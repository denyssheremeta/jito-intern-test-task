# HTML to JSON parser implementation

## User

We need to implement the HTML → JSON parser for this repository.

Before making any changes, inspect the repository, especially:

* README.md
* html2json.js
* index.html

Do not change the agreed JSON contract or invent a different architecture.

## Goal

Implement `html2json(htmlText)` in `html2json.js`.

The parser must convert an HTML string into a JSON tree without using browser DOM APIs or any external HTML parser.

Do NOT use:

* DOMParser
* document.createElement
* innerHTML
* querySelector
* browser DOM traversal
* external HTML parsing libraries

The implementation should be a custom scanner/tokenizer + stack-based tree builder.

---

# 1. JSON CONTRACT

There are exactly five node types.

## Document

```js
{
  type: "document",
  children: []
}
```

The result of `html2json()` must always be a document node.

## Element

```js
{
  type: "element",
  tag: "div",
  attributes: {},
  children: []
}
```

Rules:

* `tag` is a string.
* `attributes` is always an object.
* `children` is always an array.
* Even elements without attributes must have `attributes: {}`.
* Even void/self-closing elements must have `children: []`.

## Text

```js
{
  type: "text",
  content: "Hello world"
}
```

## Comment

```js
{
  type: "comment",
  content: "comment text"
}
```

## Doctype

```js
{
  type: "doctype",
  content: "html"
}
```

---

# 2. GENERAL ARCHITECTURE

Use two conceptual layers:

1. Scanner/tokenizer
2. Tree builder

The scanner reads the input from left to right and identifies tokens.

The tree builder consumes those tokens and builds the JSON tree using a stack.

Conceptually:

HTML string
→ scanner/tokenizer
→ tokens
→ tree builder + stack
→ document JSON tree

Keep the implementation simple and readable. Do not try to implement the complete HTML5 parsing specification.

---

# 3. TOKEN TYPES

The tokenizer should conceptually support:

* TEXT
* OPEN_TAG
* CLOSE_TAG
* SELF_CLOSING_TAG
* COMMENT
* DOCTYPE

A token should contain only the information necessary for the tree builder.

For example, an opening tag should provide:

* tag name
* parsed attributes
* whether it is self-closing

Do not over-engineer the token representation.

---

# 4. PARSER STATES

Use a simple state-based approach.

At minimum distinguish:

* DATA
* TAG
* RAW_TEXT

DATA:

* normal text content
* when `<` is encountered, determine whether this starts a tag, closing tag, comment, or doctype.

TAG:

* parse opening/closing tag syntax and attributes.

RAW_TEXT:

* used for `<script>` and `<style>`.
* Their contents must NOT be parsed as HTML tags.
* For example:

```html
<script>
  const x = "<div>";
</script>
```

The `<div>` inside the script must remain text.

The same applies to CSS inside `<style>`.

We are NOT parsing JavaScript or CSS. We only preserve their content as text.

---

# 5. STACK

Use a stack of currently open element nodes.

Rule:

A newly created node is appended to the current parent:

* stack top if stack is not empty
* document if stack is empty

For a normal opening element:

1. create the element node
2. append it to the current parent
3. push it onto the stack

For a closing tag:

1. find the matching open element in the stack
2. close it by removing it and any unmatched elements above it from the stack
3. continue parsing

Do not use recursive parsing for nested elements. Prefer an iterative parser with an explicit stack.

---

# 6. VOID ELEMENTS

Treat these as void elements:

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

For a void element:

1. create the element
2. append it to the current parent
3. DO NOT push it onto the stack

Example:

```html
<div>
  <img src="photo.jpg">
  <p>Hello</p>
</div>
```

`img` must not remain on the stack, otherwise `p` would incorrectly become a child of `img`.

Void status is determined by tag name, not by the presence of `/`.

---

# 7. SELF-CLOSING ELEMENTS

For:

```html
<div />
```

create the element and append it, but do not push it onto the stack.

For:

```html
<img src="photo.jpg" />
```

do the same.

`/>` does not introduce a new node type.

---

# 8. CLOSING TAGS AND MALFORMED HTML

The parser must NEVER throw just because the HTML is malformed.

For a normal matching closing tag:

```html
<div>
  <p>Hello</p>
</div>
```

the stack should behave normally.

For mismatched nesting:

```html
<div>
  <section>
    <p>Hello</div>
```

when `</div>` is encountered, find `div` in the stack and close/pop everything above it as implicit recovery.

For an unmatched closing tag:

```html
<div>Hello</span>
```

if `span` does not exist in the stack, ignore the closing tag and continue parsing.

For unclosed elements at end-of-input:

```html
<div>
  <section>
    <p>Hello
```

do not throw and do not invent closing tags. Keep the already constructed tree.

Do NOT attempt to fully emulate browser HTML error recovery.

---

# 9. COMMENTS

Parse:

```html
<!-- hello -->
```

as:

```js
{
  type: "comment",
  content: "hello"
}
```

Comments:

* are appended to the current parent
* are never pushed onto the stack

---

# 10. DOCTYPE

Parse:

```html
<!DOCTYPE html>
```

as:

```js
{
  type: "doctype",
  content: "html"
}
```

Do not attempt to implement full DOCTYPE parsing with public/system identifiers.

The doctype is appended to the current parent, normally the document, and is never pushed onto the stack.

---

# 11. ATTRIBUTES

Attributes must be represented as:

```js
{
  class: "container",
  id: "main",
  "data-id": "123"
}
```

Support:

* double-quoted values
* single-quoted values
* unquoted values where valid/simple parsing allows them
* boolean attributes

Example:

```html
<input disabled>
```

must produce:

```js
attributes: {
  disabled: true
}
```

Important:

```html
<input disabled="false">
```

must produce:

```js
attributes: {
  disabled: "false"
}
```

The string `"false"` is NOT boolean false.

Do not attempt CSS parsing for:

```html
style="color: red"
```

Just preserve it as an attribute string.

---

# 12. WHITESPACE RULE

Use this exact rule.

For every text segment:

```js
text.trim() === ""
```

means it is whitespace-only.

Whitespace-only text nodes should be ignored.

If:

```js
text.trim() !== ""
```

preserve the ORIGINAL text exactly.

Do not replace it with `text.trim()`.

Example:

```html
<p>Hello <strong>world</strong> !</p>
```

must preserve:

```text
"Hello "
"world"
" !"
```

But formatting whitespace such as:

```html
<div>
  <p>Hello</p>
  <p>World</p>
</div>
```

should not create separate whitespace-only text nodes.

This is a parsing decision, not HTML/CSS rendering logic.

---

# 13. SCRIPT AND STYLE

`script` and `style` are normal element nodes.

Example:

```html
<style>
  .foo::before {
    content: "<hello>";
  }
</style>
```

must preserve the content as a text node.

Do NOT parse CSS.

Example:

```html
<script>
  const x = "<div>";
</script>
```

must preserve `<div>` as text and must NOT create a `div` element.

The RAW_TEXT state should continue until the matching closing `</script>` or `</style>`.

---

# 14. CASE

HTML tag names should be normalized consistently.

Use lowercase tag names:

```html
<DIV>
```

becomes:

```js
tag: "div"
```

Closing tag matching should therefore be case-insensitive.

Attribute names should also be normalized consistently to lowercase.

Do not change attribute values.

---

# 15. EMPTY INPUT

For:

```text
""
```

return:

```js
{
  type: "document",
  children: []
}
```

The function should also safely handle whitespace-only input.

---

# 16. ERROR HANDLING / ROBUSTNESS

The parser must not crash on malformed or unexpected HTML.

Consider at least:

* empty input
* whitespace-only input
* nested elements
* repeated sibling elements
* missing closing tags
* mismatched closing tags
* unmatched closing tags
* void elements
* self-closing elements
* comments
* doctype
* attributes with spaces
* quoted `>` inside attributes
* `<` inside text where possible
* script/style content
* deeply nested structures
* large input

Avoid unnecessary recursion so deeply nested HTML does not cause a JavaScript call-stack overflow.

---

# 17. IMPORTANT SCOPE LIMITS

Do NOT add features that were not agreed upon.

Specifically:

* no DOM APIs
* no external HTML parser
* no CSS parser
* no JavaScript parser
* no browser-style rendering logic
* no computed styles
* no CSS selector matching
* no entity decoding unless already required by the existing repository
* no unnecessary dependencies

Preserve the existing project setup.

---

# 18. TESTING

Before considering the implementation complete, create a meaningful set of HTML samples covering:

1. basic element
2. nested elements
3. multiple sibling elements
4. repeated tags
5. text mixed with elements
6. attributes
7. boolean attributes
8. void elements
9. self-closing elements
10. comments
11. doctype
12. script
13. style
14. malformed nesting
15. missing closing tags
16. unmatched closing tags
17. whitespace
18. deeply nested HTML
19. empty input
20. larger HTML input

The repository README asks for HTML samples, so keep the test samples organized in the expected `html_samples/` directory if that directory does not already exist.

Do not only test the happy path.

---

# 19. BEFORE FINISHING

Review the implementation against the contract above.

In particular verify:

* every element has `type`, `tag`, `attributes`, `children`
* document always exists as root
* child ordering is preserved
* repeated tags are preserved
* text whitespace inside meaningful text is preserved
* indentation-only text is ignored
* void elements are never pushed onto the stack
* self-closing elements are never pushed onto the stack
* comments are preserved
* doctype is preserved
* script/style content is not parsed as HTML
* malformed HTML never causes an exception
* no DOM API is used
* no external HTML parser is used

Do not rewrite the contract.

First inspect the existing code and repository structure, then implement the smallest clean solution that satisfies these requirements.
After implementation, run the available tests or create/run appropriate tests and report any remaining edge cases.

## Assistant

Inspecting the repository structure and key files before implementing the parser.

### Tool Read File V2

```
{"path":"c:\\projects\\jito-intern-test-task\\README.md"}
```

### Tool Read File V2

```
{"path":"c:\\projects\\jito-intern-test-task\\html2json.js"}
```

### Tool Read File V2

```
{"path":"c:\\projects\\jito-intern-test-task\\index.html"}
```

### Tool Glob File Search

```
{"targetDirectory":"c:\\projects\\jito-intern-test-task","globPattern":"**/*"}
```

### Tool Ripgrep Raw Search

```
{"pattern":"html2json|test","path":"c:\\projects\\jito-intern-test-task","caseInsensitive":false,"multiline":false,"toolCallId":"tool_3ee63501-cd2a-4ead-b3ff-113a3192e27","offset":0}
```

## Assistant

Implementing the scanner and stack-based tree builder, then adding HTML samples and a Node test runner.

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Run Terminal Command V2

### Tool Run Terminal Command V2

## Assistant

Trimming comment content to match the spec example.

### Tool Edit File V2

### Tool Run Terminal Command V2

## Assistant

## Implementation

`html2json(htmlText)` in `html2json.js` is a **custom scanner + stack-based tree builder** (no DOM APIs):

1. **DATA** — read text until `<`; skip whitespace-only text nodes; handle `<!--`, `<!DOCTYPE`, open/close tags, or treat lone `<` as text when it is not a markup start.
2. **TAG** — parse tag names (lowercase), attributes (quoted, unquoted, boolean `true`), void elements, and `/>` self-closing.
3. **RAW_TEXT** — for open `script` / `style` on the stack, read until a matching `</script>` or `</style>` (case-insensitive) without parsing inner markup.

**Stack behavior:** new nodes attach to the stack top or the document root; void and self-closing tags are not pushed; closing tags pop from the matching frame upward (mismatch recovery) or are ignored if unmatched.

## Tests

- Added `test-parser.js` (Node/vm) with contract checks.
- Added 20 files under `html_samples/` per the README.

**Result:** `50 passed, 0 failed`

## Notes

- **Comments:** inner text is **trimmed** so `<!-- hello -->` → `content: "hello"` (matches the spec example).
- **Entities:** not decoded (`&copy;` stays literal in text).
- **Only `script` / `style`** use RAW_TEXT; other elements (e.g. `textarea`) still parse nested markup, per your spec.
- **`test-parser.js`** is a local runner only; deliverables remain `html2json.js`, `html_samples/`, and `index.html`.

Use **Convert to JSON** in `index.html` to try the parser in the browser. I can add `ai_help/chatgpt_chat.txt` or wire `showExample1/2` to real `html2json` output if you want that for submission.

## User

Improve the UI and overall appearance of the index page.

Also, add a dropdown for quickly selecting predefined examples from the /html_samples folder. Its data (options) should be populated automatically based on the contents of the /html_samples folder. Only .html and .txt files should be included.

Also, add several more complex pages instead of simple examples. For example, include inline styles, scripts, complex attributes, and other more challenging HTML structures.

## Assistant

Reviewing the current page and samples, then implementing UI improvements, a manifest-driven samples dropdown, and richer HTML examples.

### Tool Read File V2

```
{"path":"c:\\projects\\jito-intern-test-task\\index.html"}
```

### Tool Glob File Search

```
{"targetDirectory":"c:\\projects\\jito-intern-test-task\\html_samples","globPattern":"**/*"}
```

### Tool Read File V2

```
{"path":"c:\\projects\\jito-intern-test-task\\html2json.js","limit":30}
```

### Tool Glob File Search

```
{"targetDirectory":"c:\\projects\\jito-intern-test-task\\html_samples","globPattern":"*"}
```

### Tool Read File V2

```
{"path":"c:\\projects\\jito-intern-test-task\\html2json.js","offset":300}
```

## Assistant

Implementing a manifest builder, refreshed UI, sample loader, and complex HTML samples.

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

## Assistant

Fixing JSON output to use textarea `.value` and updating the test runner to regenerate the manifest.

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Run Terminal Command V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Run Terminal Command V2

## Assistant

## UI refresh (`index.html`)

- Dark theme with DM Sans + JetBrains Mono, gradient background, card-style panes
- Toolbar: **Convert**, **Copy JSON**, **Clear**, character counts, status line
- **Ctrl+Enter** shortcut to convert
- JSON panel is a read-only textarea (easier to select/copy)

## Sample dropdown (`app.js` + `html_samples/manifest.json`)

Browsers can’t list a folder on disk, so options come from **`html_samples/manifest.json`**, built by scanning the folder:

```bash
node build-samples-manifest.js
```

- Includes only **`.html`** and **`.txt`** files (sorted naturally)
- On load, the page fetches the manifest and fills the dropdown
- Choosing a sample loads the file and runs conversion automatically

`test-parser.js` regenerates the manifest before tests so it stays in sync.

**Note:** `fetch` needs HTTP — open via [GitHub Pages](https://jito-dev.github.io/jito-intern-test-task/) or a local server (`npx serve .`). Opening `index.html` as `file://` will show a manifest load error in the status bar.

## New complex samples (21–26)

| File | Focus |
|------|--------|
| `21_saas_landing_inline.html` | Full landing page, inline styles, SVG, data/ARIA attrs, inline script |
| `22_admin_dashboard.html` | Grid, tables, forms, mixed void inputs, JSON script block |
| `23_complex_form.html` | Many input types, boolean/required, quoted JSON in attributes |
| `24_blog_article_mixed.html` | Schema.org, `<script>`/`<style>` blocks, `<details>`, `srcset` |
| `25_attribute_stress.html` | Quoted `>`, unquoted URLs, boolean + `disabled="false"`, SVG |
| `26_messy_recovery.html` | Case mix, unquoted attrs, malformed nesting, recovery stress |

Legacy **Example 1 / 2** buttons were removed; those pages are covered by samples like `20_larger_page.html` and the new complex files.

**56 tests passing** including all sample files. After adding samples, run `node build-samples-manifest.js` once (or run `test-parser.js`).

## User

I see you added tests — great! But I didn’t ask you to add tests yet.

## Assistant

Removing the test runner you didn't ask for and checking for references to it.

### Tool Ripgrep Raw Search

```
{"pattern":"test-parser","path":"c:\\projects\\jito-intern-test-task","caseInsensitive":false,"multiline":false,"toolCallId":"tool_e8c3803e-16b5-42c7-8302-61a2db4ec38","offset":0}
```

### Tool Delete File

```
{"path":"c:\\projects\\jito-intern-test-task\\test-parser.js","toolCallId":"tool_6def0fc7-2ff3-4b5a-9cc4-5e9168d090b"}
```

## Assistant

You're right — I added `test-parser.js` on my own when you hadn't asked for automated tests yet. I've removed that file.

What's still in place:

- **`html_samples/`** — sample HTML from the README deliverables, plus the newer complex pages
- **`build-samples-manifest.js`** — builds the dropdown manifest from that folder (not a test suite)

When you want tests, say how you'd like them set up (e.g. plain Node script, browser-only checks, or something else) and we can add them then.

## User

<div><section><p>lsdjf lkdsf ds<<< </div>
Why am I getting an incorrect result with this input?
{
  "type": "document",
  "children": [
    {
      "type": "element",
      "tag": "div",
      "attributes": {},
      "children": [
        {
          "type": "element",
          "tag": "section",
          "attributes": {},
          "children": [
            {
              "type": "element",
              "tag": "p",
              "attributes": {},
              "children": [
                {
                  "type": "text",
                  "content": "lsdjf lkdsf ds"
                },
                {
                  "type": "text",
                  "content": "<"
                },
                {
                  "type": "text",
                  "content": "<"
                },
                {
                  "type": "text",
                  "content": "<"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

## Assistant

Tracing parser behavior for consecutive `<` characters and fixing it.

### Tool Read File V2

```
{"path":"c:\\projects\\jito-intern-test-task\\html2json.js","offset":40,"limit":100}
```

### Tool Read File V2

```
{"path":"c:\\projects\\jito-intern-test-task\\html2json.js","offset":175,"limit":50}
```

## Assistant

Invalid `<` characters are handled one at a time in the tag parser, which splits `<<<` into three text nodes. Fixing the DATA state to treat runs of non-markup `<` as literal text.

### Tool Read File V2

```
{"path":"c:\\projects\\jito-intern-test-task\\html2json.js","offset":285,"limit":55}
```

### Tool Edit File V2

### Tool Edit File V2

### Tool Run Terminal Command V2

## Assistant

## Why it happened

The parser treated **every `<` as the start of markup**. In DATA mode it stopped at the first `<`, tried to parse a tag, saw no tag name (the next character was another `<`), emitted a **one-character** text node `"<"`, and repeated for each `<`.

So `lsdjf lkdsf ds<<< ` became:

1. `"lsdjf lkdsf ds"`
2. `"<"` × 3

The trailing space was also dropped on its own, because a whitespace-only segment is ignored by the whitespace rule.

That behavior is reasonable for a single mistaken `<`, but wrong for a run like `<<<` before real markup such as `</div>`.

## Fix

DATA mode now keeps reading **literal** `<` characters until something that actually looks like markup (open/close tag, comment, doctype). Those characters stay in **one** text node.

For your input you should now get:

```json
"content": "lsdjf lkdsf ds<<< "
```

Reload and run **Convert** again to pick up the change. If you still see three `"<"` nodes, hard-refresh so the browser isn’t using a cached `html2json.js`.

## User

Why is type: "document" being added to the JSON even when there is no corresponding wrapper?

## Assistant

The **`document` node is not copied from your HTML**. There is no requirement for a `<html>` wrapper (or any “document” element) in the input.

It comes from the **JSON contract** for this project: `html2json()` must **always** return a single root node shaped like this:

```js
{
  type: "document",
  children: []
}
```

Everything parsed from the string goes in **`children`**. So for a fragment such as `<div><p>Hi</p></div>`, you get:

```json
{
  "type": "document",
  "children": [
    { "type": "element", "tag": "div", ... }
  ]
}
```

That root is a **synthetic tree root**, similar to a DOM `#document` node: one stable place to hang nodes whether the input is a full page (`<!DOCTYPE html><html>…`) or a snippet. It is **not** the same as an HTML `<html>` element; if the input includes `<html>`, that appears as a normal **`element`** under `document`, not as `type: "document"`.

If you wanted the root to be the first element (or only elements with no wrapper), that would be a **different contract** and would need an agreed change to the spec and the parser. Under the current rules, `type: "document"` on every result is intentional.

## User

Test for edge cases and possible improvements

## Assistant

I'll probe the parser with edge-case inputs, then summarize failures and concrete improvements.

### Tool Read File V2

```
{"path":"c:\\projects\\jito-intern-test-task\\html2json.js"}
```

### Tool Get Mcp Tools

```
{"server":"cursor","toolName":"TodoWrite","toolCallId":"call-422b7262-9b54-4e0f-aa68-48ec0fea3e22-63\nfc_e5ab9adf-09d0-9799-8c8f-084ee9eba646_1"}
```

### Tool Run Terminal Command V2

### Tool Edit File V2

### Tool Run Terminal Command V2

## Assistant

Found several real bugs. Fixing the clear ones: tag names must start with a letter, and `/` self-closing handling.

### Tool Run Terminal Command V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Read File V2

```
{"path":"c:\\projects\\jito-intern-test-task\\html2json.js","offset":58,"limit":100}
```

### Tool Read File V2

```
{"path":"c:\\projects\\jito-intern-test-task\\html2json.js","offset":220,"limit":60}
```

### Tool Edit File V2

### Tool Edit File V2

### Tool Run Terminal Command V2

### Tool Run Terminal Command V2

## Assistant

Ran **81 edge cases** against the parser: **0 crashes**, contract always held. Several real bugs showed up; three were fixed.

## Bugs fixed

1. **`<` followed by a digit** — `<p>1<2</p>` was parsed as a fake `<2>` element because tag names could start with `0-9`. Tag names now must start with a letter → text `"1<2"`.

2. **Self-closing with spaces** — `<div / >` left `" >"` as leftover text. Whitespace after `/` is now allowed before `>`.

3. **`/` between attributes** — `<img src=x / alt=y>` treated `/` as self-closing and dumped `alt=y>` into text. `/` only self-closes when it ends the tag; otherwise it is ignored and attributes continue → `src` + `alt` both kept.

## Still OK / intentional

| Case | Behavior |
|------|----------|
| `<<<` / `a < b` / `3 > 2` | Literal text |
| Malformed nesting / unmatched closes | Recover without throw |
| Deep nesting (500) | No stack overflow |
| `script` / `style` raw text | Inner tags stay text |
| Boolean `disabled` vs `disabled="false"` | `true` vs `"false"` |
| Entities (`&nbsp;`) | Left as literal (per scope) |
| `"</script>"` inside a script string | Closes the script (same as browsers) |

## Remaining limitations (optional later)

- **Unclosed quotes** — `<div class="oops>…` swallows until EOF into the attribute.
- **Namespaced tags** — `<svg:path>` → tag `svg` + boolean `:path` (`:` not in tag names).
- **`textarea` / `title`** — not RAW_TEXT; inner `<div>` becomes an element (only `script`/`style` are raw per contract).
- **Incomplete tags at EOF** — `<di` / `<div class="x"` still create elements; bare `</div` with no `>` is consumed with no node.
- **Duplicate attributes** — last value wins.
- **Comments** — content is trimmed (`<!-- hello -->` → `"hello"`).

Nothing else looked broken relative to the agreed contract. I can harden unclosed-quote recovery or add `textarea` RAW_TEXT if you want those next.