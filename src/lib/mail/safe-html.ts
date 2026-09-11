import sanitizeHtml from 'sanitize-html';

const MAIL_TAGS = ['p','br','strong','b','em','i','s','strike','ul','ol','li','blockquote','h1','h2','h3','pre','code','a','hr'];
const MAIL_ATTRS: sanitizeHtml.IOptions['allowedAttributes'] = { a: ['href','target','rel'] };

export function sanitizeMailHtml(value: unknown): string {
  const input = typeof value === 'string' ? value : '';
  if (!input.trim()) return '';
  return sanitizeHtml(input, {
    allowedTags: MAIL_TAGS,
    allowedAttributes: MAIL_ATTRS,
    allowedSchemes: ['http','https','mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }, true),
    },
  });
}

export function mailHtmlToText(value: unknown): string {
  const clean = sanitizeMailHtml(value);
  if (!clean) return '';
  return sanitizeHtml(clean
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|li|blockquote|pre)>/gi, '\n'), {
      allowedTags: [],
      allowedAttributes: {},
    })
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function plainTextToMailHtml(value: string): string {
  const escaped = String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  return `<p>${escaped.replace(/\r?\n/g, '<br>')}</p>`;
}
