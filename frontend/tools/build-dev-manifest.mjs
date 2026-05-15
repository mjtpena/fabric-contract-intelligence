#!/usr/bin/env node
/**
 * build-dev-manifest.mjs
 *
 * Builds a NuGet manifest package (ManifestPackage.nupkg) from the Orqentis
 * workload manifest templates. The package is used by the Fabric DevGateway
 * during local development.
 *
 * Output: frontend/tools/dist/ManifestPackage.nupkg
 *
 * Usage:
 *   npm run build:dev-manifest
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const WORKLOAD_NAME = 'Org.Orqentis';
const WORKLOAD_VERSION = '0.7.0';
const FRONTEND_APP_ID = '7a234404-ea08-454c-b2b5-0acb523f0417';
// Dev mode: frontend is served from the local Vite dev server on port 60006
const FRONTEND_URL = 'http://localhost:60006';

const MANIFEST_SRC = path.join(ROOT, 'frontend/manifest');
const OUTPUT_DIR = path.join(__dirname, 'dist');

function fillTemplate(content, vars) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    content,
  );
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/** Collects all files in a directory tree as { entryPath, filePath } pairs. */
function collectFiles(dir, prefix = '') {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectFiles(filePath, entryPath));
    } else {
      result.push({ entryPath, filePath });
    }
  }
  return result;
}

/**
 * Writes a ZIP (NuGet .nupkg) file from a directory tree.
 * Uses Node.js's built-in zlib for DEFLATE — no extra npm dependencies.
 *
 * ZIP Local File Header format:
 *   Signature  4 bytes  0x04034b50
 *   Version    2 bytes
 *   Flags      2 bytes
 *   Compression 2 bytes (0 = stored, 8 = deflated)
 *   Mod time   2 bytes
 *   Mod date   2 bytes
 *   CRC-32     4 bytes
 *   Comp size  4 bytes
 *   Uncomp sz  4 bytes
 *   Fname len  2 bytes
 *   Extra len  2 bytes
 *   Filename   variable
 *   Data       variable
 *
 * Central Directory Entry:
 *   Signature  4 bytes  0x02014b50
 *   ... (similar fields)
 *   Offset to local header 4 bytes
 *
 * End of Central Directory:
 *   Signature  4 bytes  0x06054b50
 *   Disk num   2 bytes  0
 *   Disk w/ CD 2 bytes  0
 *   Entries on disk  2 bytes
 *   Total entries    2 bytes
 *   CD size    4 bytes
 *   CD offset  4 bytes
 *   Comment len 2 bytes 0
 */
function writeZip(outputPath, files) {
  const buffers = [];
  const centralDir = [];
  let offset = 0;

  // DOS date/time for 2024-01-01 00:00:00
  const dosTime = 0x0000;
  const dosDate = 0x5421; // 2024-01-01

  for (const { entryPath, data } of files) {
    const nameBuffer = Buffer.from(entryPath, 'utf8');
    const crc = crc32(data);
    const compressed = data; // Store (no compression) for simplicity
    const compression = 0; // STORED

    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0);  // signature
    localHeader.writeUInt16LE(20, 4);           // version needed
    localHeader.writeUInt16LE(0, 6);            // flags
    localHeader.writeUInt16LE(compression, 8);  // compression
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18); // compressed size
    localHeader.writeUInt32LE(data.length, 22);        // uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);           // extra length
    nameBuffer.copy(localHeader, 30);

    centralDir.push({ entryPath, crc, size: data.length, offset, compression });

    buffers.push(localHeader, compressed);
    offset += localHeader.length + compressed.length;
  }

  // Central Directory
  const cdStart = offset;
  for (const entry of centralDir) {
    const nameBuffer = Buffer.from(entry.entryPath, 'utf8');
    const cdEntry = Buffer.alloc(46 + nameBuffer.length);
    cdEntry.writeUInt32LE(0x02014b50, 0);  // signature
    cdEntry.writeUInt16LE(20, 4);           // version made by
    cdEntry.writeUInt16LE(20, 6);           // version needed
    cdEntry.writeUInt16LE(0, 8);            // flags
    cdEntry.writeUInt16LE(entry.compression, 10);
    cdEntry.writeUInt16LE(dosTime, 12);
    cdEntry.writeUInt16LE(dosDate, 14);
    cdEntry.writeUInt32LE(entry.crc, 16);
    cdEntry.writeUInt32LE(entry.size, 20);  // compressed
    cdEntry.writeUInt32LE(entry.size, 24);  // uncompressed
    cdEntry.writeUInt16LE(nameBuffer.length, 28);
    cdEntry.writeUInt16LE(0, 30);   // extra
    cdEntry.writeUInt16LE(0, 32);   // comment
    cdEntry.writeUInt16LE(0, 34);   // disk start
    cdEntry.writeUInt16LE(0, 36);   // int file attrs
    cdEntry.writeUInt32LE(0, 38);   // ext file attrs
    cdEntry.writeUInt32LE(entry.offset, 42); // offset to local header
    nameBuffer.copy(cdEntry, 46);
    buffers.push(cdEntry);
    offset += cdEntry.length;
  }

  const cdSize = offset - cdStart;

  // End of Central Directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(centralDir.length, 8);
  eocd.writeUInt16LE(centralDir.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20);
  buffers.push(eocd);

  fs.writeFileSync(outputPath, Buffer.concat(buffers));
}

function crc32(buf) {
  // CRC-32 lookup table
  if (!crc32.table) {
    crc32.table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crc32.table[i] = c;
    }
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crc32.table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const vars = {
    WORKLOAD_NAME,
    WORKLOAD_VERSION,
    FRONTEND_APP_ID,
    FRONTEND_URL,
  };

  // ── Collect ZIP entries ───────────────────────────────────────────────────
  const zipEntries = [];

  // [Content_Types].xml (required by NuGet/OPC)
  const contentTypesXml = `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="nuspec" ContentType="application/octet"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="json" ContentType="application/json"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="svg" ContentType="image/svg+xml"/>
</Types>`;
  zipEntries.push({ entryPath: '[Content_Types].xml', data: Buffer.from(contentTypesXml, 'utf8') });

  // _rels/.rels
  const relsXml = `<?xml version="1.0" encoding="utf-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Type="http://schemas.microsoft.com/packaging/2010/07/manifest" Target="/${WORKLOAD_NAME}.nuspec" Id="R1"/>
</Relationships>`;
  zipEntries.push({ entryPath: '_rels/.rels', data: Buffer.from(relsXml, 'utf8') });

  // .nuspec
  const nuspecContent = `<?xml version="1.0"?>
<package xmlns="http://schemas.microsoft.com/packaging/2010/07/nuspec.xsd">
  <metadata>
    <id>${WORKLOAD_NAME}</id>
    <version>${WORKLOAD_VERSION}</version>
    <authors>Orqentis</authors>
    <owners>Orqentis</owners>
    <description>Orqentis workload manifest package for local DevGateway development.</description>
    <requireLicenseAcceptance>false</requireLicenseAcceptance>
  </metadata>
</package>`;
  zipEntries.push({ entryPath: `${WORKLOAD_NAME}.nuspec`, data: Buffer.from(nuspecContent, 'utf8') });

  // BE/WorkloadManifest.xml
  const beManifestSrc = path.join(MANIFEST_SRC, 'WorkloadManifest.xml');
  zipEntries.push({
    entryPath: 'BE/WorkloadManifest.xml',
    data: Buffer.from(fillTemplate(fs.readFileSync(beManifestSrc, 'utf8'), vars), 'utf8'),
  });

  // BE/ContractItem.xml, ContractPolicyItem.xml, ContractReportItem.xml
  for (const item of ['ContractItem', 'ContractPolicyItem', 'ContractReportItem']) {
    const xmlSrc = path.join(MANIFEST_SRC, 'items', item, `${item}.xml`);
    if (fs.existsSync(xmlSrc)) {
      zipEntries.push({
        entryPath: `BE/${item}.xml`,
        data: Buffer.from(fillTemplate(fs.readFileSync(xmlSrc, 'utf8'), vars), 'utf8'),
      });
    }
  }

  // FE/product.json
  zipEntries.push({
    entryPath: 'FE/product.json',
    data: fs.readFileSync(path.join(MANIFEST_SRC, 'Product.json')),
  });

  // FE/ContractItem.json, etc.
  for (const item of ['ContractItem', 'ContractPolicyItem', 'ContractReportItem']) {
    const jsonSrc = path.join(MANIFEST_SRC, 'items', item, `${item}.json`);
    if (fs.existsSync(jsonSrc)) {
      zipEntries.push({ entryPath: `FE/${item}.json`, data: fs.readFileSync(jsonSrc) });
    }
  }

  // FE/assets/**
  const assetsSrc = path.join(MANIFEST_SRC, 'assets');
  if (fs.existsSync(assetsSrc)) {
    for (const { entryPath, filePath } of collectFiles(assetsSrc)) {
      zipEntries.push({ entryPath: `FE/assets/${entryPath}`, data: fs.readFileSync(filePath) });
    }
  }

  // ── Write the NuGet package (.nupkg = ZIP) ────────────────────────────────
  const outputPkg = path.join(OUTPUT_DIR, 'ManifestPackage.nupkg');
  writeZip(outputPkg, zipEntries);

  console.log(`✅ ManifestPackage.nupkg built successfully.`);
  console.log(`   Path: ${outputPkg}`);
  console.log(`   Entries: ${zipEntries.length} files`);
  console.log('');
  console.log('   Next steps:');
  console.log('   1. Ensure C:\\workload-dev-mode.json exists (copy workload-dev-mode.json.template)');
  console.log('   2. Run: .\\scripts\\Start-Dev.ps1');
}

main().catch((err) => {
  console.error('❌ Build failed:', err.message);
  process.exit(1);
});
