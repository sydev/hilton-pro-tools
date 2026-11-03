// Runs the userscript against mocked hilton.com responses and screenshots the panel.
//
// Usage:
//   pnpm install && pnpm exec playwright install chromium
//   node test/preview.js [hilton-pro-tools.user.js] [test/shots]
//
// Set CHROMIUM_PATH to use an already installed Chromium instead of Playwright's own.
// Prints the CSV header and one row, the requests sent and any page errors;
// writes home-scanning.png, scanning.png, minimized-scanning.png, done-no-fx.png,
// done.png, home.png, home-settings.png, all-hotels.png, free-nights.png,
// free-nights-points.png, minimized.png, home-points-off.png, home-update.png,
// minimized-update.png and home-installing.png into the output folder.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const [scriptPath = path.join(__dirname, '..', 'hilton-pro-tools.user.js'), outDir = path.join(__dirname, 'shots')] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const userscript = fs.readFileSync(scriptPath, 'utf8');

// Version in the script header; the GitHub mock publishes PUBLISHED.
const VERSION = /@version\s+(\S+)/.exec(userscript)[1];
const NEXT = VERSION.replace(/^(\d+)\.(\d+).*$/, (m, major, minor) => `${major}.${+minor + 1}.0`);
let PUBLISHED = VERSION;

const changelog = () => `# Changelog

## ${NEXT}

### Added

- **First new feature:** what it does.
- **Second new feature:** what it does.

### Fixed

- **First fix:** details.
- **Second fix:** details.
- **Third fix:** details.

## ${VERSION}

### Added

- **Already installed:** not shown.
`;

const HOTELS = [
  { code: 'MLEAIHI', name: 'Hilton Maldives Amingiri Resort & Spa' },
  { code: 'MLEGSQQ', name: 'SAii Lagoon Maldives, Curio Collection by Hilton' },
  { code: 'MLEHICI', name: 'Conrad Maldives Rangali Island' },
  { code: 'MLEONWA', name: 'Waldorf Astoria Maldives Ithaafushi' }
];

const officialPage = () => {
  const links = HOTELS.map(h => `<a href="/en/hotels/${h.code.toLowerCase()}-x/">${h.name}</a>`);
  for (let i = 0; i < 60; i++) links.push(`<a href="/en/hotels/zzz${i}-x/">Filler ${i}</a>`);
  return `<html><body><main>${links.join('')}</main></body></html>`;
};

const OTHERS = [
  { code: 'MLEKAHI', name: 'Hilton Kanuhura (non-resort test)', cash: 3900, points: 70000, premium: true },
  { code: 'MLECICI', name: 'Canopy Male', cash: 1450, points: 60000 },
  { code: 'MLEHXHX', name: 'Hampton Hulhumale', cash: 980, points: null },
  { code: 'MLEXXXX', name: 'Closed Hotel', closed: true },
  { code: 'MLEDTDT', name: 'DoubleTree Male', cash: 1200, points: 52000 }
];
const CASH = { MLEAIHI: 21000, MLEGSQQ: 15800, MLEHICI: 22400, MLEONWA: 30500 };

const searchPage = `<!doctype html><html><body style="margin:0;height:900px;background:#cfe3ea">
<script>
fetch('/graphql/customer?op=shop', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    operationName: 'shopMultiPropAvail',
    query: 'query shopMultiPropAvail { shopMultiPropAvail { summary { lowest { amountAfterTax(currencyCode: "USD") } } } }',
    variables: {
      ctyhocns: ${JSON.stringify(HOTELS.map(h => h.code).concat(OTHERS.map(h => h.code)))},
      input: { arrivalDate: '2027-02-21', departureDate: '2027-03-01', numAdults: 2, specialRates: { hhonors: false } }
    }
  })
});
fetch('/graphql/customer?op=summary', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ operationName: 'hotelSummaryOptions', query: 'query hotelSummaryOptions { x }', variables: {} })
});
</script></body></html>`;

const LOG = [];

const rooms = {
  MLEAIHI: ['KNG', 'VIL'],
  MLEGSQQ: ['STD', 'DLX', 'STE'],
  MLEHICI: ['BCH', 'WTR'],
  MLEONWA: []
};

const rate = (code, name, amount, deposit) => ({
  roomTypeCode: 'x',
  ratePlanCode: code,
  rateAmount: amount,
  // Stay total for 8 nights incl. ~17% tax, like Hilton's amountAfterTaxFmt.
  amountAfterTaxFmt: '$' + (amount * 8 * 1.17).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  ratePlan: { ratePlanCode: code, ratePlanName: name, ratePlanDesc: '', advancePurchase: false },
  guarantee: {
    depositRequired: deposit,
    nonRefundable: false,
    cxlPolicyDesc: 'Free cancellation until 7 days before arrival'
  },
  hhonorsDiscountRate: null
});

const POINTS = { MLEHICI: 120000, MLEAIHI: 95000, MLEGSQQ: 80000 };

function graphql(body) {
  LOG.push(body.operationName + (body.variables?.input?.specialRates?.hhonors ? ' (points)' : ''));

  if (body.operationName === 'hotelSummaryOptions') {
    return { data: { hotelSummaryOptions: { hotels: HOTELS.concat(OTHERS).map(h => ({ ctyhocn: h.code, name: h.name })) } } };
  }

  if (body.operationName === 'currencies') {
    // conversionFactor as units per USD.
    return { data: { currencies: [
      { currencyCode: 'EUR', conversionFactor: 0.92, description: 'Euro' },
      { currencyCode: 'GBP', conversionFactor: 0.79, description: 'British Pound' },
      { currencyCode: 'JPY', conversionFactor: 150, description: 'Japanese Yen' },
      { currencyCode: 'USD', conversionFactor: 1, description: 'US Dollar' }
    ] } };
  }

  if (/shopMultiPropAvail/.test(body.operationName || '')) {
    const points = body.variables.input.specialRates?.hhonors;
    return {
      data: {
        shopMultiPropAvail: body.variables.ctyhocns.map(code => {
          const other = OTHERS.find(h => h.code === code);
          if (other?.closed) return { ctyhocn: code, statusCode: 51, statusMessage: 'Hotel no longer a hilton', summary: { lowest: null, hhonors: null } };
          const perNight = other ? other.points : POINTS[code];
          return {
            ctyhocn: code,
            statusCode: 0,
            currencyCode: 'MVR',
            lengthOfStay: 8,
            summary: points
              ? { hhonors: perNight ? { dailyRmPointsRate: perNight, ratePlan: { ratePlanName: other?.premium ? 'Premium Room Rewards' : 'Standard Room Reward' } } : null }
              : { lowest: { amountAfterTax: other ? other.cash : CASH[code], ratePlan: { ratePlanName: 'Honors Discount' } } }
          };
        })
      }
    };
  }

  const v = body.variables;
  const code = v.ctyhocn;

  if (code === 'MLEONWA' || !rooms[code]) {
    return { data: { hotel: { ctyhocn: code, shopAvail: { statusCode: 1740, roomTypes: [] } } } };
  }

  if (!v.selectedRoomTypeCode) {
    return {
      data: {
        hotel: {
          ctyhocn: code,
          shopAvail: {
            statusCode: 0,
            roomTypes: rooms[code].map((r, i) => ({
              roomTypeCode: r,
              roomTypeName: `${r} Villa`,
              quickBookRate: { rateAmount: 1000 + i * 500, ratePlanCode: 'BAR' }
            }))
          }
        }
      }
    };
  }

  const room = v.selectedRoomTypeCode;

  if (code === 'MLEGSQQ' && room === 'DLX') {
    return { errors: [{ message: 'HTTP 429 Too Many Requests' }] };
  }

  const rates = code === 'MLEHICI'
    ? [rate('SFX1', 'Semi Flex Rate', 2480, true), rate('SFX2', 'Semi Flex Breakfast', 2790, true), rate('BAR', 'Best Available', 2300, false)]
    : [rate('BAR', 'Best Available', 1500, false)];

  return {
    data: {
      hotel: {
        ctyhocn: code,
        shopAvail: {
          statusCode: 0,
          roomTypes: [{ roomTypeCode: room, roomTypeName: `${room} Villa`, roomOnlyRates: rates }]
        }
      }
    }
  };
}

(async () => {
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );
  const errors = [];
  const open = async setup => {
    const page = await browser.newPage({ viewport: { width: 420, height: 1500 }, deviceScaleFactor: 2 });
    page.on('pageerror', e => errors.push(e.message));
    await page.context().route('https://www.hilton.com/**', mock);
    await page.context().route('https://raw.githubusercontent.com/**', github);
    // Userscript managers provide GM_info even with @grant none.
    await page.addInitScript(version => { window.GM_info = { script: { version } }; }, VERSION);
    if (setup) await page.addInitScript(setup);
    await page.addInitScript(userscript);
    await page.goto('https://www.hilton.com/en/search/?query=maldives&arrivalDate=2027-02-21&departureDate=2027-03-01');
    return page;
  };
  const mock = route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/graphql/customer')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(graphql(JSON.parse(route.request().postData()))) });
    }
    if (url.pathname.includes('resort-credit-eligible-hotels')) {
      return route.fulfill({ contentType: 'text/html', body: officialPage() });
    }
    return route.fulfill({ contentType: 'text/html', body: searchPage });
  };
  const github = route => {
    const file = path.basename(new URL(route.request().url()).pathname);
    LOG.push('github ' + file);
    const body = file === 'changelog.md'
      ? changelog()
      : `// ==UserScript==\n// @name         Hilton Pro Tools\n// @version      ${PUBLISHED}\n// ==/UserScript==\n`;
    return route.fulfill({ contentType: 'text/plain', body });
  };

  const page = await open();

  const panel = page.locator('#hilton-pro-tools');
  await page.waitForTimeout(10000);
  await panel.screenshot({ path: path.join(outDir, 'home-scanning.png') });
  await page.click('.hpt-tool[data-view="resort"]');
  await panel.screenshot({ path: path.join(outDir, 'scanning.png') });

  await page.click('#hpt-min');
  await panel.screenshot({ path: path.join(outDir, 'minimized-scanning.png') });
  await page.click('#hpt-min');

  await page.waitForFunction(() => !document.querySelector('#hpt-scan').disabled, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  await page.locator('#hpt-results details').evaluateAll(ds => ds.forEach(d => { d.open = true; }));
  await panel.screenshot({ path: path.join(outDir, 'done-no-fx.png') });

  console.log('options:', await page.$$eval('#hpt-currency option', os => os.map(o => o.textContent.trim())));
  await page.waitForTimeout(200);
  await page.locator('#hpt-results details').evaluateAll(ds => ds.forEach(d => { d.open = true; }));
  await panel.screenshot({ path: path.join(outDir, 'done.png') });

  await page.click('#hpt-back');
  await panel.screenshot({ path: path.join(outDir, 'home.png') });
  await page.click('#hpt-settings-acc > summary');
  await page.waitForTimeout(300);
  await panel.screenshot({ path: path.join(outDir, 'home-settings.png') });
  await page.selectOption('#hpt-currency', 'USD');
  await page.click('.hpt-tool[data-view="points"]');
  await page.waitForTimeout(100);
  console.log('USD row:', (await page.textContent('#hpt-all-list .hpt-all-row')).replace(/\s+/g, ' ').trim());
  await page.click('#hpt-all-change');
  await page.selectOption('#hpt-currency', 'EUR');
  await page.click('.hpt-tool[data-view="points"]');
  await page.waitForTimeout(100);
  await page.locator('#hpt-view-points').screenshot({ path: path.join(outDir, 'all-hotels.png') });
  await page.evaluate(() => { document.querySelector('#hpt-body').scrollTop = 0; });

  await page.click('#hpt-back');
  await page.click('.hpt-tool[data-view="free"]');
  await page.waitForTimeout(100);
  await page.locator('#hpt-view-free').screenshot({ path: path.join(outDir, 'free-nights.png') });
  console.log('book link:', await page.getAttribute('#hpt-free .hpt-free-top a', 'href'));
  await page.click('[data-free-sort="points"]');
  await page.locator('#hpt-view-free').screenshot({ path: path.join(outDir, 'free-nights-points.png') });
  await page.click('[data-free-sort="cash"]');
  await page.click('#hpt-back');

  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#hpt-csv')]);
  const csv = fs.readFileSync(await download.path(), 'utf8').split('\r\n');
  console.log(csv[0]);
  console.log(csv.find(line => line.includes('MLEHICI')));
  console.log('stored:', await page.evaluate(() => [localStorage.getItem('hilton-pro-tools-point-value'), localStorage.getItem('hilton-pro-tools-currency')]));

  await page.click('#hpt-min');
  await panel.screenshot({ path: path.join(outDir, 'minimized.png') });

  console.log('status:', await page.textContent('#hpt-status'));
  console.log('requests:', LOG.filter(x => !x.startsWith('hotel_')));

  // Cash vs. Points and Free Night Finder switched off: no points or currency requests.
  LOG.length = 0;
  const off = await open(() => {
    localStorage.setItem('hilton-pro-tools-tools', JSON.stringify({ resort: true, points: false, free: false }));
    localStorage.removeItem('hilton-pro-tools-view');
  });
  await off.waitForTimeout(6000);
  await off.waitForFunction(() => !document.querySelector('#hpt-scan').disabled, null, { timeout: 60000 });
  await off.click('#hpt-settings-acc > summary');
  await off.waitForTimeout(300);
  await off.locator('#hilton-pro-tools').screenshot({ path: path.join(outDir, 'home-points-off.png') });
  console.log('requests (points off):', LOG.filter(x => !x.startsWith('hotel_')));

  // A newer version is published: banner, minimized badge, skip and install.
  PUBLISHED = NEXT;
  LOG.length = 0;
  const upd = await open();
  const updPanel = upd.locator('#hilton-pro-tools');
  await upd.waitForSelector('#hpt-update:not([hidden])', { timeout: 15000 });
  await updPanel.screenshot({ path: path.join(outDir, 'home-update.png') });
  await upd.click('#hpt-min');
  await updPanel.screenshot({ path: path.join(outDir, 'minimized-update.png') });
  await upd.click('#hpt-min');
  await upd.click('#hpt-update [data-update="skip"]');
  console.log('after skip:', await upd.evaluate(() => [
    document.querySelector('#hpt-update').hidden,
    JSON.parse(localStorage.getItem('hilton-pro-tools-update')).skipped
  ]));
  await upd.click('#hpt-settings-acc > summary');
  const [popup] = await Promise.all([
    upd.waitForEvent('popup'),
    upd.click('#hpt-version-state [data-update="install"]')
  ]);
  console.log('install opens:', popup.url());
  await upd.waitForTimeout(300);
  await updPanel.screenshot({ path: path.join(outDir, 'home-installing.png') });
  console.log('requests (update):', LOG.filter(x => x.startsWith('github')));

  console.log('page errors:', errors.length ? errors : 'none');
  await browser.close();
})();
