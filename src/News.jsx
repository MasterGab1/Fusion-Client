import React, { useEffect, useState } from 'react';
import { ArrowUpRight, RefreshCw, Newspaper } from 'lucide-react';
export function useNews() {
  const [news, setNews] = useState({ entries: [] }), [loading, setLoading] = useState(false);
  async function refresh(force = false) {
    setLoading(true);
    try { const result = await window.fusion.getNews(force); if (result.ok) setNews(result.value); }
    finally { setLoading(false); }
  }
  useEffect(() => { const timer = setTimeout(() => refresh(), 700); return () => clearTimeout(timer); }, []);
  return { news, loading, refresh };
}
export function NewsCards({ entries, open, compact = false }) {
  return <div className={`news-grid ${compact ? 'compact-news' : ''}`}>{entries.map(entry => <button className="news-card" key={entry.id} onClick={() => open(entry.url)}>
    <div className="news-image">{entry.image && <img src={entry.image} alt="" loading="lazy" onError={e => { e.currentTarget.style.visibility = 'hidden'; }}/>}<span className="news-source">{entry.source}</span><span className="news-arrow"><ArrowUpRight size={17}/></span></div>
    <div className="news-copy"><time>{new Date(`${entry.date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</time><h3>{entry.title}</h3>{!compact && <p>{entry.summary}</p>}</div>
  </button>)}</div>;
}
export default function News({ news, loading, refresh, open, accent = 'pink' }) {
  return <div className="news-page page-enter"><header className="page-heading"><div><span className="eyebrow">THE FEED</span><h1>News</h1></div><button className="secondary" disabled={loading} onClick={() => refresh(true)}><RefreshCw size={14} className={loading ? 'spin' : ''}/>Refresh</button></header>
    <section className="fusion-update-banner"><div><span className="eyebrow">FUSION · 0.9</span><h2>Launcher update</h2><p>Version shortcuts, Modrinth downloads, and the latest Minecraft stories.</p></div><img src={`./assets/branding/${accent}.png`} alt=""/></section>
    <div className="section-title"><h2>From Minecraft</h2><span>{news.cached ? 'Saved stories' : 'Official articles'}</span></div>
    {news.message && <p className="feed-status">{news.message}</p>}
    {news.entries.length ? <NewsCards entries={news.entries} open={open}/> : <div className="empty-state"><Newspaper size={30}/><h3>{loading ? 'Loading the news…' : 'News is unavailable'}</h3><p>Connect to the internet and refresh to load Minecraft articles.</p></div>}
  </div>;
}
