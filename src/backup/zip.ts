// A minimal .zip writer: it stores the files as they are (no compression), which is plenty for
// spreadsheets and keeps this free of any extra library. File names are written as UTF-8.
//
// Limits (far above what this league's data needs): no single file of 4 GB or more, and no more
// than 65,535 files. It throws if either is exceeded, rather than writing a damaged file.

export type ZipFile = { name: string; data: Uint8Array };

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

// The checksum every zip file entry carries (CRC-32).
export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// The date and time a zip entry carries (MS-DOS format, in the computer's own time zone).
function dosDateTime(when: Date): { time: number; date: number } {
  const year = Math.min(2107, Math.max(1980, when.getFullYear()));
  return {
    time: (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate(),
  };
}

export function createZip(files: ZipFile[], when: Date = new Date()): Uint8Array {
  if (files.length > 65535) throw new Error("A zip file cannot hold more than 65,535 files.");

  const encoder = new TextEncoder();
  const stamp = dosDateTime(when);

  const entries = files.map((file) => {
    if (file.data.length >= 0xffffffff) throw new Error(`${file.name} is too large for a zip file.`);
    return { name: encoder.encode(file.name), data: file.data, crc: crc32(file.data) };
  });

  const localSize = entries.reduce((sum, entry) => sum + 30 + entry.name.length + entry.data.length, 0);
  const centralSize = entries.reduce((sum, entry) => sum + 46 + entry.name.length, 0);
  const total = localSize + centralSize + 22;
  if (total >= 0xffffffff) throw new Error("The download is too large for one zip file.");

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let at = 0;

  const u16 = (value: number) => { view.setUint16(at, value, true); at += 2; };
  const u32 = (value: number) => { view.setUint32(at, value, true); at += 4; };
  const bytes = (data: Uint8Array) => { out.set(data, at); at += data.length; };

  const offsets: number[] = [];

  // each file: a header, then its contents
  for (const entry of entries) {
    offsets.push(at);
    u32(0x04034b50);          // local file header
    u16(20);                  // version needed
    u16(0x0800);              // flags: the name is UTF-8
    u16(0);                   // method 0: stored
    u16(stamp.time);
    u16(stamp.date);
    u32(entry.crc);
    u32(entry.data.length);   // compressed size
    u32(entry.data.length);   // size
    u16(entry.name.length);
    u16(0);                   // no extra field
    bytes(entry.name);
    bytes(entry.data);
  }

  // the table of contents
  const centralStart = at;
  entries.forEach((entry, index) => {
    u32(0x02014b50);          // central directory header
    u16(20);                  // made by
    u16(20);                  // version needed
    u16(0x0800);
    u16(0);
    u16(stamp.time);
    u16(stamp.date);
    u32(entry.crc);
    u32(entry.data.length);
    u32(entry.data.length);
    u16(entry.name.length);
    u16(0);                   // extra
    u16(0);                   // comment
    u16(0);                   // disk
    u16(0);                   // internal attributes
    u32(0);                   // external attributes
    u32(offsets[index]);
    bytes(entry.name);
  });

  // the end (the size of the table of contents is measured BEFORE this record is written)
  const centralLength = at - centralStart;
  u32(0x06054b50);
  u16(0);
  u16(0);
  u16(entries.length);
  u16(entries.length);
  u32(centralLength);
  u32(centralStart);
  u16(0);

  return out;
}
