import crypto from 'crypto';
import { config } from '../config';
import { DEFAULT_HEADERS, fetchWithTimeout, INTL_FETCH_OPTS } from '../lib/http';

export interface SearchResultItem {
  title: string;
  content?: string;
  source: string;
  sourceUrl?: string;
  metrics?: Record<string, number>;
  rank?: number;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function ua() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchJson(url: string, options: RequestInit = {}, timeoutMs = 20000, retries = 1): Promise<any> {
  const res = await fetchWithTimeout(url, options, timeoutMs, retries);
  return res.json();
}

async function fetchText(url: string, options: RequestInit = {}, timeoutMs = 20000, retries = 1): Promise<string> {
  const res = await fetchWithTimeout(url, options, timeoutMs, retries);
  return res.text();
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function parseRSSItems(xml: string): { title: string; link: string; description: string }[] {
  const items: { title: string; link: string; description: string }[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag: string) => {
      const m = block.match(
        new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i')
      );
      return (m?.[1] ?? '').trim();
    };
    const title = stripHtml(get('title'));
    if (title) {
      items.push({ title, link: get('link'), description: stripHtml(get('description')).slice(0, 300) });
    }
  }
  return items;
}

/** 搜狗网页搜索 — 国内可用，无需 API Key */
export async function searchSogou(query: string): Promise<SearchResultItem[]> {
  const html = await fetchText(
    `https://www.sogou.com/web?query=${encodeURIComponent(query)}&ie=utf-8`,
    {
      headers: {
        'User-Agent': ua(),
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      redirect: 'follow',
    }
  );

  const results: SearchResultItem[] = [];
  const blockRegex = /<div[^>]*class="[^"]*(?:vrwrap|rb)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  const linkRegex = /<h3[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i;
  const snippetRegex = /class="[^"]*(?:space-txt|str-text-info|str_info|text-layout)[^"]*"[^>]*>([\s\S]*?)<\//i;

  let blockMatch;
  while ((blockMatch = blockRegex.exec(html)) !== null && results.length < 20) {
    const block = blockMatch[0];
    const linkMatch = block.match(linkRegex);
    if (!linkMatch) continue;
    const title = stripHtml(linkMatch[2]);
    let url = linkMatch[1];
    if (url.startsWith('/')) url = `https://www.sogou.com${url}`;
    const snippetMatch = block.match(snippetRegex);
    const snippet = snippetMatch ? stripHtml(snippetMatch[1]) : title;
    if (title && !title.includes('大家还在搜')) {
      results.push({
        title,
        content: snippet,
        source: 'sogou',
        sourceUrl: url,
        metrics: { rank: results.length + 1 },
        rank: results.length + 1,
      });
    }
  }

  // fallback: simpler link extraction
  if (results.length === 0) {
    const simpleRegex = /<h3[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = simpleRegex.exec(html)) !== null && results.length < 15) {
      const title = stripHtml(m[2]);
      if (title.length < 4) continue;
      let url = m[1];
      if (url.startsWith('/')) url = `https://www.sogou.com${url}`;
      results.push({
        title,
        content: title,
        source: 'sogou',
        sourceUrl: url,
        metrics: { rank: results.length + 1 },
        rank: results.length + 1,
      });
    }
  }

  return results;
}

/** Bilibili 视频搜索 — 需 buvid3 cookie 防 412 */
export async function searchBilibili(query: string): Promise<SearchResultItem[]> {
  const buvid3 = `${crypto.randomUUID()}infoc`;
  const data = await fetchJson(
    `https://api.bilibili.com/x/web-interface/search/type?keyword=${encodeURIComponent(query)}&search_type=video&order=click&page=1&pagesize=20`,
    {
      headers: {
        'User-Agent': ua(),
        Referer: 'https://search.bilibili.com/',
        Accept: 'application/json',
        Cookie: `buvid3=${buvid3}`,
      },
    }
  );

  if (data?.code !== 0 || !data?.data?.result) return [];

  return (data.data.result as any[]).map((video, index) => ({
    title: stripHtml(video.title || ''),
    content: stripHtml(video.description || video.title || ''),
    source: 'bilibili',
    sourceUrl: `https://www.bilibili.com/video/${video.bvid}`,
    metrics: {
      views: video.play || 0,
      likes: video.like || 0,
      comments: video.review || 0,
      rank: index + 1,
    },
    rank: index + 1,
  }));
}

/** Bilibili 全站热门 — 无需关键词 */
export async function fetchBilibiliPopular(): Promise<SearchResultItem[]> {
  const data = await fetchJson(
    'https://api.bilibili.com/x/web-interface/popular?ps=20',
    {
      headers: {
        'User-Agent': ua(),
        Referer: 'https://www.bilibili.com/',
        Accept: 'application/json',
      },
    }
  );

  if (data?.code !== 0 || !data?.data?.list) return [];

  return (data.data.list as any[]).map((video, index) => ({
    title: video.title || '',
    content: video.desc || video.title,
    source: 'bilibili',
    sourceUrl: `https://www.bilibili.com/video/${video.bvid}`,
    metrics: {
      views: video.stat?.view || 0,
      likes: video.stat?.like || 0,
      rank: index + 1,
    },
    rank: index + 1,
  }));
}

/** 微博热搜 — 关键词匹配（无匹配时仍返回全部热搜供浏览） */
export async function searchWeiboHot(query: string, broadMatch = true): Promise<SearchResultItem[]> {
  const data = await fetchJson('https://weibo.com/ajax/side/hotSearch', {
    headers: {
      'User-Agent': ua(),
      Accept: 'application/json',
      Referer: 'https://weibo.com/',
    },
  });

  const items: any[] = data?.data?.realtime || [];
  const q = query.toLowerCase();
  const qParts = q.split(/\s+/).filter(Boolean);

  const matched = items.filter((item) => {
    const word = (item.note || item.word || '').toLowerCase();
    return qParts.some((p) => word.includes(p)) || word.includes(q);
  });

  const sourceList = matched.length > 0 ? matched : broadMatch ? items.slice(0, 20) : [];

  return sourceList.map((item, index) => {
    const title = item.note || item.word || '';
    return {
      title,
      content: `微博热搜 #${title}#`,
      source: 'weibo',
      sourceUrl: `https://s.weibo.com/weibo?q=${encodeURIComponent('#' + title + '#')}`,
      metrics: { hotValue: Number(item.num) || 0, rank: index + 1 },
      rank: index + 1,
    };
  });
}

/** Google News RSS — 按关键词（需 VPN/代理时可设 HTTPS_PROXY） */
export async function searchGoogleNews(query: string): Promise<SearchResultItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
  const xml = await fetchText(
    url,
    {
      headers: {
        ...DEFAULT_HEADERS,
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    },
    INTL_FETCH_OPTS.timeoutMs,
    INTL_FETCH_OPTS.retries
  );
  return parseRSSItems(xml).slice(0, 20).map((item, index) => ({
    title: item.title,
    content: item.description,
    source: 'gnews_search',
    sourceUrl: item.link,
    metrics: { rank: index + 1 },
    rank: index + 1,
  }));
}

/** Twitter 高级搜索 — 需 twitterapi.io key */
export async function searchTwitter(query: string): Promise<SearchResultItem[]> {
  const apiKey = config.twitter.bearerToken;
  if (!apiKey) return [];

  const data = await fetchJson(
    `https://api.twitterapi.io/twitter/tweet/advanced_search?query=${encodeURIComponent(query)}&queryType=Top`,
    {
      headers: {
        'User-Agent': ua(),
        'X-API-Key': apiKey,
        Accept: 'application/json',
      },
    }
  );

  const tweets: any[] = data?.tweets || data?.data || [];
  return tweets.slice(0, 15).map((t, index) => ({
    title: (t.text || t.full_text || '').slice(0, 200),
    content: t.text || t.full_text,
    source: 'twitter',
    sourceUrl: t.url || `https://x.com/i/web/status/${t.id || t.id_str}`,
    metrics: {
      likes: t.favorite_count || t.likeCount || 0,
      retweets: t.retweet_count || t.retweetCount || 0,
      rank: index + 1,
    },
    rank: index + 1,
  }));
}

/** DEV.to 标签搜索 */
export async function searchDevto(query: string): Promise<SearchResultItem[]> {
  const data = await fetchJson(
    `https://dev.to/api/articles?tag=${encodeURIComponent(query)}&per_page=15`,
    { headers: { Accept: 'application/json' } },
    15000
  );
  if (!Array.isArray(data)) return [];
  return data.map((item: any, index) => ({
    title: item.title,
    content: item.description,
    source: 'devto',
    sourceUrl: item.url,
    metrics: { reactions: item.public_reactions_count || 0, rank: index + 1 },
    rank: index + 1,
  }));
}

export type SearchSourceStatus = {
  source: string;
  ok: boolean;
  count: number;
  error?: string;
  latencyMs: number;
};

/** 并行搜索所有平台 — 先拓宽采集，不做严格过滤 */
export async function searchAllPlatforms(
  query: string,
  sources?: string[]
): Promise<{ results: SearchResultItem[]; statuses: SearchSourceStatus[] }> {
  const allSources: Record<string, () => Promise<SearchResultItem[]>> = {
    sogou: () => searchSogou(query),
    bilibili: () => searchBilibili(query),
    weibo: () => searchWeiboHot(query, false),
    gnews_search: () => searchGoogleNews(query),
    twitter: () => searchTwitter(query).catch(() => []),
    devto: () => searchDevto(query).catch(() => []),
  };

  const selected = sources?.length
    ? sources.filter((s) => allSources[s])
    : Object.keys(allSources);

  const statuses: SearchSourceStatus[] = [];
  const results: SearchResultItem[] = [];

  await Promise.all(
    selected.map(async (source) => {
      const start = Date.now();
      try {
        const items = await allSources[source]();
        statuses.push({ source, ok: items.length > 0, count: items.length, latencyMs: Date.now() - start });
        results.push(...items);
      } catch (err: any) {
        statuses.push({
          source,
          ok: false,
          count: 0,
          error: err.message,
          latencyMs: Date.now() - start,
        });
      }
    })
  );

  return { results, statuses };
}
