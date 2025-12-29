use crate::language::tree_sitter_language;
use crate::model::{CallEdge, Language, ParsedFile, Span, Symbol, SymbolKind};
use anyhow::{anyhow, Result};
use sha2::{Digest, Sha256};
use std::path::Path;
use tree_sitter::{Node, Parser};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ContainerKind {
    Module,
    Namespace,
    Type,
    Impl,
}

#[derive(Debug, Clone)]
struct Container {
    name: String,
    kind: ContainerKind,
}

struct ParseState<'a> {
    source: &'a [u8],
    file: String,
    module_path: String,
    language: Language,
    symbols: Vec<Symbol>,
    calls: Vec<CallEdge>,
    containers: Vec<Container>,
    functions: Vec<String>,
}

pub fn analyze_file(path: &Path, root: &Path, language: Language) -> Result<ParsedFile> {
    let source = std::fs::read(path)?;
    let source_text = String::from_utf8_lossy(&source);

    let mut parser = Parser::new();
    parser
        .set_language(&tree_sitter_language(language))
        .map_err(|_| anyhow!("Failed to load Tree-sitter language"))?;

    let tree = parser
        .parse(source_text.as_ref(), None)
        .ok_or_else(|| anyhow!("Failed to parse file"))?;

    let relative_path = path
        .strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .to_string();

    let module_path = module_path_from_file(path, root);

    let mut state = ParseState {
        source: source_text.as_bytes(),
        file: relative_path,
        module_path,
        language,
        symbols: Vec::new(),
        calls: Vec::new(),
        containers: Vec::new(),
        functions: Vec::new(),
    };

    let root_node = tree.root_node();
    walk_node(root_node, &mut state);

    Ok(ParsedFile {
        symbols: state.symbols,
        calls: state.calls,
    })
}

fn walk_node(node: Node, state: &mut ParseState<'_>) {
    if let Some(container_info) = container_info(node, state) {
        if let Some(symbol) = container_info.symbol {
            state.symbols.push(symbol.clone());
        }
        state.containers.push(Container {
            name: container_info.name,
            kind: container_info.kind,
        });

        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            walk_node(child, state);
        }
        state.containers.pop();
        return;
    }

    if let Some(symbol) = function_symbol(node, state) {
        let function_id = symbol.id.clone();
        state.symbols.push(symbol);
        state.functions.push(function_id);

        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            walk_node(child, state);
        }
        state.functions.pop();
        return;
    }

    if let Some(call) = call_edge(node, state) {
        state.calls.push(call);
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk_node(child, state);
    }
}

struct ContainerInfo {
    name: String,
    kind: ContainerKind,
    symbol: Option<Symbol>,
}

fn container_info(node: Node, state: &mut ParseState<'_>) -> Option<ContainerInfo> {
    match state.language {
        Language::Rust => rust_container_info(node, state),
        Language::JavaScript | Language::TypeScript | Language::Tsx => {
            js_container_info(node, state)
        }
    }
}

fn rust_container_info(node: Node, state: &mut ParseState<'_>) -> Option<ContainerInfo> {
    match node.kind() {
        "mod_item" => {
            let name = node_text(node.child_by_field_name("name")?, state.source);
            let symbol = new_symbol(
                state,
                name,
                SymbolKind::Module,
                node,
                rust_is_exported(node, state.source),
            );
            Some(ContainerInfo {
                name: name.to_string(),
                kind: ContainerKind::Module,
                symbol: Some(symbol),
            })
        }
        "trait_item" => {
            let name = node_text(node.child_by_field_name("name")?, state.source);
            let symbol = new_symbol(
                state,
                name,
                SymbolKind::Trait,
                node,
                rust_is_exported(node, state.source),
            );
            Some(ContainerInfo {
                name: name.to_string(),
                kind: ContainerKind::Type,
                symbol: Some(symbol),
            })
        }
        "impl_item" => {
            let target = node
                .child_by_field_name("type")
                .or_else(|| node.child_by_field_name("trait"))
                .or_else(|| {
                    find_descendant(
                        node,
                        &["type_identifier", "scoped_type_identifier", "generic_type"],
                    )
                });
            let name = target
                .map(|node| node_text(node, state.source).to_string())
                .unwrap_or_else(|| "impl".to_string());
            Some(ContainerInfo {
                name,
                kind: ContainerKind::Impl,
                symbol: None,
            })
        }
        _ => None,
    }
}

fn js_container_info(node: Node, state: &mut ParseState<'_>) -> Option<ContainerInfo> {
    match node.kind() {
        "class_declaration" => {
            let name = node_text(node.child_by_field_name("name")?, state.source);
            let symbol = new_symbol(state, name, SymbolKind::Class, node, js_is_exported(node));
            Some(ContainerInfo {
                name: name.to_string(),
                kind: ContainerKind::Type,
                symbol: Some(symbol),
            })
        }
        "interface_declaration" => {
            let name = node_text(node.child_by_field_name("name")?, state.source);
            let symbol = new_symbol(
                state,
                name,
                SymbolKind::Interface,
                node,
                js_is_exported(node),
            );
            Some(ContainerInfo {
                name: name.to_string(),
                kind: ContainerKind::Type,
                symbol: Some(symbol),
            })
        }
        "module_declaration" => {
            let name = node_text(node.child_by_field_name("name")?, state.source);
            let symbol = new_symbol(
                state,
                name,
                SymbolKind::Namespace,
                node,
                js_is_exported(node),
            );
            Some(ContainerInfo {
                name: name.to_string(),
                kind: ContainerKind::Namespace,
                symbol: Some(symbol),
            })
        }
        _ => None,
    }
}

fn function_symbol(node: Node, state: &mut ParseState<'_>) -> Option<Symbol> {
    match state.language {
        Language::Rust => rust_function_symbol(node, state),
        Language::JavaScript | Language::TypeScript | Language::Tsx => {
            js_function_symbol(node, state)
        }
    }
}

fn rust_function_symbol(node: Node, state: &mut ParseState<'_>) -> Option<Symbol> {
    match node.kind() {
        "function_item" => {
            let name = node_text(node.child_by_field_name("name")?, state.source);
            let kind = if in_method_context(&state.containers) {
                SymbolKind::Method
            } else {
                SymbolKind::Function
            };
            Some(new_symbol(
                state,
                name,
                kind,
                node,
                rust_is_exported(node, state.source),
            ))
        }
        "function_signature_item" => {
            let name = node_text(node.child_by_field_name("name")?, state.source);
            Some(new_symbol(
                state,
                name,
                SymbolKind::Method,
                node,
                rust_is_exported(node, state.source),
            ))
        }
        "struct_item" => {
            let name = node_text(node.child_by_field_name("name")?, state.source);
            Some(new_symbol(
                state,
                name,
                SymbolKind::Struct,
                node,
                rust_is_exported(node, state.source),
            ))
        }
        "enum_item" => {
            let name = node_text(node.child_by_field_name("name")?, state.source);
            Some(new_symbol(
                state,
                name,
                SymbolKind::Enum,
                node,
                rust_is_exported(node, state.source),
            ))
        }
        _ => None,
    }
}

fn js_function_symbol(node: Node, state: &mut ParseState<'_>) -> Option<Symbol> {
    match node.kind() {
        "function_declaration" => {
            let name = node_text(node.child_by_field_name("name")?, state.source);
            let kind = if in_method_context(&state.containers) {
                SymbolKind::Method
            } else {
                SymbolKind::Function
            };
            Some(new_symbol(state, name, kind, node, js_is_exported(node)))
        }
        "method_definition" => {
            let name = node_text(node.child_by_field_name("name")?, state.source);
            Some(new_symbol(
                state,
                name,
                SymbolKind::Method,
                node,
                js_is_exported(node),
            ))
        }
        "variable_declarator" => {
            let name_node = node.child_by_field_name("name")?;
            let value_node = node.child_by_field_name("value")?;
            let value_kind = value_node.kind();
            if value_kind == "arrow_function"
                || value_kind == "function"
                || value_kind == "function_expression"
            {
                let name = node_text(name_node, state.source);
                return Some(new_symbol(
                    state,
                    name,
                    SymbolKind::Function,
                    node,
                    js_is_exported(node),
                ));
            }
            None
        }
        "enum_declaration" => {
            let name = node_text(node.child_by_field_name("name")?, state.source);
            Some(new_symbol(
                state,
                name,
                SymbolKind::Enum,
                node,
                js_is_exported(node),
            ))
        }
        _ => None,
    }
}

fn call_edge(node: Node, state: &mut ParseState<'_>) -> Option<CallEdge> {
    let callee_name = match state.language {
        Language::Rust => rust_call_name(node, state.source),
        Language::JavaScript | Language::TypeScript | Language::Tsx => {
            js_call_name(node, state.source)
        }
    }?;

    let caller_id = state.functions.last()?.clone();
    let span = span_from_node(node);
    let id_seed = format!(
        "call:{}:{}:{}:{}:{}:{}:{}:{}",
        caller_id,
        callee_name,
        state.file,
        span.start_line,
        span.start_col,
        span.end_line,
        span.end_col,
        state.language_string()
    );

    Some(CallEdge {
        id: hash_id(&id_seed),
        caller_id,
        callee_name,
        callee_id: None,
        file: state.file.clone(),
        span,
    })
}

fn rust_call_name(node: Node, source: &[u8]) -> Option<String> {
    match node.kind() {
        "call_expression" => {
            let function = node.child_by_field_name("function")?;
            Some(normalize_call_name(node_text(function, source)))
        }
        "method_call_expression" => {
            let name = node.child_by_field_name("name")?;
            Some(node_text(name, source).trim().to_string())
        }
        _ => None,
    }
}

fn js_call_name(node: Node, source: &[u8]) -> Option<String> {
    match node.kind() {
        "call_expression" => {
            let function = node.child_by_field_name("function")?;
            Some(normalize_call_name(node_text(function, source)))
        }
        "new_expression" => {
            let constructor = node.child_by_field_name("constructor")?;
            Some(normalize_call_name(node_text(constructor, source)))
        }
        _ => None,
    }
}

fn normalize_call_name(value: &str) -> String {
    let trimmed = value.trim();
    let without_generics = trimmed.split('<').next().unwrap_or(trimmed);
    without_generics.to_string()
}

fn new_symbol(
    state: &ParseState<'_>,
    name: &str,
    kind: SymbolKind,
    node: Node,
    is_exported: bool,
) -> Symbol {
    let span = span_from_node(node);
    let fq_name = build_fq_name(&state.module_path, &state.containers, name);
    let container = state
        .containers
        .last()
        .map(|container| container.name.clone());
    let is_entrypoint = name == "main" || is_exported;
    let id_seed = format!(
        "symbol:{}:{}:{}:{}:{}:{}:{}:{}",
        state.file,
        kind_to_str(&kind),
        fq_name,
        span.start_line,
        span.start_col,
        span.end_line,
        span.end_col,
        state.language_string()
    );

    Symbol {
        id: hash_id(&id_seed),
        name: name.to_string(),
        kind,
        file: state.file.clone(),
        span,
        fq_name,
        container,
        is_exported,
        is_entrypoint,
    }
}

fn build_fq_name(module_path: &str, containers: &[Container], name: &str) -> String {
    let mut parts = Vec::new();
    if !module_path.is_empty() {
        parts.push(module_path.to_string());
    }
    for container in containers {
        parts.push(container.name.clone());
    }
    parts.push(name.to_string());
    parts.join("::")
}

fn in_method_context(containers: &[Container]) -> bool {
    containers
        .iter()
        .any(|container| matches!(container.kind, ContainerKind::Type | ContainerKind::Impl))
}

fn rust_is_exported(node: Node, source: &[u8]) -> bool {
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if child.kind() == "visibility_modifier" {
            let text = node_text(child, source);
            if text.trim_start().starts_with("pub") {
                return true;
            }
        }
    }
    false
}

fn js_is_exported(node: Node) -> bool {
    let mut current = Some(node);
    while let Some(item) = current {
        let kind = item.kind();
        if kind == "export_statement" || kind == "export_clause" {
            return true;
        }
        if kind == "program" {
            break;
        }
        current = item.parent();
    }
    false
}

fn node_text<'a>(node: Node, source: &'a [u8]) -> &'a str {
    let range = node.byte_range();
    std::str::from_utf8(&source[range]).unwrap_or("")
}

fn span_from_node(node: Node) -> Span {
    let start = node.start_position();
    let end = node.end_position();
    Span {
        start_line: start.row + 1,
        start_col: start.column + 1,
        end_line: end.row + 1,
        end_col: end.column + 1,
    }
}

fn module_path_from_file(path: &Path, root: &Path) -> String {
    let relative = path.strip_prefix(root).unwrap_or(path);
    let mut components: Vec<String> = relative
        .components()
        .map(|component| component.as_os_str().to_string_lossy().to_string())
        .collect();
    if let Some(last) = components.last_mut() {
        if let Some((stem, _)) = last.rsplit_once('.') {
            *last = stem.to_string();
        }
        if last == "mod" || last == "index" {
            components.pop();
        }
    }
    components.join("::")
}

fn hash_id(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hex::encode(hasher.finalize())
}

fn kind_to_str(kind: &SymbolKind) -> &'static str {
    match kind {
        SymbolKind::Class => "class",
        SymbolKind::Struct => "struct",
        SymbolKind::Enum => "enum",
        SymbolKind::Interface => "interface",
        SymbolKind::Trait => "trait",
        SymbolKind::Module => "module",
        SymbolKind::Namespace => "namespace",
        SymbolKind::Function => "function",
        SymbolKind::Method => "method",
    }
}

fn find_descendant<'a>(node: Node<'a>, kinds: &[&str]) -> Option<Node<'a>> {
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if kinds.contains(&child.kind()) {
            return Some(child);
        }
        if let Some(found) = find_descendant(child, kinds) {
            return Some(found);
        }
    }
    None
}

trait LanguageName {
    fn language_string(&self) -> &'static str;
}

impl LanguageName for ParseState<'_> {
    fn language_string(&self) -> &'static str {
        match self.language {
            Language::Rust => "rust",
            Language::JavaScript => "javascript",
            Language::TypeScript => "typescript",
            Language::Tsx => "tsx",
        }
    }
}
