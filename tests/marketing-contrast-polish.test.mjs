import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const polish = read('src/app/marketing-polish.css');
const hero = read('src/app/marketing-hero-tuning.css');
const layout = read('src/app/layout.tsx');
const shell = read('src/components/marketing/site-shell.tsx');

const contrast = (foreground, background) => {
  const rgb = (hex) => hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16) / 255);
  const luminance = (hex) => {
    const [r, g, b] = rgb(hex).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

test('shared marketing polish is loaded and scoped to the public shell', () => {
  assert.match(layout, /import '\.\/marketing-polish\.css'/);
  assert.match(shell, /setu-marketing-shell/);
  assert.match(polish, /\.setu-marketing-shell/);
});

test('Setu Flow marketing palette meets readable contrast targets', () => {
  assert.ok(contrast('#0f172a', '#ffffff') >= 7, 'navy ink on white should exceed AAA normal-text contrast');
  assert.ok(contrast('#334155', '#ffffff') >= 7, 'body copy on white should exceed AAA normal-text contrast');
  assert.ok(contrast('#ffffff', '#061e34') >= 7, 'white on Setu navy should exceed AAA normal-text contrast');
  assert.ok(contrast('#ccfbf1', '#061e34') >= 7, 'teal highlight on Setu navy should exceed AAA normal-text contrast');
  assert.ok(contrast('#ffffff', '#0f766e') >= 4.5, 'white on primary teal should meet AA normal-text contrast');
});

test('marketing pages include keyboard focus, reduced motion and readable caption safeguards', () => {
  assert.match(polish, /:focus-visible/);
  assert.match(polish, /outline: 3px solid/);
  assert.match(polish, /prefers-reduced-motion/);
  assert.match(polish, /text-slate-400/);
  assert.match(polish, /text-\\\[10px\\\]/);
  assert.match(polish, /text-\\\[11px\\\]/);
});

test('public tabs share the polished shell while platform keeps its distinct product-tour surface', () => {
  for (const route of ['/solutions', '/setu-guru-ai', '/field-mobile', '/pricing', '/compare', '/trade-show-trial']) {
    assert.match(shell, new RegExp(route.replaceAll('/', '\\/')));
  }
  assert.doesNotMatch(shell.match(/const sharedHeroRoutes[\s\S]*?\]\);/)?.[0] ?? '', /'\/platform'/);
  assert.match(shell, /aria-current=\{active \? 'page'/);
});

test('styling no longer depends on homepage section order', () => {
  assert.doesNotMatch(hero, /nth-of-type/);
  assert.doesNotMatch(hero, /guru-avatar-128/);
});
