const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalize, articleUrl } = require('../electron/news.cjs');
test('news strips HTML payloads down to plain fields and only opens Minecraft articles', () => {
  const entry = { id: 'one', title: 'Update', text: 'News', date: '2026-10-14', readMoreLink: 'https://www.minecraft.net/article/example', newsType: ['Java'], newsPageImage: { url: '/v2/images/example.png' }, articleBody: '<script>bad()</script>' };
  const items = normalize([entry, { ...entry, readMoreLink: 'javascript:alert(1)' }, { ...entry, newsType: ['Bedrock'] }]);
  assert.equal(items.length, 1);
  assert.equal(items[0].image, 'https://launchercontent.mojang.com/v2/images/example.png');
  assert.equal(items[0].articleBody, undefined);
  assert.equal(articleUrl('https://minecraft.net.evil.test/article'), null);
  assert.equal(articleUrl('https://user@minecraft.net/article'), null);
});
