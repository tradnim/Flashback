import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [html, css] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
]);

test('the page uses the Flashback wordmark instead of the old case header and footer', () => {
  assert.match(html, /class="brand-logo"/);
  assert.match(html, /class="brand-logo-back"/);
  assert.doesNotMatch(html, /CHERNOBYL · APRIL 1986|EVENTS FOLLOW SIMULATION TIME|CASE FILE/);
});

test('the archival photo is used as a soft page background and credited', () => {
  assert.match(css, /02790061/);
  assert.match(css, /rgba\(245, 237, 224, 0\.68\)/);
  assert.match(html, /Photo: IAEA Imagebank/);
});

test('the clock panel stays compact when its mobile layout stacks vertically', () => {
  assert.match(css, /@media \(max-width: 1000px\)[\s\S]*?\.clock-copy\s*\{\s*flex:\s*0 1 auto;/);
});
