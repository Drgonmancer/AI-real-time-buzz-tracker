/**
 * 数据源可用性自检脚本
 * 运行: npm run test:sources
 */
import crypto from 'crypto';
import { initNetwork } from '../src/lib/http.js';
import { scrapers } from '../src/services/scraperService.js';

initNetwork();

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

async function testBilibiliSearch(query = 'AI') {
  const buvid3 = `${crypto.randomUUID()}infoc`;
  const url = `https://api.bilibili.com/x/web-interface/search/type?keyword=${encodeURIComponent(query)}&search_type=video&order=pubdate&page=1&pagesize=5`;
  const res = await fetch(url, {
    headers: {
      ...DEFAULT_HEADERS,
      Referer: 'https://search.bilibili.com/',
      Cookie: `buvid3=${buvid3}`,
    },
  });
  const data = (await res.json()) as any;
  return {
    ok: res.ok && data?.code === 0,
    status: res.status,
    code: data?.code,
    count: data?.data?.result?.length ?? 0,
    message: data?.message || '',
  };
}

async function testSogouSearch(query = 'AI') {
  const url = `https://www.sogou.com/web?query=${encodeURIComponent(query)}&ie=utf-8`;
  const res = await fetch(url, { headers: DEFAULT_HEADERS, redirect: 'follow' });
  const html = await res.text();
  const matches = html.match(/class="vrwrap|class="rb/g) || [];
  return { ok: res.ok && matches.length > 0, status: res.status, count: matches.length };
}

async function main() {
  console.log('\n=== Scraper fetchData tests ===\n');
  for (const scraper of scrapers) {
    const name = scraper.sourceName;
    try {
      const start = Date.now();
      const raw = await scraper.fetchData();
      const parsed = scraper.parseData(raw);
      const ms = Date.now() - start;
      console.log(
        `[${parsed.length > 0 ? 'OK' : 'EMPTY'}] ${name.padEnd(14)} raw=${String(raw?.length ?? 0).padStart(3)} parsed=${String(parsed.length).padStart(3)} (${ms}ms)`
      );
      if (parsed.length > 0) {
        console.log(`       sample: ${parsed[0].title.slice(0, 60)}`);
      }
    } catch (err: any) {
      console.log(`[FAIL] ${name.padEnd(14)} ${err.message}`);
    }
  }

  console.log('\n=== Keyword search tests (AI) ===\n');
  try {
    const bili = await testBilibiliSearch('AI');
    console.log(`[${bili.ok ? 'OK' : 'FAIL'}] bilibili       count=${bili.count} code=${bili.code} ${bili.message}`);
  } catch (e: any) {
    console.log(`[FAIL] bilibili       ${e.message}`);
  }
  try {
    const sogou = await testSogouSearch('AI');
    console.log(`[${sogou.ok ? 'OK' : 'FAIL'}] sogou          count=${sogou.count} status=${sogou.status}`);
  } catch (e: any) {
    console.log(`[FAIL] sogou          ${e.message}`);
  }

  console.log('');
}

main().catch(console.error);
