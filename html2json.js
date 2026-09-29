function convertHtml2JsonAndSet() {
  const htmlTextAreaValue = document.getElementById("html").value;
  const jsonObj = html2json(htmlTextAreaValue);
  const jsonArea = document.getElementById("json");
  jsonArea.value = JSON.stringify(jsonObj, null, 2);
  if (typeof updateCharCounts === "function") {
    updateCharCounts();
  }
}

function html2json(htmlText) {
  if (htmlText == null) {
    htmlText = "";
  } else if (typeof htmlText !== "string") {
    htmlText = String(htmlText);
  }

  const VOID_ELEMENTS = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);

  const documentNode = { type: "document", children: [] };
  const stack = [];
  let i = 0;
  const len = htmlText.length;
  let rawTextTag = null;

  function currentParent() {
    return stack.length > 0 ? stack[stack.length - 1] : documentNode;
  }

  function appendText(text) {
    if (text.trim() === "") {
      return;
    }
    const parent = currentParent();
    const last = parent.children[parent.children.length - 1];
    if (last && last.type === "text") {
      last.content += text;
      return;
    }
    parent.children.push({ type: "text", content: text });
  }

  function isMarkupStart(pos) {
    if (htmlText[pos] !== "<") {
      return false;
    }
    if (htmlText.startsWith("<!--", pos)) {
      return true;
    }
    if (/^<!\s*doctype/i.test(htmlText.slice(pos))) {
      return true;
    }

    const next = htmlText[pos + 1];
    if (next === "/") {
      let j = pos + 2;
      while (j < len && isWhitespace(htmlText[j])) {
        j++;
      }
      return isTagNameStart(htmlText[j]);
    }
    if (next === "!" || next === "?") {
      return true;
    }
    return isTagNameStart(next);
  }

  function appendComment(content) {
    currentParent().children.push({ type: "comment", content });
  }

  function appendDoctype(content) {
    currentParent().children.push({ type: "doctype", content });
  }

  function isWhitespace(ch) {
    return ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || ch === "\f";
  }

  function skipWhitespace() {
    while (i < len && isWhitespace(htmlText[i])) {
      i++;
    }
  }

  function isTagNameStart(ch) {
    return ch !== undefined && /[a-zA-Z]/.test(ch);
  }

  function isTagNameChar(ch) {
    return /[a-zA-Z0-9-]/.test(ch);
  }

  function readTagName() {
    if (!isTagNameStart(htmlText[i])) {
      return "";
    }
    const start = i;
    i++;
    while (i < len && isTagNameChar(htmlText[i])) {
      i++;
    }
    return htmlText.slice(start, i).toLowerCase();
  }

  function readAttributeName() {
    const start = i;
    while (i < len && /[^=\s/>]/.test(htmlText[i])) {
      i++;
    }
    if (start === i) {
      return "";
    }
    return htmlText.slice(start, i).toLowerCase();
  }

  function parseAttributes() {
    const attributes = {};

    while (i < len) {
      skipWhitespace();
      if (i >= len) {
        break;
      }
      if (htmlText[i] === ">" || htmlText[i] === "/") {
        break;
      }

      const name = readAttributeName();
      if (!name) {
        i++;
        continue;
      }

      skipWhitespace();
      if (htmlText[i] !== "=") {
        attributes[name] = true;
        continue;
      }

      i++;
      skipWhitespace();
      if (i >= len) {
        attributes[name] = true;
        break;
      }

      let value = "";
      const quote = htmlText[i];
      if (quote === '"' || quote === "'") {
        i++;
        const valueStart = i;
        while (i < len && htmlText[i] !== quote) {
          i++;
        }
        value = htmlText.slice(valueStart, i);
        if (i < len) {
          i++;
        }
      } else {
        const valueStart = i;
        while (i < len && !isWhitespace(htmlText[i]) && htmlText[i] !== ">") {
          if (htmlText[i] === "/" && htmlText[i + 1] === ">") {
            break;
          }
          i++;
        }
        value = htmlText.slice(valueStart, i);
      }

      attributes[name] = value;
    }

    return attributes;
  }

  function openElement(tag, attributes, selfClosing) {
    const node = {
      type: "element",
      tag,
      attributes,
      children: [],
    };
    currentParent().children.push(node);

    const isVoid = VOID_ELEMENTS.has(tag);
    if (isVoid || selfClosing) {
      return;
    }

    stack.push(node);
    if (tag === "script" || tag === "style") {
      rawTextTag = tag;
    }
  }

  function closeElement(tag) {
    let index = -1;
    for (let s = stack.length - 1; s >= 0; s--) {
      if (stack[s].tag === tag) {
        index = s;
        break;
      }
    }
    if (index === -1) {
      return;
    }
    stack.length = index;
    rawTextTag = null;
  }

  function parseOpenOrCloseTag() {
    i++;
    if (i >= len) {
      appendText("<");
      return;
    }

    if (htmlText[i] === "/") {
      i++;
      const tag = readTagName();
      if (!tag) {
        return;
      }
      while (i < len && htmlText[i] !== ">") {
        i++;
      }
      if (i < len) {
        i++;
      }
      closeElement(tag);
      return;
    }

    const tag = readTagName();
    if (!tag) {
      appendText("<");
      return;
    }

    const attributes = parseAttributes();
    let selfClosing = false;

    // HTML: a "/" only marks self-closing when it ends the tag (optional spaces before ">").
    // A "/" between attributes is ignored so parsing can continue.
    while (htmlText[i] === "/") {
      i++;
      skipWhitespace();
      if (i < len && htmlText[i] === ">") {
        selfClosing = true;
        break;
      }
      // Otherwise ignore the slash and keep reading attributes if any remain.
      if (i < len && htmlText[i] !== ">" && !isWhitespace(htmlText[i])) {
        Object.assign(attributes, parseAttributes());
      }
    }

    skipWhitespace();
    if (i < len && htmlText[i] === ">") {
      i++;
    }

    openElement(tag, attributes, selfClosing);
  }

  function parseComment() {
    i += 4;
    const start = i;
    while (i < len) {
      if (htmlText[i] === "-" && htmlText[i + 1] === "-" && htmlText[i + 2] === ">") {
        appendComment(htmlText.slice(start, i).trim());
        i += 3;
        return;
      }
      i++;
    }
    appendComment(htmlText.slice(start).trim());
  }

  function parseDoctype() {
    const markerMatch = htmlText.slice(i).match(/^<!\s*doctype/i);
    if (!markerMatch) {
      appendText("<");
      return;
    }
    i += markerMatch[0].length;
    skipWhitespace();
    const start = i;
    while (i < len && htmlText[i] !== ">") {
      i++;
    }
    const content = htmlText.slice(start, i).trim();
    if (i < len) {
      i++;
    }
    appendDoctype(content);
  }

  function consumeRawText() {
    const tag = rawTextTag;
    const start = i;

    while (i < len) {
      if (htmlText[i] === "<" && htmlText[i + 1] === "/") {
        let j = i + 2;
        while (j < len && isWhitespace(htmlText[j])) {
          j++;
        }
        if (!isTagNameStart(htmlText[j])) {
          i++;
          continue;
        }
        const nameStart = j;
        j++;
        while (j < len && isTagNameChar(htmlText[j])) {
          j++;
        }
        const closingName = htmlText.slice(nameStart, j).toLowerCase();
        while (j < len && isWhitespace(htmlText[j])) {
          j++;
        }
        if (closingName === tag && j < len && htmlText[j] === ">") {
          appendText(htmlText.slice(start, i));
          i = j + 1;
          closeElement(tag);
          return;
        }
      }
      i++;
    }

    appendText(htmlText.slice(start));
    rawTextTag = null;
  }

  while (i < len) {
    if (rawTextTag) {
      consumeRawText();
      continue;
    }

    const textStart = i;
    while (i < len) {
      if (htmlText[i] !== "<") {
        i++;
        continue;
      }
      if (isMarkupStart(i)) {
        break;
      }
      i++;
    }

    if (i > textStart) {
      appendText(htmlText.slice(textStart, i));
    }

    if (i >= len) {
      break;
    }

    if (htmlText.startsWith("<!--", i)) {
      parseComment();
      continue;
    }

    if (/^<!\s*doctype/i.test(htmlText.slice(i))) {
      parseDoctype();
      continue;
    }

    if (htmlText[i + 1] === "!" || htmlText[i + 1] === "?") {
      appendText("<");
      i++;
      continue;
    }

    parseOpenOrCloseTag();
  }

  return documentNode;
}
