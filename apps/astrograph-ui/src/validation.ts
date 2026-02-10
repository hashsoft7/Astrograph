import {
  AnalysisResult,
  AnalysisStats,
  CallEdge,
  FileInfo,
  Symbol,
  CURRENT_SCHEMA_VERSION,
} from "./types";

type ValidationResult =
  | { ok: true; value: AnalysisResult }
  | { ok: false; error: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isString = (value: unknown): value is string =>
  typeof value === "string";

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

const isLanguage = (value: unknown): value is FileInfo["language"] =>
  value === "rust" ||
  value === "javascript" ||
  value === "typescript" ||
  value === "tsx";

const isSpan = (value: unknown): value is Symbol["span"] => {
  if (!isObject(value)) return false;
  return (
    isNumber(value.start_line) &&
    isNumber(value.start_col) &&
    isNumber(value.end_line) &&
    isNumber(value.end_col)
  );
};

const isStats = (value: unknown): value is AnalysisStats => {
  if (!isObject(value)) return false;
  return (
    isNumber(value.file_count) &&
    isNumber(value.symbol_count) &&
    isNumber(value.call_count) &&
    isNumber(value.entrypoint_count) &&
    isNumber(value.reused_cache_files) &&
    isNumber(value.reanalyzed_files)
  );
};

const isFileInfoArray = (value: unknown): value is FileInfo[] =>
  Array.isArray(value) &&
  value.every((item) => {
    if (!isObject(item)) return false;
    return (
      isString(item.path) &&
      isLanguage(item.language) &&
      isString(item.hash) &&
      isNumber(item.byte_size)
    );
  });

const isSymbolArray = (value: unknown): value is Symbol[] =>
  Array.isArray(value) &&
  value.every((item) => {
    if (!isObject(item)) return false;
    const container = item.container;
    const containerOk =
      container === undefined || container === null || isString(container);

    return (
      isString(item.id) &&
      isString(item.name) &&
      isString(item.kind) &&
      isString(item.file) &&
      isSpan(item.span) &&
      isString(item.fq_name) &&
      containerOk &&
      isBoolean(item.is_exported) &&
      isBoolean(item.is_entrypoint)
    );
  });

const isCallEdgeArray = (value: unknown): value is CallEdge[] =>
  Array.isArray(value) &&
  value.every((item) => {
    if (!isObject(item)) return false;
    const calleeId = item.callee_id;
    const calleeIdOk =
      calleeId === undefined || calleeId === null || isString(calleeId);

    return (
      isString(item.id) &&
      isString(item.caller_id) &&
      isString(item.callee_name) &&
      calleeIdOk &&
      isString(item.file) &&
      isSpan(item.span)
    );
  });

export const validateAnalysisResult = (
  value: unknown,
): ValidationResult => {
  if (!isObject(value)) {
    return {
      ok: false,
      error: "AnalysisResult must be an object",
    };
  }

  if (!isString(value.schema_version)) {
    return {
      ok: false,
      error: "Invalid or missing 'schema_version'",
    };
  }

  if (!isString(value.root)) {
    return {
      ok: false,
      error: "Invalid or missing 'root'",
    };
  }

  if (!isString(value.generated_at)) {
    return {
      ok: false,
      error: "Invalid or missing 'generated_at'",
    };
  }

  if (!isStats(value.stats)) {
    return {
      ok: false,
      error: "Invalid or missing 'stats'",
    };
  }

  if (!isFileInfoArray(value.files)) {
    return {
      ok: false,
      error: "Invalid or missing 'files'",
    };
  }

  if (!isSymbolArray(value.symbols)) {
    return {
      ok: false,
      error: "Invalid or missing 'symbols'",
    };
  }

  if (!isCallEdgeArray(value.calls)) {
    return {
      ok: false,
      error: "Invalid or missing 'calls'",
    };
  }

  if (!isStringArray(value.entrypoints)) {
    return {
      ok: false,
      error: "Invalid or missing 'entrypoints'",
    };
  }

  return {
    ok: true,
    value: value as AnalysisResult,
  };
};

export const isSchemaVersionCompatible = (schemaVersion: string): boolean =>
  schemaVersion === CURRENT_SCHEMA_VERSION;


