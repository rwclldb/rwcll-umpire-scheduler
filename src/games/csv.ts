// A small, careful CSV reader.
// Handles a leading byte-order mark, Windows or Unix line endings, quoted
// values that contain commas, line breaks or doubled quotes, and skips lines
// that are completely empty.

export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;

  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let inQuotes = false;
  let cellWasQuoted = false;

  const endCell = () => {
    record.push(cell);
    cell = "";
    cellWasQuoted = false;
  };

  const endRecord = () => {
    endCell();
    // a line with nothing in it at all is not a record
    if (record.some((value) => value.trim() !== "") || record.length > 1) {
      records.push(record);
    }
    record = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"'; // a doubled quote is one quote character
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"' && cell === "" && !cellWasQuoted) {
      inQuotes = true;
      cellWasQuoted = true;
    } else if (char === ",") {
      endCell();
    } else if (char === "\r") {
      if (text[i + 1] === "\n") i += 1;
      endRecord();
    } else if (char === "\n") {
      endRecord();
    } else {
      cell += char;
    }
  }

  if (inQuotes) {
    throw new Error(
      "The file ends inside a quoted value. Check that every opening quote has a closing quote."
    );
  }

  if (cell !== "" || record.length > 0) endRecord();

  // drop records that are only empty cells (for example a stray ",,,," line)
  return records.filter((row) => row.some((value) => value.trim() !== ""));
}
