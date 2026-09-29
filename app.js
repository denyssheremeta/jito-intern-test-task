const SAMPLE_MANIFEST_URL = "html_samples/manifest.json";

function formatSampleLabel(entry) {
  return entry.label || entry.name;
}

async function loadSampleManifest() {
  const response = await fetch(SAMPLE_MANIFEST_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load sample manifest (${response.status})`);
  }
  return response.json();
}

function populateSampleDropdown(files) {
  const select = document.getElementById("sample-select");
  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose a sample from html_samples…";
  select.appendChild(placeholder);

  for (const file of files) {
    const option = document.createElement("option");
    option.value = file.name;
    option.textContent = formatSampleLabel(file);
    select.appendChild(option);
  }
}

async function loadSampleIntoEditor(filename) {
  const htmlArea = document.getElementById("html");
  const status = document.getElementById("status-text");

  if (!filename) {
    status.textContent = "Select a sample or paste HTML manually.";
    return;
  }

  status.textContent = `Loading ${filename}…`;

  const response = await fetch(`html_samples/${encodeURIComponent(filename)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Could not load ${filename} (${response.status})`);
  }

  htmlArea.value = await response.text();
  convertHtml2JsonAndSet();
  status.textContent = `Loaded ${filename}.`;
}

function clearPanels() {
  document.getElementById("html").value = "";
  document.getElementById("json").value = "";
  document.getElementById("sample-select").value = "";
  document.getElementById("status-text").textContent = "Cleared input and output.";
  updateCharCounts();
}

async function copyJsonToClipboard() {
  const jsonText = document.getElementById("json").value;
  const status = document.getElementById("status-text");
  if (!jsonText.trim()) {
    status.textContent = "Nothing to copy — convert HTML first.";
    return;
  }
  try {
    await navigator.clipboard.writeText(jsonText);
    status.textContent = "JSON copied to clipboard.";
  } catch {
    status.textContent = "Copy failed — select JSON manually.";
  }
}

function updateCharCounts() {
  const htmlLen = document.getElementById("html").value.length;
  const jsonLen = document.getElementById("json").value.length;
  document.getElementById("html-meta").textContent = `${htmlLen.toLocaleString()} characters`;
  document.getElementById("json-meta").textContent = `${jsonLen.toLocaleString()} characters`;
}

function initApp() {
  const htmlArea = document.getElementById("html");
  const sampleSelect = document.getElementById("sample-select");
  const status = document.getElementById("status-text");

  document.getElementById("convert-btn").addEventListener("click", () => {
    convertHtml2JsonAndSet();
    status.textContent = "Conversion complete.";
  });

  document.getElementById("clear-btn").addEventListener("click", clearPanels);
  document.getElementById("copy-json-btn").addEventListener("click", copyJsonToClipboard);

  sampleSelect.addEventListener("change", () => {
    loadSampleIntoEditor(sampleSelect.value).catch((error) => {
      status.textContent = error.message;
    });
  });

  htmlArea.addEventListener("input", updateCharCounts);

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      convertHtml2JsonAndSet();
      status.textContent = "Conversion complete.";
    }
  });

  loadSampleManifest()
    .then((manifest) => {
      populateSampleDropdown(manifest.files || []);
      status.textContent =
        manifest.files?.length > 0
          ? `${manifest.files.length} samples ready — pick one from the dropdown.`
          : "No samples found. Run node build-samples-manifest.js.";
    })
    .catch((error) => {
      status.textContent = error.message + " Serve the folder over HTTP (e.g. npx serve).";
    });

  updateCharCounts();
}

document.addEventListener("DOMContentLoaded", initApp);
