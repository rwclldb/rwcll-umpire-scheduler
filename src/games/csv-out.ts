// Writing a CSV file and offering it for download.

// One value, quoted when it needs to be. A value that begins with = + - or @
// would be treated as a formula by a spreadsheet, so it gets a ' in front.
export function csvCell(value: string): string {
  let text = value ?? "";

  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Rows of values as CSV text. It begins with a byte-order mark so Excel reads
// accented letters correctly, and uses Windows line endings.
export function toCsv(rows: string[][]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

// A name that is safe to use for a file.
export function safeFileName(text: string): string {
  return (
    text
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "download"
  );
}

// Offers text to the person as a file download.
export function downloadText(fileName: string, text: string): void {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
