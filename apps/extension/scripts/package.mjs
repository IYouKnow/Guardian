// Packages the built extension (dist/) into a zip ready for the
// Chrome Web Store upload.
//
// Dependency-free: writes a standard ZIP (deflate) using node:zlib.
//
//   node scripts/package.mjs
//
// Reads the version from dist/manifest.json so the archive name always
// matches the shipped manifest version.

import {
  readFileSync,
  readdirSync,
  statSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, sep, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, crc32 } from 'node:zlib';

const extensionRoot = fileURLToPath(new URL('..', import.meta.url));
const distDir = join(extensionRoot, 'dist');
const releaseDir = join(extensionRoot, 'release');

function collectFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    // Skip Vite build metadata and other dot-entries.
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectFiles(full));
    else out.push(full);
  }
  return out;
}

function dosDateTime(date) {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() >> 1) & 0x1f);
  const day =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);
  return { time, day };
}

function buildZip(files, rootDir) {
  const local = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const name = relative(rootDir, file).split(sep).join('/');
    const nameBuf = Buffer.from(name, 'utf8');
    const data = readFileSync(file);
    const crc = crc32(data) >>> 0;
    const compressed = deflateRawSync(data, { level: 9 });
    const { time, day } = dosDateTime(statSync(file).mtime);
    const flags = 0x0800; // UTF-8 filenames

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(flags, 6);
    header.writeUInt16LE(8, 8); // deflate
    header.writeUInt16LE(time, 10);
    header.writeUInt16LE(day, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(nameBuf.length, 26);
    header.writeUInt16LE(0, 28);
    local.push(header, nameBuf, compressed);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(flags, 8);
    entry.writeUInt16LE(8, 10); // deflate
    entry.writeUInt16LE(time, 12);
    entry.writeUInt16LE(day, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(compressed.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBuf.length, 28);
    entry.writeUInt16LE(0, 30);
    entry.writeUInt16LE(0, 32);
    entry.writeUInt16LE(0, 34);
    entry.writeUInt16LE(0, 36);
    entry.writeUInt32LE(0, 38);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBuf);

    offset += header.length + nameBuf.length + compressed.length;
  }

  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...local, centralBuf, eocd]);
}

const manifestPath = join(distDir, 'manifest.json');
let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch {
  console.error(`No build found at ${manifestPath}. Run "vite build" first.`);
  process.exit(1);
}

const files = collectFiles(distDir);
if (files.length === 0) {
  console.error(`Nothing to package — ${distDir} is empty.`);
  process.exit(1);
}

const zip = buildZip(files, distDir);
mkdirSync(releaseDir, { recursive: true });

const outName = `guardian-chrome-${manifest.version}.zip`;
const outPath = join(releaseDir, outName);
writeFileSync(outPath, zip);

const kb = (zip.length / 1024).toFixed(1);
console.log(`Packaged ${files.length} files into ${basename(outPath)} (${kb} kB)`);
console.log(outPath);
