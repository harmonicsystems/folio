/**
 * Caret utilities for the plain-text page editor. Offsets are character
 * positions into the serialized text, where every <br> counts as one '\n' —
 * the same walk `serializeEditable` uses, so offsets round-trip exactly.
 */

export function serializeEditable(root: HTMLElement): string {
  let out = '';
  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += (node as Text).data;
      return;
    }
    if (node.nodeName === 'BR') {
      out += '\n';
      return;
    }
    node.childNodes.forEach(walk);
  };
  root.childNodes.forEach(walk);
  return out;
}

/** Caret offset into the serialized text, or null when selection is outside. */
export function getCaretOffset(root: HTMLElement): number | null {
  const sel = root.ownerDocument.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;

  let offset = 0;
  let found = false;
  const walk = (node: Node): void => {
    if (found) return;
    if (node === range.startContainer) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += range.startOffset;
      } else {
        // Element container: startOffset counts child nodes — walk them.
        for (let i = 0; i < range.startOffset; i++) {
          const child = node.childNodes[i];
          if (child) walk(child);
        }
      }
      found = true;
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      offset += (node as Text).data.length;
      return;
    }
    if (node.nodeName === 'BR') {
      offset += 1;
      return;
    }
    for (const child of node.childNodes) {
      walk(child);
      if (found) return;
    }
  };
  walk(root);
  return found ? offset : null;
}

/** Place the caret at a character offset (clamped to the text length). */
export function setCaretOffset(root: HTMLElement, offset: number): void {
  const doc = root.ownerDocument;
  const sel = doc.getSelection();
  if (!sel) return;

  let remaining = Math.max(0, offset);
  let target: { node: Node; offset: number } | null = null;
  const walk = (node: Node): void => {
    if (target) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node as Text).data.length;
      if (remaining <= len) {
        target = { node, offset: remaining };
        return;
      }
      remaining -= len;
      return;
    }
    if (node.nodeName === 'BR') {
      if (remaining === 0) {
        const parent = node.parentNode;
        if (parent) {
          const i = Array.prototype.indexOf.call(parent.childNodes, node);
          target = { node: parent, offset: i };
        }
        return;
      }
      remaining -= 1;
      return;
    }
    for (const child of node.childNodes) {
      walk(child);
      if (target) return;
    }
  };
  walk(root);

  const range = doc.createRange();
  if (target === null) {
    range.selectNodeContents(root);
    range.collapse(false);
  } else {
    const t: { node: Node; offset: number } = target;
    range.setStart(t.node, t.offset);
    range.collapse(true);
  }
  sel.removeAllRanges();
  sel.addRange(range);
}
