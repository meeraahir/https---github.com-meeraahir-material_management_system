export function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(objectUrl);
}

export function downloadCsv(content: string, filename: string): void {
  const csvBlob = new Blob([content], {
    type: "text/csv;charset=utf-8;",
  });

  downloadBlob(csvBlob, filename);
}
