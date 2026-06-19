/**
 * Dependency-free, XSS-safe minimal markdown -> HTML.
 * Escapes ALL HTML first, then applies a small, fixed set of formatting rules.
 * Intended for internal runbook/wiki content. Not a full markdown implementation.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderSafeMarkdown(input: string): string {
  const esc = escapeHtml(input ?? '');
  const lines = esc.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^### /.test(line)) { closeList(); out.push(`<h3>${inline(line.slice(4))}</h3>`); continue; }
    if (/^## /.test(line)) { closeList(); out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (/^# /.test(line)) { closeList(); out.push(`<h2>${inline(line.slice(2))}</h2>`); continue; }
    if (/^[-*] /.test(line)) { if (!inList) { out.push('<ul>'); inList = true; } out.push(`<li>${inline(line.slice(2))}</li>`); continue; }
    if (line.trim() === '') { closeList(); continue; }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

function inline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
