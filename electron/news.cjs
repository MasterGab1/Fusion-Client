const fs = require('node:fs/promises');
const path = require('node:path');
const FEED = 'https://launchercontent.mojang.com/v2/news.json';
function articleUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && ['minecraft.net', 'www.minecraft.net'].includes(url.hostname) && !url.username && !url.password && !url.port ? url.href : null; } catch { return null; }
}
function normalize(entries) {
  return entries.filter(e => e.newsType?.includes('Java') && articleUrl(e.readMoreLink)).map(e => {
    const image = new URL(e.newsPageImage?.url || e.playPageImage?.url || '/', FEED);
    return { id: String(e.id), title: String(e.title).slice(0, 180), summary: String(e.text || '').slice(0, 400), date: e.date, url: articleUrl(e.readMoreLink), image: image.origin === 'https://launchercontent.mojang.com' ? image.href : null, source: 'Minecraft' };
  }).filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e.date)).sort((a,b) => b.date.localeCompare(a.date)).slice(0, 18);
}
class NewsService {
  constructor(root) { this.file = path.join(root, 'news-cache.json'); }
  async get(refresh = false) {
    let cached;
    try { cached = JSON.parse(await fs.readFile(this.file, 'utf8')); } catch {}
    if (!refresh && cached && Date.now() - cached.fetchedAt < 30 * 60 * 1000) return { ...cached, cached: false };
    try {
      const response = await fetch(FEED, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      const result = { fetchedAt: Date.now(), entries: normalize(data.entries) };
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      await fs.writeFile(this.file, JSON.stringify(result));
      return { ...result, cached: false };
    } catch { return { ...(cached || { entries: [] }), cached: true, message: 'News could not refresh. Showing saved stories.' }; }
  }
}
module.exports = { NewsService, normalize, articleUrl };
