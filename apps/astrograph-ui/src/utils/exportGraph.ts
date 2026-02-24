/**
 * Triggers a file download for graph export.
 * In Tauri: uses save dialog and backend write. In web: uses blob/data URL download.
 */
const isTauri = Boolean(import.meta.env.TAURI_PLATFORM);

export async function downloadExportFile(
  filename: string,
  mimeType: string,
  getContents: () => Promise<string | Blob>
): Promise<void> {
  const contents = await getContents();

  if (isTauri) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { invoke } = await import("@tauri-apps/api/core");

    const ext = filename.split(".").pop() ?? "";
    const path = await save({
      defaultPath: filename,
      filters:
        ext === "png"
          ? [{ name: "PNG Image", extensions: ["png"] }]
          : ext === "svg"
            ? [{ name: "SVG Image", extensions: ["svg"] }]
            : [{ name: "JSON", extensions: ["json"] }],
    });

    if (!path) return;

    const base64 =
      typeof contents === "string"
        ? (contents.startsWith("data:")
          ? contents.replace(/^data:[^;]+;base64,/, "")
          : btoa(unescape(encodeURIComponent(contents))))
        : await blobToBase64(contents);

    await invoke("write_export_file", {
      path,
      contentsBase64: base64,
    });
    return;
  }

  // Web: trigger download
  const blob =
    typeof contents === "string"
      ? contents.startsWith("data:")
        ? await (await fetch(contents)).blob()
        : new Blob([contents], { type: mimeType })
      : contents;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.replace(/^data:[^;]+;base64,/, ""));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
