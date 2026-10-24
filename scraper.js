// scraper.js - LakSweep Automated NLB & DLB History + Daily Result Extractor Bot
const fs = require('fs');

const LOTTERIES = [
  { slug: 'mahajana-sampatha', agency: 'NLB', name_si: 'මහජන සම්පත', jackpot: 'රු. 25,000,000' },
  { slug: 'govisetha', agency: 'NLB', name_si: 'ගොවිසෙත', jackpot: 'රු. 60,000,000' },
  { slug: 'mega-power', agency: 'NLB', name_si: 'මෙගා පවර්', jackpot: 'රු. 234,500,000' },
  { slug: 'dhana-nidhanaya', agency: 'NLB', name_si: 'ධන නිධානය', jackpot: 'රු. 80,000,000' },
  { slug: 'handahana', agency: 'NLB', name_si: 'හඳහන', jackpot: 'රු. 10,000,000' },
  { slug: 'ada-sampatha', agency: 'NLB', name_si: 'අද සම්පත', jackpot: 'රු. 15,000,000' },
  { slug: 'jaya-sampatha', agency: 'NLB', name_si: 'ජය සම්පත', jackpot: 'රු. 10,000,000' },
  { slug: 'subha-dawasak', agency: 'NLB', name_si: 'සුබ දවසක්', jackpot: 'රු. 10,000,000' }
];

const MONTHS = {
  January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
  July: '07', August: '08', September: '09', October: '10', November: '11', December: '12'
};

function parseHtmlRows(html, meta) {
  const draws = [];
  const rows = html.split('<tr');
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const drawMatch = r.match(/<b>\s*(\d{3,5})\s*<\/b>/i);
    const dateMatch = r.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})/i);
    if (!drawMatch || !dateMatch) continue;

    const drawNo = drawMatch[1];
    const isoDate = `${dateMatch[3]}-${MONTHS[dateMatch[1]] || '01'}-${('0' + dateMatch[2]).slice(-2)}`;
    const liRegex = /<li[^>]*>\s*([A-Z0-9]{1,3})\s*<\/li>/gi;
    const tokens = [];
    let m;
    while ((m = liRegex.exec(r)) !== null) tokens.push(m[1].trim());

    if (tokens.length >= 4) {
      const hasLetter = /^[A-Z]$/.test(tokens[0]);
      draws.push({
        id: `${meta.slug}_${drawNo}`,
        agency: meta.agency,
        slug: meta.slug,
        name_si: meta.name_si,
        draw_no: String(drawNo),
        draw_date: isoDate,
        letter: hasLetter ? tokens[0] : '',
        numbers: hasLetter ? tokens.slice(1) : tokens,
        super_ball: '',
        jackpot: meta.jackpot
      });
    }
  }
  return draws;
}

async function run() {
  let existing = [];
  if (fs.existsSync('results.json')) {
    try { existing = JSON.parse(fs.readFileSync('results.json', 'utf8')).results || []; } catch (e) {}
  }
  const map = new Map();
  existing.forEach(d => map.set(d.id, d));

  for (const lot of LOTTERIES) {
    try {
      const res = await fetch(`https://r.jina.ai/https://www.nlb.lk/English/results/${lot.slug}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 Chrome/126.0.0.0' }
      });
      if (res.ok) {
        const text = await res.text();
        const parsed = parseHtmlRows(text, lot);
        parsed.forEach(d => map.set(d.id, d));
      }
    } catch (e) {
      console.error('Error scraping', lot.slug, e.message);
    }
  }

  const finalResults = Array.from(map.values()).sort((a, b) => Number(b.draw_no) - Number(a.draw_no));
  fs.writeFileSync('results.json', JSON.stringify({ updated_at: new Date().toISOString(), count: finalResults.length, results: finalResults }, null, 2));
  console.log('Saved total draws:', finalResults.length);
}

run();
