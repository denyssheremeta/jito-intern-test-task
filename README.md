# Jito's Software Development Intern "html2json" Test Task

## Live Demo

**[Open the live demo on GitHub Pages](https://denyssheremeta.github.io/jito-intern-test-task/)**

The demo provides a simple interface for experimenting with the parser:

* enter custom HTML;
* select predefined HTML samples;
* convert HTML to JSON;
* copy the generated JSON;
* clear the input and output;
* inspect conversion status and character counts.

---

## Assignment

The goal of the task is to implement a function called `html2json`, which converts an HTML string into a JSON representation.

The implementation must work without using a browser DOM parser or an external HTML parsing library.

AI tools usage is **REQUIRED**. The complete AI conversation used during development is provided separately according to the task requirements.

---

## Solution Overview

The parser is implemented as a custom **scanner/tokenizer + stack-based tree builder**.

The input is processed from left to right:

```text
HTML string
    ↓
Scanner / Tokenizer
    ↓
Tokens
    ↓
Tree Builder + Stack
    ↓
JSON document tree
```

The parser uses an iterative approach with an explicit stack instead of recursive parsing.

It does not use:

* `DOMParser`;
* `document.createElement`;
* `innerHTML`;
* browser DOM traversal;
* external HTML parsing libraries.

The implementation focuses on predictable parsing behavior, malformed HTML recovery, and robustness rather than attempting to reproduce the complete HTML5 parsing algorithm.

---

## JSON Structure

`html2json()` always returns a document node.

### Document

```js
{
  type: "document",
  children: []
}
```

### Element

```js
{
  type: "element",
  tag: "div",
  attributes: {},
  children: []
}
```

Every element contains:

* `type`;
* `tag`;
* `attributes`;
* `children`.

### Text

```js
{
  type: "text",
  content: "Hello world"
}
```

### Comment

```js
{
  type: "comment",
  content: "comment text"
}
```

### Doctype

```js
{
  type: "doctype",
  content: "html"
}
```

The order of nodes in `children` is preserved.

---

## Parsing Features

The parser supports:

* nested elements;
* sibling elements;
* text nodes;
* comments;
* doctypes;
* quoted and unquoted attributes;
* boolean attributes;
* void elements;
* self-closing elements;
* raw text inside `script` and `style`;
* case-insensitive tag matching;
* lowercase normalization of tag and attribute names;
* whitespace handling;
* malformed HTML recovery.

### Attributes

The parser supports double-quoted, single-quoted, and simple unquoted attribute values.

Boolean attributes are represented using `true`, while explicitly provided string values remain strings.

For example, an attribute without a value is treated differently from an attribute whose value is the string `"false"`.

Attribute values are not interpreted as CSS or JavaScript.

### Void Elements

The following HTML void elements are recognized:

```text
area
base
br
col
embed
hr
img
input
link
meta
param
source
track
wbr
```

Void elements are added to the tree but are never pushed onto the open-element stack.

### Self-Closing Elements

Elements using `/>` are treated as immediately closed and are not pushed onto the stack.

### Comments and Doctype

Comments and doctypes are represented as separate node types and remain in their original position in the tree.

### Script and Style

`script` and `style` are treated as raw-text elements.

Their contents are preserved as text and are not parsed as HTML. JavaScript and CSS themselves are not interpreted.

---

## Whitespace Handling

Whitespace-only text segments are ignored.

The parser uses whitespace only to determine whether a text segment is empty:

```js
text.trim() === ""
```

If the segment contains only whitespace, no text node is created.

When the segment contains meaningful content:

```js
text.trim() !== ""
```

the original text is preserved exactly, including leading and trailing whitespace.

This allows indentation between elements to be ignored while preserving meaningful whitespace inside text content.

---

## Malformed HTML Recovery

The parser is designed not to crash when processing malformed or unexpected HTML.

The recovery strategy includes:

* ignoring unmatched closing tags;
* closing the nearest matching open element when a closing tag matches an element deeper in the stack;
* popping unmatched elements above the matching element during recovery;
* preserving the already constructed tree when the input ends with unclosed elements;
* treating invalid `<` sequences as literal text when they do not form recognizable markup.

The parser does not attempt to fully emulate browser HTML error recovery.

---

## Robustness

The implementation was checked against a broad set of edge cases during development.

One edge-case pass covered **81 inputs**, resulting in **0 crashes**. Several parser issues were discovered and fixed during this process, including:

* invalid tag detection when `<` was followed by a digit;
* self-closing syntax containing whitespace;
* `/` appearing between attributes;
* consecutive literal `<` characters in text;
* malformed nesting and unmatched closing tags.

The parser was also checked with deep nesting without relying on recursive parsing, helping avoid JavaScript call-stack limitations.

---

## HTML Samples

The `html_samples/` directory contains predefined inputs used to manually verify parser behavior.

The samples cover:

* basic HTML structures;
* nested elements;
* forms;
* attributes;
* boolean attributes;
* void elements;
* comments and doctypes;
* inline styles and scripts;
* SVG and ARIA/data attributes;
* malformed HTML;
* more complex page structures.

Several larger samples exercise more realistic HTML structures, including landing pages, dashboards, complex forms, articles, attribute-heavy markup, and malformed HTML recovery.

### Sample Manifest

The browser cannot directly enumerate files in a directory, so the available samples are represented by:

```text
html_samples/manifest.json
```

Generate the manifest with:

```bash
node build-samples-manifest.js
```

The script scans `html_samples/` and includes only `.html` and `.txt` files.

After adding, removing, or renaming samples, regenerate the manifest.

---

## Demo and Local Development

### GitHub Pages

The project is available as a static web application:

**[Open the live demo](https://denyssheremeta.github.io/jito-intern-test-task/)**

### Local Development

Because the UI loads sample files using `fetch`, the project should be served over HTTP rather than opened directly using `file://`.

For example:

```bash
npx serve .
```

Then open the local URL provided by the server.

The parser can also be tested manually by entering HTML directly into the input area.

Use **Ctrl + Enter** on Windows/Linux or **Cmd + Enter** on macOS to trigger conversion.

---

## UI

The demo interface includes:

* HTML input and JSON output panes;
* predefined sample selection;
* automatic sample loading;
* character counts;
* Convert action;
* Copy JSON action;
* Clear action;
* conversion status;
* keyboard shortcut for conversion;
* responsive layout.

The UI is intentionally lightweight and serves as a convenient manual testing environment for the parser.

---

## Project Structure

```text
.
├── html2json.js
├── index.html
├── app.js
├── build-samples-manifest.js
├── html_samples/
│   ├── manifest.json
│   └── ...
└── ai_help/
    └── chatgpt_chat.txt
```

### Main Files

* `html2json.js` — parser implementation.
* `index.html` — application UI.
* `app.js` — UI logic for sample selection, loading, conversion, copying, clearing, and status updates.
* `build-samples-manifest.js` — generates the sample manifest.
* `html_samples/` — manual HTML samples used to exercise the parser.
* `ai_help/chatgpt_chat.txt` — link to the AI conversation used during development.

---

## Known Limitations

The implementation intentionally does not attempt to provide complete browser-level HTML parsing.

Known limitations include:

* HTML entities are not decoded and remain literal text;
* duplicate attributes use the last parsed value;
* namespaced tag syntax is not fully supported;
* `textarea` and `title` are not treated as raw-text elements;
* recovery from an unclosed quoted attribute is limited;
* incomplete tags at the end of input have simplified recovery behavior.

These limitations are consistent with the deliberately scoped parser and the agreed requirements rather than an attempt to implement the complete HTML5 parsing specification.

---

## Development Approach

The implementation was developed incrementally:

1. Define the JSON contract.
2. Define token types and parser states.
3. Define stack-based tree construction.
4. Implement the parser.
5. Add representative HTML samples.
6. Manually exercise edge cases.
7. Identify and fix robustness issues.
8. Refine the demo UI and sample loading workflow.
9. Review the implementation against the agreed parsing rules.

The main design goal was to keep the parser small, explicit, iterative, and easy to reason about while still handling a broad range of valid and malformed HTML input.

---

## Original Task

The original Jito test task template is available here:

**[Jito HTML to JSON Test Task](https://jito-dev.github.io/jito-intern-test-task/)**

---

## Submission Checklist

Before submission:

* verify the GitHub Pages demo works;
* verify all sample files load correctly;
* regenerate `html_samples/manifest.json` after any sample changes;
* test the parser with the included samples;
* verify that malformed inputs do not crash the parser;
* verify that the AI conversation link in `ai_help/chatgpt_chat.txt` is accessible;
* verify that all required repository files are included;
* verify that the live demo works in an incognito/private browser window.

The final implementation should be tested immediately before submission, and all required links should be checked for accessibility.
