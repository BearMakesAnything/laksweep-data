// scraper.js - Full Automated Real-Browser NLB & DLB All Lotteries + Deep History Extractor
const fs = require('fs');
const { chromium } = require('playwright');

const NLB_LOTTERIES = [
  { slug: 'mahajana-sampatha', agency: 'NLB', name_si: 'මහජන සම්පත', name_en: 'Mahajana Sampatha', jackpot: 'රු. 25,000,000' },
  { slug: 'govisetha', agency: 'NLB', name_si: 'ගොවිසෙත', name_en: 'Govisetha', jackpot: 'රු. 60,000,000' },
  { slug: 'mega-power', agency: 'NLB', name_si: 'මෙගා පවර්', name_en: 'Mega Power', jackpot: 'රු. 234,500,000' },
  { slug: 'dhana-nidhanaya', agency: 'NLB', name_si: 'ධන නිධානය', name_en: 'Dhana Nidhanaya', jackpot: 'රු. 80,000,000' },
  { slug: 'handahana', agency: 'NLB', name_si: 'හඳහන', name_en: 'Handahana', jackpot: 'රු. 10,000,000' },
  { slug: 'ada-sampatha', agency: 'NLB', name_si: 'අද සම්පත', name_en: 'Ada Sampatha', jackpot: 'රු. 15,000,000' },
  { slug: 'jaya-sampatha', agency: 'NLB', name_si: 'ජය සම්පත', name_en: 'Jaya Sampatha', jackpot: 'රු. 10,000,000' },
  { slug: 'subha-dawasak', agency: 'NLB', name_si: 'සුබ දවසක්', name_en: 'Subha Dawasak', jackpot: 'රු. 10,000,000' },
  { slug: 'nlb-jaya', agency: 'NLB', name_si: 'NLB ජය', name_en: 'NLB Jaya', jackpot: 'රු. 10,000,000' }
];

const DLB_LOTTERIES = [
  { id: 1, slug: 'ada-kotipathi', agency: 'DLB', name_si: 'අද කෝටිපති', name_en: 'Ada Kotipathi', jackpot: 'රු. 75,000,000' },
  { id: 2, slug: 'shanida', agency: 'DLB', name_si: 'ශනිදා වාසනාව', name_en: 'Shanida Wasana', jackpot: 'රු. 50,000,000' },
  { id: 3, slug: 'lagna-wasana', agency: 'DLB', name_si: 'ලග්න වාසනාව', name_en: 'Lagna Wasana', jackpot: 'රු. 4,500,000' },
  { id: 4, slug: 'supiri-dhana-sampatha', agency: 'DLB', name_si: 'සුපිරි ධන සම්පත', name_en: 'Supiri Dhana Sampatha', jackpot: 'රු. 40,000,000' },
  { id: 5, slug: 'kapruka', agency: 'DLB', name_si: 'කප්රුක', name_en: 'Kapruka', jackpot: 'රු. 65,000,000' },
  { id: 6, slug: 'jayoda', agency: 'DLB', name_si: 'ජයෝදා', name_en: 'Jayoda', jackpot: 'රු. 30,000,000' },
  { id: 7, slug: 'sasiri', agency: 'DLB', name_si: 'සසිරි', name_en: 'Sasiri', jackpot: 'රු. 20,000,000' },
  { id: 8, slug: 'super-ball', agency: 'DLB', name_si: 'සුපර් බෝල්', name_en: 'Super Ball', jackpot: 'රු. 50,000,000' }
];

const MONTHS = {
  January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
  July: '07', August: '08', September: '09', October: '10', November: '11', December: '12'
};

function toIsoDate(dateStr) {
  const m = String(dateStr).match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})/i);
  if (m) return `${m[3]}-${MONTHS[m[1]]}-${('0' + m[2]).slice(-2)}`;
  const iso = String(dateStr).match(/(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : '';
}

async function run() {
  let existing = [];
  if (fs.existsSync('results.json')) {
    try {
      existing = JSON.parse(fs.readFileSync('results.json', 'utf8')).results || [];
    } catch (e) {}
  }
  const map = new Map();
  existing.forEach(d => { if (d && d.id) map.set(d.id, d); });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  // 1. NLB සියලුම ලොතරැයි සහ පරණ දිනුම් වාර Scrape කිරීම
  for (const lot of NLB_LOTTERIES) {
    try {
      console.log('Scraping NLB:', lot.slug);
      await page.goto(`https://www.nlb.lk/English/results/${lot.slug}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(2500);

      for (let p = 0; p < 15; p++) {
        const moreBtn = await page.$('a.more, button.more, .load-more, #loadMore');
        if (!moreBtn) break;
        try {
          await moreBtn.click();
          await page.waitForTimeout(1200);
        } catch (e) { break; }
      }

      const rows = await page.$$eval('table tbody tr', trs => trs.map(tr => {
        const firstTd = tr.querySelector('td:first-child');
        const bTag = firstTd ? firstTd.querySelector('b') : null;
        const drawNo = bTag ? bTag.innerText.trim() : '';
        const rawDate = firstTd ? firstTd.innerText.trim() : '';
        const balls = Array.from(tr.querySelectorAll('ol li, ul li, .B li')).map(li => li.innerText.trim()).filter(Boolean);
        return { drawNo, rawDate, balls };
      }));

      for (const r of rows) {
        if (!/^\d{3,5}$/.test(r.drawNo) || r.balls.length < 4) continue;
        const isoDate = toIsoDate(r.rawDate);
        if (!isoDate) continue;
        const hasLetter = /^[A-Z]$/.test(r.balls[0]) || r.balls[0].length > 2;
        const letter = hasLetter ? r.balls[0] : '';
        const nums = hasLetter ? r.balls.slice(1) : r.balls;
        let superBall = '';
        if (lot.slug === 'mega-power' && nums.length >= 5) {
          superBall = nums[0];
        }
        const id = `${lot.slug}_${r.drawNo}`;
        map.set(id, {
          id,
          agency: 'NLB',
          slug: lot.slug,
          name_si: lot.name_si,
          name_en: lot.name_en,
          draw_no: String(r.drawNo),
          draw_date: isoDate,
          letter,
          numbers: nums,
          super_ball: superBall,
          jackpot: lot.jackpot
        });
      }
    } catch (err) {
      console.error('NLB scrape warning for', lot.slug, err.message);
    }
  }

  // 2. DLB සියලුම ලොතරැයි Scrape කිරීම
  try {
    console.log('Scraping DLB official results...');
    await page.goto('https://www.dlb.lk/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    const dlbItems = await page.evaluate(() => {
      const extracted = [];
      document.querySelectorAll('.result_box, .lottery-result, .card, tr, .item').forEach(el => {
        const text = el.innerText || '';
        const drawMatch = text.match(/Draw\s*No\s*[:\-]?\s*(\d{3,5})|(\d{4})\s*\|/i);
        const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})|(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*\d{4}/i);
        const balls = Array.from(el.querySelectorAll('li, .ball, .num_ball, span.number')).map(b => b.innerText.trim()).filter(x => /^[A-Z0-9]{1,10}$/i.test(x));
        if (drawMatch && balls.length >= 4) {
          extracted.push({
            rawText: text.slice(0, 200),
            drawNo: drawMatch[1] || drawMatch[2],
            rawDate: dateMatch ? dateMatch[0] : '',
            balls
          });
        }
      });
      return extracted;
    });

    for (const item of dlbItems) {
      const matchedLot = DLB_LOTTERIES.find(l => item.rawText.toLowerCase().includes(l.name_en.toLowerCase().split(' ')[0])) || DLB_LOTTERIES[0];
      const isoDate = toIsoDate(item.rawDate) || new Date().toISOString().slice(0, 10);
      const hasLetter = /^[A-Z]+$/i.test(item.balls[0]);
      const id = `${matchedLot.slug}_${item.drawNo}`;
      map.set(id, {
        id,
        agency: 'DLB',
        slug: matchedLot.slug,
        name_si: matchedLot.name_si,
        name_en: matchedLot.name_en,
        draw_no: String(item.drawNo),
        draw_date: isoDate,
        letter: hasLetter ? item.balls[0] : '',
        numbers: hasLetter ? item.balls.slice(1) : item.balls,
        super_ball: '',
        jackpot: matchedLot.jackpot
      });
    }
  } catch (err) {
    console.error('DLB scrape warning:', err.message);
  }

  await browser.close();

  const finalResults = Array.from(map.values()).sort((a, b) => {
    if (b.draw_date !== a.draw_date) return b.draw_date.localeCompare(a.draw_date);
    return Number(b.draw_no) - Number(a.draw_no);
  });

  fs.writeFileSync('results.json', JSON.stringify({
    updated_at: new Date().toISOString(),
    count: finalResults.length,
    results: finalResults
  }, null, 2));

  console.log('Successfully saved results.json with total draws:', finalResults.length);
}

run();
