import { initNetwork } from '../src/lib/http.js';
import { searchGoogleNews } from '../src/services/searchService.js';
import { scrapers } from '../src/services/scraperService.js';

initNetwork();

async function main() {
  const reddit = scrapers.find((s) => s.sourceName === 'reddit')!;
  const gnews = scrapers.find((s) => s.sourceName === 'gnews_cn_tech')!;

  try {
    const r = await reddit.fetchData();
    const p = reddit.parseData(r);
    console.log('reddit OK', p.length, p[0]?.title?.slice(0, 60));
  } catch (e: any) {
    console.log('reddit FAIL', e.message);
  }

  try {
    const items = await searchGoogleNews('AI');
    console.log('gnews search OK', items.length, items[0]?.title?.slice(0, 60));
  } catch (e: any) {
    console.log('gnews search FAIL', e.message);
  }

  try {
    const r = await gnews.fetchData();
    const p = gnews.parseData(r);
    console.log('gnews scraper OK', p.length, p[0]?.title?.slice(0, 60));
  } catch (e: any) {
    console.log('gnews scraper FAIL', e.message);
  }
}

main();
