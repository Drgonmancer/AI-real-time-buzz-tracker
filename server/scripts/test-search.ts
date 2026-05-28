import { searchAllPlatforms } from '../src/services/searchService.js';

async function main() {
  const q = process.argv[2] || 'AI编程';
  console.log(`\nSearching: "${q}"\n`);
  const { results, statuses } = await searchAllPlatforms(q);
  console.log(`Total: ${results.length} results\n`);
  for (const s of statuses) {
    console.log(`  [${s.ok ? 'OK' : 'FAIL'}] ${s.source.padEnd(14)} ${s.count}条  ${s.error || ''}`);
  }
  if (results.length > 0) {
    console.log('\nSamples:');
    results.slice(0, 5).forEach((r, i) => console.log(`  ${i + 1}. [${r.source}] ${r.title.slice(0, 50)}`));
  }
}

main().catch(console.error);
