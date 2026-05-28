import crypto from 'crypto';
import prisma from '../lib/prisma';
import { config } from '../config';
import { autoClassify } from '../lib/classify';
import { notifyTopicsUpdated } from '../socket';
import {
  DEFAULT_HEADERS,
  fetchWithTimeout,
  INTL_FETCH_OPTS,
  REDDIT_USER_AGENT,
} from '../lib/http';

/** Parse simple RSS 2.0 XML without external dependencies */
function parseRSSItems(
  xml: string
): { title: string; link: string; description: string }[] {
  const items: { title: string; link: string; description: string }[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag: string) => {
      const m = block.match(
        new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`)
      );
      return (m?.[1] ?? '').trim().replace(/&amp;/g, '&').replace(/<[^>]+>/g, '');
    };
    const title = get('title');
    if (title) {
      items.push({ title, link: get('link'), description: get('description').slice(0, 300) });
    }
  }
  return items;
}

interface ParsedHotTopic {
  title: string;
  content?: string;
  source: string;
  sourceUrl?: string;
  category?: string;
  metrics: Record<string, number>;
  rank?: number;
  hash?: string;
}

abstract class BaseScraper {
  abstract sourceName: string;
  abstract fetchInterval: number;

  abstract fetchData(): Promise<any[]>;
  abstract parseData(raw: any[]): ParsedHotTopic[];

  generateHash(title: string, source: string): string {
    return crypto.createHash('md5').update(`${title}_${source}`).digest('hex');
  }

  async run(): Promise<number> {
    try {
      console.log(`[SCRAPER] Fetching ${this.sourceName}...`);
      const rawData = await this.fetchData();

      if (!rawData || rawData.length === 0) {
        console.log(`[SCRAPER] ${this.sourceName} returned no data`);
        return 0;
      }

      const parsed = this.parseData(rawData);
      if (parsed.length === 0) return 0;

      // Enrich with hash + category
      for (const topic of parsed) {
        topic.hash = this.generateHash(topic.title, topic.source);
        topic.category = autoClassify(topic.title, topic.source, topic.category);
      }

      // Batch check existing hashes — 1 query instead of N
      const hashes = parsed.map((t) => t.hash as string);
      const existing = await prisma.hotTopic.findMany({
        where: { hash: { in: hashes } },
        select: { hash: true },
      });
      const existingSet = new Set(existing.map((e) => e.hash));

      const newTopics = parsed.filter((t) => !existingSet.has(t.hash as string));

      if (newTopics.length === 0) {
        console.log(`[SCRAPER] ${this.sourceName} done: 0 new, ${parsed.length} total`);
        return 0;
      }

      // Batch insert new topics — 1 query instead of N
      await prisma.hotTopic.createMany({
        data: newTopics.map((topic) => ({
          title: topic.title,
          content: topic.content,
          source: topic.source,
          sourceUrl: topic.sourceUrl,
          category: topic.category,
          metrics: JSON.stringify(topic.metrics),
          rank: topic.rank,
          hash: topic.hash as string,
        })),
      });

      const savedCount = newTopics.length;
      console.log(`[SCRAPER] ${this.sourceName} done: ${savedCount} new, ${parsed.length} total`);

      if (savedCount > 0) {
        notifyTopicsUpdated(this.sourceName, savedCount);
      }

      return savedCount;
    } catch (error) {
      console.error(`[SCRAPER] ${this.sourceName} failed:`, error);
      return 0;
    }
  }
}

// ─── Chinese Platforms ────────────────────────────────────────────────────────

class BaiduScraper extends BaseScraper {
  sourceName = 'baidu';
  fetchInterval = config.scraper.intervals.baidu;

  async fetchData(): Promise<any[]> {
    const response = await fetchWithTimeout(
      'https://top.baidu.com/api/board?tab=realtime',
      { headers: DEFAULT_HEADERS }
    );
    const data = await response.json() as any;
    return data?.data?.cards?.[0]?.content || [];
  }

  parseData(raw: any[]): ParsedHotTopic[] {
    return raw
      .filter((item: any) => item?.word || item?.query)
      .map((item: any, index: number) => ({
        title: item.word || item.query || '',
        source: 'baidu',
        sourceUrl: `https://www.baidu.com/s?wd=${encodeURIComponent(item.word || '')}`,
        category: item.tag || undefined,
        metrics: { hotScore: Number(item.hotScore) || 0 },
        rank: index + 1,
      }));
  }
}

class WeiboScraper extends BaseScraper {
  sourceName = 'weibo';
  fetchInterval = config.scraper.intervals.weibo;

  async fetchData(): Promise<any[]> {
    const response = await fetchWithTimeout(
      'https://weibo.com/ajax/side/hotSearch',
      {
        headers: {
          ...DEFAULT_HEADERS,
          Referer: 'https://weibo.com/',
          Origin: 'https://weibo.com',
        },
      }
    );
    const data = await response.json() as any;
    return data?.data?.realtime || [];
  }

  parseData(raw: any[]): ParsedHotTopic[] {
    return raw
      .filter((item: any) => item?.word || item?.note)
      .map((item: any, index: number) => ({
        title: item.word || item.note || '',
        source: 'weibo',
        sourceUrl: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word || '')}`,
        category: item.category || undefined,
        metrics: {
          hotValue: Number(item.num) || 0,
          rawHot: Number(item.raw_hot) || 0,
        },
        rank: index + 1,
      }));
  }
}

class DouyinScraper extends BaseScraper {
  sourceName = 'douyin';
  fetchInterval = config.scraper.intervals.douyin;

  async fetchData(): Promise<any[]> {
    const endpoints = [
      'https://www.iesdouyin.com/web/api/v2/hotsearch/billboard/word/',
      'https://www.iesdouyin.com/share/api/hotboard/?type=0',
    ];
    for (const url of endpoints) {
      try {
        const response = await fetchWithTimeout(url, {
          headers: {
            ...DEFAULT_HEADERS,
            Referer: 'https://www.douyin.com/',
          },
        });
        const data = (await response.json()) as any;
        const list =
          data?.word_list ||
          data?.data?.word_list ||
          data?.data?.list ||
          data?.data ||
          [];
        if (Array.isArray(list) && list.length > 0) return list;
      } catch {
        // try next endpoint
      }
    }
    console.warn('[SCRAPER] Douyin: all endpoints failed, skipping this cycle');
    return [];
  }

  parseData(raw: any[]): ParsedHotTopic[] {
    return raw
      .filter((item: any) => item?.word || item?.title)
      .map((item: any, index: number) => ({
        title: item.word || item.title || '',
        source: 'douyin',
        sourceUrl:
          item.url ||
          `https://www.douyin.com/search/${encodeURIComponent(item.word || '')}`,
        category: item.label || undefined,
        metrics: {
          hotValue: Number(item.hot_value) || Number(item.view_count) || 0,
        },
        rank: index + 1,
      }));
  }
}

// ─── Tech Platforms ───────────────────────────────────────────────────────────

class GitHubScraper extends BaseScraper {
  sourceName = 'github';
  fetchInterval = config.scraper.intervals.github;

  async fetchData(): Promise<any[]> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const response = await fetchWithTimeout(
      `https://api.github.com/search/repositories?q=stars:>100+pushed:>${since}&sort=stars&order=desc&per_page=20`,
      {
        headers: {
          ...DEFAULT_HEADERS,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    const data = await response.json() as any;
    return data?.items || [];
  }

  parseData(raw: any[]): ParsedHotTopic[] {
    return raw.map((item: any, index: number) => ({
      title: `${item.full_name}: ${item.description || ''}`.slice(0, 200),
      content: item.description || undefined,
      source: 'github',
      sourceUrl: item.html_url,
      category: item.language || undefined,
      metrics: {
        stars: item.stargazers_count || 0,
        forks: item.forks_count || 0,
        watchers: item.watchers_count || 0,
      },
      rank: index + 1,
    }));
  }
}

class HackerNewsScraper extends BaseScraper {
  sourceName = 'hackernews';
  fetchInterval = config.scraper.intervals.hackernews;

  async fetchData(): Promise<any[]> {
    const response = await fetchWithTimeout(
      'https://hacker-news.firebaseio.com/v0/topstories.json',
      { headers: DEFAULT_HEADERS }
    );
    const ids = await response.json() as number[];
    const topIds: number[] = ids.slice(0, 15);

    const stories = await Promise.all(
      topIds.map(async (id: number) => {
        try {
          const res = await fetchWithTimeout(
            `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
            { headers: DEFAULT_HEADERS },
            5000
          );
          return res.json();
        } catch {
          return null;
        }
      })
    );

    return stories.filter(Boolean);
  }

  parseData(raw: any[]): ParsedHotTopic[] {
    return raw
      .filter((item: any) => item?.title && (item.score || 0) >= 10)
      .map((item: any, index: number) => ({
        title: item.title,
        content: item.text || undefined,
        source: 'hackernews',
        sourceUrl: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        metrics: {
          score: item.score || 0,
          comments: item.descendants || 0,
        },
        rank: index + 1,
      }));
  }
}

/**
 * Product Hunt — requires an Access Token.
 * Get a free one at https://api.producthunt.com/v2/docs
 * Set PRODUCTHUNT_ACCESS_TOKEN in .env to activate.
 */
class ProductHuntScraper extends BaseScraper {
  sourceName = 'producthunt';
  fetchInterval = config.scraper.intervals.producthunt;

  async fetchData(): Promise<any[]> {
    const token = config.producthunt.accessToken;
    if (!token) {
      console.log('[SCRAPER] ProductHunt: PRODUCTHUNT_ACCESS_TOKEN not set, skipping.');
      return [];
    }

    const query = `{
      posts(order: VOTES, first: 20) {
        edges {
          node {
            id name tagline url votesCount commentsCount
            topics { edges { node { name } } }
          }
        }
      }
    }`;

    const response = await fetchWithTimeout(
      'https://api.producthunt.com/v2/api/graphql',
      {
        method: 'POST',
        headers: {
          ...DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );
    const data = await response.json() as any;
    return data?.data?.posts?.edges || [];
  }

  parseData(raw: any[]): ParsedHotTopic[] {
    return raw
      .filter((edge: any) => edge?.node?.name)
      .map((edge: any, index: number) => {
        const post = edge.node;
        const topicNames: string =
          post.topics?.edges?.map((e: any) => e.node.name).join(', ') || '';
        return {
          title: `${post.name}: ${post.tagline || ''}`.slice(0, 200),
          content: post.tagline || undefined,
          source: 'producthunt',
          sourceUrl: post.url,
          category: topicNames || undefined,
          metrics: {
            votes: post.votesCount || 0,
            comments: post.commentsCount || 0,
          },
          rank: index + 1,
        };
      });
  }
}

// ─── International Platforms ─────────────────────────────────────────────────

/**
 * Twitter/X Trends — requires an API Bearer Token.
 * Apply at https://developer.twitter.com (Free tier has limited access;
 * the trends endpoint requires at least the Basic plan).
 * Set TWITTER_BEARER_TOKEN in .env to activate.
 */
/**
 * Parses twitterapi.io meta_description like "17.7K posts" or "1.2M posts"
 * into a numeric tweet count. Returns 0 if unparseable.
 */
function parseTweetCount(meta: string): number {
  if (!meta) return 0;
  const m = meta.match(/([\d.]+)\s*([KMB]?)\s*posts?/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const suffix = (m[2] || '').toUpperCase();
  if (suffix === 'K') return Math.round(n * 1_000);
  if (suffix === 'M') return Math.round(n * 1_000_000);
  if (suffix === 'B') return Math.round(n * 1_000_000_000);
  return Math.round(n);
}

/**
 * Twitter trending topics via twitterapi.io (third-party, no official API needed).
 * Auth: X-API-Key header.  Set TWITTER_BEARER_TOKEN to your twitterapi.io API key.
 * woeid=1 = Worldwide trends.
 */
class TwitterScraper extends BaseScraper {
  sourceName = 'twitter';
  fetchInterval = config.scraper.intervals.twitter;

  async fetchData(): Promise<any[]> {
    const apiKey = config.twitter.bearerToken;
    if (!apiKey) {
      console.log('[SCRAPER] Twitter: TWITTER_BEARER_TOKEN (twitterapi.io key) not set, skipping.');
      return [];
    }

    const response = await fetchWithTimeout(
      'https://api.twitterapi.io/twitter/trends?woeid=1',
      {
        headers: {
          ...DEFAULT_HEADERS,
          'X-API-Key': apiKey,
        },
      }
    );
    const data = await response.json() as any;
    if (data?.status === 'error') {
      console.error('[SCRAPER] Twitter trends error:', data.msg);
      return [];
    }
    // Actual response wraps each entry as { trend: { name, target, rank, meta_description } }
    const trends: any[] = data?.trends || [];
    return trends.map((t: any) => t.trend ?? t);
  }

  parseData(raw: any[]): ParsedHotTopic[] {
    return raw
      .filter((item: any) => item?.name)
      .slice(0, 20)
      .map((item: any, index: number) => {
        const query = item.target?.query || item.name;
        const volume = parseTweetCount(item.meta_description || '');
        return {
          title: item.name,
          source: 'twitter',
          sourceUrl: `https://x.com/search?q=${encodeURIComponent(query)}&src=trend_click&vertical=trends`,
          metrics: {
            tweetVolume: volume,
          },
          rank: item.rank ?? index + 1,
        };
      });
  }
}

class RedditScraper extends BaseScraper {
  sourceName = 'reddit';
  fetchInterval = config.scraper.intervals.reddit;

  async fetchData(): Promise<any[]> {
    const response = await fetchWithTimeout(
      'https://www.reddit.com/r/technology/hot.json?limit=25',
      {
        headers: {
          'User-Agent': REDDIT_USER_AGENT,
          Accept: 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
      INTL_FETCH_OPTS.timeoutMs,
      INTL_FETCH_OPTS.retries
    );
    const data = (await response.json()) as any;
    return data?.data?.children || [];
  }

  parseData(raw: any[]): ParsedHotTopic[] {
    return raw
      .filter((child: any) => child?.data?.title && !child.data.stickied && (child.data.score || 0) >= 10)
      .map((child: any, index: number) => {
        const post = child.data;
        return {
          title: post.title,
          content: post.selftext ? post.selftext.slice(0, 300) : undefined,
          source: 'reddit',
          sourceUrl: `https://www.reddit.com${post.permalink}`,
          category: post.flair_text || undefined,
          metrics: {
            upvotes: post.ups || 0,
            comments: post.num_comments || 0,
            score: post.score || 0,
          },
          rank: index + 1,
        };
      });
  }
}

/**
 * Bilibili 全站热门 — 国内稳定可用，替代失效的 Bing RSS
 */
class BilibiliPopularScraper extends BaseScraper {
  sourceName = 'bilibili';
  fetchInterval = config.scraper.intervals.bilibili ?? config.scraper.intervals.bingnews;

  async fetchData(): Promise<any[]> {
    const response = await fetchWithTimeout(
      'https://api.bilibili.com/x/web-interface/popular?ps=20',
      {
        headers: {
          ...DEFAULT_HEADERS,
          Referer: 'https://www.bilibili.com/',
          Accept: 'application/json',
        },
      }
    );
    const data = (await response.json()) as any;
    return data?.data?.list || [];
  }

  parseData(raw: any[]): ParsedHotTopic[] {
    return raw
      .filter((item: any) => item?.title)
      .map((item: any, index: number) => ({
        title: item.title,
        content: item.desc || undefined,
        source: 'bilibili',
        sourceUrl: `https://www.bilibili.com/video/${item.bvid}`,
        category: item.tname || undefined,
        metrics: {
          views: item.stat?.view || 0,
          likes: item.stat?.like || 0,
          danmaku: item.stat?.danmaku || 0,
        },
        rank: index + 1,
      }));
  }
}

/**
 * Bing News via public RSS feed — no API key required.
 * Queries today's top Chinese-language news headlines.
 */
class BingNewsScraper extends BaseScraper {
  sourceName = 'bingnews';
  fetchInterval = config.scraper.intervals.bingnews;

  async fetchData(): Promise<any[]> {
    const urls = [
      'https://cn.bing.com/news/search?q=科技&format=RSS&mkt=zh-CN',
      'https://www.bing.com/news/search?q=technology&format=RSS&mkt=en-US',
    ];
    for (const url of urls) {
      try {
        const response = await fetchWithTimeout(url, {
          headers: {
            ...DEFAULT_HEADERS,
            Accept: 'application/rss+xml, application/xml, text/xml, */*',
          },
        });
        const xml = await response.text();
        if (!xml.includes('<item>') && !xml.includes('<entry>')) continue;
        const items = parseRSSItems(xml);
        if (items.length > 0) return items;
      } catch {
        // try next
      }
    }
    return [];
  }

  parseData(
    raw: { title: string; link: string; description: string }[]
  ): ParsedHotTopic[] {
    return raw
      .filter((item) => item.title)
      .slice(0, 20)
      .map((item, index) => ({
        title: item.title,
        content: item.description || undefined,
        source: 'bingnews',
        sourceUrl: item.link || undefined,
        metrics: { rank: index + 1 },
        rank: index + 1,
      }));
  }
}

/**
 * DEV.to — free public API, no key required.
 * Complements Bing News with developer community articles.
 */
class DevToScraper extends BaseScraper {
  sourceName = 'devto';
  fetchInterval = config.scraper.intervals.bingnews; // reuse bingnews interval

  async fetchData(): Promise<any[]> {
    const response = await fetchWithTimeout(
      'https://dev.to/api/articles?top=7&per_page=20',
      { headers: { ...DEFAULT_HEADERS, Accept: 'application/json' } }
    );
    return response.json() as Promise<any[]>;
  }

  parseData(raw: any[]): ParsedHotTopic[] {
    return raw
      .filter((item: any) => item?.title)
      .map((item: any, index: number) => ({
        title: item.title,
        content: item.description || undefined,
        source: 'devto',
        sourceUrl: item.url,
        category: item.tag_list?.[0] || undefined,
        metrics: {
          reactions: item.public_reactions_count || 0,
          comments: item.comments_count || 0,
        },
        rank: index + 1,
      }));
  }
}

/**
 * Google News RSS — free, no API key, aggregates top authoritative sources.
 * Three feeds cover Chinese tech, Chinese headlines and global AI/tech.
 */
class GoogleNewsScraper extends BaseScraper {
  sourceName: string;
  fetchInterval: number;
  private feedUrl: string;

  constructor(sourceName: string, feedUrl: string, intervalMs: number) {
    super();
    this.sourceName = sourceName;
    this.feedUrl = feedUrl;
    this.fetchInterval = intervalMs;
  }

  async fetchData(): Promise<any[]> {
    const response = await fetchWithTimeout(
      this.feedUrl,
      {
        headers: {
          ...DEFAULT_HEADERS,
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
      },
      INTL_FETCH_OPTS.timeoutMs,
      INTL_FETCH_OPTS.retries
    );
    const xml = await response.text();
    return parseRSSItems(xml);
  }

  parseData(
    raw: { title: string; link: string; description: string }[]
  ): ParsedHotTopic[] {
    return raw
      .filter((item) => item.title && item.title.length > 5)
      .slice(0, 20)
      .map((item, index) => ({
        title: item.title,
        content: item.description || undefined,
        source: this.sourceName,
        sourceUrl: item.link || undefined,
        metrics: { rank: index + 1 },
        rank: index + 1,
      }));
  }
}

// ─── Scraper Registry & Startup ──────────────────────────────────────────────

const GNEWS_INTERVAL = 15 * 60 * 1000; // 15 min

export const scrapers = [
  // Chinese platforms — refresh every 5–10 min
  new BaiduScraper(),
  new WeiboScraper(),
  new DouyinScraper(),
  new BilibiliPopularScraper(),
  // Tech community — refresh every 15–60 min
  new GitHubScraper(),
  new HackerNewsScraper(),
  new DevToScraper(),
  // International social — refresh every 15–30 min
  new TwitterScraper(),    // activates only if TWITTER_BEARER_TOKEN (twitterapi.io key) is set
  new RedditScraper(),
  new BingNewsScraper(),
  // Google News RSS — free, no key required, refresh every 15 min
  new GoogleNewsScraper(
    'gnews_cn_tech',
    'https://news.google.com/rss/search?q=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD+%E7%A7%91%E6%8A%80&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
    GNEWS_INTERVAL
  ),
  new GoogleNewsScraper(
    'gnews_cn',
    'https://news.google.com/rss?hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
    GNEWS_INTERVAL
  ),
  new GoogleNewsScraper(
    'gnews_ai',
    'https://news.google.com/rss/search?q=artificial+intelligence+LLM&hl=en-US&gl=US&ceid=US:en',
    GNEWS_INTERVAL
  ),
];

let isRunning = false;

export async function startScrapers() {
  if (isRunning || !config.scraper.enabled) {
    return;
  }

  isRunning = true;
  console.log('\n[SCRAPER] Data collection engine starting...\n');

  for (const scraper of scrapers) {
    // Initial fetch runs in background — does not block server startup
    scraper.run().catch((error) => {
      console.error(
        `[SCRAPER] Initial fetch failed (${scraper.sourceName}):`,
        error
      );
    });

    setInterval(async () => {
      try {
        await scraper.run();
      } catch (error) {
        console.error(
          `[SCRAPER] Interval fetch failed (${scraper.sourceName}):`,
          error
        );
      }
    }, scraper.fetchInterval);
  }

  console.log('\n[SCRAPER] All scrapers scheduled, monitoring...\n');
}
