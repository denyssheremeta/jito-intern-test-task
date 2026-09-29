"use strict";

const fs = require("fs");
const path = require("path");

const samplesDir = path.join(__dirname, "html_samples");
const manifestPath = path.join(samplesDir, "manifest.json");

function labelFromFilename(filename) {
  const base = filename.replace(/\.(html|txt)$/i, "");
  return base.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

const files = fs
  .readdirSync(samplesDir)
  .filter((name) => /\.(html|txt)$/i.test(name) && name !== "manifest.json")
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const manifest = {
  generatedAt: new Date().toISOString(),
  files: files.map((name) => ({
    name,
    label: labelFromFilename(name),
  })),
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`Wrote ${manifest.files.length} sample(s) to html_samples/manifest.json`);
