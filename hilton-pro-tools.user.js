// ==UserScript==
// @name         Hilton Pro Tools
// @namespace    hilton-pro-tools
// @version      0.11.0
// @description  Aspire resort credit finder (Semi-Flex deposit rates), cash vs. points comparison, Free Night Certificate finder, split stay optimizer, flexible dates calendar, rate inspector, suite finder, price watchlist and resort credit tracker for Hilton searches
// @author       sydev
// @license      MIT
// @homepageURL  https://github.com/sydev/hilton-pro-tools
// @supportURL   https://github.com/sydev/hilton-pro-tools/issues
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTQiIGZpbGw9IiMwZjc2NmUiLz48cmVjdCB4PSIyOSIgeT0iMTMiIHdpZHRoPSI2IiBoZWlnaHQ9IjUiIHJ4PSIyIiBmaWxsPSIjZmJiZjI0Ii8+PHBhdGggZD0iTTEwIDQ0YTIyIDIyIDAgMCAxIDQ0IDB6IiBmaWxsPSIjZmJiZjI0Ii8+PHBhdGggZD0iTTE4IDM4YTE0IDE0IDAgMCAxIDktMTEiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZkZTY4YSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cmVjdCB4PSI2IiB5PSI0NSIgd2lkdGg9IjUyIiBoZWlnaHQ9IjYiIHJ4PSIzIiBmaWxsPSIjZjhmYWZjIi8+PHBhdGggZD0iTTUxIDhsMS44IDQuMkw1NyAxNGwtNC4yIDEuOEw1MSAyMGwtMS44LTQuMkw0NSAxNGw0LjItMS44eiIgZmlsbD0iI2Y4ZmFmYyIvPjwvc3ZnPg==
// @match        https://www.hilton.com/*
// @updateURL    https://raw.githubusercontent.com/sydev/hilton-pro-tools/main/hilton-pro-tools.meta.js
// @downloadURL  https://raw.githubusercontent.com/sydev/hilton-pro-tools/main/hilton-pro-tools.user.js
// @run-at       document-start
// @grant        none
// @noframes
// ==/UserScript==
 
(() => {
  'use strict';
 
  if (window.top !== window.self || window.__hiltonProTools) return;
  window.__hiltonProTools = true;
 
  const API = '/graphql/customer';
  const OFFICIAL =
    'https://www.hilton.com/en/p/hilton-honors/resort-credit-eligible-hotels/';
 
  const CACHE = 'hilton-pro-tools-resort-list';
  const RELOAD_KEY = 'hilton-pro-tools-navigation-reload';
  const AUTO_KEY = 'hilton-pro-tools-auto-scan';
  const POINT_KEY = 'hilton-pro-tools-point-value';
  const CURRENCY_KEY = 'hilton-pro-tools-currency';
  const RATES_KEY = 'hilton-pro-tools-currency-rates';
  const VIEW_KEY = 'hilton-pro-tools-view';
  const TOOLS_KEY = 'hilton-pro-tools-tools';
  const UPDATE_KEY = 'hilton-pro-tools-update';
  const UPDATE_AUTO_KEY = 'hilton-pro-tools-update-auto';
  const FREE_SORT_KEY = 'hilton-pro-tools-free-sort';
  const SPLIT_CERTS_KEY = 'hilton-pro-tools-split-certificates';
  const CALENDAR_RANGE_KEY = 'hilton-pro-tools-calendar-range';
  const CALENDAR_MODE_KEY = 'hilton-pro-tools-calendar-mode';
  const RATES_SPECIAL_KEY = 'hilton-pro-tools-rates-special';
  const WATCH_KEY = 'hilton-pro-tools-watchlist';
  const SUITES_SHOW_KEY = 'hilton-pro-tools-suites-show';
  const CREDIT_KEY = 'hilton-pro-tools-resort-credit';

  // Panel pages: the home overview and one page per tool.
  const VIEWS = {
    home: 'Hilton Pro Tools',
    resort: 'Resort Finder',
    points: 'Cash vs. Points',
    free: 'Free Night Finder',
    split: 'Split Stay',
    calendar: 'Flexible Dates',
    rates: 'Rate Inspector',
    suites: 'Suite Finder',
    watch: 'Price Watch',
    credit: 'Credit Tracker'
  };

  // Description of each tool in the home page's on/off switches.
  const TOOL_INFO = {
    resort: 'Scans Resort Credit hotels for Semi-Flex rates',
    points: 'Loads points prices and exchange rates',
    free: 'Finds Standard Room Rewards for Free Night Certificates',
    split: 'Mixes cash, points and certificates night by night',
    calendar: 'Compares prices for nearby arrival dates',
    rates: 'Shows every rate plan of one hotel side by side',
    suites: 'Finds suites and upgrades with their markup',
    watch: 'Checks watched stays for a lower price',
    credit: 'Counts the resort credit used per half year'
  };

  // Update check against the published script on GitHub.
  const REPO_RAW = 'https://raw.githubusercontent.com/sydev/hilton-pro-tools/main/';
  const UPDATE = {
    meta: REPO_RAW + 'hilton-pro-tools.meta.js',
    script: REPO_RAW + 'hilton-pro-tools.user.js',
    notes: REPO_RAW + 'changelog.md',
    changelog: 'https://github.com/sydev/hilton-pro-tools/blob/main/changelog.md',
    startDelay: 3000,
    // Automatic checks at most this often; failed ones are retried sooner.
    everyHours: 6,
    retryMinutes: 10,
    maxNotes: 4
  };

  // Installed version as reported by the userscript manager.
  const VERSION = (() => {
    try {
      return GM_info.script.version || null;
    } catch {
      return null;
    }
  })();

  const CONFIG = {
    maxHotels: 40,
    maxRooms: 25,
    delay: 850,
    autoDelay: 4500,
    cacheDays: 30
  };

  // Split Stay loads one-night prices on demand: two requests per night and results page.
  const SPLIT = {
    minNights: 2,
    maxNights: 14,
    maxCertificates: 5,
    // A hotel change is only suggested when it saves at least this share.
    switchSaving: 0.1
  };

  // Flexible Dates moves the arrival by up to maxShift days each way, keeping the stay
  // length, and loads on demand: two requests per shifted stay and results page.
  const CALENDAR = {
    maxShift: 3,
    defaultShift: 2
  };

  // Suite Finder loads on demand: room types and their points prices, two requests per hotel.
  const SUITES = {
    maxHotels: 10,
    // Upgrades shown per hotel; the rest are on Hilton.
    maxShown: 6
  };

  // Price Watch re-prices watched stays when a hilton.com page loads: two requests per stay.
  const WATCH = {
    maxStays: 10,
    startDelay: 6000,
    // A stay is checked at most this often; failed checks are retried sooner.
    everyHours: 6,
    retryMinutes: 30,
    // A drop of at least this share of the paid price is worth rebooking.
    minDrop: 0.01
  };

  // Credit Tracker: the Aspire card's resort credit, in USD per half year (Jan–Jun, Jul–Dec).
  const CREDIT = {
    perHalf: 200,
    maxEntries: 200,
    // The home card counts down the days once the half year ends this soon.
    soonDays: 45
  };
 
  const nativeFetch = window.fetch.bind(window);
 
  const state = {
    hotels: new Map(),
    results: new Map(),
    processed: new Set(),
    resorts: null,
    search: null,
    generation: 0,
    destination: '',
    busy: false,
    stop: false,
    paused: false,
    panel: null,
    minimized: false,
    // Key of VIEWS shown in the panel.
    view: 'home',
    // Tools switched on by the user; a tool that is off sends no requests.
    tools: { resort: true, points: true, free: true, split: true, calendar: true, rates: true, suites: true, watch: true, credit: true },
    // Captured search pages ({ codes, input }), to load points prices
    // when Cash vs. Points is switched on later.
    batches: [],
    pages: 0,
    autoScan: true,
    scan: null,
    // Euro cents per Hilton Honors point.
    pointValue: 0.433,
    // Currency the comparison is shown in.
    currency: 'EUR',
    // Free Night Finder ranks by cash price ('cash') or points saved ('points').
    freeSort: 'cash',
    // Split Stay: one-night prices per night of the stay, see loadSplit().
    split: freshSplit(),
    // Free Night Certificates the Split Stay may use.
    certificates: 0,
    // Flexible Dates: prices of the stay shifted by a few days, see loadCalendar().
    calendar: freshCalendar(),
    // Days the arrival is moved each way.
    calendarRange: CALENDAR.defaultShift,
    // Flexible Dates shows cash ('cash') or points ('points').
    calendarMode: 'cash',
    // Rate Inspector: the hotel and room type being inspected, see inspectRates().
    inspect: freshInspect(null),
    // Hilton's rate plans by planKey(), from the scan or the Rate Inspector.
    plans: new Map(),
    // Rate Inspector also asks for AAA and Senior rates.
    inspectSpecial: false,
    // Suite Finder: room types with cash and points prices per hotel, see loadSuites().
    suites: freshSuites(),
    // Suite Finder shows suites and villas ('suites') or every pricier room type ('all').
    suiteShow: 'suites',
    // Price Watch: watched stays (saved, see loadWatchItems()) and the running check.
    watch: { items: [], status: 'idle', done: 0, total: 0 },
    // Credit Tracker: credit per half year and the charges booked against it, see loadCredit().
    credit: { amount: CREDIT.perHalf, entries: [] },
    // Hilton's conversion factors by currency code, see loadCurrencies().
    currencies: null,
    currencyError: '',
    // Hotel names from Hilton's hotelSummaryOptions request, by code.
    names: new Map(),
    // Codes already sent in a points request this search.
    extras: { points: new Set(), pending: 0, error: '' },
    // status: idle, checking, current, available or failed.
    update: {
      auto: true,
      status: 'idle',
      latest: null,
      notes: null,
      skipped: null,
      installing: false
    }
  };

  try {
    state.autoScan = localStorage.getItem(AUTO_KEY) !== 'off';

    const pointValue = parseFloat(localStorage.getItem(POINT_KEY));
    if (pointValue > 0) state.pointValue = pointValue;

    const currency = localStorage.getItem(CURRENCY_KEY);
    if (/^[A-Z]{3}$/.test(currency || '')) state.currency = currency;

    if (localStorage.getItem(FREE_SORT_KEY) === 'points') state.freeSort = 'points';

    const certificates = parseInt(localStorage.getItem(SPLIT_CERTS_KEY), 10);
    if (certificates >= 0) {
      state.certificates = Math.min(SPLIT.maxCertificates, certificates);
    }

    const range = parseInt(localStorage.getItem(CALENDAR_RANGE_KEY), 10);
    if (range >= 1) state.calendarRange = Math.min(CALENDAR.maxShift, range);

    if (localStorage.getItem(CALENDAR_MODE_KEY) === 'points') state.calendarMode = 'points';

    state.inspectSpecial = localStorage.getItem(RATES_SPECIAL_KEY) === 'on';

    if (localStorage.getItem(SUITES_SHOW_KEY) === 'all') state.suiteShow = 'all';

    state.update.auto = localStorage.getItem(UPDATE_AUTO_KEY) !== 'off';
    state.update.skipped = savedUpdate().skipped || null;

    const tools = JSON.parse(localStorage.getItem(TOOLS_KEY) || '{}');

    for (const tool of Object.keys(state.tools)) {
      if (typeof tools?.[tool] === 'boolean') state.tools[tool] = tools[tool];
    }

    const view = localStorage.getItem(VIEW_KEY);
    if (Object.hasOwn(VIEWS, view) && state.tools[view] !== false) {
      state.view = view;
    }
  } catch {}
 
  let autoTimer = null;
  let reloadTimer = null;
 
  const $ = id => state.panel?.querySelector('#' + id);
 
  const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));
 
  const parse = text => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };
 
  const html = value =>
    String(value ?? '').replace(
      /[&<>"']/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c])
    );
 
  function status(message) {
    const element = $('hpt-status');
    if (!element) return;

    element.textContent = message;
    element.dataset.busy = String(state.busy);
  }
 
  function isGraphQL(value) {
    try {
      const url = new URL(value, location.href);
      return url.origin === location.origin &&
        url.pathname === API;
    } catch {
      return false;
    }
  }
 
  // =====================================
  // Search state and destination switching
  // =====================================
 
  function locationKey() {
    const url = new URL(location.href);
 
    return [
      url.pathname,
      url.searchParams.get('query') || '',
      url.searchParams.get('arrivalDate') || '',
      url.searchParams.get('departureDate') || ''
    ].join('|').toLowerCase();
  }
 
  state.destination = locationKey();
 
  function invalidate(reason) {
    state.generation++;
    state.stop = true;
 
    clearTimeout(autoTimer);
 
    state.hotels.clear();
    state.results.clear();
    state.processed.clear();
 
    state.search = null;
    state.pages = 0;
    state.batches = [];
    state.extras = { points: new Set(), pending: 0, error: '' };
    state.split = freshSplit();
    state.calendar = freshCalendar();
    state.inspect = freshInspect(null);
    state.plans.clear();
    state.suites = freshSuites();
 
    render();
    status(reason);
  }
 
  function syncLocation() {
    const current = locationKey();
 
    if (current === state.destination) return;
 
    state.destination = current;
    invalidate('Search criteria changed, switching…');
 
    clearTimeout(reloadTimer);
 
    if (!location.pathname.includes('/search')) {
      return;
    }
 
    const targetURL = location.href;
 
    reloadTimer = setTimeout(() => {
      if (location.href !== targetURL) return;
 
      const previous = parse(
        sessionStorage.getItem(RELOAD_KEY)
      );
 
      if (
        previous?.url === targetURL &&
        Date.now() - previous.at < 30000
      ) {
        return;
      }
 
      sessionStorage.setItem(
        RELOAD_KEY,
        JSON.stringify({
          url: targetURL,
          at: Date.now()
        })
      );
 
      location.reload();
    }, 800);
  }
 
  setInterval(syncLocation, 350);
 
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
 
    history[method] = function(...args) {
      const result = original.apply(this, args);
      syncLocation();
      return result;
    };
  }
 
  addEventListener('popstate', syncLocation);
 
  // =====================================
  // Official Resort Credit hotel list
  // =====================================
 
  function hotelCode(href) {
    try {
      return new URL(href, OFFICIAL)
        .pathname
        .match(/\/hotels\/([^/?#-]+)(?:-|\/|$)/i)
        ?.[1]?.toUpperCase() || null;
    } catch {
      return null;
    }
  }
 
  async function loadResorts() {
    if (state.resorts) return state.resorts;
 
    const cached = parse(localStorage.getItem(CACHE));
 
    if (
      Array.isArray(cached?.items) &&
      cached.items.length >= 50 &&
      Date.now() - cached.at <
        CONFIG.cacheDays * 86400000
    ) {
      state.resorts = new Map(
        cached.items.map(item => [
          String(item.code).toUpperCase(),
          item
        ])
      );
 
      render();
      return state.resorts;
    }
 
    const response = await nativeFetch(OFFICIAL, {
      credentials: 'same-origin',
      cache: 'no-store'
    });
 
    if (!response.ok) {
      throw Error(`Official list HTTP ${response.status}`);
    }
 
    const documentHTML = new DOMParser()
      .parseFromString(
        await response.text(),
        'text/html'
      );
 
    const map = new Map();
 
    for (const a of documentHTML.querySelectorAll(
      'main a[href*="/hotels/"]'
    )) {
      const code = hotelCode(a.getAttribute('href'));
      if (!code) continue;
 
      const name = a.textContent
        .replace(/\s+/g, ' ')
        .trim();
 
      const url = new URL(
        a.getAttribute('href'),
        OFFICIAL
      ).href;
 
      if (
        !map.has(code) ||
        name.length > map.get(code).name.length
      ) {
        map.set(code, { code, name, url });
      }
    }
 
    if (map.size < 50) {
      throw Error(
        `Official list parse incomplete, only ${map.size} hotels`
      );
    }
 
    localStorage.setItem(
      CACHE,
      JSON.stringify({
        at: Date.now(),
        items: [...map.values()]
      })
    );
 
    state.resorts = map;
    render();
 
    return map;
  }
 
  // =====================================
  // Capture Hilton destination search results
  // =====================================
 
  function settings(input) {
    return {
      arrival: input.arrivalDate,
      departure: input.departureDate,
      adults: input.numAdults ?? 1,
      children: input.numChildren ?? 0,
      rooms: input.numRooms ?? 1,
      currency: input.displayCurrency || 'USD',
      country: input.guestLocationCountry || 'DE'
    };
  }
 
  function datesMatch(input) {
    const url = new URL(location.href);
 
    const arrival = url.searchParams.get('arrivalDate');
    const departure = url.searchParams.get('departureDate');
 
    return (
      (!arrival || arrival === input.arrivalDate) &&
      (!departure || departure === input.departureDate)
    );
  }
 
  // Hilton's search asks for amountAfterTax(currencyCode: "USD"); without it, amounts are in the hotel's currency.
  function cashCurrency(query) {
    return String(query || '').match(
      /amountAfterTax\(\s*currencyCode:\s*"([A-Z]{3})"/
    )?.[1] || null;
  }

  async function post(
    operationName,
    query,
    variables,
    appName,
    originalOpName = operationName
  ) {
    const url = new URL(API, location.origin);

    for (const [key, value] of Object.entries({
      appName,
      operationName,
      originalOpName,
      bl: 'en'
    })) {
      url.searchParams.set(key, value);
    }

    const response = await nativeFetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({ query, operationName, variables })
    });

    const data = parse(await response.text());

    if (!response.ok) throw Error(`HTTP ${response.status}`);
    if (!data) throw Error('non-JSON response');

    if (data.errors?.length) {
      throw Error(
        data.errors.map(e => e.message).join('; ').slice(0, 200)
      );
    }

    return data.data;
  }

  // Same search as Hilton's "Use Points" toggle, only asking for the points price.
  const POINTS_QUERY = `
    query shopMultiPropAvail(
      $ctyhocns: [String!],
      $language: String!,
      $input: ShopMultiPropAvailQueryInput!
    ) {
      shopMultiPropAvail(
        input: $input,
        language: $language,
        ctyhocns: $ctyhocns
      ) {
        ctyhocn
        statusCode
        summary {
          hhonors {
            dailyRmPointsRate
            ratePlan {
              ratePlanName
            }
          }
        }
      }
    }
  `;

  // Points prices feed Cash vs. Points and the Free Night Finder.
  const wantsPoints = () => state.tools.points || state.tools.free;

  // Hilton names the lowest award "Standard Room Reward" or "Premium Room Reward";
  // a Free Night Certificate only covers a Standard Room Reward.
  function rewardType(hhonors) {
    const name = hhonors?.ratePlan?.ratePlanName;
    if (!name) return null;

    return /premium/i.test(name) ? 'premium' : 'standard';
  }

  async function loadPoints(codes, input, generation) {
    // Hilton's own points search may lack the rate plan name, so ask again for those.
    const missing = codes.filter(code =>
      !state.extras.points.has(code) &&
      !state.hotels.get(code)?.reward
    );

    if (!missing.length) return;

    missing.forEach(code => state.extras.points.add(code));
    state.extras.pending++;
    render();

    try {
      const data = await post(
        'shopMultiPropAvail',
        POINTS_QUERY,
        {
          input: {
            ...input,
            specialRates: {
              ...(input.specialRates || {}),
              hhonors: true
            }
          },
          ctyhocns: missing,
          language: 'en'
        },
        'dx_shop_search_app'
      );

      if (generation !== state.generation) return;

      for (const hotel of data?.shopMultiPropAvail || []) {
        const entry = state.hotels.get(hotel?.ctyhocn);
        const points = hotel?.summary?.hhonors?.dailyRmPointsRate;

        if (entry && Number.isFinite(points) && points > 0) {
          entry.points = points;
          entry.reward = rewardType(hotel.summary.hhonors) || 'standard';
        }
      }

    } catch (error) {
      if (generation === state.generation) {
        state.extras.error = `Points prices: ${error.message}`;
      }

    } finally {
      if (generation === state.generation) {
        state.extras.pending--;
        render();
      }
    }
  }

  const CURRENCIES_QUERY = `
    query currencies($language: String!) {
      currencies(language: $language, sort: { by: currencyCode }) {
        conversionFactor
        currencyCode
        description
      }
    }
  `;

  // Loads Hilton's currency converter rates once and caches them for 12 hours.
  async function loadCurrencies() {
    if (state.currencies) return;

    const cached = parse(localStorage.getItem(RATES_KEY));

    if (
      Array.isArray(cached?.items) &&
      cached.items.length &&
      Date.now() - cached.at < 12 * 3600000
    ) {
      state.currencies = new Map(
        cached.items.map(item => [item.currencyCode, item])
      );
      render();
      return;
    }

    // Marks the request as running so it is not sent twice.
    state.currencies = new Map();

    try {
      const data = await post(
        'currencies',
        CURRENCIES_QUERY,
        { language: 'en' },
        'dx_shop_search_app',
        'getCurrencyConverterCurrencies'
      );

      const items = (data?.currencies || []).filter(item =>
        /^[A-Z]{3}$/.test(item?.currencyCode || '') &&
        item.conversionFactor > 0
      );

      if (!items.length) throw Error('no currencies returned');

      state.currencies = new Map(
        items.map(item => [item.currencyCode, item])
      );
      state.currencyError = '';

      try {
        localStorage.setItem(
          RATES_KEY,
          JSON.stringify({ at: Date.now(), items })
        );
      } catch {}

    } catch (error) {
      state.currencies = null;
      state.currencyError = `Exchange rates: ${error.message}`;
    }

    render();
  }

  // status: idle, loading or done; nights[i] holds the prices for one night of the stay.
  function freshSplit() {
    return { status: 'idle', nights: [], done: 0, total: 0, errors: [] };
  }

  // Date of the given day after an ISO date, as an ISO date.
  function addDays(date, days) {
    const day = new Date(`${date}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() + days);

    return day.toISOString().slice(0, 10);
  }

  // Cheapest cash price after tax in USD, like Hilton's own search asks for it
  // (one night for Split Stay, the shifted stay for Flexible Dates).
  const NIGHT_CASH_QUERY = `
    query shopMultiPropAvail(
      $ctyhocns: [String!],
      $language: String!,
      $input: ShopMultiPropAvailQueryInput!
    ) {
      shopMultiPropAvail(
        input: $input,
        language: $language,
        ctyhocns: $ctyhocns
      ) {
        ctyhocn
        statusCode
        summary {
          lowest {
            amountAfterTax(currencyCode: "USD")
          }
        }
      }
    }
  `;

  // Requests a split stay sends: cash and points for each night of each results page.
  const splitRequests = () => nights() * state.batches.length * 2;

  // Loads the cash and points price of every single night of the stay, one night at a time.
  async function loadSplit() {
    const stay = nights();

    if (
      !state.tools.split ||
      !state.search ||
      state.split.status === 'loading' ||
      stay < SPLIT.minNights ||
      stay > SPLIT.maxNights ||
      !state.batches.length
    ) return;

    const generation = state.generation;
    const batches = [...state.batches];

    state.split = {
      status: 'loading',
      nights: Array.from({ length: stay }, (_, index) => ({
        date: addDays(state.search.arrival, index),
        cash: new Map(),
        points: new Map()
      })),
      done: 0,
      total: stay * batches.length * 2,
      errors: []
    };

    loadCurrencies();
    render();

    const split = state.split;

    for (const night of split.nights) {
      for (const batch of batches) {
        for (const points of [false, true]) {
          if (generation !== state.generation || state.split !== split) return;

          // Switched off while loading: keep nothing half loaded.
          if (!state.tools.split) {
            state.split = freshSplit();
            render();
            return;
          }

          try {
            const data = await post(
              'shopMultiPropAvail',
              points ? POINTS_QUERY : NIGHT_CASH_QUERY,
              {
                input: {
                  ...batch.input,
                  arrivalDate: night.date,
                  departureDate: addDays(night.date, 1),
                  specialRates: {
                    ...(batch.input.specialRates || {}),
                    hhonors: points
                  }
                },
                ctyhocns: batch.codes,
                language: 'en'
              },
              'dx_shop_search_app'
            );

            if (generation !== state.generation || state.split !== split) return;

            for (const hotel of data?.shopMultiPropAvail || []) {
              if (!hotel?.ctyhocn || hotel.statusCode !== 0) continue;

              if (points) {
                const perNight = hotel.summary?.hhonors?.dailyRmPointsRate;

                if (Number.isFinite(perNight) && perNight > 0) {
                  night.points.set(hotel.ctyhocn, {
                    points: perNight,
                    reward: rewardType(hotel.summary.hhonors) || 'standard'
                  });
                }
              } else {
                const amount = hotel.summary?.lowest?.amountAfterTax;

                if (Number.isFinite(amount) && amount > 0) {
                  night.cash.set(hotel.ctyhocn, amount);
                }
              }
            }

          } catch (error) {
            if (generation !== state.generation || state.split !== split) return;

            const issue = `${night.date} ${points ? 'points' : 'cash'}: ${error.message}`;
            if (!split.errors.includes(issue)) split.errors.push(issue);
          }

          split.done++;
          render();

          if (split.done < split.total) await sleep(CONFIG.delay);
        }
      }
    }

    if (generation !== state.generation || state.split !== split) return;

    split.status = 'done';
    render();
  }

  // status: idle, loading or done; days[i] holds the prices of the stay moved by days[i].offset.
  function freshCalendar() {
    return { status: 'idle', range: 0, days: [], arrival: '', done: 0, total: 0, errors: [] };
  }

  // Today in the user's time zone, as an ISO date.
  function today() {
    const now = new Date();

    return new Date(now - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  }

  // Days the arrival can move for Flexible Dates, without arrivals in the past; 0 is the search.
  function calendarShifts(range = state.calendarRange) {
    const first = today();
    const shifts = [];

    for (let offset = -range; offset <= range; offset++) {
      if (addDays(state.search.arrival, offset) >= first) shifts.push(offset);
    }

    return shifts;
  }

  // What Flexible Dates asks for on one shift. The search itself already has its cash prices,
  // and its points prices while Cash vs. Points or Free Night Finder is on.
  const calendarKinds = offset =>
    offset ? ['cash', 'points'] : wantsPoints() ? [] : ['points'];

  const calendarRequests = () => state.search
    ? calendarShifts().reduce((sum, offset) => sum + calendarKinds(offset).length, 0) *
      state.batches.length
    : 0;

  // Loads cash and points prices of the same stay with the arrival moved a few days.
  async function loadCalendar() {
    if (
      !state.tools.calendar ||
      !state.search ||
      state.calendar.status === 'loading' ||
      !state.batches.length
    ) return;

    const generation = state.generation;
    const batches = [...state.batches];
    const s = state.search;

    const days = calendarShifts().map(offset => {
      const kinds = calendarKinds(offset);

      return {
        offset,
        arrival: addDays(s.arrival, offset),
        departure: addDays(s.departure, offset),
        kinds,
        // Whole-stay cash in USD and points per night by hotel; null reads the search's own prices.
        cash: kinds.includes('cash') ? new Map() : null,
        points: kinds.includes('points') ? new Map() : null
      };
    });

    state.calendar = {
      status: 'loading',
      range: state.calendarRange,
      days,
      done: 0,
      total: days.reduce((sum, day) => sum + day.kinds.length, 0) * batches.length,
      errors: []
    };

    loadCurrencies();
    render();

    const calendar = state.calendar;

    for (const day of days) {
      // Shown in the progress line.
      calendar.arrival = day.arrival;

      for (const batch of batches) {
        for (const kind of day.kinds) {
          if (generation !== state.generation || state.calendar !== calendar) return;

          // Switched off while loading: keep nothing half loaded.
          if (!state.tools.calendar) {
            state.calendar = freshCalendar();
            render();
            return;
          }

          const points = kind === 'points';

          try {
            const data = await post(
              'shopMultiPropAvail',
              points ? POINTS_QUERY : NIGHT_CASH_QUERY,
              {
                input: {
                  ...batch.input,
                  arrivalDate: day.arrival,
                  departureDate: day.departure,
                  specialRates: {
                    ...(batch.input.specialRates || {}),
                    hhonors: points
                  }
                },
                ctyhocns: batch.codes,
                language: 'en'
              },
              'dx_shop_search_app'
            );

            if (generation !== state.generation || state.calendar !== calendar) return;

            for (const hotel of data?.shopMultiPropAvail || []) {
              if (!hotel?.ctyhocn || hotel.statusCode !== 0) continue;

              const value = points
                ? hotel.summary?.hhonors?.dailyRmPointsRate
                : hotel.summary?.lowest?.amountAfterTax;

              if (Number.isFinite(value) && value > 0) {
                day[kind].set(hotel.ctyhocn, value);
              }
            }

          } catch (error) {
            if (generation !== state.generation || state.calendar !== calendar) return;

            const issue = `${day.arrival} ${kind}: ${error.message}`;
            if (!calendar.errors.includes(issue)) calendar.errors.push(issue);
          }

          calendar.done++;
          render();

          if (calendar.done < calendar.total) await sleep(CONFIG.delay);
        }
      }
    }

    if (generation !== state.generation || state.calendar !== calendar) return;

    calendar.status = 'done';
    render();
  }

  function ingest(
    url,
    request,
    response,
    generation,
    destination
  ) {
    syncLocation();
 
    if (
      !isGraphQL(url) ||
      generation !== state.generation ||
      destination !== state.destination
    ) return;
 
    const requests = Array.isArray(request)
      ? request
      : [request];
 
    const responses = Array.isArray(response)
      ? response
      : [response];
 
    requests.forEach((req, index) => {
      // Hilton's map/list request carries the hotel names the search lacks.
      const summary = (
        responses[index] || responses[0]
      )?.data?.hotelSummaryOptions?.hotels;

      if (Array.isArray(summary)) {
        for (const hotel of summary) {
          if (!hotel?.ctyhocn || !hotel.name) continue;

          state.names.set(hotel.ctyhocn, hotel.name);

          const known = state.hotels.get(hotel.ctyhocn);
          if (known) known.name = hotel.name;
        }

        render();
        return;
      }

      if (
        !/shopMultiPropAvail/i.test(
          `${req?.operationName || ''} ${req?.query || ''}`
        )
      ) return;
 
      const input = req.variables?.input;
      const codes = req.variables?.ctyhocns;
 
      const list = (
        responses[index] || responses[0]
      )?.data?.shopMultiPropAvail;
 
      if (
        !input?.arrivalDate ||
        !input?.departureDate ||
        !Array.isArray(codes) ||
        !Array.isArray(list) ||
        !datesMatch(input)
      ) return;
 
      const next = settings(input);
 
      if (
        state.search &&
        JSON.stringify(state.search) !==
        JSON.stringify(next)
      ) return;
 
      if (!state.search) state.search = next;
 
      const allowed = new Set(codes);
      let added = 0;
 
      for (const hotel of list) {
        const code = hotel?.ctyhocn;
 
        if (!code || !allowed.has(code)) continue;
 
        if (!state.hotels.has(code)) added++;
 
        const old = state.hotels.get(code) || {};
 
        const points =
          hotel.summary?.hhonors?.dailyRmPointsRate;

        const lowest = hotel.summary?.lowest;

        state.hotels.set(code, {
          ...old,
          code,
          name:
            hotel.name ||
            hotel.hotelName ||
            hotel.propertyName ||
            state.names.get(code) ||
            old.name ||
            '',
          // Lowest reward points per night, if Hilton returned one.
          points:
            Number.isFinite(points) && points > 0
              ? points
              : old.points || null,
          // 'standard' or 'premium' Room Reward, null while unknown.
          reward:
            Number.isFinite(points) && points > 0
              ? rewardType(hotel.summary.hhonors)
              : old.reward || null,
          // Cheapest cash rate for the whole stay, after tax.
          cash: Number.isFinite(lowest?.amountAfterTax)
            ? {
                amount: lowest.amountAfterTax,
                currency:
                  cashCurrency(req.query) ||
                  hotel.currencyCode ||
                  state.search.currency,
                plan: lowest.ratePlan?.ratePlanName || ''
              }
            : old.cash || null,
          bookable: hotel.statusCode === 0,
          // Hilton's reason when not bookable, e.g. "Hotel no longer a hilton".
          statusMessage: hotel.statusMessage || ''
        });
      }
 
      state.pages++;
      state.batches.push({ codes, input });

      if (wantsPoints()) {
        loadPoints(codes, input, generation);
        loadCurrencies();
      }

      render();
 
      if (added) {
        if (state.tools.resort) status(
          state.autoScan
            ? 'Hotel list captured, preparing auto scan…'
            : 'Hotel list captured; click Quick scan to start'
        );
        scheduleAutoScan();
      }
    });
  }
 
  // Only observe site requests, never modify Hilton responses
  const originalWindowFetch = window.fetch;
 
  window.fetch = function(input, init) {
    const output = originalWindowFetch.apply(
      this,
      arguments
    );
 
    try {
      const url =
        typeof input === 'string' ||
        input instanceof URL
          ? String(input)
          : input?.url;
 
      if (isGraphQL(url)) {
        syncLocation();
 
        const generation = state.generation;
        const destination = state.destination;
 
        const body =
          typeof init?.body === 'string'
            ? Promise.resolve(init.body)
            : input instanceof Request
              ? input.clone().text()
              : Promise.resolve('');
 
        Promise.all([
          body,
          output.then(r => r.clone().text())
        ])
          .then(([bodyText, responseText]) => {
            ingest(
              url,
              parse(bodyText),
              parse(responseText),
              generation,
              destination
            );
          })
          .catch(() => {});
      }
    } catch {}
 
    return output;
  };
 
  const xhrOpen = XMLHttpRequest.prototype.open;
  const xhrSend = XMLHttpRequest.prototype.send;
 
  XMLHttpRequest.prototype.open =
    function(method, url, ...rest) {
      this.__hiltonProToolsURL = url;
 
      return xhrOpen.call(
        this,
        method,
        url,
        ...rest
      );
    };
 
  XMLHttpRequest.prototype.send = function(body) {
    if (
      isGraphQL(this.__hiltonProToolsURL) &&
      typeof body === 'string'
    ) {
      syncLocation();
 
      const generation = state.generation;
      const destination = state.destination;
 
      this.addEventListener('load', () => {
        ingest(
          this.__hiltonProToolsURL,
          parse(body),
          parse(this.responseText),
          generation,
          destination
        );
      }, { once: true });
    }
 
    return xhrSend.apply(this, arguments);
  };
 
  // =====================================
  // Rate GraphQL
  // =====================================
 
  const V = `
    $arrivalDate:String!,
    $departureDate:String!,
    $ctyhocn:String!,
    $language:String!,
    $guestLocationCountry:String,
    $numAdults:Int!,
    $numChildren:Int!,
    $numRooms:Int!,
    $displayCurrency:String,
    $guestId:BigInt,
    $specialRates:ShopSpecialRateInput,
    $cacheId:String!,
    $knownGuest:Boolean,
    $modifyingReservation:Boolean,
    $childAges:[Int],
    $adjoiningRoomStay:Boolean,
    $includeCUCEligibility:Boolean
  `;
 
  const INPUT = `
    cacheId:$cacheId,
    input:{
      guestLocationCountry:$guestLocationCountry,
      arrivalDate:$arrivalDate,
      departureDate:$departureDate,
      displayCurrency:$displayCurrency,
      numAdults:$numAdults,
      numChildren:$numChildren,
      numRooms:$numRooms,
      guestId:$guestId,
      specialRates:$specialRates,
      knownGuest:$knownGuest,
      modifyingReservation:$modifyingReservation,
      childAges:$childAges,
      adjoiningRoomStay:$adjoiningRoomStay,
      includeCUCEligibility:$includeCUCEligibility,
      includeGuests:true
    }
  `;
 
  const GUARANTEE = `
    depositRequired
    nonRefundable
    cxlPolicyCode
    cxlPolicyDesc
    guarPolicyCode
    guarPolicyDesc
  `;
 
  const PLAN = `
    ratePlanCode
    ratePlanName
    ratePlanDesc
    advancePurchase
  `;
 
  const QUICK = `
    query hotel_shopAvailOptions_shopPropAvail(
      ${V},
      $roomTypeSortInput:[ShopRoomTypeSortInput!]
    ) {
      hotel(ctyhocn:$ctyhocn,language:$language) {
        ctyhocn
        shopAvail(${INPUT}) {
          statusCode
          roomTypes(sort:$roomTypeSortInput) {
            roomTypeCode
            roomTypeName
            quickBookRate {
              rateAmount
              ratePlanCode
            }
            moreRatesFromRate {
              rateAmount
              ratePlanCode
            }
          }
        }
      }
    }
  `;
 
  const FULL = `
    query hotel_shopAvailOptions_shopPropAvail(
      ${V},
      $selectedRoomTypeCode:String
    ) {
      hotel(ctyhocn:$ctyhocn,language:$language) {
        ctyhocn
        shopAvail(${INPUT}) {
          statusCode
          roomTypes(
            filter:{roomTypeCode:$selectedRoomTypeCode}
          ) {
            roomTypeCode
            roomTypeName
            roomOnlyRates {
              roomTypeCode
              ratePlanCode
              rateAmount
              amountAfterTaxFmt
              ratePlan {${PLAN}}
              guarantee {${GUARANTEE}}
              hhonorsDiscountRate {
                roomTypeCode
                ratePlanCode
                rateAmount
                amountAfterTaxFmt
                ratePlan {${PLAN}}
                guarantee {${GUARANTEE}}
              }
            }
          }
        }
      }
    }
  `;
 
  // Every room type with its lowest reward per night, like the room selection with "Use Points".
  const ROOM_POINTS = `
    query hotel_shopAvailOptions_shopPropAvail(${V}) {
      hotel(ctyhocn:$ctyhocn,language:$language) {
        ctyhocn
        shopAvail(${INPUT}) {
          statusCode
          roomTypes {
            roomTypeCode
            roomTypeName
            redemptionRoomRates(first:1) {
              ratePlanCode
              ratePlan {
                ratePlanName
              }
              pointDetails(perNight:true) {
                pointsRate
              }
            }
          }
        }
      }
    }
  `;

  // s: the search to price, by default the current one (Price Watch passes a saved stay).
  function variables(code, room, cacheId, s = state.search) {
 
    return {
      ctyhocn: code,
      language: 'en',
      guestLocationCountry: s.country,
      arrivalDate: s.arrival,
      departureDate: s.departure,
      numAdults: s.adults,
      numChildren: s.children,
      numRooms: s.rooms,
      displayCurrency: s.currency,
      guestId: null,
      knownGuest: true,
      modifyingReservation: false,
      childAges: null,
      adjoiningRoomStay: false,
      includeCUCEligibility: false,
      roomTypeSortInput: [],
      selectedRoomTypeCode: room,
      cacheId,
      specialRates: {
        aaa: false,
        governmentMilitary: false,
        hhonors: false,
        lta: false,
        pnd: '',
        senior: false,
        teamMember: false,
        owner: false,
        ownerHGV: false,
        familyAndFriends: false,
        travelAgent: false,
        smb: false,
        specialOffer: false,
        specialOfferName: null
      }
    };
  }
 
  // counted: part of the scan, for its time estimate.
  async function ask(query, values, counted = true) {
    if (counted && state.scan) state.scan.requests++;

    const url = new URL(API, location.origin);
 
    for (const [key, value] of Object.entries({
      appName: 'dx-res-ui',
      operationName:
        'hotel_shopAvailOptions_shopPropAvail',
      originalOpName: 'getShopAvail',
      bl: 'en',
      ctyhocn: values.ctyhocn
    })) {
      url.searchParams.set(key, value);
    }
 
    const response = await nativeFetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        query,
        operationName:
          'hotel_shopAvailOptions_shopPropAvail',
        variables: values
      })
    });
 
    const raw = await response.text();
    const data = parse(raw);
 
    if (!response.ok) {
      throw Error(`HTTP ${response.status}`);
    }
 
    if (!data) {
      throw Error(
        `Non-JSON response: ${raw.slice(0, 80)}`
      );
    }
 
    if (data.errors?.length) {
      throw Error(
        data.errors
          .map(e => e.message)
          .join('; ')
          .slice(0, 200)
      );
    }
 
    const hotel = data.data?.hotel;
 
    if (!hotel?.shopAvail) {
      throw Error('No hotel rate data returned');
    }
 
    if (hotel.shopAvail.statusCode === 1740) {
      return { ...hotel, unavailable: true };
    }
 
    if (
      hotel.shopAvail.statusCode != null &&
      hotel.shopAvail.statusCode !== 0
    ) {
      throw Error(
        `Rate query status ${hotel.shopAvail.statusCode}`
      );
    }
 
    return hotel;
  }
 
  function referencePrice(room) {
    const values = [
      room.quickBookRate?.rateAmount,
      room.moreRatesFromRate?.rateAmount
    ].filter(Number.isFinite);
 
    return values.length
      ? Math.min(...values)
      : Infinity;
  }
 
  // =====================================
  // Hotel room type scan
  // =====================================
 
  function getEntry(hotel) {
    let entry = state.results.get(hotel.code);
    if (entry) return entry;
 
    const listed = state.resorts.get(hotel.code);
 
    entry = {
      code: hotel.code,
      name:
        listed?.name ||
        hotel.name ||
        state.names.get(hotel.code) ||
        hotel.code,
      codeUsed: null,
      cache: null,
      rooms: null,
      totalRooms: 0,
      done: new Set(),
      seen: new Set(),
      matches: [],
      errors: [],
      unavailable: false,
      full: false
    };
 
    state.results.set(hotel.code, entry);
    return entry;
  }
 
  async function discoverRooms(hotel, entry, generation) {
    const errors = [];
    let unavailable = 0;
 
    const aliases = [
      hotel.code,
      ...(hotel.code.length > 5
        ? [hotel.code.slice(0, 5)]
        : [])
    ];
 
    for (const code of [...new Set(aliases)]) {
      if (
        state.stop ||
        generation !== state.generation
      ) return;
 
      try {
        const cache =
          crypto.randomUUID?.() ||
          `${Date.now()}-${Math.random()}`;
 
        const result = await ask(
          QUICK,
          variables(code, null, cache)
        );
 
        if (
          state.stop ||
          generation !== state.generation
        ) return;
 
        if (result.unavailable) {
          unavailable++;
          continue;
        }
 
        if (result.ctyhocn !== hotel.code) {
          errors.push(`${code}: hotel code mismatch`);
          continue;
        }
 
        const rooms = (
          result.shopAvail.roomTypes || []
        )
          .filter(room => room.roomTypeCode)
          .sort(
            (a, b) =>
              referencePrice(a) - referencePrice(b)
          );
 
        if (rooms.length) {
          entry.codeUsed = code;
          entry.cache = cache;
          entry.rooms = rooms.slice(0, CONFIG.maxRooms);
          entry.totalRooms = rooms.length;
          entry.errors = entry.errors.filter(
            x => !x.startsWith('Init: ')
          );
          return;
        }
 
        errors.push(`${code}: no bookable room types found`);
 
      } catch (error) {
        errors.push(`${code}: ${error.message}`);
      }
 
      if (!state.stop) {
        await sleep(CONFIG.delay);
      }
    }
 
    if (unavailable && !errors.length) {
      entry.unavailable = true;
    } else if (
      !state.stop &&
      generation === state.generation
    ) {
      entry.errors = [
        ...new Set([
          ...entry.errors,
          ...errors.map(x => `Init: ${x}`)
        ])
      ];
    }
  }
 
  function extractRates(entry, room, hotel) {
    const selected = (
      hotel.shopAvail.roomTypes || []
    ).find(
      x => x.roomTypeCode === room.roomTypeCode
    );
 
    if (!selected) {
      throw Error('Target room type not returned');
    }
 
    const rates = selected.roomOnlyRates;
 
    if (!Array.isArray(rates) || !rates.length) {
      throw Error('Full rate plans not returned');
    }

    // The Rate Inspector shows them without asking again.
    state.plans.set(planKey(entry.code, room.roomTypeCode, ''), rates);
 
    for (const base of rates) {
      const offers = [
        [base, null],
        ...(base?.hhonorsDiscountRate
          ? [[base.hhonorsDiscountRate, base]]
          : [])
      ];
 
      for (const [rate, parent] of offers) {
        if (!rate) continue;
 
        const plan = rate.ratePlan || {};
        const parentPlan = parent?.ratePlan || {};
 
        const name = String(
          plan.ratePlanName ||
          parentPlan.ratePlanName ||
          ''
        );
 
        const description = String(
          plan.ratePlanDesc ||
          parentPlan.ratePlanDesc ||
          ''
        );
 
        if (
          !/semi[\s-]*flex/i.test(
            `${name} ${description}`
          )
        ) continue;
 
        const guarantee = rate.guarantee || {};
        const parentGuarantee =
          parent?.guarantee || {};
 
        const deposit =
          guarantee.depositRequired ??
          parentGuarantee.depositRequired;
 
        const nonRefundable =
          guarantee.nonRefundable ??
          parentGuarantee.nonRefundable;
 
        const advance =
          plan.advancePurchase ??
          parentPlan.advancePurchase;
 
        if (
          deposit !== true ||
          nonRefundable !== false ||
          advance === true
        ) continue;
 
        const code =
          rate.ratePlanCode ||
          plan.ratePlanCode ||
          '';
 
        const key = `${room.roomTypeCode}|${code}`;
 
        if (entry.seen.has(key)) continue;
 
        entry.seen.add(key);
 
        entry.matches.push({
          room: room.roomTypeCode,
          roomName:
            room.roomTypeName ||
            room.roomTypeCode,
          name: name || 'Semi-Flex',
          code,
          amount: Number.isFinite(rate.rateAmount)
            ? rate.rateAmount
            : Infinity,
          price:
            rate.amountAfterTaxFmt ||
            String(rate.rateAmount ?? ''),
          cancellation:
            guarantee.cxlPolicyDesc ||
            parentGuarantee.cxlPolicyDesc ||
            ''
        });
      }
    }
  }
 
  async function scanHotel(hotel, full = false) {
    const generation = state.generation;
    const entry = getEntry(hotel);
 
    if (!entry.rooms && !entry.unavailable) {
      await discoverRooms(hotel, entry, generation);
    }
 
    if (
      state.stop ||
      generation !== state.generation ||
      entry.unavailable ||
      !entry.rooms
    ) return;
 
    if (!full && entry.matches.length) return;
 
    for (const room of entry.rooms) {
      if (
        state.stop ||
        generation !== state.generation
      ) return;
 
      if (entry.done.has(room.roomTypeCode)) continue;
 
      status(
        `${entry.name} · checked ${entry.done.size}/${entry.rooms.length} room types`
      );
 
      try {
        const result = await ask(
          FULL,
          variables(
            entry.codeUsed,
            room.roomTypeCode,
            entry.cache
          )
        );
 
        if (
          state.stop ||
          generation !== state.generation
        ) return;
 
        if (result.unavailable) {
          throw Error('No bookable rate for this room type (1740)');
        }
 
        extractRates(entry, room, result);
        entry.done.add(room.roomTypeCode);
 
        entry.errors = entry.errors.filter(
          x => !x.startsWith(`${room.roomTypeCode}: `)
        );
 
      } catch (error) {
        if (
          state.stop ||
          generation !== state.generation
        ) return;
 
        const issue =
          `${room.roomTypeCode}: ${error.message}`;
 
        if (!entry.errors.includes(issue)) {
          entry.errors.push(issue);
        }
      }
 
      render();
 
      if (!full && entry.matches.length) break;
 
      if (!state.stop) {
        await sleep(CONFIG.delay);
      }
    }
 
    entry.full =
      entry.done.size === entry.totalRooms &&
      entry.errors.length === 0;
 
    render();
  }
 
  // =====================================
  // Decide which hotels need a retry
  // =====================================
 
  function needsRetry(code) {
    const entry = state.results.get(code);
 
    // Never scanned
    if (!entry) return true;
 
    // Qualifying rate already found, no need to rescan
    if (entry.matches.length > 0) return false;
 
    // No bookable rate is a known state, not a network failure
    if (entry.unavailable) return false;
 
    // Init or query failed
    if (entry.errors.length > 0) return true;
 
    // Room types not retrieved
    if (!entry.rooms) return true;
 
    // Some room types not yet queried successfully
    return entry.rooms.some(
      room => !entry.done.has(room.roomTypeCode)
    );
  }
 
  // =====================================
  // Auto scan and manual retry of failures
  // =====================================
 
  function scheduleAutoScan() {
    clearTimeout(autoTimer);
 
    if (
      !state.tools.resort ||
      !state.autoScan ||
      state.paused ||
      !state.search ||
      !state.hotels.size
    ) return;
 
    const generation = state.generation;
 
    autoTimer = setTimeout(() => {
      if (
        generation !== state.generation ||
        !state.tools.resort ||
        !state.autoScan ||
        state.paused
      ) return;
 
      if (state.busy) {
        // Newly found hotels are checked when the scan finishes
        return;
      }
 
      runScan(false);
    }, CONFIG.autoDelay);
  }
 
  async function runScan(manual = false) {
    syncLocation();

    if (!state.tools.resort) return;
 
    if (state.busy) {
      if (manual) {
        status('A scan is already running; stop it or wait for it to finish');
      }
      return;
    }
 
    if (!state.search || !state.hotels.size) {
      status('Search a destination and dates on Hilton first');
      return;
    }
 
    state.busy = true;
    state.stop = false;
 
    const generation = state.generation;
    const button = $('hpt-scan');
 
    if (button) button.disabled = true;
 
    try {
      status('Checking official resort list…');
 
      await loadResorts();
 
      if (
        state.stop ||
        generation !== state.generation
      ) return;
 
      const hotels = [
        ...state.hotels.values()
      ].filter(
        hotel => state.resorts.has(hotel.code)
      );
 
      render();
 
      if (hotels.length > CONFIG.maxHotels) {
        status('Hotel count exceeds safe scan limit');
        return;
      }
 
      if (!hotels.length) {
        status('None of the captured hotels are eligible resorts');
        return;
      }
 
      // Auto scan: only process hotels not yet processed.
      // Manual quick scan: only retry failed or incomplete hotels without candidates.
      const targets = hotels.filter(hotel => {
        if (!needsRetry(hotel.code)) return false;
 
        if (manual) return true;
 
        return !state.processed.has(hotel.code);
      });
 
      if (!targets.length) {
        const failed = hotels.filter(
          hotel => needsRetry(hotel.code)
        ).length;
 
        status(
          failed
            ? `No new hotels; ${failed} more can be retried via Quick scan`
            : 'Scan complete: no hotels need a retry'
        );
        return;
      }
 
      let completed = 0;

      startProgress(targets.map(hotel => hotel.code));
 
      for (const [index, hotel] of targets.entries()) {
        if (
          state.stop ||
          generation !== state.generation
        ) break;
 
        state.processed.add(hotel.code);
        advanceProgress(index);
 
        await scanHotel(hotel, false);
 
        if (generation !== state.generation) break;
 
        completed++;
 
        if (!state.stop) {
          await sleep(CONFIG.delay);
        }
      }
 
      if (generation !== state.generation) return;
 
      const matched = hotels.filter(hotel =>
        (state.results.get(hotel.code)?.matches.length || 0) > 0
      ).length;
 
      const retryable = hotels.filter(hotel =>
        needsRetry(hotel.code)
      ).length;
 
      status(
        `${state.stop ? 'Stopped' : 'Round complete'} · ` +
        `checked ${completed} hotels this round · ` +
        `${matched} with candidates` +
        (retryable ? ` · ${retryable} retryable` : '')
      );
 
    } catch (error) {
      status(`Scan error: ${error.message}`);
 
    } finally {
      state.busy = false;
      state.scan = null;
 
      if (button) button.disabled = false;
      render();
 
      // When later pages arrive, auto scan only the newly added hotels.
      if (
        !state.stop &&
        !state.paused &&
        generation === state.generation
      ) {
        const hasNew = [...state.hotels.keys()].some(
          code =>
            state.resorts?.has(code) &&
            !state.processed.has(code)
        );
 
        if (hasNew) {
          scheduleAutoScan();
        }
      }
    }
  }
 
  async function expandHotel(code) {
    if (state.busy) {
      status('Current scan has not finished yet');
      return;
    }
 
    const hotel = state.hotels.get(code);
 
    if (!hotel || !state.resorts) return;
 
    const generation = state.generation;
 
    state.busy = true;
    state.stop = false;
 
    const button = $('hpt-scan');
    if (button) button.disabled = true;
 
    try {
      startProgress([code]);

      await scanHotel(hotel, true);
 
      if (generation !== state.generation) return;
 
      const entry = state.results.get(code);
 
      status(
        `${entry.name} · successfully checked ` +
        `${entry.done.size}/${entry.totalRooms} room types`
      );
 
    } finally {
      state.busy = false;
      state.scan = null;
 
      if (button) button.disabled = false;
 
      render();
    }
  }
 
  // =====================================
  // Update check
  // =====================================

  // Compares dotted version numbers: 1 if a is newer, -1 if older, else 0.
  function compareVersions(a, b) {
    const parts = value => String(value).replace(/^v/, '').split('.')
      .map(part => parseInt(part, 10) || 0);

    const x = parts(a);
    const y = parts(b);

    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const diff = (x[i] || 0) - (y[i] || 0);
      if (diff) return diff > 0 ? 1 : -1;
    }

    return 0;
  }

  const isNewer = latest =>
    Boolean(VERSION && latest && compareVersions(latest, VERSION) > 0);

  function savedUpdate() {
    try {
      return JSON.parse(localStorage.getItem(UPDATE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveUpdate(values) {
    try {
      localStorage.setItem(
        UPDATE_KEY,
        JSON.stringify({ ...savedUpdate(), ...values })
      );
    } catch {}
  }

  // Own request without cookies, so nothing of the Hilton session leaves the page.
  async function fetchText(url) {
    const response = await nativeFetch(url, {
      cache: 'no-store',
      credentials: 'omit',
      signal: AbortSignal.timeout?.(10000)
    });

    if (!response.ok) throw Error(`HTTP ${response.status}`);

    return response.text();
  }

  // Changelog entries between the installed and the latest version, by group
  // (Added, Changed, Fixed). An entry is shortened to its bold lead-in.
  function changelogNotes(markdown, latest) {
    const groups = [];
    let version = null;
    let group = null;

    for (const line of markdown.split(/\r?\n/)) {
      const heading = /^##\s+v?(\d[\w.-]*)/.exec(line);

      if (heading) {
        version = heading[1];
        group = null;
        continue;
      }

      if (
        !version ||
        compareVersions(version, VERSION) <= 0 ||
        compareVersions(version, latest) > 0
      ) continue;

      const title = /^###\s+(.+)/.exec(line);

      if (title) {
        const name = title[1].trim();

        group = groups.find(item => item.title === name);
        if (!group) groups.push(group = { title: name, items: [] });
        continue;
      }

      const entry = /^[-*]\s+(.+)/.exec(line);
      if (!entry || !group) continue;

      const text = /^\*\*(.+?)\*\*/.exec(entry[1])?.[1] || entry[1];

      group.items.push(
        text
          .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
          .replace(/[*`]/g, '')
          .replace(/:$/, '')
          .trim()
      );
    }

    return groups.filter(item => item.items.length);
  }

  function applyLatest(latest, notes) {
    const update = state.update;

    update.latest = latest;
    update.notes = notes || null;
    update.status = isNewer(latest) ? 'available' : 'current';
  }

  // Reads the @version of the published header and, when it is newer,
  // the matching changelog entries. Automatic checks reuse a recent result.
  async function checkUpdate(manual = false) {
    const update = state.update;

    if (!VERSION || update.status === 'checking') return;

    const saved = savedUpdate();
    const wait = saved.failed
      ? UPDATE.retryMinutes * 60000
      : UPDATE.everyHours * 3600000;

    if (!manual && saved.at && Date.now() - saved.at < wait) {
      if (!saved.failed && saved.latest) {
        applyLatest(saved.latest, saved.notes);
        render();
      }
      return;
    }

    update.status = 'checking';
    render();

    try {
      const latest = /^\/\/\s*@version\s+(\S+)/m.exec(
        await fetchText(UPDATE.meta)
      )?.[1];

      if (!latest) throw Error('no @version in the published header');

      let notes = null;

      if (isNewer(latest)) {
        try {
          notes = changelogNotes(await fetchText(UPDATE.notes), latest);
        } catch {}
      }

      applyLatest(latest, notes);
      saveUpdate({ at: Date.now(), latest, notes, failed: false });

    } catch (error) {
      update.status = 'failed';
      update.error = error.message;
      saveUpdate({ at: Date.now(), failed: true });
    }

    render();
  }

  // Opens the published script; the userscript manager shows its install
  // page in the new tab. This page reloads once the user comes back.
  function installUpdate() {
    window.open(UPDATE.script, '_blank', 'noopener');

    if (!state.update.installing) {
      state.update.installing = true;

      let left = document.visibilityState === 'hidden';

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') left = true;
        else if (left) location.reload();
      });
    }

    render();
  }

  function skipUpdate() {
    state.update.skipped = state.update.latest;
    saveUpdate({ skipped: state.update.latest });
    render();
  }

  function updateNotesHTML(notes) {
    let shown = 0;
    let rest = 0;

    const groups = (notes || []).map(group => {
      const items = group.items.slice(0, Math.max(0, UPDATE.maxNotes - shown));

      shown += items.length;
      rest += group.items.length - items.length;

      return items.length
        ? `
          <div class="hpt-update-cat">${html(group.title)}</div>
          <ul>${items.map(item => `<li>${html(item)}</li>`).join('')}</ul>
        `
        : '';
    }).join('');

    if (!shown) return '';

    const more = rest
      ? `
        <a
          class="hpt-update-more"
          href="${html(UPDATE.changelog)}"
          target="_blank"
          rel="noopener"
        >+ ${rest} more in the changelog ↗</a>
      `
      : '';

    return `<div class="hpt-update-notes">${groups}${more}</div>`;
  }

  // Banner on the home page, the dot and badge when minimized and the
  // version row in Settings.
  function renderUpdate() {
    const update = state.update;
    const latest = update.latest;

    const visible =
      update.status === 'available' &&
      (update.installing || latest !== update.skipped);

    const banner = $('hpt-update');
    const bannerKey = visible ? `${latest}|${update.installing}` : '';

    banner.hidden = !visible;
    $('hpt-logo').dataset.update = String(visible);
    $('hpt-min-update').textContent = visible ? 'Update' : '';

    if (banner.dataset.key !== bannerKey) {
      banner.dataset.key = bannerKey;

      const head = (title, text) => `
        <div class="hpt-update-head">
          <span class="hpt-update-icon">${ICON.upgrade}</span>
          <span class="hpt-update-text">
            <b>${html(title)}</b>
            <span>${html(text)}</span>
          </span>
        </div>
      `;

      banner.innerHTML = !visible
        ? ''
        : update.installing
          ? `
            <div class="hpt-update" role="status">
              ${head(
                `Installing ${latest}`,
                'Confirm the install in the new tab. This page reloads when you come back.'
              )}
              <div class="hpt-update-actions">
                <button class="hpt-update-link" type="button" data-update="install">
                  Open install page again
                </button>
              </div>
            </div>
          `
          : `
            <div class="hpt-update" role="status">
              ${head('Update available', `Hilton Pro Tools ${VERSION} → ${latest}`)}
              ${updateNotesHTML(update.notes)}
              <div class="hpt-update-actions">
                <button class="hpt-update-go" type="button" data-update="install">
                  Install ${html(latest)}
                </button>
                <button class="hpt-update-link" type="button" data-update="skip">
                  Skip this version
                </button>
              </div>
            </div>
          `;
    }

    const row = $('hpt-version-state');
    const rowKey = `${update.status}|${latest}`;

    $('hpt-update-auto').checked = update.auto;

    if (row.dataset.key === rowKey) return;
    row.dataset.key = rowKey;

    const action = (name, label) =>
      `<button class="hpt-link-btn" type="button" data-update="${name}">${label}</button>`;

    row.innerHTML = !VERSION
      ? 'Version unknown'
      : {
          idle: action('check', 'Check for updates'),
          checking: '<span class="hpt-spin" aria-hidden="true"></span>Checking…',
          current: `<span class="hpt-version-ok">${ICON.check}Up to date</span>${action('check', 'Check again')}`,
          available: `<span class="hpt-version-new">${html(latest)} available</span>${action('install', 'Install')}`,
          failed: `<span class="hpt-version-fail" title="${html(update.error)}">Check failed</span>${action('check', 'Retry')}`
        }[update.status];
  }

  // =====================================
  // View rates link
  // =====================================
 
  // dates ({ arrival, departure }) books part of the stay, e.g. one leg of a split stay.
  // s: the search to open, by default the current one.
  function rateURL(entry, points = false, dates = null, s = state.search) {
    if (!s) return '';
 
    const url = new URL(
      '/en/book/reservation/rooms/',
      location.origin
    );
 
    url.searchParams.set(
      'ctyhocn',
      entry.codeUsed || entry.code
    );
 
    url.searchParams.set('arrivalDate', dates?.arrival || s.arrival);
    url.searchParams.set('departureDate', dates?.departure || s.departure);
 
    url.searchParams.set(
      'room1NumAdults',
      String(s.adults || 1)
    );
 
    if (s.currency) {
      url.searchParams.set('displayCurrency', s.currency);
    }

    // Opens the room selection with reward rates, like Hilton's "Use Points".
    if (points) url.searchParams.set('redeemPts', 'true');
 
    return url.href;
  }
 
  // =====================================
  // Panel UI
  // =====================================
 
  const STYLE = `
    #hilton-pro-tools {
      position: fixed;
      right: 12px;
      top: 75px;
      z-index: 2147483647;
      width: 350px;
      max-width: calc(100vw - 20px);
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      background: #fff;
      color: #0f172a;
      border-radius: 14px;
      box-shadow: 0 1px 2px rgba(15,23,42,.08), 0 12px 32px rgba(15,23,42,.16);
      font: 13px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      text-align: left;
      overflow: hidden;
    }
    #hilton-pro-tools * { box-sizing: border-box; }
    #hilton-pro-tools [hidden] { display: none !important; }
    #hilton-pro-tools button {
      font: inherit;
      margin: 0;
      line-height: 1.2;
      letter-spacing: normal;
      text-transform: none;
      cursor: pointer;
    }
    #hilton-pro-tools button:disabled { cursor: default; }
    #hilton-pro-tools a { color: #0f5f58; font-weight: 600; text-decoration: none; }
    #hilton-pro-tools a:hover { color: #0a3f3a; text-decoration: underline; }
    #hilton-pro-tools p { margin: 0; }

    .hpt-head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 12px 12px 14px;
      border-bottom: 1px solid #e2e8f0;
      cursor: move;
      user-select: none;
      flex: none;
    }
    .hpt-logo {
      position: relative;
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: #0f766e;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: none;
    }
    .hpt-heading { flex: 1; min-width: 0; }
    .hpt-title { font-size: 14px; font-weight: 650; line-height: 1.2; }
    .hpt-sub { font-size: 12px; color: #475569; margin-top: 2px; }
    .hpt-icon-btn {
      width: 32px;
      height: 32px;
      padding: 0;
      border: 0;
      border-radius: 8px;
      background: #f1f5f9;
      color: #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: none;
    }
    .hpt-icon-btn:hover { background: #e2e8f0; }

    #hpt-body { overflow: auto; }
    .hpt-controls { padding: 12px 14px; display: flex; flex-direction: column; gap: 12px; }

    .hpt-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .hpt-stat { background: #f8fafc; border-radius: 10px; padding: 8px 10px; }
    .hpt-stat b { display: block; font-size: 18px; font-weight: 650; line-height: 1.3; }
    .hpt-stat span { font-size: 11px; color: #475569; }
    .hpt-stat.good { background: #ecfdf5; }
    .hpt-stat.good b, .hpt-stat.good span { color: #166534; }

    .hpt-actions { display: flex; gap: 6px; align-items: center; }
    .hpt-primary {
      flex: 1;
      height: 36px;
      border: 0;
      border-radius: 9px;
      background: #0f766e;
      color: #fff;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .hpt-primary:hover { background: #0d5f59; }
    .hpt-primary:disabled { background: #e2e8f0; color: #475569; }
    .hpt-primary:disabled .hpt-idle,
    .hpt-primary:not(:disabled) .hpt-busy { display: none; }
    .hpt-secondary {
      height: 36px;
      padding: 0 12px;
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      background: #fff;
      color: #0f172a;
      font-weight: 500;
    }
    .hpt-square {
      width: 36px;
      height: 36px;
      padding: 0;
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      background: #fff;
      color: #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: none;
    }
    .hpt-secondary:hover, .hpt-square:hover { background: #f8fafc; }

    .hpt-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin: 0;
      font-size: 13px;
      cursor: pointer;
    }
    .hpt-switch {
      appearance: none;
      -webkit-appearance: none;
      position: relative;
      width: 34px;
      height: 20px;
      margin: 0;
      border-radius: 999px;
      background: #cbd5e1;
      cursor: pointer;
      flex: none;
    }
    .hpt-switch::before {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,.25);
      transition: left .15s;
    }
    .hpt-switch:checked { background: #0f766e; }
    .hpt-switch:checked::before { left: 16px; }
    .hpt-switch:focus-visible { outline: 2px solid #0f766e; outline-offset: 2px; }

    .hpt-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #475569;
      background: #f8fafc;
      border-radius: 8px;
      padding: 7px 10px;
    }
    .hpt-status::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #94a3b8;
      flex: none;
    }
    .hpt-status[data-busy="true"]::before {
      background: #0f766e;
      animation: hpt-pulse .8s ease-in-out infinite alternate;
    }
    @keyframes hpt-pulse { to { opacity: .3; } }

    .hpt-list { border-top: 1px solid #e2e8f0; }
    .hpt-list:empty { display: none; }
    .hpt-hotel {
      padding: 12px 14px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .hpt-row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .hpt-name { font-size: 13px; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; }
    .hpt-code { font: 11px ui-monospace, Menlo, monospace; color: #64748b; white-space: nowrap; }
    .hpt-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 12px; color: #475569; }
    .hpt-badge {
      font-size: 11px;
      font-weight: 600;
      border-radius: 999px;
      padding: 2px 8px;
      background: #f1f5f9;
      color: #475569;
      white-space: nowrap;
    }
    .hpt-badge.match { background: #dcfce7; color: #166534; }
    .hpt-badge.update { background: #dbeafe; color: #1e40af; }
    .hpt-badge.partial { background: #fef3c7; color: #92400e; }
    .hpt-badge.unavail { background: #e2e8f0; color: #334155; }
    .hpt-bar { height: 4px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
    .hpt-bar > div { height: 100%; border-radius: 999px; background: #0f766e; }
    .hpt-bar.partial > div { background: #d97706; }

    .hpt-best {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 9px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12px;
      color: #3f4f46;
    }
    .hpt-best b { font-size: 15px; font-weight: 700; color: #14532d; }
    .hpt-best .hpt-row span { font-weight: 600; color: #166534; text-align: right; }

    #hilton-pro-tools details { font-size: 12px; }
    #hilton-pro-tools summary { cursor: pointer; font-weight: 600; color: #334155; }
    .hpt-more > div { display: flex; justify-content: space-between; gap: 8px; padding-top: 7px; }
    .hpt-more b { white-space: nowrap; }
    .hpt-diag { background: #fffbeb; border-radius: 8px; padding: 8px 10px; }
    #hilton-pro-tools .hpt-diag summary { color: #92400e; }
    .hpt-diag div {
      font: 11px/1.5 ui-monospace, Menlo, monospace;
      color: #78350f;
      padding-top: 6px;
      overflow-wrap: anywhere;
    }

    .hpt-links { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; font-size: 12px; }
    .hpt-link-btn { border: 0; background: none; padding: 0; color: #0f5f58; font-weight: 600; }
    .hpt-link-btn:hover { text-decoration: underline; }
    .hpt-link-btn:disabled { color: #94a3b8; text-decoration: none; }

    .hpt-empty {
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      text-align: center;
    }
    .hpt-empty-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .hpt-empty b { font-size: 14px; }
    .hpt-empty p { font-size: 12px; color: #475569; line-height: 1.5; }

    .hpt-footer { background: #f8fafc; padding: 10px 14px; font-size: 11px; line-height: 1.45; color: #475569; }

    .hpt-progress { display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
    .hpt-progress .hpt-row span { color: #475569; white-space: nowrap; }
    .hpt-progress .hpt-bar { height: 6px; }
    .hpt-progress-sub { color: #475569; overflow-wrap: anywhere; }
    .hpt-queue {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
      max-height: 150px;
      overflow: auto;
    }
    .hpt-queue div { display: flex; justify-content: space-between; gap: 8px; }
    .hpt-queue div span:last-child { white-space: nowrap; color: #475569; }
    .hpt-queue .current { font-weight: 600; }
    .hpt-queue .current span:last-child { color: #0f5f58; }
    .hpt-queue .queued, .hpt-queue .queued span:last-child { color: #64748b; }
    .hpt-queue .match span:last-child { color: #166534; }
    .hpt-queue .partial span:last-child { color: #92400e; }
    .hpt-secondary.hpt-danger {
      border-color: #fecaca;
      background: #fef2f2;
      color: #991b1b;
      font-weight: 600;
    }

    .hpt-settings {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 14px;
      font-size: 12px;
      color: #475569;
    }
    .hpt-settings label { display: flex; align-items: center; gap: 5px; margin: 0; }
    .hpt-settings input {
      width: 70px;
      height: 28px;
      margin: 0;
      padding: 0 6px;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      background: #fff;
      color: #0f172a;
      font: inherit;
    }
    .hpt-settings input:focus { outline: 2px solid #0f766e; outline-offset: 1px; }
    .hpt-compare {
      background: #f8fafc;
      border-radius: 10px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 12px;
      color: #475569;
    }
    .hpt-compare b { color: #0f172a; font-weight: 600; white-space: nowrap; }
    .hpt-verdict { font-weight: 700; }
    .hpt-verdict.points { color: #1e40af; }
    .hpt-verdict.cash { color: #166534; }

    .hpt-settings select {
      height: 28px;
      max-width: 150px;
      margin: 0;
      padding: 0 4px;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      background: #fff;
      color: #0f172a;
      font: inherit;
    }
    .hpt-all { padding: 0 14px 6px; }
    .hpt-all-title { font-size: 13px; font-weight: 600; }
    .hpt-hint { font-size: 12px; color: #475569; }
    .hpt-all-note { font-size: 12px; color: #475569; padding: 0 0 8px; }
    .hpt-all-row { padding: 8px 0; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 3px; }
    .hpt-all-row.off .hpt-name { color: #64748b; font-weight: 500; }
    .hpt-all-meta { font-size: 12px; color: #475569; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .hpt-tag {
      font-size: 10px;
      font-weight: 600;
      color: #0f5f58;
      background: #ccfbf1;
      border-radius: 999px;
      padding: 1px 7px;
    }
    .hpt-chip {
      font-size: 11px;
      font-weight: 700;
      border-radius: 999px;
      padding: 2px 8px;
      white-space: nowrap;
    }
    .hpt-chip.points { background: #dbeafe; color: #1e40af; }
    .hpt-chip.cash { background: #dcfce7; color: #166534; }
    .hpt-chip.free { background: #ede9fe; color: #5b21b6; }
    .hpt-chip.muted { background: #f1f5f9; color: #475569; font-weight: 600; }

    /* Free Night Finder page. */
    .hpt-stat.free { background: #f5f3ff; }
    .hpt-stat.free b, .hpt-stat.free span { color: #5b21b6; }
    .hpt-free-intro { font-size: 12px; line-height: 1.45; color: #475569; }
    .hpt-free-sort { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; color: #475569; }
    .hpt-seg { display: flex; gap: 2px; padding: 2px; border-radius: 8px; background: #f1f5f9; }
    #hilton-pro-tools .hpt-seg button {
      height: 26px;
      padding: 0 10px;
      border: 0;
      border-radius: 6px;
      background: none;
      color: #475569;
      font-size: 12px;
      font-weight: 500;
    }
    #hilton-pro-tools .hpt-seg button[aria-pressed="true"] {
      background: #fff;
      color: #0f172a;
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(15, 23, 42, .12);
    }
    .hpt-free-top { border-top: 1px solid #e2e8f0; padding: 12px 14px 6px; display: flex; flex-direction: column; gap: 6px; }
    .hpt-free-best {
      background: #f5f3ff;
      border: 1px solid #ddd6fe;
      border-radius: 10px;
      padding: 9px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12px;
      color: #4c1d95;
    }
    .hpt-free-best b { font-size: 15px; font-weight: 700; }
    .hpt-free-best .hpt-row span { font-weight: 600; text-align: right; }
    .hpt-free-row { padding: 9px 14px; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 3px; }
    .hpt-free-row .hpt-row > b { font-size: 13px; white-space: nowrap; }
    .hpt-free-sub { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: #475569; }
    .hpt-free-sub a, .hpt-free-top a { font-weight: 600; white-space: nowrap; text-decoration: none; }
    .hpt-free-title { border-top: 1px solid #e2e8f0; padding: 10px 14px 4px; font-size: 12px; font-weight: 600; color: #334155; }
    .hpt-free-off { padding: 7px 14px; display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px; color: #475569; line-height: 1.3; }
    .hpt-free-off:last-child { padding-bottom: 12px; }
    .hpt-free-note { padding: 0 14px 10px; font-size: 12px; color: #475569; }
    .hpt-empty-icon.free { color: #64748b; }

    /* Split Stay page. */
    .hpt-chip.split { background: #ffedd5; color: #9a3412; }
    .hpt-stat.split { background: #fff7ed; }
    .hpt-stat.split b, .hpt-stat.split span { color: #9a3412; }
    .hpt-split-pick { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .hpt-split-pick .hpt-primary { flex: none; width: auto; padding: 0 14px; }
    .hpt-split-stats { padding: 0 14px 12px; }
    .hpt-split-card { border-top: 1px solid #e2e8f0; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
    .hpt-split-total { font-size: 12px; color: #475569; }
    .hpt-leg {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 7px 9px;
      border: 1px solid #e2e8f0;
      border-radius: 9px;
      font-size: 12px;
    }
    .hpt-leg .hpt-chip { flex: none; min-width: 52px; text-align: center; }
    .hpt-leg-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; color: #475569; }
    .hpt-leg-text b { color: #0f172a; font-weight: 600; overflow-wrap: anywhere; }
    .hpt-leg a { font-weight: 600; white-space: nowrap; text-decoration: none; }
    .hpt-split-row { border-top: 1px solid #f1f5f9; padding: 9px 14px; }
    .hpt-split-row summary { list-style: none; cursor: pointer; display: flex; flex-direction: column; gap: 3px; }
    .hpt-split-row summary::-webkit-details-marker { display: none; }
    .hpt-split-row summary .hpt-row > b { font-size: 13px; white-space: nowrap; }
    .hpt-split-row[open] summary { margin-bottom: 6px; }
    .hpt-split-row .hpt-leg + .hpt-leg { margin-top: 6px; }

    /* Flexible Dates page. */
    .hpt-chip.calendar { background: #ffe4e6; color: #9f1239; }
    .hpt-stat.calendar { background: #fff1f2; }
    .hpt-stat.calendar b, .hpt-stat.calendar span { color: #9f1239; }
    .hpt-cal { border-top: 1px solid #e2e8f0; }
    .hpt-cal-head, .hpt-cal-grid {
      display: grid;
      grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
      gap: 3px;
    }
    /* Date header stays visible while the hotels scroll. */
    .hpt-cal-head {
      position: sticky;
      top: 0;
      z-index: 1;
      padding: 8px 14px 6px;
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
    }
    .hpt-cal-day {
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.25;
      color: #334155;
      white-space: nowrap;
    }
    .hpt-cal-day small { font-size: 10px; font-weight: 500; color: #64748b; }
    .hpt-cal-day.current, .hpt-cal-day.current small { color: #0f172a; font-weight: 700; }
    .hpt-cal-day.current::after {
      content: '';
      width: 18px;
      height: 2px;
      margin-top: 2px;
      border-radius: 2px;
      background: #0f172a;
    }
    .hpt-cal-row { padding: 9px 14px; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 5px; }
    #hilton-pro-tools .hpt-cal-cell {
      height: 28px;
      border-radius: 6px;
      background: #f8fafc;
      color: #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-decoration: none;
    }
    #hilton-pro-tools a.hpt-cal-cell:hover { background: #e2e8f0; color: #0f172a; text-decoration: none; }
    #hilton-pro-tools .hpt-cal-cell.current { box-shadow: inset 0 0 0 1.5px #334155; }
    #hilton-pro-tools .hpt-cal-cell.best { background: #dcfce7; color: #166534; }
    #hilton-pro-tools .hpt-cal.points .hpt-cal-cell.best { background: #dbeafe; color: #1e40af; }
    #hilton-pro-tools .hpt-cal-cell.none { color: #94a3b8; font-weight: 500; }
    #hilton-pro-tools a.hpt-cal-cell:focus-visible { outline: 2px solid #0f766e; outline-offset: 1px; }
    .hpt-cal-sub { font-size: 12px; color: #475569; }
    .hpt-cal-row .hpt-tag { flex: none; white-space: nowrap; }

    /* Rate Inspector page. */
    .hpt-chip.rates { background: #fef9c3; color: #854d0e; }
    .hpt-stat.rates { background: #fefce8; }
    .hpt-stat.rates b, .hpt-stat.rates span { color: #854d0e; }
    .hpt-stat.rates b { overflow-wrap: anywhere; }
    .hpt-rate-pick { width: 100%; }
    #hilton-pro-tools .hpt-rate-pick select { flex: 1; min-width: 0; max-width: none; }
    .hpt-rate-pick > span:first-child { width: 42px; flex: none; }
    #hilton-pro-tools .hpt-rate-special { flex-basis: auto; margin: 0; font-size: 12px; color: #334155; }
    .hpt-rate-list { border-top: 1px solid #e2e8f0; }
    .hpt-rate-row { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 4px; }
    .hpt-rate-row .hpt-row > b { font-size: 13px; white-space: nowrap; }
    .hpt-rate-row .hpt-free-sub { align-items: center; }
    .hpt-rate-markup { font-weight: 600; color: #475569; white-space: nowrap; }
    .hpt-rate-markup.low { color: #166534; }
    .hpt-rate-cxl { font-size: 12px; color: #475569; }

    /* Suite Finder page. */
    .hpt-chip.suites { background: #fae8ff; color: #86198f; }
    .hpt-stat.suites { background: #fdf4ff; }
    .hpt-stat.suites b, .hpt-stat.suites span { color: #86198f; }
    #hpt-suites .hpt-stat span { overflow-wrap: anywhere; }
    .hpt-suite-list { border-top: 1px solid #e2e8f0; }
    .hpt-suite-hotel { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 6px; }
    .hpt-suite-hotel .hpt-row .hpt-tag { flex: none; white-space: nowrap; }
    .hpt-suite-base, .hpt-suite-more { font-size: 12px; color: #475569; }
    .hpt-suite-room { padding-top: 8px; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 4px; }
    .hpt-suite-room .hpt-row > b { font-size: 13px; white-space: nowrap; }
    .hpt-suite-room .hpt-free-sub { align-items: center; }
    .hpt-suite-name { font-size: 13px; font-weight: 600; line-height: 1.3; min-width: 0; overflow-wrap: anywhere; }

    /* Price Watch page. */
    .hpt-watching { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: #155e75; white-space: nowrap; }
    .hpt-watch-list { border-top: 1px solid #e2e8f0; }
    .hpt-watch-row { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 4px; }
    .hpt-watch-row .hpt-row > b { font-size: 13px; white-space: nowrap; }
    .hpt-watch-row .hpt-free-sub { align-items: center; }
    .hpt-watch-row.past .hpt-name, .hpt-watch-row.past .hpt-row > b { color: #64748b; }
    .hpt-watch-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px; margin-top: 2px; }
    #hilton-pro-tools .hpt-watch-foot .hpt-settings { gap: 6px; }
    #hilton-pro-tools .hpt-watch-foot .hpt-settings input { width: 92px; }

    /* Credit Tracker page. */
    .hpt-chip.credit { background: #e0e7ff; color: #3730a3; }
    .hpt-stat.credit { background: #eef2ff; }
    .hpt-stat.credit b, .hpt-stat.credit span { color: #3730a3; }
    #hilton-pro-tools .hpt-rate-pick input { flex: 1; min-width: 0; width: auto; }
    .hpt-credit-field > span:first-child { width: 52px; }
    #hilton-pro-tools .hpt-split-pick .hpt-credit-field { flex: 1; min-width: 0; }
    .hpt-credit-bar { margin-top: 8px; height: 6px; }
    .hpt-credit-bar > div { background: #4f46e5; }
    .hpt-credit-half { padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #475569; }
    .hpt-credit-half b { color: #0f172a; font-weight: 600; white-space: nowrap; }

    #hilton-pro-tools .hpt-back { width: 36px; height: 36px; margin-left: -6px; background: none; }
    #hilton-pro-tools .hpt-back:hover { background: #f1f5f9; }
    .hpt-tools { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
    .hpt-tool {
      width: 100%;
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #fff;
      color: inherit;
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: left;
    }
    .hpt-tool:hover { border-color: #94a3b8; background: #f8fafc; }
    .hpt-tool:focus-visible, .hpt-back:focus-visible { outline: 2px solid #0f766e; outline-offset: 2px; }
    .hpt-tool-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #ccfbf1;
      color: #0f5f58;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: none;
      position: relative;
    }
    .hpt-tool-icon.points { background: #dbeafe; color: #1e40af; }
    .hpt-tool-icon.free { background: #ede9fe; color: #5b21b6; }
    .hpt-tool-icon.split { background: #ffedd5; color: #9a3412; }
    .hpt-tool-icon.calendar { background: #ffe4e6; color: #9f1239; }
    .hpt-tool-icon.rates { background: #fef9c3; color: #854d0e; }
    .hpt-tool-icon.watch { background: #cffafe; color: #155e75; }
    .hpt-tool-icon.suites { background: #fae8ff; color: #86198f; }
    .hpt-tool-icon.credit { background: #e0e7ff; color: #3730a3; }
    /* Spinner badge on the icon while the tool is still loading. */
    .hpt-tool[aria-busy="true"] .hpt-tool-icon::after {
      content: '';
      position: absolute;
      right: -5px;
      bottom: -5px;
      width: 12px;
      height: 12px;
      box-sizing: content-box;
      border-radius: 50%;
      border: 2px solid #cbd5e1;
      border-top-color: currentColor;
      background: #fff;
      box-shadow: 0 0 0 2px #fff;
      animation: hpt-spin .8s linear infinite;
    }
    @keyframes hpt-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) {
      .hpt-tool[aria-busy="true"] .hpt-tool-icon::after {
        animation: hpt-pulse 1s ease-in-out infinite alternate;
      }
    }
    .hpt-tool-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .hpt-tool-text b { font-size: 14px; font-weight: 650; }
    .hpt-tool-sub { font-size: 12px; color: #475569; overflow-wrap: anywhere; }
    .hpt-tool .hpt-badge:empty, .hpt-tool .hpt-chip:empty { display: none; }
    .hpt-tool-icon.small { width: 28px; height: 28px; border-radius: 8px; }
    .hpt-tool-icon.small svg { width: 16px; height: 16px; }
    .hpt-tool-icon.off { background: #f1f5f9; color: #64748b; }
    .hpt-tool-switch { justify-content: flex-start; }
    .hpt-tool-switch .hpt-tool-text { gap: 1px; font-size: 11px; color: #475569; }
    .hpt-tool-switch .hpt-tool-text b { font-size: 13px; font-weight: 600; color: #0f172a; }
    /* Settings accordion on the home page, closed on load. */
    .hpt-acc { border-top: 1px solid #e2e8f0; }
    .hpt-acc > summary {
      list-style: none;
      min-height: 44px;
      padding: 0 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-size: 12px;
      color: #475569;
    }
    .hpt-acc > summary::-webkit-details-marker { display: none; }
    .hpt-acc > summary:hover { background: #f8fafc; }
    .hpt-acc > summary:focus-visible { outline: 2px solid #0f766e; outline-offset: -2px; }
    .hpt-acc > summary b { font-size: 13px; font-weight: 600; color: #0f172a; }
    .hpt-acc > summary svg { flex: none; }
    .hpt-acc > summary > svg:last-child { transition: transform .15s; }
    .hpt-acc[open] > summary > svg:last-child { transform: rotate(90deg); }
    .hpt-acc-sum { flex: 1; min-width: 0; text-align: right; }
    .hpt-acc-body { padding: 4px 14px 14px; display: flex; flex-direction: column; gap: 10px; }
    .hpt-shared { margin-top: 4px; display: flex; flex-direction: column; gap: 10px; }
    .hpt-shared-note { font-size: 11px; line-height: 1.45; color: #475569; }

    /* Update check: banner on the home page and version row in Settings. */
    .hpt-update-wrap { padding: 14px 14px 0; }
    .hpt-update {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 12px;
      color: #334155;
    }
    .hpt-update-head { display: flex; align-items: center; gap: 10px; }
    .hpt-update-icon {
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: #1d4ed8;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: none;
    }
    .hpt-update-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; color: #475569; }
    .hpt-update-text b { font-size: 13px; color: #1e3a8a; }
    .hpt-update-notes { border-top: 1px solid #bfdbfe; padding-top: 8px; display: flex; flex-direction: column; gap: 2px; }
    .hpt-update-cat { font-size: 11px; font-weight: 600; color: #475569; margin-top: 4px; }
    .hpt-update-cat:first-child { margin-top: 0; }
    .hpt-update ul { margin: 0; padding-left: 16px; }
    .hpt-update li { margin: 1px 0; line-height: 1.4; }
    #hilton-pro-tools .hpt-update-more { margin-top: 4px; color: #1e40af; }
    .hpt-update-actions { display: flex; align-items: center; gap: 8px; }
    #hilton-pro-tools .hpt-update-go {
      height: 36px;
      padding: 0 14px;
      border: 0;
      border-radius: 9px;
      background: #1d4ed8;
      color: #fff;
      font-size: 13px;
      font-weight: 600;
    }
    #hilton-pro-tools .hpt-update-go:hover { background: #1e40af; }
    #hilton-pro-tools .hpt-update-link {
      min-height: 36px;
      padding: 0 4px;
      border: 0;
      background: none;
      color: #1e40af;
      font-size: 12px;
      font-weight: 600;
    }
    #hilton-pro-tools .hpt-update-link:hover { text-decoration: underline; }
    .hpt-update button:focus-visible { outline: 2px solid #1d4ed8; outline-offset: 2px; }
    #hilton-pro-tools.hpt-min .hpt-logo[data-update="true"]::after {
      content: '';
      position: absolute;
      top: -3px;
      right: -3px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #1d4ed8;
      box-shadow: 0 0 0 2px #fff;
    }
    .hpt-version {
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 8px;
      font-size: 12px;
      color: #475569;
    }
    #hpt-version-state { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; min-height: 28px; }
    .hpt-version-ok { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; color: #166534; }
    .hpt-version-new { font-weight: 600; color: #1e40af; }
    #hilton-pro-tools .hpt-version-new + .hpt-link-btn { color: #1e40af; }
    .hpt-version-fail { font-weight: 600; color: #b91c1c; }
    .hpt-spin {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid #cbd5e1;
      border-top-color: #0f766e;
      animation: hpt-spin .8s linear infinite;
      flex: none;
    }
    @media (prefers-reduced-motion: reduce) { .hpt-spin { animation: none; } }
    #hilton-pro-tools .hpt-version-auto {
      flex-basis: 100%;
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 4px 0 0;
      color: #334155;
      cursor: pointer;
    }
    .hpt-version-auto input { margin: 0; width: 16px; height: 16px; accent-color: #0f766e; }
    .hpt-section {
      border-top: 1px solid #e2e8f0;
      padding: 12px 14px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .hpt-section-title { font-size: 12px; font-weight: 600; color: #334155; }
    .hpt-top .hpt-row b { font-size: 13px; }

    .hpt-min-badge { display: none; }
    .hpt-min-progress { display: none; font-size: 12px; color: #475569; }
    .hpt-min-bar { display: none; height: 3px; background: #e2e8f0; flex: none; }
    .hpt-min-bar > div { height: 100%; width: 0; background: #0f766e; }
    #hilton-pro-tools.hpt-min .hpt-min-progress:not(:empty) { display: inline; }
    #hilton-pro-tools.hpt-min .hpt-min-bar { display: block; }
    #hilton-pro-tools.hpt-min .hpt-head { border-bottom: 0; padding: 10px 10px 10px 12px; }
    #hilton-pro-tools.hpt-min .hpt-sub { display: none; }
    #hilton-pro-tools.hpt-min .hpt-min-badge:not(:empty) { display: inline-block; }
    #hilton-pro-tools.hpt-min #hpt-csv { display: none; }
    #hilton-pro-tools.hpt-min #hpt-body { display: none; }
  `;

  const svg = (size, body, stroke = 'currentColor', width = 2) =>
    `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

  const ICON = {
    search: svg(18, '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', '#fff'),
    minus: svg(16, '<path d="M5 12h14"/>'),
    plus: svg(16, '<path d="M5 12h14M12 5v14"/>'),
    refresh: svg(15, '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>', 'currentColor', 2.2),
    download: svg(16, '<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>'),
    trash: svg(16, '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>'),
    back: svg(18, '<path d="m15 6-6 6 6 6"/>'),
    chevron: svg(16, '<path d="m9 6 6 6-6 6"/>', '#64748b'),
    upgrade: svg(16, '<path d="M12 19V7"/><path d="m6 12 6-6 6 6"/>', 'currentColor', 2.2),
    check: svg(14, '<path d="m5 12 5 5 9-10"/>', 'currentColor', 2.5),
    sliders: svg(16, '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>', '#475569'),
    resort: svg(20, '<path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9z"/><path d="M12 12v7a2 2 0 0 0 4 0"/>'),
    points: svg(20, '<circle cx="9" cy="9" r="6"/><path d="M15.4 10.6A6 6 0 1 1 10.6 15.4"/>'),
    free: svg(20, '<path d="M4 5h16a1 1 0 0 1 1 1v3a3 3 0 0 0 0 6v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a3 3 0 0 0 0-6V6a1 1 0 0 1 1-1z"/><path d="M14 5v2M14 11v2M14 17v2"/>'),
    split: svg(20, '<path d="M3 12h6l4-5h8"/><path d="M13 17h8"/><path d="M9 12l4 5"/><path d="m18 4 3 3-3 3"/><path d="m18 14 3 3-3 3"/>'),
    dates: svg(20, '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 14h2M14 14h2M8 17h2"/>'),
    rates: svg(20, '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>'),
    suites: svg(20, '<path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>'),
    watch: svg(20, '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
    credit: svg(20, '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>'),
    calendar: svg(24, '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', '#475569', 1.8)
  };

  const plural = (count, one, many) =>
    count === 1 ? one : many;

  function stay(arrival, departure) {
    const start = new Date(`${arrival}T00:00:00Z`);
    const end = new Date(`${departure}T00:00:00Z`);

    if (isNaN(start) || isNaN(end)) {
      return `${arrival} → ${departure}`;
    }

    const format = (date, withYear) =>
      date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(withYear ? { year: 'numeric' } : {}),
        timeZone: 'UTC'
      });

    const nights = Math.round((end - start) / 86400000);

    return `${format(
      start,
      start.getUTCFullYear() !== end.getUTCFullYear()
    )} → ${format(end, true)} · ` +
      `${nights} ${plural(nights, 'night', 'nights')}`;
  }

  // =====================================
  // Scan progress, time estimate and queue
  // =====================================

  function startProgress(codes) {
    state.scan = {
      codes,
      position: 0,
      startedAt: Date.now(),
      requests: 0,
      finishedRequests: 0
    };

    // Keeps the time estimate moving between requests.
    const ticker = setInterval(() => {
      if (!state.scan) clearInterval(ticker);
      renderProgress();
    }, 1000);

    render();
  }

  function advanceProgress(position) {
    const scan = state.scan;
    if (!scan) return;

    scan.position = position;
    scan.finishedRequests = scan.requests;

    render();
  }

  function remainingTime(scan) {
    if (scan.requests < 2) return null;

    const perRequest =
      (Date.now() - scan.startedAt) / scan.requests;

    const entry = state.results.get(scan.codes[scan.position]);

    const current = entry?.rooms
      ? Math.max(0, entry.rooms.length - entry.done.size)
      : entry?.unavailable ? 0 : 1;

    // Average requests of finished hotels, else the current hotel's size.
    const perHotel = scan.position
      ? scan.finishedRequests / scan.position
      : (entry?.rooms?.length || 0) + 1;

    const queued = scan.codes.length - scan.position - 1;

    return perRequest * (current + queued * perHotel);
  }

  function timeLeft(ms) {
    const seconds = Math.ceil(ms / 1000);

    return seconds < 60
      ? `≈ ${Math.max(5, Math.ceil(seconds / 5) * 5)} s left`
      : `≈ ${Math.round(seconds / 60)} min left`;
  }

  function hotelName(code) {
    return state.results.get(code)?.name ||
      state.resorts?.get(code)?.name ||
      state.hotels.get(code)?.name ||
      code;
  }

  function queueState(code, index, position) {
    if (index === position) {
      return { tone: 'current', text: 'Checking…' };
    }

    if (index > position) {
      return { tone: 'queued', text: 'Queued' };
    }

    const entry = state.results.get(code);
    const count = entry?.matches.length || 0;

    if (count) {
      return {
        tone: 'match',
        text: `${count} ${plural(count, 'candidate', 'candidates')}`
      };
    }

    if (entry?.unavailable) return { tone: '', text: 'Sold out' };
    if (entry?.errors.length) return { tone: 'partial', text: 'Incomplete' };

    return { tone: '', text: 'No match' };
  }

  function renderProgress() {
    if (!state.panel) return;

    const scan = state.scan;
    const box = $('hpt-progress');

    $('hpt-status').hidden = Boolean(scan);
    $('hpt-stop').classList.toggle('hpt-danger', state.busy);
    $('hpt-min-bar').hidden = !scan;

    if (!scan) {
      box.hidden = true;
      box.innerHTML = '';
      $('hpt-min-progress').textContent = '';
      return;
    }

    const code = scan.codes[scan.position];
    const entry = state.results.get(code);
    const total = scan.codes.length;

    const share = entry?.rooms?.length
      ? Math.min(1, entry.done.size / entry.rooms.length)
      : 0;

    const percent = Math.round(
      100 * (scan.position + share) / total
    );

    const time = remainingTime(scan);

    const detail = !entry
      ? 'starting…'
      : entry.rooms
        ? `room type ${Math.min(entry.done.size + 1, entry.rooms.length)}` +
          `/${entry.rooms.length}`
        : entry.unavailable
          ? 'no bookable rates'
          : 'loading room types…';

    box.hidden = false;
    box.innerHTML = `
      <div class="hpt-row">
        <b>Scanning hotel ${scan.position + 1} of ${total}</b>
        <span>${time === null ? 'Estimating time…' : timeLeft(time)}</span>
      </div>

      <div class="hpt-bar">
        <div style="width:${percent}%"></div>
      </div>

      <div class="hpt-progress-sub">
        ${html(hotelName(code))} · ${html(detail)}
      </div>

      ${total > 1 ? `
        <div class="hpt-queue">
          ${scan.codes.map((item, index) => {
            const { tone, text } =
              queueState(item, index, scan.position);

            return `
              <div class="${tone}">
                <span>${html(hotelName(item))}</span>
                <span>${html(text)}</span>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    `;

    $('hpt-min-progress').textContent =
      `${scan.position + 1}/${total}`;

    $('hpt-min-bar').firstElementChild.style.width =
      `${percent}%`;
  }

  // =====================================
  // Cash vs. points
  // =====================================

  const money = (value, currency = state.currency) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0
      }).format(value);
    } catch {
      return `${currency} ${Math.round(value)}`;
    }
  };

  const number = value =>
    new Intl.NumberFormat('en-US').format(value);

  function nights() {
    const s = state.search;
    if (!s) return 0;

    const days = (
      new Date(`${s.departure}T00:00:00Z`) -
      new Date(`${s.arrival}T00:00:00Z`)
    ) / 86400000;

    return Number.isFinite(days) && days > 0 ? days : 0;
  }

  // Hilton's conversionFactor is relative to USD. Currencies like JPY or IDR show
  // whether it means "units per USD" (factors far above 1) or "USD per unit".
  function convert(amount, from, to) {
    if (!Number.isFinite(amount)) return null;
    if (from === to) return amount;

    const rates = state.currencies;
    const a = rates?.get(from)?.conversionFactor;
    const b = rates?.get(to)?.conversionFactor;

    if (!a || !b) return null;

    const perUSD = [...rates.values()].some(
      item => item.conversionFactor > 50
    );

    return perUSD ? amount / a * b : amount * a / b;
  }

  // Total cash price of a Semi-Flex rate for the stay, in the search currency.
  function cashTotal(rate, stay) {
    // Formatted prices are English ("$2,480.00"), so drop everything but digits and dots.
    const total = parseFloat(
      String(rate.price).replace(/[^\d.]/g, '')
    );

    if (!Number.isFinite(total) || total <= 0) return null;

    // If the after-tax price is below the nightly rate times the nights, it is a nightly price.
    if (
      Number.isFinite(rate.amount) &&
      stay > 1 &&
      total < rate.amount * stay * 0.95
    ) {
      return total * stay;
    }

    return total;
  }

  function valuation(perNight, cash, currency) {
    const stay = nights();
    if (!stay) return null;

    // Standard Room Rewards: every 5th night of a stay is free (Silver and up).
    const freeNights = Math.floor(stay / 5);
    const points = perNight ? perNight * (stay - freeNights) : null;

    // The point value is set in euro cents.
    const pointsEuro = points ? points * state.pointValue / 100 : null;
    const pointsValue = convert(pointsEuro, 'EUR', state.currency);

    const cashValue = cash ? convert(cash, currency, state.currency) : null;
    const cashEuro = cash ? convert(cash, currency, 'EUR') : null;

    return {
      perNight,
      freeNights,
      points,
      pointsValue,
      cashValue,
      // Cash exists but cannot be converted yet.
      unconverted: Boolean(cash) && cashValue === null,
      // Euro cents each point would be worth when used instead of cash.
      centsPerPoint:
        cashEuro && points ? cashEuro * 100 / points : null,
      winner:
        cashValue && pointsValue
          ? pointsValue < cashValue ? 'points' : 'cash'
          : null
    };
  }

  // Semi-Flex rate of a scanned resort against its points price.
  function compare(entry, rate) {
    if (!state.tools.points) return null;

    const perNight = state.hotels.get(entry.code)?.points;
    if (!perNight) return null;

    return valuation(
      perNight,
      rate ? cashTotal(rate, nights()) : null,
      state.search?.currency
    );
  }

  function ratesNote() {
    return state.currencyError ||
      (state.currencies?.size ? '' : 'Loading exchange rates…');
  }

  function compareHTML(entry, rate) {
    const result = compare(entry, rate);
    if (!result) return '';

    const pointsLine = `
      <div class="hpt-row">
        <span>
          Points (${number(result.perNight)}/night${result.freeNights
            ? `, ${result.freeNights} ${plural(result.freeNights, 'night', 'nights')} free`
            : ''})
        </span>
        <b>
          ${number(result.points)}
          ${result.pointsValue === null ? '' : `≈ ${money(result.pointsValue)}`}
        </b>
      </div>
    `;

    if (!rate || result.unconverted || result.pointsValue === null) {
      const note = rate || result.pointsValue === null ? ratesNote() : '';

      return `
        <div class="hpt-compare">
          ${pointsLine}
          ${note ? `<div>${html(note)}</div>` : ''}
        </div>
      `;
    }

    const saving = Math.abs(result.cashValue - result.pointsValue);

    return `
      <div class="hpt-compare">
        <div class="hpt-row">
          <span>Semi-Flex cash</span>
          <b>≈ ${money(result.cashValue)}</b>
        </div>
        ${pointsLine}
        <div class="hpt-verdict ${result.winner}">
          ${result.winner === 'points' ? 'Points' : 'Cash'}
          cheaper by ≈ ${money(saving)}
        </div>
        <div>
          Points worth ${result.centsPerPoint.toFixed(3)} ct here
          (your value ${state.pointValue} ct)
        </div>
      </div>
    `;
  }

  // Every hotel of the search: cheapest cash rate against the points price.
  function allHotels() {
    return [...state.hotels.values()]
      .map(hotel => ({
        hotel,
        name:
          state.resorts?.get(hotel.code)?.name ||
          hotel.name ||
          state.names.get(hotel.code) ||
          hotel.code,
        resort: Boolean(state.resorts?.has(hotel.code)),
        result: valuation(
          hotel.points,
          hotel.cash?.amount,
          hotel.cash?.currency
        )
      }))
      .sort((a, b) =>
        // Not bookable hotels go last.
        (a.hotel.bookable === false) - (b.hotel.bookable === false) ||
        (b.result?.centsPerPoint ?? -1) -
          (a.result?.centsPerPoint ?? -1) ||
        (b.hotel.points ? 1 : 0) - (a.hotel.points ? 1 : 0) ||
        a.name.localeCompare(b.name)
      );
  }

  // Counts shared by the Cash vs. Points page and its card on the home page.
  function pointsSummary() {
    const rows = state.search ? allHotels() : [];
    const priced = rows.filter(row => row.result?.winner);

    return {
      rows,
      priced,
      points: priced.filter(row => row.result.winner === 'points'),
      closed: rows.filter(row => row.hotel.bookable === false).length
    };
  }

  function renderAll() {
    const { rows, priced, points, closed } = pointsSummary();

    $('hpt-all-title').textContent = rows.length
      ? `${rows.length} ${plural(rows.length, 'hotel', 'hotels')}` +
        (priced.length ? ` · points win ${points.length} of ${priced.length}` : '') +
        (closed ? ` · ${closed} not bookable` : '')
      : 'No hotels yet';

    $('hpt-all-hint').textContent = rows.length
      ? `Best value per point first · ${state.pointValue} ct · ${state.currency}`
      : 'Search a destination and dates on Hilton.';

    $('hpt-all-change').hidden = !rows.length;

    if (!rows.length) {
      $('hpt-all-list').innerHTML = '';
      return;
    }

    const note = state.extras.pending
      ? 'Loading points prices…'
      : [state.extras.error, ratesNote()].filter(Boolean).join(' · ');

    $('hpt-all-list').innerHTML = `
      ${note ? `<div class="hpt-all-note">${html(note)}</div>` : ''}

      ${rows.map(({ hotel, name, resort, result }) => {
        if (hotel.bookable === false) {
          return `
            <div class="hpt-all-row off">
              <div class="hpt-row">
                <span class="hpt-name">${html(name)}</span>
              </div>
              <div class="hpt-all-meta">
                ${resort ? '<span class="hpt-tag">Resort Credit</span>' : ''}
                ${html(['Not bookable', hotel.statusMessage].filter(Boolean).join(' · '))}
              </div>
            </div>
          `;
        }

        const verdict = result?.winner
          ? `<span class="hpt-chip ${result.winner}">
              ${result.winner === 'points' ? 'Points' : 'Cash'}
            </span>`
          : '';

        const parts = [];

        if (result?.cashValue) {
          parts.push(`Cash ≈ ${money(result.cashValue)}`);
        } else if (!hotel.cash) {
          parts.push('No cash rate');
        }

        if (result?.points) {
          parts.push(
            `${number(result.points)} pts` +
            (result.freeNights ? ` (${result.freeNights} free)` : '') +
            (result.pointsValue === null ? '' : ` ≈ ${money(result.pointsValue)}`)
          );
        } else {
          parts.push(state.extras.pending ? 'points…' : 'No reward rooms');
        }

        if (result?.centsPerPoint) {
          parts.push(`${result.centsPerPoint.toFixed(2)} ct/pt`);
        }

        // A scanned resort may have been found under another code.
        const link = rateURL(state.results.get(hotel.code) || hotel);

        return `
          <div class="hpt-all-row">
            <div class="hpt-row">
              <span class="hpt-name">${html(name)}</span>
              ${verdict}
            </div>
            <div class="hpt-all-meta">
              ${resort ? '<span class="hpt-tag">Resort Credit</span>' : ''}
              ${html(parts.join(' · '))}
            </div>
            ${link ? `
              <div class="hpt-links">
                <a
                  href="${html(link)}"
                  target="_blank"
                  rel="noopener noreferrer"
                >View rates ↗</a>
                ${inspectButton(hotel.code)}
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    `;
  }

  // =====================================
  // Free Night Finder
  // =====================================

  // Hotels of the search by whether a Free Night Certificate covers a night there,
  // usable ones ranked by what that night is worth.
  function freeNights() {
    const stay = nights();
    const usable = [];
    const unusable = [];

    for (const hotel of state.hotels.values()) {
      // A certificate can't be booked at a closed hotel anyway.
      if (hotel.bookable === false) continue;

      const name =
        state.resorts?.get(hotel.code)?.name ||
        hotel.name ||
        state.names.get(hotel.code) ||
        hotel.code;

      if (!hotel.points) {
        // No answer yet is not the same as no reward rooms.
        if (
          state.extras.pending ||
          state.extras.error ||
          !state.extras.points.has(hotel.code)
        ) continue;

        unusable.push({ hotel, name, reason: 'No reward rooms' });
        continue;
      }

      if (hotel.reward === 'premium') {
        unusable.push({ hotel, name, reason: 'Premium only' });
        continue;
      }

      if (hotel.reward !== 'standard') continue;

      usable.push({
        hotel,
        name,
        // Cheapest cash rate for one night, which the certificate saves.
        cash: hotel.cash && stay
          ? convert(hotel.cash.amount / stay, hotel.cash.currency, state.currency)
          : null,
        // The point value is set in euro cents.
        value: convert(hotel.points * state.pointValue / 100, 'EUR', state.currency)
      });
    }

    const byPoints = state.freeSort === 'points';
    const key = row => byPoints ? row.hotel.points : row.cash ?? -1;

    usable.sort((a, b) =>
      key(b) - key(a) ||
      b.hotel.points - a.hotel.points ||
      a.name.localeCompare(b.name)
    );

    // Premium only first: those may still open up on other dates.
    unusable.sort((a, b) =>
      (b.reason === 'Premium only') - (a.reason === 'Premium only') ||
      a.name.localeCompare(b.name)
    );

    return { usable, unusable };
  }

  // Headline, its unit and the second line of a usable hotel for the chosen ranking.
  function freeLines(row) {
    const points = `${number(row.hotel.points)} pts`;

    if (state.freeSort === 'points' || row.cash === null) {
      return {
        headline: points,
        unit: 'saved / night',
        sub: row.cash !== null
          ? `Otherwise ≈ ${money(row.cash)} cash a night`
          : row.hotel.cash
            ? ratesNote() || 'No cash rate'
            : 'No cash rate'
      };
    }

    return {
      headline: `≈ ${money(row.cash)}`,
      unit: 'cash / night',
      sub: `or ${points}` +
        (row.value === null ? '' : ` ≈ ${money(row.value)}`) +
        ' a night'
    };
  }

  function renderFree() {
    const root = $('hpt-free');
    const s = state.search;

    if (!s) {
      root.innerHTML = `
        <div class="hpt-empty">
          <div class="hpt-empty-icon">${ICON.calendar}</div>
          <b>Waiting for a Hilton search</b>
          <p>Search a destination and dates on Hilton.</p>
        </div>
      `;
      return;
    }

    const { usable, unusable } = freeNights();
    const loading = state.extras.pending > 0;

    const note = loading
      ? 'Loading points prices…'
      : [state.extras.error, ratesNote()].filter(Boolean).join(' · ');

    const notUsable = unusable.length ? `
      <div class="hpt-free-title">Certificate not usable</div>
      ${unusable.map(row => `
        <div class="hpt-free-off">
          <span>${html(row.name)}</span>
          <span class="hpt-chip muted">${html(row.reason)}</span>
        </div>
      `).join('')}
    ` : '';

    if (!usable.length) {
      const premium = unusable.filter(row => row.reason === 'Premium only').length;

      root.innerHTML = loading || !unusable.length
        ? `<div class="hpt-controls"><div class="hpt-hint">${html(note || 'No hotels yet')}</div></div>`
        : `
          <div class="hpt-empty">
            <div class="hpt-empty-icon free">${ICON.free}</div>
            <b>No Standard Room Reward for these dates</b>
            <p>
              ${premium
                ? `${premium} ${plural(premium, 'hotel only offers', 'hotels only offer')} Premium Room Rewards, which certificates don't cover.`
                : 'No hotel in this search has reward rooms.'}
              Try other dates.
            </p>
          </div>
          ${notUsable}
        `;
      return;
    }

    const lines = usable.map(freeLines);
    const [top, ...rest] = usable;
    const byPoints = state.freeSort === 'points';

    root.innerHTML = `
      <div class="hpt-controls">
        <div class="hpt-stats">
          <div class="hpt-stat free">
            <b>${usable.length} of ${usable.length + unusable.length}</b>
            <span>with Standard Room Reward</span>
          </div>
          <div class="hpt-stat">
            <b>${html(lines[0].headline)}</b>
            <span>best value per certificate</span>
          </div>
        </div>

        <div class="hpt-free-intro">
          A Free Night Certificate covers one night of a Standard Room Reward.
          Ranked by what that night is worth.
        </div>

        <div class="hpt-free-sort">
          <span>Value by</span>
          <div class="hpt-seg" role="group" aria-label="Rank by">
            <button type="button" data-free-sort="cash" aria-pressed="${!byPoints}">Cash price</button>
            <button type="button" data-free-sort="points" aria-pressed="${byPoints}">Points saved</button>
          </div>
        </div>
      </div>

      ${note ? `<div class="hpt-free-note">${html(note)}</div>` : ''}

      <div class="hpt-free-top">
        <div class="hpt-row">
          <span class="hpt-name">${html(top.name)}</span>
          <span class="hpt-chip cash">Standard</span>
        </div>
        <div class="hpt-free-best">
          <div class="hpt-row">
            <b>${html(lines[0].headline)}</b>
            <span>${html(lines[0].unit)}</span>
          </div>
          <div>${html(lines[0].sub)}</div>
        </div>
        <div class="hpt-links">
          <a
            href="${html(rateURL(top.hotel, true))}"
            target="_blank"
            rel="noopener noreferrer"
          >Book with points ↗</a>
        </div>
      </div>

      ${rest.map((row, index) => `
        <div class="hpt-free-row">
          <div class="hpt-row">
            <span class="hpt-name">${html(row.name)}</span>
            <b>${html(lines[index + 1].headline)}</b>
          </div>
          <div class="hpt-free-sub">
            <span>${html(lines[index + 1].sub)}</span>
            <a
              href="${html(rateURL(row.hotel, true))}"
              target="_blank"
              rel="noopener noreferrer"
            >Book ↗</a>
          </div>
        </div>
      `).join('')}

      ${notUsable}
    `;
  }

  function setFreeSort(sort) {
    state.freeSort = sort === 'points' ? 'points' : 'cash';

    try {
      localStorage.setItem(FREE_SORT_KEY, state.freeSort);
    } catch {}

    render();
  }

  // =====================================
  // Split Stay
  // =====================================

  // Value of points in the display currency; the point value is set in euro cents.
  const pointsMoney = points =>
    convert(points * state.pointValue / 100, 'EUR', state.currency);

  // One hotel's nights: cash in the display currency, points and whether it is a Standard Room Reward.
  function splitRows(code) {
    return state.split.nights.map(night => {
      const cash = night.cash.get(code);
      const reward = night.points.get(code);

      return {
        cash: cash ? convert(cash, 'USD', state.currency) : null,
        points: reward?.points || null,
        standard: reward?.reward === 'standard'
      };
    });
  }

  // Points for one reward booking of nights [from, to). Of every 5 Standard Room Reward
  // nights the cheapest is free (Silver and up).
  function runPoints(rows, from, to) {
    let points = 0;
    let free = 0;

    for (let start = from; start < to; start += 5) {
      const block = rows.slice(start, Math.min(start + 5, to));

      points += block.reduce((sum, row) => sum + row.points, 0);

      if (block.length === 5 && block.every(row => row.standard)) {
        points -= Math.min(...block.map(row => row.points));
        free++;
      }
    }

    return { points, free };
  }

  // Cheapest mix of cash nights, reward bookings and certificates for nights [from, to)
  // at one hotel. Entry c is the best plan using at most c certificates, or null.
  function mixPlans(rows, from, to, certificates) {
    const table = Array.from({ length: to + 1 }, () => []);
    // Plans link back to the plan they extend; steps are collected at the end.
    table[from][0] = { value: 0, cash: 0, points: 0, prev: null, step: null };

    const reach = (index, used, plan, step) => {
      const cash = plan.cash + step.cash;
      const points = plan.points + step.points;
      const value = cash + pointsMoney(points);
      const current = table[index][used];

      if (current && current.value <= value) return;

      table[index][used] = { value, cash, points, prev: plan, step };
    };

    for (let i = from; i < to; i++) {
      for (let used = 0; used <= certificates; used++) {
        const plan = table[i][used];
        if (!plan) continue;

        const row = rows[i];

        if (row.cash !== null) {
          reach(i + 1, used, plan, { kind: 'cash', from: i, to: i + 1, cash: row.cash, points: 0, free: 0 });
        }

        if (used < certificates && row.standard) {
          reach(i + 1, used + 1, plan, { kind: 'certificate', from: i, to: i + 1, cash: 0, points: 0, free: 0 });
        }

        for (let end = i + 1; end <= to && rows[end - 1].points; end++) {
          const run = runPoints(rows, i, end);
          reach(end, used, plan, { kind: 'points', from: i, to: end, cash: 0, ...run });
        }
      }
    }

    const best = [];

    for (let used = 0; used <= certificates; used++) {
      const plan = table[to][used];
      const previous = best[used - 1];

      if (!plan || (previous && previous.value <= plan.value)) {
        best.push(previous || null);
        continue;
      }

      const steps = [];
      for (let link = plan; link.step; link = link.prev) steps.unshift(link.step);

      best.push({ value: plan.value, cash: plan.cash, points: plan.points, steps });
    }

    return best;
  }

  // Joins neighbouring cash nights and certificate nights at the same hotel into one leg.
  function legs(steps) {
    const joined = [];

    for (const step of steps) {
      const last = joined[joined.length - 1];

      if (
        last &&
        last.kind === step.kind &&
        last.code === step.code &&
        last.to === step.from &&
        step.kind !== 'points'
      ) {
        joined[joined.length - 1] = { ...last, to: step.to, cash: last.cash + step.cash };
        continue;
      }

      joined.push({ ...step });
    }

    return joined;
  }

  let splitCache = null;

  // Best split stay per hotel and, if it pays off, the best stay with one hotel change.
  // Cached, since render() runs often and this is the expensive part.
  function splitStays() {
    const split = state.split;
    const stay = split.nights.length;

    if (split.status !== 'done' || !stay) return null;

    const key = [
      state.certificates,
      state.pointValue,
      state.currency,
      state.currencies?.size,
      state.hotels.size
    ].join('|');

    if (splitCache?.split !== split || splitCache.key !== key) {
      splitCache = { split, key, result: computeSplit() };
    }

    return splitCache.result;
  }

  function computeSplit() {
    const split = state.split;
    const stay = split.nights.length;

    // Cash comes in USD and the point value in euro cents.
    if (convert(1, 'USD', state.currency) === null || pointsMoney(1) === null) {
      return { note: ratesNote(), hotels: [], change: null, value: null, plan: null, saving: 0 };
    }

    const certificates = Math.min(state.certificates, stay);
    const hotels = [];
    const parts = [];

    for (const hotel of state.hotels.values()) {
      if (hotel.bookable === false) continue;

      const rows = splitRows(hotel.code);

      parts.push({
        code: hotel.code,
        // First k nights and the rest, for k = 1 … stay - 1.
        head: Array.from({ length: stay }, (_, k) => k && mixPlans(rows, 0, k, certificates)),
        tail: Array.from({ length: stay }, (_, k) => k && mixPlans(rows, k, stay, certificates))
      });

      const plan = mixPlans(rows, 0, stay, certificates)[certificates];

      if (!plan) continue;

      const allCash = rows.every(row => row.cash !== null)
        ? rows.reduce((sum, row) => sum + row.cash, 0)
        : null;

      const allPoints = rows.every(row => row.points)
        ? pointsMoney(runPoints(rows, 0, stay).points)
        : null;

      const single = [allCash, allPoints].filter(value => value !== null);
      const baseline = single.length ? Math.min(...single) : null;
      const steps = plan.steps.map(step => ({ ...step, code: hotel.code }));

      hotels.push({
        code: hotel.code,
        name: hotelName(hotel.code),
        plan: { ...plan, steps },
        legs: legs(steps),
        baseline,
        saving: baseline === null ? 0 : Math.max(0, baseline - plan.value),
        mixed: new Set(steps.map(step => step.kind)).size > 1
      });
    }

    hotels.sort((a, b) => a.plan.value - b.plan.value || a.name.localeCompare(b.name));

    // Moving hotels once, after night k.
    let change = null;

    for (let k = 1; k < stay; k++) {
      for (const first of parts) {
        for (const second of parts) {
          if (first === second) continue;

          for (let used = 0; used <= certificates; used++) {
            const a = first.head[k][used];
            const b = second.tail[k][certificates - used];

            if (!a || !b) continue;

            const value = a.cash + b.cash + pointsMoney(a.points + b.points);
            if (change && change.value <= value) continue;

            change = {
              value,
              cash: a.cash + b.cash,
              points: a.points + b.points,
              steps: [
                ...a.steps.map(step => ({ ...step, code: first.code })),
                ...b.steps.map(step => ({ ...step, code: second.code }))
              ]
            };
          }
        }
      }
    }

    const best = hotels[0];

    if (
      !change ||
      (best && change.value > best.plan.value * (1 - SPLIT.switchSaving))
    ) {
      change = null;
    } else {
      change.legs = legs(change.steps);
      change.saving = best ? best.plan.value - change.value : 0;
    }

    // Cheapest stay paid one way only (all cash or all points at one hotel).
    const plain = hotels
      .map(row => row.baseline)
      .filter(value => value !== null);

    const value = change ? change.value : best?.plan.value ?? null;

    return {
      note: '',
      hotels,
      change,
      value,
      plan: change || best?.plan || null,
      saving: plain.length && value !== null
        ? Math.max(0, Math.min(...plain) - value)
        : 0
    };
  }

  const shortDate = date =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });

  // What a leg costs, e.g. "≈ €450" or "104,000 pts · 1 free ≈ €450".
  function legCost(leg) {
    const count = leg.to - leg.from;

    if (leg.kind === 'cash') return `≈ ${money(leg.cash)}`;

    if (leg.kind === 'certificate') {
      return count === 1 ? 'Free Night Certificate' : `${count} Free Night Certificates`;
    }

    return `${number(leg.points)} pts` +
      (leg.free ? ` · ${leg.free} free` : '') +
      ` ≈ ${money(pointsMoney(leg.points))}`;
  }

  const LEG_LABEL = { cash: 'Cash', points: 'Points', certificate: 'Certificate' };
  const LEG_TONE = { cash: 'cash', points: 'points', certificate: 'free' };

  function legsHTML(list, withHotel) {
    const arrival = state.search.arrival;

    return list.map(leg => {
      const count = leg.to - leg.from;
      const dates = {
        arrival: addDays(arrival, leg.from),
        departure: addDays(arrival, leg.to)
      };

      return `
        <div class="hpt-leg">
          <span class="hpt-chip ${LEG_TONE[leg.kind]}">${LEG_LABEL[leg.kind]}</span>
          <div class="hpt-leg-text">
            ${withHotel ? `<b>${html(hotelName(leg.code))}</b>` : ''}
            <span>
              ${html(shortDate(dates.arrival))} → ${html(shortDate(dates.departure))} ·
              ${count} ${plural(count, 'night', 'nights')}
            </span>
            <span>${html(legCost(leg))}</span>
          </div>
          <a
            href="${html(rateURL(state.hotels.get(leg.code) || { code: leg.code }, leg.kind !== 'cash', dates))}"
            target="_blank"
            rel="noopener noreferrer"
          >Book ↗</a>
        </div>
      `;
    }).join('');
  }

  // Short description of a plan, e.g. "3 cash · 5 points · 1 certificate".
  function planSummary(steps) {
    const count = { cash: 0, points: 0, certificate: 0 };

    for (const step of steps) count[step.kind] += step.to - step.from;

    return [
      count.cash ? `${count.cash} cash` : '',
      count.points ? `${count.points} points` : '',
      count.certificate
        ? `${count.certificate} ${plural(count.certificate, 'certificate', 'certificates')}`
        : ''
    ].filter(Boolean).join(' · ');
  }

  // Why the Split Stay can't run for this search, or ''.
  function splitBlocked() {
    const stay = nights();

    if (!state.search) return 'Waiting for a search';
    if (stay < SPLIT.minNights) return `Needs a stay of ${SPLIT.minNights} or more nights`;
    if (stay > SPLIT.maxNights) return `Works for stays of up to ${SPLIT.maxNights} nights`;
    if (!state.batches.length) return 'Waiting for hotels';

    return '';
  }

  function renderSplit() {
    const root = $('hpt-split');
    const split = state.split;
    const blocked = splitBlocked();
    const loading = split.status === 'loading';

    $('hpt-split-controls').hidden = Boolean(blocked);

    const select = $('hpt-certs');
    if (document.activeElement !== select) select.value = String(state.certificates);

    const load = $('hpt-split-load');
    load.disabled = loading;
    $('hpt-split-label').textContent = split.status === 'done'
      ? 'Reload nightly prices'
      : 'Load nightly prices';

    if (blocked) {
      $('hpt-split-status').innerHTML = '';
      root.innerHTML = `
        <div class="hpt-empty">
          <div class="hpt-empty-icon">${ICON.calendar}</div>
          <b>${html(blocked)}</b>
          <p>Search a destination and dates on Hilton.</p>
        </div>
      `;
      return;
    }

    if (loading) {
      const night = Math.min(
        split.nights.length,
        Math.floor(split.done / (split.total / split.nights.length)) + 1
      );

      $('hpt-split-status').innerHTML = `
        <div class="hpt-progress">
          <div class="hpt-row">
            <b>Loading night ${night} of ${split.nights.length}</b>
            <span>${split.done}/${split.total} requests</span>
          </div>
          <div class="hpt-bar">
            <div style="width:${Math.round(100 * split.done / split.total)}%"></div>
          </div>
        </div>
      `;
      root.innerHTML = '';
      return;
    }

    if (split.status === 'idle') {
      const requests = splitRequests();

      $('hpt-split-status').textContent =
        `Sends ${requests} requests to Hilton (cash and points for each night), ` +
        `about ${Math.max(1, Math.round(requests * (CONFIG.delay + 400) / 60000))} min.`;
      root.innerHTML = '';
      return;
    }

    const result = splitStays();
    const errors = split.errors.length
      ? `${split.errors.length} of ${split.total} requests failed`
      : '';

    $('hpt-split-status').textContent =
      [errors, result.note].filter(Boolean).join(' · ');

    if (!result.hotels.length && !result.change) {
      root.innerHTML = result.note ? '' : `
        <div class="hpt-empty">
          <div class="hpt-empty-icon">${ICON.split}</div>
          <b>No hotel has a price for every night</b>
          <p>Each night needs a cash rate, a reward room or a certificate. Try other dates.</p>
        </div>
      `;
      return;
    }

    const [best, ...rest] = result.hotels;
    const change = result.change;

    // Preserve expanded hotels during rerenders.
    const opened = new Set(
      [...root.querySelectorAll('details[open]')].map(x => x.dataset.detail)
    );

    root.innerHTML = `
      <div class="hpt-split-stats">
        <div class="hpt-stats">
          <div class="hpt-stat split">
            <b>≈ ${html(money(result.value))}</b>
            <span>cheapest stay</span>
          </div>
          <div class="hpt-stat${result.saving ? ' good' : ''}">
            <b>≈ ${html(money(result.saving))}</b>
            <span>saved vs. all cash or all points</span>
          </div>
        </div>
      </div>

      ${change ? `
        <div class="hpt-split-card">
          <div class="hpt-row">
            <span class="hpt-name">Change hotels once</span>
            ${change.saving > 0
              ? `<span class="hpt-chip split">−${html(money(change.saving))}</span>`
              : ''}
          </div>
          <div class="hpt-split-total">
            ≈ ${html(money(change.value))} · ${html(planSummary(change.steps))}
          </div>
          ${legsHTML(change.legs, true)}
        </div>
      ` : ''}

      ${best ? `
        <div class="hpt-split-card">
          <div class="hpt-row">
            <span class="hpt-name">${html(best.name)}</span>
            ${best.mixed && best.saving
              ? `<span class="hpt-chip split">−${html(money(best.saving))}</span>`
              : ''}
          </div>
          <div class="hpt-split-total">
            ≈ ${html(money(best.plan.value))} · ${html(planSummary(best.plan.steps))}
          </div>
          ${legsHTML(best.legs, false)}
        </div>
      ` : ''}

      ${rest.length ? `<div class="hpt-free-title">Other hotels</div>` : ''}

      ${rest.map(row => `
        <details
          class="hpt-split-row"
          data-detail="${html(row.code)}"
          ${opened.has(row.code) ? 'open' : ''}
        >
          <summary>
            <span class="hpt-row">
              <span class="hpt-name">${html(row.name)}</span>
              <b>≈ ${html(money(row.plan.value))}</b>
            </span>
            <span class="hpt-free-sub">
              <span>${html(planSummary(row.plan.steps))}</span>
              <span>${row.mixed && row.saving ? `saves ≈ ${html(money(row.saving))}` : ''}</span>
            </span>
          </summary>
          ${legsHTML(row.legs, false)}
        </details>
      `).join('')}
    `;
  }

  function setCertificates(value) {
    const count = parseInt(value, 10);

    state.certificates = count >= 0 ? Math.min(SPLIT.maxCertificates, count) : 0;

    try {
      localStorage.setItem(SPLIT_CERTS_KEY, String(state.certificates));
    } catch {}

    render();
  }

  function renderSettings() {
    const point = $('hpt-point');

    if (document.activeElement !== point) {
      point.value = state.pointValue;
    }

    const select = $('hpt-currency');
    const codes = [
      ...new Set([
        state.currency,
        ...(state.currencies?.keys() || [])
      ])
    ].sort();

    const key = codes.join(',');

    if (select.dataset.key !== key) {
      select.dataset.key = key;
      select.innerHTML = codes.map(code => {
        const description = state.currencies?.get(code)?.description;

        return `
          <option value="${html(code)}">
            ${html(code)}${description ? ` – ${html(description)}` : ''}
          </option>
        `;
      }).join('');
    }

    select.value = state.currency;
  }

  function saveSettings() {
    const point = parseFloat(
      String($('hpt-point').value).replace(',', '.')
    );

    if (point > 0) state.pointValue = point;

    state.currency = $('hpt-currency').value || state.currency;

    try {
      localStorage.setItem(POINT_KEY, String(state.pointValue));
      localStorage.setItem(CURRENCY_KEY, state.currency);
    } catch {}

    render();
  }

  const EMPTY = `
    <div class="hpt-empty">
      <div class="hpt-empty-icon">${ICON.calendar}</div>
      <b>Waiting for a Hilton search</b>
      <p>
        Search a destination and dates on Hilton.
        Eligible resorts are scanned for Semi-Flex deposit rates.
      </p>
    </div>
  `;

  // Cheapest Semi-Flex match of all scanned resorts.
  function topFind() {
    return [...state.results.values()]
      .filter(entry => entry.matches.length)
      .map(entry => ({
        entry,
        rate: [...entry.matches].sort((a, b) => a.amount - b.amount)[0]
      }))
      .sort((a, b) => a.rate.amount - b.rate.amount)[0];
  }

  function renderHome(eligible, matched) {
    const s = state.search;
    const scan = state.scan;

    $('hpt-home-empty').innerHTML = s ? '' : EMPTY;

    for (const tool of Object.keys(state.tools)) {
      const on = state.tools[tool];

      const input = state.panel.querySelector(`[data-tool="${tool}"]`);

      state.panel.querySelector(`.hpt-tool[data-view="${tool}"]`).hidden = !on;
      input.checked = on;
      input.closest('label')
        .querySelector('.hpt-tool-icon')
        .classList.toggle('off', !on);
      $(`hpt-${tool}-state`).textContent = on
        ? TOOL_INFO[tool]
        : tool === 'credit'
          ? 'Off · hidden from the home page'
          : 'Off · sends no requests';
    }

    const on = Object.values(state.tools).filter(Boolean).length;
    const total = Object.keys(state.tools).length;

    $('hpt-tools').hidden = !on;
    // Point value and currency only matter for points comparisons.
    const valued = wantsPoints() || state.tools.split || state.tools.calendar || state.tools.suites;

    $('hpt-shared').hidden = !valued;
    $('hpt-shared-note').hidden = !(state.tools.points && state.tools.free);

    state.panel.querySelector('.hpt-tool[data-view="split"]')
      .setAttribute('aria-busy', String(state.split.status === 'loading'));

    state.panel.querySelector('.hpt-tool[data-view="calendar"]')
      .setAttribute('aria-busy', String(state.calendar.status === 'loading'));

    state.panel.querySelector('.hpt-tool[data-view="rates"]')
      .setAttribute('aria-busy', String(state.inspect.status === 'loading'));

    state.panel.querySelector('.hpt-tool[data-view="suites"]')
      .setAttribute('aria-busy', String(state.suites.status === 'loading'));

    state.panel.querySelector('.hpt-tool[data-view="watch"]')
      .setAttribute('aria-busy', String(state.watch.status === 'checking'));

    $('hpt-settings-sum').textContent = valued
      ? `${on === total ? `${on} tools on` : `${on} of ${total} tools on`} · ` +
        `${state.pointValue} ct · ${state.currency}`
      : `${on} of ${total} tools on`;

    // Each tool card shows a spinner while that tool is still loading.
    state.panel.querySelector('.hpt-tool[data-view="resort"]')
      .setAttribute('aria-busy', String(Boolean(s && state.busy)));

    for (const tool of ['points', 'free']) {
      state.panel.querySelector(`.hpt-tool[data-view="${tool}"]`)
        .setAttribute('aria-busy', String(Boolean(
          s && (state.extras.pending > 0 || state.currencies?.size === 0)
        )));
    }

    $('hpt-resort-chip').textContent = matched
      ? `${matched} ${plural(matched, 'match', 'matches')}`
      : '';

    const checked = state.results.size;
    const retry = [...state.results.keys()].filter(needsRetry).length;

    $('hpt-resort-sub').textContent = !s
      ? 'Waiting for a search'
      : scan
        ? `Scanning hotel ${scan.position + 1} of ${scan.codes.length}`
        : eligible === null
          ? 'Loading the Resort Credit list…'
          : [
              `${eligible} Resort Credit ${plural(eligible, 'hotel', 'hotels')}`,
              checked ? `${checked} checked` : '',
              retry ? `${retry} retryable` : ''
            ].filter(Boolean).join(' · ');

    const { rows, priced, points } = pointsSummary();
    const best = rows.find(row => row.result?.centsPerPoint);

    $('hpt-points-chip').textContent = priced.length
      ? `Points ${points.length}/${priced.length}`
      : '';

    $('hpt-points-sub').textContent = !s
      ? 'Waiting for a search'
      : best
        ? `Best: ${best.result.centsPerPoint.toFixed(2)} ct/pt at ${best.name}`
        : state.extras.pending
          ? 'Loading points prices…'
          : rows.length
            ? `${rows.length} ${plural(rows.length, 'hotel', 'hotels')} · no points prices`
            : 'Waiting for hotels';

    const { usable } = s ? freeNights() : { usable: [] };

    $('hpt-free-chip').textContent = usable.length
      ? `${usable.length} usable`
      : '';

    $('hpt-free-sub').textContent = !s
      ? 'Waiting for a search'
      : usable.length
        ? `Best: ${freeLines(usable[0]).headline} a night at ${usable[0].name}`
        : state.extras.pending
          ? 'Loading points prices…'
          : state.hotels.size
            ? 'No Standard Room Reward for these dates'
            : 'Waiting for hotels';

    const blocked = splitBlocked();
    const split = state.split;
    const splitResult = splitStays();

    $('hpt-split-chip').textContent = splitResult?.saving > 0
      ? `−${money(splitResult.saving)}`
      : '';

    $('hpt-split-sub').textContent = blocked
      || (split.status === 'loading'
        ? `Loading nightly prices · ${split.done}/${split.total} requests`
        : split.status === 'idle'
          ? `Load nightly prices on demand · ${splitRequests()} requests`
          : splitResult.note
            || (splitResult.plan
              ? `Best: ≈ ${money(splitResult.value)} · ${planSummary(splitResult.plan.steps)}`
              : 'No hotel has a price for every night'));

    const calendar = state.calendar;
    const calendarResult = calendarTable();
    const calendarTop = calendarResult?.top;

    $('hpt-calendar-chip').textContent = calendarResult?.saving > 0
      ? `−${calendarAmount(calendarResult.saving)}`
      : '';

    $('hpt-calendar-sub').textContent = calendarBlocked()
      || (calendar.status === 'loading'
        ? `Loading other dates · ${calendar.done}/${calendar.total} requests`
        : calendar.status === 'idle'
          ? `Compare ±${state.calendarRange} ${plural(state.calendarRange, 'day', 'days')} on demand · ` +
            `${calendarRequests()} requests`
          : calendarResult.note
            || (calendarTop
              ? `Best: arrive ${shortDate(calendar.days[calendarTop.best].arrival)} · ` +
                `${state.calendarMode === 'points' ? '' : '≈ '}` +
                `${calendarAmount(calendarTop.prices[calendarTop.best])} a night at ${calendarTop.name}`
              : 'No prices on these dates'));

    const inspect = state.inspect;
    const inspected = inspect.status === 'done' && inspect.code ? inspectPlans() : null;

    $('hpt-rates-chip').textContent = inspected?.plans.length
      ? `${inspected.plans.length} ${plural(inspected.plans.length, 'rate', 'rates')}`
      : '';

    $('hpt-rates-sub').textContent = !s
      ? 'Waiting for a search'
      : !state.hotels.size
        ? 'Waiting for hotels'
        : inspect.status === 'loading'
          ? `Loading rates of ${hotelName(inspect.code)}…`
          : inspect.status === 'failed'
            ? `Could not load rates of ${hotelName(inspect.code)}`
            : inspect.unavailable
              ? `${hotelName(inspect.code)}: no bookable rates`
              : inspected?.plans.length
                ? `${hotelName(inspect.code)}: ` + (inspected.flexibility === null
                    ? 'no refundable rate'
                    : inspected.flexibility === 0
                      ? 'cheapest rate is refundable'
                      : `refundable ${percent(inspected.flexibility)} over cheapest`)
                : 'Pick a hotel to compare its rate plans';

    const suites = state.suites;
    const suiteResult = suiteBlocked() ? null : suiteTable();
    const [suiteOne, suiteMany] = suiteNoun();

    $('hpt-suites-chip').textContent = suiteResult?.count
      ? `${suiteResult.count} ${plural(suiteResult.count, suiteOne, suiteMany)}`
      : '';

    $('hpt-suites-sub').textContent = suiteBlocked()
      || (suites.status === 'loading'
        ? `Loading rooms · ${Math.min(suites.done, suites.total)}/${suites.total} requests`
        : suiteResult.noExtra
          ? `${suiteResult.noExtra.room.name} at no extra points · ${suiteResult.noExtra.row.name}`
          : suiteResult.top
            ? `Best: ${suiteResult.top.upgrades[0].name} ${upgradeCost(suiteResult.top.upgrades[0])} · ` +
              suiteResult.top.name
            : suiteResult.empty.length
              ? `No ${suiteMany} at these hotels`
              : `Find suites on demand · ${suiteRequests()} requests`);

    const watch = state.watch;
    const drops = rebooks();
    const ahead = watch.items.filter(upcoming);

    $('hpt-watch-chip').textContent = drops.length
      ? `−${money(watchDrop(drops[0]), drops[0].search.currency)}`
      : '';

    $('hpt-watch-sub').textContent = watch.status === 'checking'
      ? `Checking prices · ${watch.done}/${watch.total} stays`
      : drops.length
        ? `Rebook ${drops[0].name}: now ${drops[0].price || money(drops[0].total, drops[0].search.currency)}` +
          (drops.length > 1 ? ` · ${drops.length - 1} more` : '')
        : ahead.length
          ? `${ahead.length} ${plural(ahead.length, 'stay', 'stays')} watched · ` +
            `checked ${ago(Math.max(...ahead.map(item => item.checked || 0)))}`
          : 'Watch a rate from the Rate Inspector';

    const credit = creditNow();

    $('hpt-credit-chip').textContent = credit.left > 0
      ? `${usdExact(credit.left)} left`
      : 'Used up';

    $('hpt-credit-sub').textContent = credit.left > 0
      ? `${credit.label}: ${usdExact(credit.used)} of ${usd(state.credit.amount)} used · ` +
        (credit.days <= CREDIT.soonDays
          ? `expires in ${credit.days} ${plural(credit.days, 'day', 'days')}`
          : `until ${shortDate(credit.end)}`)
      : `${credit.label} used up · next credit from ${shortDate(credit.next)}`;

    const top = state.tools.resort && topFind();

    $('hpt-top').hidden = !top;
    if (!top) return;

    const result = compare(top.entry, top.rate);

    const verdict =
      result?.winner && !result.unconverted && result.pointsValue !== null
        ? `
          <div class="hpt-verdict ${result.winner}">
            ${result.winner === 'points' ? 'Points' : 'Cash'}
            cheaper by ≈ ${html(money(Math.abs(result.cashValue - result.pointsValue)))}
          </div>
        `
        : '';

    $('hpt-top-card').innerHTML = `
      <div class="hpt-row">
        <b>${html(top.entry.name)}</b>
        <b>${html(top.rate.price)}</b>
      </div>
      <div>
        ${html(top.rate.name)} · deposit · ${html(top.rate.roomName)}
      </div>
      ${verdict}
    `;
  }

  // Header and visible page for state.view; minimized always shows the home header.
  function renderView() {
    const home = state.view === 'home';

    for (const view of Object.keys(VIEWS)) {
      $(`hpt-view-${view}`).hidden = view !== state.view;
    }

    $('hpt-back').hidden = home || state.minimized;
    $('hpt-logo').hidden = !home && !state.minimized;
    $('hpt-title').textContent =
      VIEWS[state.minimized ? 'home' : state.view];
  }

  // Switches a tool on or off. Off stops its requests; on catches up
  // on the current search.
  function setTool(tool, on) {
    state.tools[tool] = on;

    try {
      localStorage.setItem(TOOLS_KEY, JSON.stringify(state.tools));
    } catch {}

    if (tool === 'resort') {
      if (on) {
        state.paused = false;
        scheduleAutoScan();
      } else {
        clearTimeout(autoTimer);
        state.stop = true;
      }
    }

    // Switched off while loading: drop the half loaded inspection.
    if (tool === 'rates' && !on && state.inspect.status === 'loading') {
      state.inspect = freshInspect(state.inspect.code);
    }

    // Switched off while loading: stop, keeping the picked hotel.
    if (tool === 'suites' && !on && state.suites.status === 'loading') {
      state.suites = freshSuites(state.suites.pick);
    }

    if (tool === 'watch' && on) checkWatch();

    if ((tool === 'points' || tool === 'free') && on && state.search) {
      for (const batch of state.batches) {
        loadPoints(batch.codes, batch.input, state.generation);
      }

      loadCurrencies();
    }

    render();
  }

  function showView(view) {
    const from = state.view;

    state.view = view;

    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {}

    render();
    $('hpt-body').scrollTop = 0;

    // The clicked control is hidden now, so move keyboard focus.
    (view === 'home'
      ? state.panel.querySelector(`.hpt-tool[data-view="${from}"]`)
      : $('hpt-back')
    )?.focus();
  }

  function render() {
    if (!state.panel) return;

    const s = state.search;

    const eligible = state.resorts
      ? [...state.hotels.keys()].filter(
          code => state.resorts.has(code)
        ).length
      : null;

    const matched = [...state.results.values()].filter(
      entry => entry.matches.length > 0
    ).length;

    $('hpt-dates').textContent = s
      ? stay(s.arrival, s.departure)
      : 'Waiting for search';

    $('hpt-min-badge').textContent = matched
      ? `${matched} ${plural(matched, 'match', 'matches')}`
      : '';

    const drop = state.tools.watch && rebooks()[0];

    $('hpt-min-watch').textContent = drop
      ? `Rebook: −${money(watchDrop(drop), drop.search.currency)}`
      : '';

    const stats = $('hpt-stats');

    stats.hidden = !s;
    stats.innerHTML = `
      <div class="hpt-stat">
        <b>${eligible ?? '…'}</b>
        <span>Resort Credit ${plural(eligible, 'hotel', 'hotels')}</span>
      </div>
      <div class="hpt-stat${matched ? ' good' : ''}">
        <b>${matched}</b>
        <span>with candidates</span>
      </div>
    `;

    $('hpt-status').dataset.busy = String(state.busy);

    renderView();
    renderProgress();
    renderSettings();
    renderHome(eligible, matched);
    renderUpdate();
    renderAll();
    renderFree();
    renderSplit();
    renderCalendar();
    renderRates();
    renderSuites();
    renderWatch();
    renderCredit();

    const root = $('hpt-results');

    if (!s && !state.results.size) {
      root.innerHTML = EMPTY;
      return;
    }

    // Preserve expanded details during rerenders.
    const opened = new Set(
      [...root.querySelectorAll('details[open]')]
        .map(x => x.dataset.detail)
    );

    root.innerHTML = [
      ...state.results.values()
    ].map(entry => {
      const rates = [...entry.matches].sort(
        (a, b) => a.amount - b.amount
      );

      const best = rates[0];

      const remaining = Math.max(
        0,
        (entry.rooms?.length || 0) - entry.done.size
      );

      const tone = entry.unavailable
        ? 'unavail'
        : best
          ? 'match'
          : entry.errors.length
            ? 'partial'
            : 'none';

      const label = entry.unavailable
        ? 'Sold out (1740)'
        : best
          ? `${rates.length} ${plural(rates.length, 'candidate', 'candidates')}`
          : entry.errors.length
            ? 'Incomplete'
            : entry.full
              ? 'No qualifying rate'
              : 'Not fully verified';

      const count = entry.unavailable
        ? 'No bookable rates'
        : entry.totalRooms
          ? `${entry.done.size}/${entry.totalRooms} room types` +
            (entry.full ? ' · fully checked' : '')
          : 'Room types not loaded';

      const progress = entry.totalRooms
        ? Math.round(100 * entry.done.size / entry.totalRooms)
        : 0;

      const link = rateURL(entry);

      const detailsKey = `rates-${entry.code}`;
      const errorsKey = `errors-${entry.code}`;

      return `
        <div class="hpt-hotel">
          <div class="hpt-row">
            <div class="hpt-name">${html(entry.name)}</div>
            <span class="hpt-code">${html(entry.code)}</span>
          </div>

          <div class="hpt-meta">
            <span class="hpt-badge ${tone}">${html(label)}</span>
            <span>${html(count)}</span>
          </div>

          ${entry.totalRooms && !entry.unavailable ? `
            <div class="hpt-bar ${tone}">
              <div style="width:${progress}%"></div>
            </div>
          ` : ''}

          ${best ? `
            <div class="hpt-best">
              <div class="hpt-row">
                <b>${html(best.price)}</b>
                <span>${html(best.name)} · deposit</span>
              </div>
              <div>${html(best.roomName)} · ${html(best.code)}</div>
              ${best.cancellation ? `
                <div>${html(best.cancellation)}</div>
              ` : ''}
            </div>
          ` : ''}

          ${entry.unavailable ? '' : compareHTML(entry, best)}

          ${rates.length > 1 ? `
            <details
              class="hpt-more"
              data-detail="${html(detailsKey)}"
              ${opened.has(detailsKey) ? 'open' : ''}
            >
              <summary>
                ${rates.length - 1} more
                ${plural(rates.length - 1, 'candidate', 'candidates')}
              </summary>

              ${rates.slice(1).map(rate => `
                <div>
                  <span>
                    ${html(rate.roomName)} ·
                    ${html(rate.name)} ·
                    ${html(rate.code)}
                  </span>
                  <b>${html(rate.price)}</b>
                </div>
              `).join('')}
            </details>
          ` : ''}

          ${entry.errors.length ? `
            <details
              class="hpt-diag"
              data-detail="${html(errorsKey)}"
              ${opened.has(errorsKey) ? 'open' : ''}
            >
              <summary>Diagnostics (${entry.errors.length})</summary>

              ${entry.errors.map(error => `
                <div>${html(error)}</div>
              `).join('')}
            </details>
          ` : ''}

          <div class="hpt-links">
            ${link ? `
              <a
                href="${html(link)}"
                target="_blank"
                rel="noopener noreferrer"
              >View rates ↗</a>
            ` : ''}

            ${entry.unavailable ? '' : inspectButton(entry.code)}

            ${!entry.unavailable && remaining > 0 ? `
              <button
                type="button"
                class="hpt-link-btn"
                data-expand="${html(entry.code)}"
                ${state.busy ? 'disabled' : ''}
              >
                Scan ${remaining} more
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    root.querySelectorAll('[data-expand]')
      .forEach(button => {
        button.addEventListener('click', () => {
          expandHotel(button.dataset.expand);
        });
      });
  }

  // =====================================
  // Flexible Dates
  // =====================================

  // A price in the mode Flexible Dates shows, e.g. "€980" or "52,000 pts".
  const calendarAmount = value =>
    state.calendarMode === 'points'
      ? `${number(Math.round(value))} pts`
      : money(value);

  // Short price for a date cell, e.g. "€980", "€12.4K" or "52k".
  function cellPrice(value) {
    if (state.calendarMode === 'points') {
      return value >= 1000
        ? `${+(value / 1000).toFixed(value % 1000 ? 1 : 0)}k`
        : number(value);
    }

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: state.currency,
        notation: value >= 10000 ? 'compact' : 'standard',
        maximumFractionDigits: value >= 10000 ? 1 : 0
      }).format(value);
    } catch {
      return String(Math.round(value));
    }
  }

  const weekday = date =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'UTC'
    });

  // Every hotel of the search with its price per night on each loaded arrival day:
  // cash in the display currency or points.
  function calendarTable() {
    const calendar = state.calendar;
    if (calendar.status !== 'done' || !calendar.days.length) return null;

    const byPoints = state.calendarMode === 'points';
    const stay = nights();
    // Savings are for the whole stay; on points every 5th night is free, as in Cash vs. Points.
    const paid = byPoints ? stay - Math.floor(stay / 5) : stay;
    const current = calendar.days.findIndex(day => !day.offset);
    const result = { note: '', rows: [], empty: [], current, top: null, saving: 0 };

    // Cash comes in USD.
    if (!byPoints && convert(1, 'USD', state.currency) === null) {
      return { ...result, note: ratesNote() };
    }

    const perNight = (day, hotel) => {
      if (byPoints) {
        return (day.points ? day.points.get(hotel.code) : hotel.points) || null;
      }

      const total = day.cash
        ? convert(day.cash.get(hotel.code), 'USD', state.currency)
        : hotel.cash
          ? convert(hotel.cash.amount, hotel.cash.currency, state.currency)
          : null;

      return total === null ? null : total / stay;
    };

    for (const hotel of state.hotels.values()) {
      if (hotel.bookable === false) continue;

      const prices = calendar.days.map(day => perNight(day, hotel));
      const known = prices.filter(price => price !== null);
      const name = hotelName(hotel.code);

      if (!known.length) {
        result.empty.push({ hotel, name });
        continue;
      }

      const low = Math.min(...known);
      const searched = prices[current] ?? null;

      result.rows.push({
        hotel,
        name,
        resort: Boolean(state.resorts?.has(hotel.code)),
        prices,
        // On a tie the searched dates win, so no move is suggested for nothing.
        best: searched === low ? current : prices.indexOf(low),
        // What the cheapest day saves on the whole stay, null without a price on the searched dates.
        saving: searched === null ? null : (searched - low) * paid
      });
    }

    result.rows.sort((a, b) =>
      a.prices[a.best] - b.prices[b.best] ||
      a.name.localeCompare(b.name)
    );
    result.empty.sort((a, b) => a.name.localeCompare(b.name));

    const top = result.rows[0] || null;
    const searched = result.rows
      .map(row => row.prices[current] ?? null)
      .filter(price => price !== null);

    result.top = top;
    // Cheapest stay overall against the cheapest one on the searched dates.
    result.saving = top && searched.length
      ? Math.max(0, (Math.min(...searched) - top.prices[top.best]) * paid)
      : 0;

    // The search's own points prices may still be loading.
    if (byPoints && current >= 0 && !calendar.days[current].points && state.extras.pending) {
      result.note = 'Loading points prices…';
    }

    return result;
  }

  // Why Flexible Dates can't run for this search, or ''.
  function calendarBlocked() {
    if (!state.search) return 'Waiting for a search';
    if (!state.batches.length) return 'Waiting for hotels';

    return '';
  }

  // The same Hilton search on other dates; the panel then follows the new search.
  function searchURL(day) {
    if (!location.pathname.includes('/search')) return '';

    const url = new URL(location.href);
    url.searchParams.set('arrivalDate', day.arrival);
    url.searchParams.set('departureDate', day.departure);

    return url.href;
  }

  function renderCalendar() {
    const root = $('hpt-cal');
    const calendar = state.calendar;
    const blocked = calendarBlocked();
    const loading = calendar.status === 'loading';
    const byPoints = state.calendarMode === 'points';

    $('hpt-cal-controls').hidden = Boolean(blocked);

    const select = $('hpt-cal-range');
    if (document.activeElement !== select) select.value = String(state.calendarRange);

    $('hpt-cal-load').disabled = loading;
    $('hpt-cal-label').textContent =
      calendar.status === 'done' && calendar.range === state.calendarRange
        ? 'Reload prices'
        : 'Load other dates';

    $('hpt-cal-mode').hidden = calendar.status !== 'done';

    for (const button of state.panel.querySelectorAll('[data-cal-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.calMode === state.calendarMode));
    }

    if (blocked) {
      $('hpt-cal-status').innerHTML = '';
      root.innerHTML = `
        <div class="hpt-empty">
          <div class="hpt-empty-icon">${ICON.calendar}</div>
          <b>${html(blocked)}</b>
          <p>Search a destination and dates on Hilton.</p>
        </div>
      `;
      return;
    }

    if (loading) {
      $('hpt-cal-status').innerHTML = `
        <div class="hpt-progress">
          <div class="hpt-row">
            <b>Loading arrival ${html(shortDate(calendar.arrival || state.search.arrival))}</b>
            <span>${calendar.done}/${calendar.total} requests</span>
          </div>
          <div class="hpt-bar">
            <div style="width:${Math.round(100 * calendar.done / Math.max(1, calendar.total))}%"></div>
          </div>
        </div>
      `;
      root.innerHTML = '';
      return;
    }

    if (calendar.status === 'idle') {
      const requests = calendarRequests();

      $('hpt-cal-status').textContent =
        `Sends ${requests} requests to Hilton (cash and points for each other arrival day), ` +
        `about ${Math.max(1, Math.round(requests * (CONFIG.delay + 400) / 60000))} min.`;
      root.innerHTML = '';
      return;
    }

    const table = calendarTable();
    const errors = calendar.errors.length
      ? `${calendar.errors.length} of ${calendar.total} requests failed`
      : '';

    $('hpt-cal-status').textContent =
      [errors, table.note].filter(Boolean).join(' · ');

    if (!table.rows.length) {
      root.innerHTML = table.note ? '' : `
        <div class="hpt-empty">
          <div class="hpt-empty-icon">${ICON.calendar}</div>
          <b>No ${byPoints ? 'reward rooms' : 'prices'} on these dates</b>
          <p>Try a wider range or other dates.</p>
        </div>
      `;
      return;
    }

    const { rows, empty, current, top } = table;
    const days = calendar.days;
    const columns = days.length;
    const bestDay = days[top.best];
    const search = bestDay.offset ? searchURL(bestDay) : '';
    const title = (day, price) =>
      `Arrive ${weekday(day.arrival)}, ${shortDate(day.arrival)}` +
      (price === null ? ': not available' : `: ${byPoints ? '' : '≈ '}${calendarAmount(price)} a night`);

    root.innerHTML = `
      <div class="hpt-split-stats">
        <div class="hpt-stats">
          <div class="hpt-stat calendar">
            <b>${html(`${weekday(bestDay.arrival)}, ${shortDate(bestDay.arrival)}`)}</b>
            <span>cheapest arrival</span>
          </div>
          <div class="hpt-stat${table.saving ? ' good' : ''}">
            <b>${byPoints ? '' : '≈ '}${html(calendarAmount(table.saving))}</b>
            <span>saved vs. your dates</span>
          </div>
        </div>
      </div>

      <div class="hpt-split-card">
        <div class="hpt-row">
          <span class="hpt-name">${html(top.name)}</span>
          ${top.saving > 0
            ? `<span class="hpt-chip calendar">−${html(calendarAmount(top.saving))}</span>`
            : ''}
        </div>
        <div class="hpt-split-total">
          ${html(stay(bestDay.arrival, bestDay.departure))} ·
          ${byPoints ? '' : '≈ '}${html(calendarAmount(top.prices[top.best]))} a night
        </div>
        <div class="hpt-links">
          <a
            href="${html(rateURL(top.hotel, byPoints, bestDay))}"
            target="_blank"
            rel="noopener noreferrer"
          >Book ↗</a>
          ${search ? `<a href="${html(search)}">Search these dates</a>` : ''}
        </div>
      </div>

      <div class="hpt-cal${byPoints ? ' points' : ''}" style="--cols:${columns}">
        <div class="hpt-cal-head">
          ${days.map((day, index) => `
            <span class="hpt-cal-day${index === current ? ' current' : ''}">
              <small>${html(weekday(day.arrival))}</small>
              ${html(shortDate(day.arrival))}
            </span>
          `).join('')}
        </div>

        ${rows.map(row => `
          <div class="hpt-cal-row">
            <div class="hpt-row">
              <span class="hpt-name">${html(row.name)}</span>
              ${row.resort ? '<span class="hpt-tag">Resort Credit</span>' : ''}
            </div>
            <div class="hpt-cal-grid">
              ${row.prices.map((price, index) => {
                const day = days[index];
                const tone = [
                  'hpt-cal-cell',
                  index === row.best ? 'best' : '',
                  index === current ? 'current' : '',
                  price === null ? 'none' : ''
                ].filter(Boolean).join(' ');

                return price === null
                  ? `<span class="${tone}" title="${html(title(day, null))}">–</span>`
                  : `<a
                      class="${tone}"
                      href="${html(rateURL(row.hotel, byPoints, day))}"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="${html(title(day, price))}"
                    >${html(cellPrice(price))}</a>`;
              }).join('')}
            </div>
            <div class="hpt-cal-sub">
              ${html(row.saving === null
                ? `Best: ${weekday(days[row.best].arrival)}, ${shortDate(days[row.best].arrival)} · not available on your dates`
                : row.best === current
                  ? 'Your dates are the cheapest'
                  : `Best: ${weekday(days[row.best].arrival)}, ${shortDate(days[row.best].arrival)} · saves ${byPoints ? '' : '≈ '}${calendarAmount(row.saving)}`)}
            </div>
          </div>
        `).join('')}
      </div>

      ${empty.length ? `
        <div class="hpt-free-title">No ${byPoints ? 'reward rooms' : 'rooms'} on any of these dates</div>
        ${empty.map(row => `
          <div class="hpt-free-off">
            <span>${html(row.name)}</span>
            <span class="hpt-chip muted">${byPoints ? 'No reward rooms' : 'Sold out'}</span>
          </div>
        `).join('')}
      ` : ''}
    `;
  }

  function setCalendarRange(value) {
    const range = parseInt(value, 10);

    state.calendarRange = range >= 1
      ? Math.min(CALENDAR.maxShift, range)
      : CALENDAR.defaultShift;

    try {
      localStorage.setItem(CALENDAR_RANGE_KEY, String(state.calendarRange));
    } catch {}

    render();
  }

  function setCalendarMode(mode) {
    state.calendarMode = mode === 'points' ? 'points' : 'cash';

    try {
      localStorage.setItem(CALENDAR_MODE_KEY, state.calendarMode);
    } catch {}

    render();
  }

  // =====================================
  // Rate Inspector
  // =====================================

  // Special rates the Rate Inspector can ask for on top, as keys of specialRates.
  const SPECIALS = ['aaa', 'senior'];

  const planKey = (code, room, special) => `${code}|${room}|${special}`;

  // One rate plan of a room type, as ratePlans() returns it.
  const planId = plan => `${plan.code}|${plan.name}|${plan.honors}`;

  // status: idle, loading, done or failed; rooms come from the scan or one room type request.
  function freshInspect(code) {
    return {
      code,
      status: 'idle',
      rooms: null,
      codeUsed: null,
      cache: null,
      room: null,
      unavailable: false,
      error: '',
      issues: []
    };
  }

  const inspectSpecials = () => ['', ...(state.inspectSpecial ? SPECIALS : [])];

  // Hotels the Rate Inspector can pick, by name.
  function inspectOptions() {
    return [...state.hotels.values()]
      .filter(hotel => hotel.bookable !== false)
      .map(hotel => ({ code: hotel.code, name: hotelName(hotel.code) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // The chosen hotel, else the top Semi-Flex find, else the first hotel.
  function inspectHotel() {
    const code = state.inspect.code;
    if (code && state.hotels.has(code)) return code;

    return topFind()?.entry.code || inspectOptions()[0]?.code || null;
  }

  // Room types of a hotel some tool already loaded ({ rooms, codeUsed, cache }), else
  // { unavailable: true } when the scan found it sold out, else null.
  function knownRooms(code) {
    const known = [
      state.results.get(code),
      state.inspect.code === code ? state.inspect : null,
      state.suites.hotels.get(code)
    ].find(item => item?.rooms);

    if (known) return { rooms: known.rooms, codeUsed: known.codeUsed, cache: known.cache };

    return state.results.get(code)?.unavailable ? { unavailable: true } : null;
  }

  // Asks for the room types of a hotel, cheapest first. Like the scan, tries the 5-letter
  // code too. send(values) sends one QUICK request. Returns { rooms, codeUsed, cache },
  // { unavailable: true } when Hilton reports the hotel sold out (1740), or null.
  async function loadRoomTypes(code, send) {
    const aliases = [...new Set([code, ...(code.length > 5 ? [code.slice(0, 5)] : [])])];

    for (const alias of aliases) {
      const cache = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const result = await send(variables(alias, null, cache));

      if (result.unavailable) {
        if (alias === aliases[aliases.length - 1]) return { unavailable: true };
        continue;
      }

      const rooms = (result.shopAvail.roomTypes || [])
        .filter(item => item.roomTypeCode)
        .sort((a, b) => referencePrice(a) - referencePrice(b));

      if (result.ctyhocn === code && rooms.length) {
        return { rooms: rooms.slice(0, CONFIG.maxRooms), codeUsed: alias, cache };
      }
    }

    return null;
  }

  // Requests inspectRates() still needs for the chosen hotel and room type.
  function inspectRequests() {
    const code = inspectHotel();
    if (!code) return 0;

    const inspect = state.inspect.code === code ? state.inspect : freshInspect(code);
    const known = knownRooms(code);
    const rooms = inspect.rooms || known?.rooms;
    const room = inspect.room || rooms?.[0]?.roomTypeCode;

    if (inspect.unavailable || known?.unavailable) return 0;

    return (rooms ? 0 : 1) + inspectSpecials().filter(special =>
      !room || !state.plans.has(planKey(code, room, special))
    ).length;
  }

  // Loads the room types of a hotel (unless the scan has them) and every rate plan of one room type.
  async function inspectRates(code = inspectHotel(), room = null) {
    if (
      !state.tools.rates ||
      !state.search ||
      !code ||
      !state.hotels.has(code) ||
      state.inspect.status === 'loading'
    ) return;

    const generation = state.generation;
    const inspect = state.inspect.code === code ? state.inspect : freshInspect(code);

    // Everything already loaded: ask again.
    if (!room && inspect.status === 'done' && !inspectRequests()) {
      if (inspect.unavailable && !state.results.get(code)?.unavailable) {
        Object.assign(inspect, freshInspect(code));
      }

      for (const special of inspectSpecials()) {
        state.plans.delete(planKey(code, inspect.room, special));
      }
    }

    inspect.status = 'loading';
    inspect.error = '';
    inspect.issues = [];
    state.inspect = inspect;
    render();

    const current = () =>
      generation === state.generation && state.inspect === inspect;

    let sent = 0;

    const send = async values => {
      if (sent++) await sleep(CONFIG.delay);
      if (!current()) throw Error('cancelled');

      return ask(values.selectedRoomTypeCode ? FULL : QUICK, values, false);
    };

    try {
      if (!inspect.rooms && !inspect.unavailable) {
        const found = knownRooms(code) || await loadRoomTypes(code, send);
        if (!current()) return;

        if (found) Object.assign(inspect, found);
      }

      if (!inspect.rooms) {
        if (!inspect.unavailable) throw Error('No bookable room types found');

        inspect.status = 'done';
        render();
        return;
      }

      inspect.room = room || inspect.room || inspect.rooms[0].roomTypeCode;

      for (const special of inspectSpecials()) {
        const key = planKey(code, inspect.room, special);
        if (state.plans.has(key)) continue;

        const values = variables(inspect.codeUsed, inspect.room, inspect.cache);
        if (special) values.specialRates = { ...values.specialRates, [special]: true };

        try {
          const result = await send(values);
          if (!current()) return;

          const selected = result.unavailable
            ? null
            : (result.shopAvail.roomTypes || []).find(
                item => item.roomTypeCode === inspect.room
              );

          state.plans.set(key, selected?.roomOnlyRates || []);

        } catch (error) {
          if (!current()) return;
          if (!special) throw error;

          inspect.issues.push(`${special.toUpperCase()}: ${error.message}`);
        }
      }

      inspect.status = 'done';

    } catch (error) {
      if (!current()) return;

      inspect.status = 'failed';
      inspect.error = error.message;
    }

    render();
  }

  // Hilton's rate plans flattened: the Honors discount of a rate is a plan of its own.
  function ratePlans(rates) {
    const plans = [];

    for (const base of rates || []) {
      const offers = [
        [base, null],
        ...(base?.hhonorsDiscountRate ? [[base.hhonorsDiscountRate, base]] : [])
      ];

      for (const [rate, parent] of offers) {
        if (!rate) continue;

        const plan = rate.ratePlan || {};
        const parentPlan = parent?.ratePlan || {};
        const guarantee = rate.guarantee || {};
        const parentGuarantee = parent?.guarantee || {};
        const code = rate.ratePlanCode || plan.ratePlanCode || '';

        plans.push({
          code,
          name: plan.ratePlanName || parentPlan.ratePlanName || code || 'Rate',
          description: plan.ratePlanDesc || parentPlan.ratePlanDesc || '',
          honors: Boolean(parent),
          // Nightly rate in the search currency; price is Hilton's formatted total after tax.
          amount: Number.isFinite(rate.rateAmount) ? rate.rateAmount : null,
          price: rate.amountAfterTaxFmt || '',
          deposit: (guarantee.depositRequired ?? parentGuarantee.depositRequired) === true,
          nonRefundable: (guarantee.nonRefundable ?? parentGuarantee.nonRefundable) === true,
          advance: (plan.advancePurchase ?? parentPlan.advancePurchase) === true,
          cancellation: guarantee.cxlPolicyDesc || parentGuarantee.cxlPolicyDesc || '',
          guarantee: guarantee.guarPolicyDesc || parentGuarantee.guarPolicyDesc || ''
        });
      }
    }

    return plans;
  }

  // What kind of rate a plan is, from its flags and name, or ''.
  function rateKind(plan) {
    const text = `${plan.name} ${plan.description}`;

    if (/\baaa\b/i.test(text)) return 'AAA';
    if (/senior/i.test(text)) return 'Senior';
    if (plan.advance || /advance purchase/i.test(text)) return 'Advance Purchase';
    if (/semi[\s-]*flex/i.test(text)) return 'Semi-Flex';
    if (plan.honors || /honors discount/i.test(text)) return 'Honors discount';
    if (/flex|best available/i.test(text)) return 'Flex';

    return '';
  }

  // The same rule as the Resort Finder scan.
  const creditRate = plan =>
    /semi[\s-]*flex/i.test(`${plan.name} ${plan.description}`) &&
    plan.deposit &&
    !plan.nonRefundable &&
    !plan.advance;

  // Every rate plan of the inspected room type, cheapest first, with its markup over the cheapest.
  function inspectPlans() {
    const inspect = state.inspect;
    if (!inspect.room) return null;

    const lists = inspectSpecials()
      .map(special => ({
        special,
        rates: state.plans.get(planKey(inspect.code, inspect.room, special))
      }))
      .filter(list => list.rates);

    if (!lists.length) return null;

    const seen = new Set();
    const plans = [];

    for (const { special, rates } of lists) {
      for (const plan of ratePlans(rates)) {
        const key = planId(plan);
        if (seen.has(key)) continue;

        seen.add(key);
        // special: the special rate it was asked for with, '' for the normal rates.
        plans.push({ ...plan, special, kind: rateKind(plan) });
      }
    }

    plans.sort((a, b) =>
      (a.amount ?? Infinity) - (b.amount ?? Infinity) ||
      a.name.localeCompare(b.name)
    );

    const low = plans.find(plan => plan.amount)?.amount ?? null;
    const markup = plan => low && plan.amount ? Math.round((plan.amount - low) / low * 100) : null;
    const refundable = plans.find(plan => !plan.nonRefundable && !plan.advance && plan.amount);

    return {
      plans: plans.map(plan => ({ ...plan, markup: markup(plan) })),
      cheapest: plans[0] || null,
      refundable: refundable || null,
      // What flexibility costs here: cheapest refundable rate over the cheapest rate.
      flexibility: refundable ? markup(refundable) : null
    };
  }

  // Opens the Rate Inspector on a hotel, e.g. from Resort Finder or Cash vs. Points,
  // and on one of its room types from the Suite Finder.
  function openInspector(code, room = null) {
    if (!state.tools.rates || !state.hotels.has(code)) return;

    if (state.inspect.code !== code && state.inspect.status !== 'loading') {
      state.inspect = freshInspect(code);
    }

    showView('rates');
    inspectRates(code, room);
  }

  const inspectButton = code => state.tools.rates
    ? `<button type="button" class="hpt-link-btn" data-inspect="${html(code)}">Inspect rates</button>`
    : '';

  const percent = value => `${value > 0 ? '+' : ''}${value} %`;

  function renderRates() {
    const root = $('hpt-rates');
    const inspect = state.inspect;
    const code = inspectHotel();
    const options = inspectOptions();
    const loading = inspect.status === 'loading';
    const shown = inspect.code === code ? inspect : freshInspect(code);

    $('hpt-rates-controls').hidden = !state.search || !options.length;

    const hotels = $('hpt-rate-hotel');
    const key = options.map(option => `${option.code}:${option.name}`).join(',');

    if (hotels.dataset.key !== key) {
      hotels.dataset.key = key;
      hotels.innerHTML = options.map(option =>
        `<option value="${html(option.code)}">${html(option.name)}</option>`
      ).join('');
    }

    if (document.activeElement !== hotels && code) hotels.value = code;
    hotels.disabled = loading;

    const rooms = $('hpt-rate-room');
    const roomKey = `${shown.code}|${(shown.rooms || []).map(room => room.roomTypeCode).join(',')}`;

    $('hpt-rate-room-pick').hidden = !shown.rooms;

    if (rooms.dataset.key !== roomKey) {
      rooms.dataset.key = roomKey;
      rooms.innerHTML = (shown.rooms || []).map(room => `
        <option value="${html(room.roomTypeCode)}">
          ${html(room.roomTypeName || room.roomTypeCode)}
        </option>
      `).join('');
    }

    if (document.activeElement !== rooms && shown.room) rooms.value = shown.room;
    rooms.disabled = loading;

    $('hpt-rate-special').checked = state.inspectSpecial;

    const requests = inspectRequests();

    $('hpt-rate-load').disabled = loading;
    $('hpt-rate-label').textContent =
      shown.status === 'done' && !requests ? 'Reload rates' : 'Inspect rates';

    if (!state.search || !options.length) {
      $('hpt-rate-status').textContent = '';
      root.innerHTML = `
        <div class="hpt-empty">
          <div class="hpt-empty-icon">${ICON.calendar}</div>
          <b>${state.search ? 'Waiting for hotels' : 'Waiting for a Hilton search'}</b>
          <p>Search a destination and dates on Hilton.</p>
        </div>
      `;
      return;
    }

    if (loading) {
      $('hpt-rate-status').textContent = 'Loading rate plans…';
      root.innerHTML = '';
      return;
    }

    if (shown.status === 'failed') {
      $('hpt-rate-status').textContent = `Could not load rates: ${shown.error}`;
      root.innerHTML = '';
      return;
    }

    if (shown.unavailable) {
      $('hpt-rate-status').textContent = '';
      root.innerHTML = `
        <div class="hpt-empty">
          <div class="hpt-empty-icon">${ICON.rates}</div>
          <b>No bookable rates for these dates</b>
          <p>Hilton reports this hotel as sold out (1740). Try other dates.</p>
        </div>
      `;
      return;
    }

    const result = shown.status === 'done' ? inspectPlans() : null;

    if (!result) {
      $('hpt-rate-status').textContent = requests
        ? `Sends ${requests} ${plural(requests, 'request', 'requests')} to Hilton ` +
          '(room types, then the rates of one room type).'
        : 'Already loaded by Resort Finder; sends no requests.';
      root.innerHTML = '';
      return;
    }

    $('hpt-rate-status').textContent = [
      ...shown.issues,
      requests
        ? `Inspect rates adds AAA and Senior: ${requests} more ${plural(requests, 'request', 'requests')}`
        : ''
    ].filter(Boolean).join(' · ');

    if (!result.plans.length) {
      root.innerHTML = `
        <div class="hpt-empty">
          <div class="hpt-empty-icon">${ICON.rates}</div>
          <b>No rates for this room type</b>
          <p>Pick another room type.</p>
        </div>
      `;
      return;
    }

    const resort = Boolean(state.resorts?.has(shown.code));
    const { cheapest, flexibility } = result;

    root.innerHTML = `
      <div class="hpt-split-stats">
        <div class="hpt-stats">
          <div class="hpt-stat rates">
            <b>${html(cheapest.price || String(cheapest.amount ?? '–'))}</b>
            <span>cheapest · ${html(cheapest.kind || cheapest.name)}</span>
          </div>
          <div class="hpt-stat${flexibility === 0 ? ' good' : ''}">
            <b>${flexibility === null ? '–' : html(percent(flexibility))}</b>
            <span>${flexibility === null
              ? 'no refundable rate'
              : flexibility === 0
                ? 'cheapest rate is refundable'
                : 'for a refundable rate'}</span>
          </div>
        </div>
      </div>

      <div class="hpt-rate-list">
        ${result.plans.map(plan => `
          <div class="hpt-rate-row">
            <div class="hpt-row">
              <span class="hpt-name">${html(plan.name)}</span>
              <b>${html(plan.price || String(plan.amount ?? ''))}</b>
            </div>
            <div class="hpt-free-sub">
              <span class="hpt-all-meta">
                ${plan.kind ? `<span class="hpt-chip rates">${html(plan.kind)}</span>` : ''}
                ${plan.honors && plan.kind !== 'Honors discount' ? '<span class="hpt-chip points">Honors discount</span>' : ''}
                <span class="hpt-chip ${plan.nonRefundable || plan.advance ? 'split' : 'cash'}">
                  ${plan.nonRefundable || plan.advance ? 'Non-refundable' : 'Refundable'}
                </span>
                ${plan.deposit ? '<span class="hpt-chip muted">Deposit</span>' : ''}
                ${resort && creditRate(plan) ? '<span class="hpt-tag">Resort Credit</span>' : ''}
              </span>
              <span class="hpt-rate-markup${plan.markup === 0 ? ' low' : ''}">
                ${plan.markup === null ? '' : plan.markup === 0 ? 'Cheapest' : html(percent(plan.markup))}
              </span>
            </div>
            ${plan.cancellation ? `<div class="hpt-rate-cxl">${html(plan.cancellation)}</div>` : ''}
            <div class="hpt-row">
              <span class="hpt-code">${html(plan.code)}</span>
              ${watchButton(plan)}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="hpt-controls">
        <div class="hpt-links">
          <a
            href="${html(rateURL(state.results.get(shown.code) || state.hotels.get(shown.code)))}"
            target="_blank"
            rel="noopener noreferrer"
          >View rates on Hilton ↗</a>
        </div>
      </div>
    `;
  }

  // =====================================
  // Suite Finder
  // =====================================

  // status: idle or loading; hotels: room types and points prices by hotel code, see
  // loadSuites(); pick: the one hotel to look at, '' for the first SUITES.maxHotels.
  function freshSuites(pick = '') {
    return { status: 'idle', hotels: new Map(), pick, done: 0, total: 0, current: '' };
  }

  // Hotels the Suite Finder looks at: the picked one, else the first of the search.
  function suiteHotels() {
    const pick = state.suites.pick;
    if (pick && state.hotels.has(pick)) return [pick];

    return [...state.hotels.values()]
      .filter(hotel => hotel.bookable !== false)
      .slice(0, SUITES.maxHotels)
      .map(hotel => hotel.code);
  }

  // The search's points prices show no reward rooms here, so its rooms are not asked for points.
  const noRewards = code =>
    wantsPoints() &&
    state.extras.points.has(code) &&
    !state.extras.pending &&
    !state.extras.error &&
    !state.hotels.get(code)?.points;

  // What loadSuites() still asks for one hotel: 'rooms' (with cash prices) and 'points'.
  function suiteNeeds(code) {
    const data = state.suites.hotels.get(code);
    const known = data?.rooms || data?.unavailable ? data : knownRooms(code);

    if (known?.unavailable) return [];

    return [
      ...(known?.rooms ? [] : ['rooms']),
      ...(data?.points || noRewards(code) ? [] : ['points'])
    ];
  }

  const suiteRequests = () =>
    suiteHotels().reduce((sum, code) => sum + suiteNeeds(code).length, 0);

  // Lowest reward of a room type: { points } per night and its reward ('standard',
  // 'premium' or null), or null.
  function roomPoints(room) {
    const offers = [].concat(room?.redemptionRoomRates || []).map(rate => {
      const nights = [].concat(rate?.pointDetails || [])
        .map(item => item?.pointsRate)
        .filter(value => Number.isFinite(value) && value > 0);

      return nights.length
        ? {
            points: Math.round(nights.reduce((sum, value) => sum + value, 0) / nights.length),
            reward: rewardType(rate)
          }
        : null;
    }).filter(Boolean);

    return offers.sort((a, b) => a.points - b.points)[0] || null;
  }

  // Loads the room types of each hotel (unless another tool has them) and their points prices.
  async function loadSuites() {
    if (
      !state.tools.suites ||
      !state.search ||
      state.suites.status === 'loading'
    ) return;

    const codes = suiteHotels();
    if (!codes.length) return;

    const generation = state.generation;
    const suites = state.suites;

    // Everything already loaded: ask again.
    if (!suiteRequests()) {
      for (const code of codes) suites.hotels.delete(code);
    }

    suites.status = 'loading';
    suites.done = 0;
    suites.total = suiteRequests();
    loadCurrencies();
    render();

    const current = () =>
      generation === state.generation && state.suites === suites;

    let sent = 0;

    const send = async (query, values) => {
      if (sent++) await sleep(CONFIG.delay);
      if (!current()) throw Error('cancelled');

      const result = await ask(query, values, false);
      suites.done++;

      return result;
    };

    for (const code of codes) {
      if (!current()) return;

      const needs = suiteNeeds(code);
      const data = suites.hotels.get(code) || {
        rooms: null,
        codeUsed: null,
        cache: null,
        unavailable: false,
        // Lowest reward by room type code (see roomPoints()), null until loaded.
        points: null,
        error: '',
        pointsError: ''
      };

      data.error = '';
      suites.hotels.set(code, data);
      suites.current = code;
      render();

      try {
        if (!data.rooms && !data.unavailable) {
          const found = knownRooms(code) || await loadRoomTypes(code, values => send(QUICK, values));
          if (!current()) return;

          if (!found) throw Error('No bookable room types found');
          Object.assign(data, found);
        }

        if (data.rooms && needs.includes('points')) {
          const values = variables(
            data.codeUsed,
            null,
            crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
          );
          values.specialRates = { ...values.specialRates, hhonors: true };

          try {
            const result = await send(ROOM_POINTS, values);
            if (!current()) return;

            data.points = new Map();
            data.pointsError = '';

            for (const room of result.unavailable ? [] : result.shopAvail.roomTypes || []) {
              const offer = roomPoints(room);
              if (offer) data.points.set(room.roomTypeCode, offer);
            }

          } catch (error) {
            if (!current()) return;

            data.pointsError = error.message;
          }
        }

      } catch (error) {
        if (!current()) return;

        data.error = error.message;
      }
    }

    if (!current()) return;

    suites.status = 'idle';
    suites.current = '';
    render();
  }

  // Kind of room by its name, or '' for a plain room.
  function roomKind(name) {
    if (/suite|penthouse|presidential|residence|apartment/i.test(name)) return 'Suite';
    if (/villa|bungalow|pavilion|chalet|cabana/i.test(name)) return 'Villa';
    if (/executive|club|lounge|ambassador/i.test(name)) return 'Club';
    if (/view|ocean|\bsea\b|lagoon|beach|water|front|balcony|terrace/i.test(name)) return 'View';

    return '';
  }

  const isSuite = room => room.kind === 'Suite' || room.kind === 'Villa';

  const suiteNoun = () => state.suiteShow === 'all' ? ['upgrade', 'upgrades'] : ['suite', 'suites'];

  // A nightly cash amount in the panel currency, else in the search currency.
  function suiteMoney(amount, sign = false) {
    const from = state.search.currency;
    const value = convert(amount, from, state.currency);

    return (value !== null && from !== state.currency ? '≈ ' : '') +
      (sign ? '+' : '') +
      (value === null ? money(amount, from) : money(value));
  }

  // What an upgrade costs over the cheapest room, short.
  const upgradeCost = room =>
    room.cashUp === null
      ? `+${number(room.pointsUp)} pts`
      : room.cashUp === 0
        ? 'same price'
        : `+${room.percent} %`;

  // Why the Suite Finder can't run for this search, or ''.
  function suiteBlocked() {
    if (!state.search) return 'Waiting for a search';
    if (!state.hotels.size) return 'Waiting for hotels';

    return '';
  }

  // Per loaded hotel: its cheapest room and the pricier room types with their markup in
  // cash and points, cheapest upgrade first; pending counts hotels not loaded yet.
  function suiteTable() {
    const s = state.search;
    const result = { rows: [], empty: [], pending: 0, count: 0, top: null, noExtra: null };

    for (const code of suiteHotels()) {
      const data = state.suites.hotels.get(code);
      const name = hotelName(code);

      if (data?.unavailable) {
        result.empty.push({ code, name, reason: 'Sold out' });
        continue;
      }

      if (!data?.rooms) {
        if (data?.error) result.empty.push({ code, name, reason: 'Failed', error: data.error });
        else result.pending++;
        continue;
      }

      const rooms = data.rooms.map(room => {
        const cash = referencePrice(room);
        const offer = data.points?.get(room.roomTypeCode);
        const label = room.roomTypeName || room.roomTypeCode;

        return {
          code: room.roomTypeCode,
          name: label,
          kind: roomKind(label),
          // Cheapest nightly rate in the search currency.
          cash: Number.isFinite(cash) ? cash : null,
          points: offer?.points ?? null,
          reward: offer?.reward ?? null
        };
      }).filter(room => room.cash !== null || room.points !== null);

      const lowest = values => values.length ? Math.min(...values) : null;
      const lowCash = lowest(rooms.map(room => room.cash).filter(value => value !== null));
      const lowPoints = lowest(rooms.map(room => room.points).filter(value => value !== null));

      // The hotel's cheapest room in cash, else in points.
      const base =
        rooms.find(room => lowCash !== null && room.cash === lowCash) ||
        rooms.find(room => room.points === lowPoints);

      if (!base) {
        result.empty.push({ code, name, reason: 'No prices' });
        continue;
      }

      const upgrades = rooms
        .filter(room => room !== base)
        .map(room => {
          const cashUp = room.cash !== null && lowCash !== null ? room.cash - lowCash : null;
          const pointsUp = room.points !== null && lowPoints !== null ? room.points - lowPoints : null;
          const cashEuro = cashUp > 0 ? convert(cashUp, s.currency, 'EUR') : null;

          return {
            ...room,
            cashUp,
            percent: cashUp !== null && lowCash ? Math.round(cashUp / lowCash * 100) : null,
            pointsUp,
            // The extra points at the user's point value, in the panel currency.
            pointsValue: pointsUp > 0
              ? convert(pointsUp * state.pointValue / 100, 'EUR', state.currency)
              : null,
            // Euro cents each extra point is worth when the upgrade is paid in points instead of cash.
            centsPerPoint: cashEuro && pointsUp > 0 ? cashEuro * 100 / pointsUp : null
          };
        })
        .filter(room =>
          (room.cashUp > 0 || room.pointsUp > 0 || isSuite(room)) &&
          (state.suiteShow === 'all' || isSuite(room))
        )
        .sort((a, b) =>
          (a.cashUp ?? Infinity) - (b.cashUp ?? Infinity) ||
          (a.pointsUp ?? Infinity) - (b.pointsUp ?? Infinity) ||
          a.name.localeCompare(b.name)
        );

      if (!upgrades.length) {
        result.empty.push({ code, name, reason: state.suiteShow === 'all' ? 'No upgrades' : 'No suites' });
        continue;
      }

      result.rows.push({
        code,
        name,
        data,
        base,
        lowCash,
        lowPoints,
        upgrades,
        resort: Boolean(state.resorts?.has(code))
      });
    }

    result.rows.sort((a, b) =>
      (a.upgrades[0].percent ?? Infinity) - (b.upgrades[0].percent ?? Infinity) ||
      a.name.localeCompare(b.name)
    );

    result.count = result.rows.reduce((sum, row) => sum + row.upgrades.length, 0);
    result.top = result.rows[0] || null;

    // An upgrade at no extra points although it costs more in cash.
    for (const row of result.rows) {
      const room = row.upgrades.find(item => item.pointsUp === 0 && item.cashUp > 0);

      if (room && !result.noExtra) result.noExtra = { row, room };
    }

    return result;
  }

  function renderSuites() {
    const root = $('hpt-suites');
    const suites = state.suites;
    const blocked = suiteBlocked();
    const loading = suites.status === 'loading';
    const options = inspectOptions();
    const first = Math.min(
      SUITES.maxHotels,
      [...state.hotels.values()].filter(hotel => hotel.bookable !== false).length
    );

    $('hpt-suite-controls').hidden = Boolean(blocked);

    const select = $('hpt-suite-hotel');
    const key = `${first}|` + options.map(option => `${option.code}:${option.name}`).join(',');

    if (select.dataset.key !== key) {
      select.dataset.key = key;
      select.innerHTML =
        `<option value="">First ${first} ${plural(first, 'hotel', 'hotels')} of the search</option>` +
        options.map(option =>
          `<option value="${html(option.code)}">${html(option.name)}</option>`
        ).join('');
    }

    if (document.activeElement !== select) {
      select.value = state.hotels.has(suites.pick) ? suites.pick : '';
    }
    select.disabled = loading;

    for (const button of state.panel.querySelectorAll('[data-suite-show]')) {
      button.setAttribute('aria-pressed', String(button.dataset.suiteShow === state.suiteShow));
    }

    if (blocked) {
      $('hpt-suite-status').textContent = '';
      root.innerHTML = `
        <div class="hpt-empty">
          <div class="hpt-empty-icon">${ICON.calendar}</div>
          <b>${html(blocked)}</b>
          <p>Search a destination and dates on Hilton.</p>
        </div>
      `;
      return;
    }

    const requests = suiteRequests();
    const table = suiteTable();

    $('hpt-suite-load').disabled = loading;
    $('hpt-suite-label').textContent =
      !requests && !table.pending ? 'Reload rooms' : 'Find suites';

    if (loading) {
      $('hpt-suite-status').innerHTML = `
        <div class="hpt-progress">
          <div class="hpt-row">
            <b>Loading rooms of ${html(hotelName(suites.current))}</b>
            <span>${Math.min(suites.done, suites.total)}/${suites.total} requests</span>
          </div>
          <div class="hpt-bar">
            <div style="width:${Math.round(100 * Math.min(1, suites.done / Math.max(1, suites.total)))}%"></div>
          </div>
        </div>
      `;
      root.innerHTML = '';
      return;
    }

    const hotels = suiteHotels().length;

    if (!table.rows.length && !table.empty.length) {
      $('hpt-suite-status').textContent = requests
        ? `Sends ${requests} ${plural(requests, 'request', 'requests')} to Hilton ` +
          `(room types and their points prices for ${hotels} ${plural(hotels, 'hotel', 'hotels')}), ` +
          `about ${Math.max(1, Math.round(requests * (CONFIG.delay + 400) / 60000))} min.`
        : 'Room types already loaded by other tools; sends no requests.';
      root.innerHTML = '';
      return;
    }

    const failed = suiteHotels()
      .filter(code => suites.hotels.get(code)?.pointsError).length;

    $('hpt-suite-status').textContent = [
      failed ? `Points prices failed for ${failed} ${plural(failed, 'hotel', 'hotels')}` : '',
      table.pending
        ? `${table.pending} more ${plural(table.pending, 'hotel', 'hotels')}: ` +
          `${requests} ${plural(requests, 'request', 'requests')}`
        : ''
    ].filter(Boolean).join(' · ');

    const [one, many] = suiteNoun();
    const { top, noExtra } = table;

    const cents = room => room.centsPerPoint
      ? `<span
          class="hpt-chip ${room.centsPerPoint >= state.pointValue ? 'points' : 'muted'}"
          title="Each extra point is worth ${html(room.centsPerPoint.toFixed(2))} ct when you pay this upgrade in points"
        >${html(room.centsPerPoint.toFixed(2))} ct/pt</span>`
      : '';

    const points = (row, room) => room.pointsUp === null
      ? (row.data.points && row.lowPoints !== null ? '<span class="hpt-chip muted">Not on points</span>' : '')
      : room.pointsUp === 0
        ? '<span class="hpt-chip cash">No extra points</span>'
        : `<span>+${html(number(room.pointsUp))} pts${room.pointsValue !== null
            ? ` (≈ ${html(money(room.pointsValue))})`
            : ''}</span>`;

    root.innerHTML = `
      ${top ? `
        <div class="hpt-split-stats">
          <div class="hpt-stats">
            <div class="hpt-stat suites">
              <b>${html(upgradeCost(top.upgrades[0]))}</b>
              <span>cheapest ${one}: ${html(top.upgrades[0].name)}</span>
            </div>
            ${noExtra ? `
              <div class="hpt-stat good">
                <b>0 extra pts</b>
                <span>${html(noExtra.room.name)} at ${html(noExtra.row.name)}</span>
              </div>
            ` : `
              <div class="hpt-stat">
                <b>${table.count}</b>
                <span>${plural(table.count, one, many)} at ${table.rows.length} ${plural(table.rows.length, 'hotel', 'hotels')}</span>
              </div>
            `}
          </div>
        </div>
      ` : ''}

      <div class="hpt-suite-list">
        ${table.rows.map(row => {
          const more = row.upgrades.length - SUITES.maxShown;
          const entry = { code: row.code, codeUsed: row.data.codeUsed };

          return `
            <div class="hpt-suite-hotel">
              <div class="hpt-row">
                <span class="hpt-name">${html(row.name)}</span>
                ${row.resort ? '<span class="hpt-tag">Resort Credit</span>' : ''}
              </div>
              <div class="hpt-suite-base">
                Cheapest: ${html(row.base.name)} ·
                ${html([
                  row.lowCash !== null ? suiteMoney(row.lowCash) : '',
                  row.lowPoints !== null ? `${number(row.lowPoints)} pts` : ''
                ].filter(Boolean).join(' or '))} a night
              </div>

              ${row.upgrades.slice(0, SUITES.maxShown).map(room => `
                <div class="hpt-suite-room">
                  <div class="hpt-row">
                    <span class="hpt-suite-name">${html(room.name)}</span>
                    <b>${html(room.cashUp === null
                      ? 'Points only'
                      : room.cashUp === 0 ? 'Same price' : suiteMoney(room.cashUp, true))}</b>
                  </div>
                  <div class="hpt-free-sub">
                    <span class="hpt-all-meta">
                      ${room.kind ? `<span class="hpt-chip suites">${html(room.kind)}</span>` : ''}
                      ${room.percent > 0 ? `<span class="hpt-rate-markup">+${room.percent} %</span>` : ''}
                      ${points(row, room)}
                      ${cents(room)}
                      ${room.reward === 'standard' && isSuite(room)
                        ? '<span class="hpt-chip free" title="Standard Room Reward: a Free Night Certificate covers it">Certificate</span>'
                        : ''}
                    </span>
                    ${state.tools.rates && room.cash !== null ? `
                      <button
                        type="button"
                        class="hpt-link-btn"
                        data-inspect="${html(row.code)}"
                        data-inspect-room="${html(room.code)}"
                      >Rates</button>
                    ` : ''}
                  </div>
                </div>
              `).join('')}

              ${more > 0 ? `<div class="hpt-suite-more">${more} more ${plural(more, one, many)} on Hilton</div>` : ''}

              <div class="hpt-links">
                <a
                  href="${html(rateURL(entry))}"
                  target="_blank"
                  rel="noopener noreferrer"
                >View rooms ↗</a>
                ${row.lowPoints !== null ? `
                  <a
                    href="${html(rateURL(entry, true))}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >Rooms on points ↗</a>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${table.empty.length ? `
        <div class="hpt-free-title">No ${html(many)} shown</div>
        ${table.empty.map(row => `
          <div class="hpt-free-off">
            <span>${html(row.name)}</span>
            <span class="hpt-chip muted"${row.error ? ` title="${html(row.error)}"` : ''}>${html(row.reason)}</span>
          </div>
        `).join('')}
      ` : ''}
    `;
  }

  function setSuiteShow(value) {
    state.suiteShow = value === 'all' ? 'all' : 'suites';

    try {
      localStorage.setItem(SUITES_SHOW_KEY, state.suiteShow);
    } catch {}

    render();
  }

  // =====================================
  // Price Watch
  // =====================================

  // Watched stays from localStorage. Each one keeps the search it was priced with, the rate
  // plan, what was paid and the latest total (both for the stay, in that search's currency).
  function loadWatchItems() {
    try {
      const items = JSON.parse(localStorage.getItem(WATCH_KEY));

      return Array.isArray(items)
        ? items.filter(item => item?.id && item.search?.arrival && item.room && item.rate)
        : [];
    } catch {
      return [];
    }
  }

  state.watch.items = loadWatchItems();

  function saveWatch() {
    try {
      localStorage.setItem(WATCH_KEY, JSON.stringify(state.watch.items));
    } catch {}
  }

  // The same stay, room and rate plan.
  const watchKey = item => [
    item.code,
    item.room,
    item.rate,
    item.honors,
    item.special,
    item.search.arrival,
    item.search.departure,
    item.search.adults,
    item.search.children,
    item.search.rooms,
    item.search.currency
  ].join('|');

  const stayNights = s => Math.max(
    1,
    Math.round((Date.parse(s.departure) - Date.parse(s.arrival)) / 86400000)
  );

  // Total for the stay, from Hilton's formatted price or else the nightly rate.
  function planTotal(plan, stay) {
    const total = cashTotal(plan, stay);
    if (total) return total;

    return plan.amount > 0 ? plan.amount * stay : null;
  }

  // A watch item for one plan of the Rate Inspector, without the prices yet.
  function watchTarget(plan) {
    const inspect = state.inspect;

    return {
      code: inspect.code,
      codeUsed: inspect.codeUsed || inspect.code,
      room: inspect.room,
      rate: plan.code,
      honors: plan.honors,
      special: plan.special || '',
      search: { ...state.search }
    };
  }

  const isWatched = target =>
    state.watch.items.some(item => watchKey(item) === watchKey(target));

  function watchButton(plan) {
    if (!state.tools.watch || !state.search) return '';

    if (isWatched(watchTarget(plan))) {
      return `<span class="hpt-watching">${ICON.check}Watching</span>`;
    }

    const full = state.watch.items.length >= WATCH.maxStays;

    return `
      <button
        type="button"
        class="hpt-link-btn"
        data-watch="${html(planId(plan))}"
        ${full ? `disabled title="${html(`Price Watch is full (${WATCH.maxStays} stays)`)}"` : ''}
      >Watch price</button>
    `;
  }

  // Adds a rate plan of the Rate Inspector to the watchlist, at its current price.
  function watchRate(id) {
    if (!state.tools.watch || !state.search) return;

    const plan = inspectPlans()?.plans.find(item => planId(item) === id);
    const total = plan && planTotal(plan, nights());
    if (!total) return;

    const target = watchTarget(plan);
    const inspect = state.inspect;

    // Another tab may have changed the list.
    state.watch.items = loadWatchItems();

    if (!isWatched(target) && state.watch.items.length < WATCH.maxStays) {
      state.watch.items.push({
        ...target,
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        name: hotelName(inspect.code),
        roomName: inspect.rooms?.find(room => room.roomTypeCode === inspect.room)
          ?.roomTypeName || inspect.room,
        rateName: plan.name,
        // What was paid (editable on the Price Watch page) and the latest price.
        paid: total,
        total,
        price: plan.price,
        status: 'ok',
        error: '',
        added: Date.now(),
        checked: Date.now()
      });

      saveWatch();
    }

    render();
  }

  function unwatchStay(id) {
    state.watch.items = loadWatchItems().filter(item => item.id !== id);
    saveWatch();
    render();
  }

  // Accepts "1234.50", "1,234.50" and "1234,50".
  function parseAmount(value) {
    const text = String(value).replace(/[^\d.,]/g, '');

    return parseFloat(
      /,\d{1,2}$/.test(text) && !text.includes('.')
        ? text.replace(',', '.')
        : text.replace(/,/g, '')
    );
  }

  function setPaid(id, value) {
    const paid = parseAmount(value);

    state.watch.items = loadWatchItems();

    const item = state.watch.items.find(other => other.id === id);

    if (item && paid > 0) {
      item.paid = paid;
      saveWatch();
    }

    render();
  }

  const upcoming = item => item.search.arrival >= today();

  // Stays to check now: upcoming ones whose last check is old enough (all of them when manual).
  function dueStays(manual) {
    return state.watch.items.filter(item => {
      if (!upcoming(item)) return false;
      if (manual) return true;

      const wait = item.status === 'failed'
        ? WATCH.retryMinutes * 60000
        : WATCH.everyHours * 3600000;

      return Date.now() - (item.checked || 0) >= wait;
    });
  }

  // Prices one watched stay like the Rate Inspector does: its room types, then the rates of
  // its room type. Never throws; returns the fields to update.
  async function priceStay(item) {
    const cache = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;

    try {
      const quick = await ask(
        QUICK,
        variables(item.codeUsed, null, cache, item.search),
        false
      );

      if (quick.unavailable) return { status: 'soldout', error: '' };

      if (!(quick.shopAvail.roomTypes || []).some(room => room.roomTypeCode === item.room)) {
        return { status: 'gone', error: 'Room type not offered' };
      }

      await sleep(CONFIG.delay);

      const values = variables(item.codeUsed, item.room, cache, item.search);
      if (item.special) values.specialRates = { ...values.specialRates, [item.special]: true };

      const full = await ask(FULL, values, false);

      if (full.unavailable) return { status: 'soldout', error: '' };

      const rates = (full.shopAvail.roomTypes || [])
        .find(room => room.roomTypeCode === item.room)?.roomOnlyRates;

      const plan = ratePlans(rates).find(other =>
        other.code === item.rate && other.honors === item.honors
      );

      const total = plan && planTotal(plan, stayNights(item.search));

      return total
        ? { status: 'ok', error: '', total, price: plan.price }
        : { status: 'gone', error: 'Rate not offered' };

    } catch (error) {
      return { status: 'failed', error: error.message };
    }
  }

  // Checks the due watched stays one by one, on page load or with Check now.
  async function checkWatch(manual = false) {
    const watch = state.watch;

    if (!state.tools.watch || watch.status === 'checking') return;

    watch.items = loadWatchItems();

    const due = dueStays(manual);

    if (!due.length) {
      render();
      return;
    }

    watch.status = 'checking';
    watch.done = 0;
    watch.total = due.length;
    render();

    for (const stay of due) {
      // Switched off while checking: stop, keep what was checked.
      if (!state.tools.watch) break;
      if (watch.done) await sleep(CONFIG.delay);

      const result = await priceStay(stay);

      // Another tab may have changed the list meanwhile; a removed stay stays removed.
      watch.items = loadWatchItems();

      const item = watch.items.find(other => other.id === stay.id);

      if (item) {
        Object.assign(item, result, { checked: Date.now() });
        saveWatch();
      }

      watch.done++;
      render();
    }

    watch.status = 'idle';
    render();
  }

  // What rebooking saves: paid minus the latest price, or 0.
  function watchDrop(item) {
    return item.status === 'ok' && item.paid > 0 && item.total > 0
      ? item.paid - item.total
      : 0;
  }

  const rebook = item =>
    upcoming(item) && watchDrop(item) >= Math.max(1, item.paid * WATCH.minDrop);

  // Watched stays worth rebooking, biggest saving first.
  const rebooks = () => state.watch.items
    .filter(rebook)
    .sort((a, b) => watchDrop(b) - watchDrop(a));

  function ago(time) {
    if (!time) return 'never';

    const minutes = Math.floor((Date.now() - time) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h ago`;

    const days = Math.floor(hours / 24);
    return `${days} ${plural(days, 'day', 'days')} ago`;
  }

  // Chip with the price change since paid, or why there is no price.
  function watchChip(item) {
    if (!upcoming(item)) return '<span class="hpt-chip muted">Past stay</span>';

    const currency = item.search.currency;
    const drop = watchDrop(item);

    return {
      soldout: '<span class="hpt-chip split">Sold out</span>',
      gone: '<span class="hpt-chip split">Rate not offered</span>',
      failed: `<span class="hpt-chip split" title="${html(item.error)}">Check failed</span>`
    }[item.status] || (rebook(item)
      ? `<span class="hpt-chip cash">Rebook: −${html(money(drop, currency))}</span>`
      : Math.abs(drop) >= 1
        ? `<span class="hpt-chip muted">${drop > 0 ? '−' : '+'}${html(money(Math.abs(drop), currency))}</span>`
        : '<span class="hpt-chip muted">Same price</span>');
  }

  let watchMarkup = '';

  function renderWatch() {
    const watch = state.watch;
    const root = $('hpt-watch');
    const checking = watch.status === 'checking';
    const ahead = watch.items.filter(upcoming);
    const last = Math.max(0, ...ahead.map(item => item.checked || 0));

    $('hpt-watch-check').disabled = checking;
    $('hpt-watch-check').hidden = !ahead.length;

    $('hpt-watch-status').textContent = checking
      ? `Checking stay ${Math.min(watch.done + 1, watch.total)} of ${watch.total}…`
      : ahead.length
        ? `Last checked ${ago(last)} · Check now sends ${ahead.length * 2} ` +
          `${plural(ahead.length * 2, 'request', 'requests')}.`
        : '';

    const markup = !watch.items.length
      ? `
        <div class="hpt-empty">
          <div class="hpt-empty-icon">${ICON.watch}</div>
          <b>No stays watched yet</b>
          <p>
            Open the Rate Inspector on a hotel and click <b>Watch price</b> on the rate
            you booked or plan to book.
          </p>
        </div>
      `
      : `
        <div class="hpt-watch-list">
          ${[...watch.items]
            .sort((a, b) =>
              upcoming(b) - upcoming(a) ||
              a.search.arrival.localeCompare(b.search.arrival)
            )
            .map(item => `
                <div class="hpt-watch-row${upcoming(item) ? '' : ' past'}">
                  <div class="hpt-row">
                    <span class="hpt-name">${html(item.name)}</span>
                    <b>${html(item.status === 'ok' ? item.price || money(item.total, item.search.currency) : '–')}</b>
                  </div>
                  <div class="hpt-cal-sub">
                    ${html(stay(item.search.arrival, item.search.departure))} · ${html(item.roomName)}
                  </div>
                  <div class="hpt-free-sub">
                    <span class="hpt-all-meta">
                      ${html(item.rateName)}
                      ${watchChip(item)}
                    </span>
                    <span class="hpt-rate-markup">${html(`Checked ${ago(item.checked)}`)}</span>
                  </div>
                  <div class="hpt-watch-foot">
                    <label class="hpt-settings">
                      Paid
                      <input
                        type="text"
                        inputmode="decimal"
                        value="${html(String(Math.round(item.paid)))}"
                        data-watch-paid="${html(item.id)}"
                        aria-label="${html(`Paid for ${item.name}, ${item.search.currency}`)}"
                      >
                      ${html(item.search.currency)}
                    </label>
                    <span class="hpt-links">
                      ${upcoming(item) ? `
                        <a
                          href="${html(rateURL(item, false, null, item.search))}"
                          target="_blank"
                          rel="noopener noreferrer"
                        >Book ↗</a>
                      ` : ''}
                      <button
                        type="button"
                        class="hpt-link-btn"
                        data-unwatch="${html(item.id)}"
                      >Remove</button>
                    </span>
                  </div>
                </div>
              `).join('')}
        </div>
      `;

    // Rebuilding would drop the focus of a Paid field being edited.
    const editing = document.activeElement?.matches?.('[data-watch-paid]') &&
      root.contains(document.activeElement);

    if (markup === watchMarkup || editing) return;

    watchMarkup = markup;
    root.innerHTML = markup;
  }

  // =====================================
  // Credit Tracker
  // =====================================

  // Credit per half year and the charges booked against it ({ id, date, hotel, amount } in USD),
  // from localStorage.
  function loadCredit() {
    try {
      const saved = JSON.parse(localStorage.getItem(CREDIT_KEY));

      return {
        amount: saved?.amount > 0 ? saved.amount : CREDIT.perHalf,
        entries: Array.isArray(saved?.entries)
          ? saved.entries.filter(entry =>
              entry?.id && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && entry.amount > 0
            )
          : []
      };
    } catch {
      return { amount: CREDIT.perHalf, entries: [] };
    }
  }

  state.credit = loadCredit();

  function saveCredit() {
    try {
      localStorage.setItem(CREDIT_KEY, JSON.stringify(state.credit));
    } catch {}
  }

  // The half year an ISO date falls in: its key, label, last day and the day the next one starts.
  function creditHalf(date) {
    const year = Number(date.slice(0, 4));
    const first = Number(date.slice(5, 7)) <= 6;

    return {
      key: `${year}-${first ? 1 : 2}`,
      label: first ? `Jan – Jun ${year}` : `Jul – Dec ${year}`,
      end: first ? `${year}-06-30` : `${year}-12-31`,
      next: first ? `${year}-07-01` : `${year + 1}-01-01`
    };
  }

  // The current half year with what was used and what is left.
  function creditNow() {
    const half = creditHalf(today());
    const entries = state.credit.entries.filter(entry => creditHalf(entry.date).key === half.key);
    const used = entries.reduce((sum, entry) => sum + entry.amount, 0);

    return {
      ...half,
      entries,
      used,
      left: Math.max(0, state.credit.amount - used),
      days: Math.round((Date.parse(half.end) - Date.parse(today())) / 86400000) + 1
    };
  }

  // Earlier and later half years with charges, newest first.
  function creditOther() {
    const current = creditHalf(today()).key;
    const halves = new Map();

    for (const entry of state.credit.entries) {
      const half = creditHalf(entry.date);
      if (half.key === current) continue;

      const row = halves.get(half.key) || { ...half, used: 0, count: 0 };
      row.used += entry.amount;
      row.count++;
      halves.set(half.key, row);
    }

    return [...halves.values()].sort((a, b) => b.key.localeCompare(a.key));
  }

  function addCredit() {
    const date = $('hpt-credit-date').value || today();
    const amount = parseAmount($('hpt-credit-amount').value);

    if (!state.tools.credit || !(amount > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      $('hpt-credit-amount').focus();
      return;
    }

    // Another tab may have changed the list.
    state.credit = loadCredit();

    if (state.credit.entries.length < CREDIT.maxEntries) {
      state.credit.entries.push({
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        date,
        hotel: $('hpt-credit-hotel').value.trim().slice(0, 80),
        amount: Math.round(amount * 100) / 100
      });

      saveCredit();
    }

    $('hpt-credit-hotel').value = '';
    $('hpt-credit-date').value = today();
    $('hpt-credit-amount').value = '';
    render();
  }

  function removeCredit(id) {
    state.credit = loadCredit();
    state.credit.entries = state.credit.entries.filter(entry => entry.id !== id);
    saveCredit();
    render();
  }

  function setCreditAmount(value) {
    const amount = parseAmount(value);

    state.credit = loadCredit();

    if (amount > 0) {
      state.credit.amount = Math.round(amount);
      saveCredit();
    }

    render();
  }

  // Resort Credit hotels of the current search, offered as hotel names when adding a charge.
  const creditHotels = () => [...state.hotels.values()]
    .filter(hotel => hotel.name && state.resorts?.has(hotel.code))
    .map(hotel => hotel.name)
    .sort((a, b) => a.localeCompare(b));

  const usd = value => money(value, 'USD');

  // Amounts with cents only when they have some.
  const usdExact = value => Number.isInteger(value)
    ? usd(value)
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  let creditMarkup = '';

  function renderCredit() {
    const now = creditNow();
    const other = creditOther();
    const total = state.credit.amount;
    const share = total > 0 ? Math.min(1, now.used / total) : 0;
    const root = $('hpt-credit');

    if (document.activeElement !== $('hpt-credit-total')) {
      $('hpt-credit-total').value = String(total);
    }

    if (!$('hpt-credit-date').value) $('hpt-credit-date').value = today();

    const options = creditHotels()
      .map(name => `<option value="${html(name)}"></option>`)
      .join('');

    if ($('hpt-credit-hotels').innerHTML !== options) {
      $('hpt-credit-hotels').innerHTML = options;
    }

    const markup = `
      <div class="hpt-split-stats">
        <div class="hpt-stats">
          <div class="hpt-stat ${now.left > 0 ? 'credit' : 'good'}">
            <b>${html(now.left > 0 ? usdExact(now.left) : 'Used up')}</b>
            <span>${now.left > 0
              ? `left until ${html(shortDate(now.end))} · ${now.days} ${plural(now.days, 'day', 'days')}`
              : `next credit from ${html(shortDate(now.next))}`}</span>
          </div>
          <div class="hpt-stat">
            <b>${html(usdExact(now.used))}</b>
            <span>of ${html(usd(total))} used · ${html(now.label)}</span>
          </div>
        </div>
        <div class="hpt-bar hpt-credit-bar">
          <div style="width: ${Math.round(share * 100)}%"></div>
        </div>
      </div>

      ${now.entries.length ? `
        <div class="hpt-watch-list">
          ${[...now.entries]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map(entry => `
              <div class="hpt-watch-row">
                <div class="hpt-row">
                  <span class="hpt-name">${html(entry.hotel || 'Resort credit')}</span>
                  <b>${html(usdExact(entry.amount))}</b>
                </div>
                <div class="hpt-free-sub">
                  <span class="hpt-cal-sub">${html(shortDate(entry.date))}</span>
                  <button
                    type="button"
                    class="hpt-link-btn"
                    data-uncredit="${html(entry.id)}"
                  >Remove</button>
                </div>
              </div>
            `).join('')}
        </div>
      ` : `
        <div class="hpt-empty">
          <div class="hpt-empty-icon">${ICON.credit}</div>
          <b>Nothing used in ${html(now.label)}</b>
          <p>
            After a stay, add what the resort charged to your Aspire card for food,
            drinks or spa, up to ${html(usd(total))} this half year.
          </p>
        </div>
      `}

      ${other.length ? `
        <div class="hpt-all">
          <div class="hpt-all-title">Other half years</div>
          ${other.map(half => `
            <div class="hpt-row hpt-credit-half">
              <span>${html(half.label)} · ${half.count} ${plural(half.count, 'charge', 'charges')}</span>
              <b>${html(usdExact(half.used))} of ${html(usd(total))}</b>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    if (markup === creditMarkup) return;

    creditMarkup = markup;
    root.innerHTML = markup;
  }

  // =====================================
  // CSV export
  // =====================================
 
  function exportCSV() {
    const rows = [[
      'Hotel',
      'Hotel code',
      'Rate link',
      'Arrival date',
      'Departure date',
      'Room types checked',
      'Total room types',
      'Full scan',
      'Room type',
      'Room type code',
      'Rate name',
      'Rate code',
      'Raw amount',
      'Display price',
      'Deposit required',
      'Refundable flag',
      'Points per night',
      'Free nights',
      'Total points',
      `Points value (${state.currency})`,
      `Cash (${state.currency})`,
      'Value per point (ct)',
      'Cheaper option',
      'Diagnostics'
    ]];
 
    for (const entry of state.results.values()) {
      const rates = entry.matches.length
        ? entry.matches
        : [null];
 
      for (const rate of rates) {
        const result = compare(entry, rate);
        const round = value =>
          value == null ? '' : Math.round(value * 100) / 100;

        rows.push([
          entry.name,
          entry.code,
          rateURL(entry),
          state.search?.arrival,
          state.search?.departure,
          entry.done.size,
          entry.totalRooms,
          entry.full,
          rate?.roomName,
          rate?.room,
          rate?.name,
          rate?.code,
          rate?.amount,
          rate?.price,
          rate ? 'true' : '',
          rate ? 'true' : '',
          result?.perNight,
          result?.freeNights,
          result?.points,
          round(result?.pointsValue),
          round(result?.cashValue),
          result?.centsPerPoint == null
            ? ''
            : result.centsPerPoint.toFixed(3),
          result?.winner,
          entry.errors.join(' | ')
        ]);
      }
    }
 
    // Prefix cells that spreadsheets would evaluate as formulas.
    const cell = value => {
      const text = String(value ?? '');
      return typeof value === 'string' &&
        /^[=+\-@\t\r]/.test(text)
        ? "'" + text
        : text;
    };

    const csv = '\ufeff' + rows.map(
      row => row.map(
        value =>
          '"' +
          cell(value).replace(/"/g, '""') +
          '"'
      ).join(',')
    ).join('\r\n');
 
    const objectURL = URL.createObjectURL(
      new Blob([csv], {
        type: 'text/csv;charset=utf-8'
      })
    );
 
    const a = document.createElement('a');
    a.href = objectURL;
    a.download = 'hilton_pro_tools.csv';
 
    document.body.appendChild(a);
    a.click();
    a.remove();
 
    setTimeout(
      () => URL.revokeObjectURL(objectURL),
      1000
    );
  }
 
  // =====================================
  // Draggable, collapsible panel
  // =====================================
 
  function mount() {
    if (state.panel || !document.body) return;
 
    const panel = document.createElement('section');
    panel.id = 'hilton-pro-tools';
 
    state.panel = panel;
 
    panel.innerHTML = `
      <style>${STYLE}</style>

      <div id="hpt-head" class="hpt-head">
        <button
          id="hpt-back"
          class="hpt-icon-btn hpt-back"
          type="button"
          aria-label="Back to all tools"
          title="All tools"
          data-view="home"
          hidden
        >${ICON.back}</button>

        <div id="hpt-logo" class="hpt-logo">${ICON.search}</div>

        <div class="hpt-heading">
          <div id="hpt-title" class="hpt-title">Hilton Pro Tools</div>
          <div id="hpt-dates" class="hpt-sub">Waiting for search</div>
        </div>

        <span id="hpt-min-badge" class="hpt-badge match hpt-min-badge"></span>
        <span id="hpt-min-watch" class="hpt-badge match hpt-min-badge"></span>
        <span id="hpt-min-update" class="hpt-badge update hpt-min-badge"></span>
        <span id="hpt-min-progress" class="hpt-min-progress"></span>

        <button
          id="hpt-csv"
          class="hpt-icon-btn"
          type="button"
          aria-label="Export CSV"
          title="Export CSV"
        >${ICON.download}</button>

        <button
          id="hpt-min"
          class="hpt-icon-btn"
          type="button"
          aria-label="Minimize panel"
          title="Minimize"
        >${ICON.minus}</button>
      </div>

      <div id="hpt-min-bar" class="hpt-min-bar" hidden><div></div></div>

      <div id="hpt-body">
        <div id="hpt-view-home">
          <div id="hpt-update" class="hpt-update-wrap" hidden></div>

          <div id="hpt-home-empty"></div>

          <div id="hpt-tools" class="hpt-tools">
            <button class="hpt-tool" type="button" data-view="resort">
              <span class="hpt-tool-icon">${ICON.resort}</span>
              <span class="hpt-tool-text">
                <span class="hpt-row">
                  <b>Resort Finder</b>
                  <span id="hpt-resort-chip" class="hpt-badge match"></span>
                </span>
                <span id="hpt-resort-sub" class="hpt-tool-sub"></span>
              </span>
              ${ICON.chevron}
            </button>

            <button class="hpt-tool" type="button" data-view="points">
              <span class="hpt-tool-icon points">${ICON.points}</span>
              <span class="hpt-tool-text">
                <span class="hpt-row">
                  <b>Cash vs. Points</b>
                  <span id="hpt-points-chip" class="hpt-chip points"></span>
                </span>
                <span id="hpt-points-sub" class="hpt-tool-sub"></span>
              </span>
              ${ICON.chevron}
            </button>

            <button class="hpt-tool" type="button" data-view="free">
              <span class="hpt-tool-icon free">${ICON.free}</span>
              <span class="hpt-tool-text">
                <span class="hpt-row">
                  <b>Free Night Finder</b>
                  <span id="hpt-free-chip" class="hpt-chip free"></span>
                </span>
                <span id="hpt-free-sub" class="hpt-tool-sub"></span>
              </span>
              ${ICON.chevron}
            </button>

            <button class="hpt-tool" type="button" data-view="split">
              <span class="hpt-tool-icon split">${ICON.split}</span>
              <span class="hpt-tool-text">
                <span class="hpt-row">
                  <b>Split Stay</b>
                  <span id="hpt-split-chip" class="hpt-chip split"></span>
                </span>
                <span id="hpt-split-sub" class="hpt-tool-sub"></span>
              </span>
              ${ICON.chevron}
            </button>

            <button class="hpt-tool" type="button" data-view="calendar">
              <span class="hpt-tool-icon calendar">${ICON.dates}</span>
              <span class="hpt-tool-text">
                <span class="hpt-row">
                  <b>Flexible Dates</b>
                  <span id="hpt-calendar-chip" class="hpt-chip calendar"></span>
                </span>
                <span id="hpt-calendar-sub" class="hpt-tool-sub"></span>
              </span>
              ${ICON.chevron}
            </button>

            <button class="hpt-tool" type="button" data-view="rates">
              <span class="hpt-tool-icon rates">${ICON.rates}</span>
              <span class="hpt-tool-text">
                <span class="hpt-row">
                  <b>Rate Inspector</b>
                  <span id="hpt-rates-chip" class="hpt-chip rates"></span>
                </span>
                <span id="hpt-rates-sub" class="hpt-tool-sub"></span>
              </span>
              ${ICON.chevron}
            </button>

            <button class="hpt-tool" type="button" data-view="suites">
              <span class="hpt-tool-icon suites">${ICON.suites}</span>
              <span class="hpt-tool-text">
                <span class="hpt-row">
                  <b>Suite Finder</b>
                  <span id="hpt-suites-chip" class="hpt-chip suites"></span>
                </span>
                <span id="hpt-suites-sub" class="hpt-tool-sub"></span>
              </span>
              ${ICON.chevron}
            </button>

            <button class="hpt-tool" type="button" data-view="watch">
              <span class="hpt-tool-icon watch">${ICON.watch}</span>
              <span class="hpt-tool-text">
                <span class="hpt-row">
                  <b>Price Watch</b>
                  <span id="hpt-watch-chip" class="hpt-chip cash"></span>
                </span>
                <span id="hpt-watch-sub" class="hpt-tool-sub"></span>
              </span>
              ${ICON.chevron}
            </button>

            <button class="hpt-tool" type="button" data-view="credit">
              <span class="hpt-tool-icon credit">${ICON.credit}</span>
              <span class="hpt-tool-text">
                <span class="hpt-row">
                  <b>Credit Tracker</b>
                  <span id="hpt-credit-chip" class="hpt-chip credit"></span>
                </span>
                <span id="hpt-credit-sub" class="hpt-tool-sub"></span>
              </span>
              ${ICON.chevron}
            </button>
          </div>

          <div id="hpt-top" class="hpt-section" hidden>
            <div class="hpt-section-title">Top find</div>
            <div id="hpt-top-card" class="hpt-best hpt-top"></div>
          </div>

          <details id="hpt-settings-acc" class="hpt-acc">
            <summary>
              ${ICON.sliders}
              <b>Settings</b>
              <span id="hpt-settings-sum" class="hpt-acc-sum"></span>
              ${ICON.chevron}
            </summary>

            <div class="hpt-acc-body">
              <div class="hpt-section-title">Tools</div>

              <label class="hpt-toggle hpt-tool-switch">
                <span class="hpt-tool-icon small">${ICON.resort}</span>
                <span class="hpt-tool-text">
                  <b>Resort Finder</b>
                  <span id="hpt-resort-state"></span>
                </span>
                <input
                  class="hpt-switch"
                  type="checkbox"
                  role="switch"
                  data-tool="resort"
                  aria-label="Resort Finder"
                >
              </label>

              <label class="hpt-toggle hpt-tool-switch">
                <span class="hpt-tool-icon small points">${ICON.points}</span>
                <span class="hpt-tool-text">
                  <b>Cash vs. Points</b>
                  <span id="hpt-points-state"></span>
                </span>
                <input
                  class="hpt-switch"
                  type="checkbox"
                  role="switch"
                  data-tool="points"
                  aria-label="Cash vs. Points"
                >
              </label>

              <label class="hpt-toggle hpt-tool-switch">
                <span class="hpt-tool-icon small free">${ICON.free}</span>
                <span class="hpt-tool-text">
                  <b>Free Night Finder</b>
                  <span id="hpt-free-state"></span>
                </span>
                <input
                  class="hpt-switch"
                  type="checkbox"
                  role="switch"
                  data-tool="free"
                  aria-label="Free Night Finder"
                >
              </label>

              <label class="hpt-toggle hpt-tool-switch">
                <span class="hpt-tool-icon small split">${ICON.split}</span>
                <span class="hpt-tool-text">
                  <b>Split Stay</b>
                  <span id="hpt-split-state"></span>
                </span>
                <input
                  class="hpt-switch"
                  type="checkbox"
                  role="switch"
                  data-tool="split"
                  aria-label="Split Stay"
                >
              </label>

              <label class="hpt-toggle hpt-tool-switch">
                <span class="hpt-tool-icon small calendar">${ICON.dates}</span>
                <span class="hpt-tool-text">
                  <b>Flexible Dates</b>
                  <span id="hpt-calendar-state"></span>
                </span>
                <input
                  class="hpt-switch"
                  type="checkbox"
                  role="switch"
                  data-tool="calendar"
                  aria-label="Flexible Dates"
                >
              </label>

              <label class="hpt-toggle hpt-tool-switch">
                <span class="hpt-tool-icon small rates">${ICON.rates}</span>
                <span class="hpt-tool-text">
                  <b>Rate Inspector</b>
                  <span id="hpt-rates-state"></span>
                </span>
                <input
                  class="hpt-switch"
                  type="checkbox"
                  role="switch"
                  data-tool="rates"
                  aria-label="Rate Inspector"
                >
              </label>

              <label class="hpt-toggle hpt-tool-switch">
                <span class="hpt-tool-icon small suites">${ICON.suites}</span>
                <span class="hpt-tool-text">
                  <b>Suite Finder</b>
                  <span id="hpt-suites-state"></span>
                </span>
                <input
                  class="hpt-switch"
                  type="checkbox"
                  role="switch"
                  data-tool="suites"
                  aria-label="Suite Finder"
                >
              </label>

              <label class="hpt-toggle hpt-tool-switch">
                <span class="hpt-tool-icon small watch">${ICON.watch}</span>
                <span class="hpt-tool-text">
                  <b>Price Watch</b>
                  <span id="hpt-watch-state"></span>
                </span>
                <input
                  class="hpt-switch"
                  type="checkbox"
                  role="switch"
                  data-tool="watch"
                  aria-label="Price Watch"
                >
              </label>

              <label class="hpt-toggle hpt-tool-switch">
                <span class="hpt-tool-icon small credit">${ICON.credit}</span>
                <span class="hpt-tool-text">
                  <b>Credit Tracker</b>
                  <span id="hpt-credit-state"></span>
                </span>
                <input
                  class="hpt-switch"
                  type="checkbox"
                  role="switch"
                  data-tool="credit"
                  aria-label="Credit Tracker"
                >
              </label>

              <div id="hpt-shared" class="hpt-shared">
                <div class="hpt-section-title">Shared settings</div>

                <div class="hpt-settings">
                  <label>
                    Point value
                    <input
                      id="hpt-point"
                      type="text"
                      inputmode="decimal"
                      aria-label="Point value in euro cents"
                    >
                    ct
                  </label>

                  <label>
                    Show in
                    <select
                      id="hpt-currency"
                      aria-label="Currency for prices and point values"
                    ></select>
                  </label>
                </div>

                <div id="hpt-shared-note" class="hpt-shared-note">
                  Cash vs. Points and Free Night Finder share one points request per results page.
                </div>
              </div>

              <div class="hpt-version">
                <span>Hilton Pro Tools ${html(VERSION || '')}</span>
                <span aria-hidden="true">·</span>
                <span id="hpt-version-state"></span>

                <label class="hpt-version-auto">
                  <input id="hpt-update-auto" type="checkbox">
                  Check for updates automatically
                </label>
              </div>
            </div>
          </details>
        </div>

        <div id="hpt-view-resort" hidden>
          <div class="hpt-controls">
            <div id="hpt-stats" class="hpt-stats" hidden></div>

            <div id="hpt-progress" class="hpt-progress" hidden></div>

            <div class="hpt-actions">
              <button id="hpt-scan" class="hpt-primary" type="button">
                ${ICON.refresh}
                <span class="hpt-idle">Quick scan</span>
                <span class="hpt-busy">Scanning…</span>
              </button>

              <button id="hpt-stop" class="hpt-secondary" type="button">
                Stop
              </button>

              <button
                id="hpt-clear"
                class="hpt-square"
                type="button"
                aria-label="Clear results"
                title="Clear results"
              >${ICON.trash}</button>
            </div>

            <label class="hpt-toggle">
              <span>Auto scan after search results</span>
              <input
                id="hpt-auto"
                class="hpt-switch"
                type="checkbox"
                role="switch"
              >
            </label>

            <div id="hpt-status" class="hpt-status">
              Quick scan only retries failed or incomplete hotels.
            </div>
          </div>

          <div id="hpt-results" class="hpt-list"></div>

          <div class="hpt-footer">
            Rates and cancellation policies are as shown on the Hilton checkout page.
            A deposit requirement does not guarantee an immediate charge or an Aspire credit.
          </div>
        </div>

        <div id="hpt-view-points" hidden>
          <div class="hpt-controls">
            <div id="hpt-all-title" class="hpt-all-title"></div>
            <div class="hpt-hint">
              <span id="hpt-all-hint"></span>
              <button
                id="hpt-all-change"
                class="hpt-link-btn"
                type="button"
                data-view="home"
              >Change</button>
            </div>
          </div>

          <div id="hpt-all" class="hpt-all">
            <div id="hpt-all-list"></div>
          </div>
        </div>

        <div id="hpt-view-free" hidden>
          <div id="hpt-free" class="hpt-free"></div>

          <div class="hpt-footer">
            Based on Hilton's lowest points price for the whole stay.
            A single certificate night can still differ; check it on Hilton before booking.
          </div>
        </div>

        <div id="hpt-view-split" hidden>
          <div id="hpt-split-controls" class="hpt-controls">
            <div class="hpt-free-intro">
              Prices every night of the stay on its own and finds the cheapest mix of
              cash nights, points nights and Free Night Certificates, also across two hotels.
            </div>

            <div class="hpt-split-pick">
              <label class="hpt-settings">
                Certificates
                <select id="hpt-certs" aria-label="Free Night Certificates to use">
                  ${Array.from(
                    { length: SPLIT.maxCertificates + 1 },
                    (_, count) => `<option value="${count}">${count}</option>`
                  ).join('')}
                </select>
              </label>

              <button id="hpt-split-load" class="hpt-primary" type="button">
                ${ICON.refresh}
                <span id="hpt-split-label" class="hpt-idle">Load nightly prices</span>
                <span class="hpt-busy">Loading…</span>
              </button>
            </div>

            <div id="hpt-split-status" class="hpt-hint"></div>
          </div>

          <div id="hpt-split" class="hpt-split"></div>

          <div class="hpt-footer">
            Nightly prices come from one-night searches and can differ from a longer stay's rates.
            In each reward booking, the cheapest of every 5 Standard Room Reward nights is counted
            free (Silver and up). Each leg is booked separately; check prices on Hilton before booking.
          </div>
        </div>

        <div id="hpt-view-calendar" hidden>
          <div id="hpt-cal-controls" class="hpt-controls">
            <div class="hpt-free-intro">
              Prices the same stay with the arrival a few days earlier or later,
              for every hotel of the search.
            </div>

            <div class="hpt-split-pick">
              <label class="hpt-settings">
                Arrival
                <select id="hpt-cal-range" aria-label="Days to move the arrival each way">
                  ${Array.from(
                    { length: CALENDAR.maxShift },
                    (_, index) => `<option value="${index + 1}">±${index + 1} ${plural(index + 1, 'day', 'days')}</option>`
                  ).join('')}
                </select>
              </label>

              <button id="hpt-cal-load" class="hpt-primary" type="button">
                ${ICON.refresh}
                <span id="hpt-cal-label" class="hpt-idle">Load other dates</span>
                <span class="hpt-busy">Loading…</span>
              </button>
            </div>

            <div id="hpt-cal-mode" class="hpt-free-sort" hidden>
              <span>Show</span>
              <div class="hpt-seg" role="group" aria-label="Show prices in">
                <button type="button" data-cal-mode="cash" aria-pressed="true">Cash / night</button>
                <button type="button" data-cal-mode="points" aria-pressed="false">Points / night</button>
              </div>
            </div>

            <div id="hpt-cal-status" class="hpt-hint"></div>
          </div>

          <div id="hpt-cal"></div>

          <div class="hpt-footer">
            Every column is a stay of the same length from another arrival day. Click a price to open
            Hilton's rates for those dates. Semi-Flex rates for the Resort Credit change by date too:
            use <b>Search these dates</b> and let Resort Finder scan them.
          </div>
        </div>

        <div id="hpt-view-rates" hidden>
          <div id="hpt-rates-controls" class="hpt-controls">
            <div class="hpt-free-intro">
              Every rate plan of one room type side by side, with deposit, cancellation
              and what it costs over the cheapest rate.
            </div>

            <label class="hpt-settings hpt-rate-pick">
              <span>Hotel</span>
              <select id="hpt-rate-hotel" aria-label="Hotel to inspect"></select>
            </label>

            <label id="hpt-rate-room-pick" class="hpt-settings hpt-rate-pick" hidden>
              <span>Room</span>
              <select id="hpt-rate-room" aria-label="Room type to inspect"></select>
            </label>

            <div class="hpt-split-pick">
              <label class="hpt-version-auto hpt-rate-special">
                <input id="hpt-rate-special" type="checkbox">
                AAA and Senior rates too
              </label>

              <button id="hpt-rate-load" class="hpt-primary" type="button">
                ${ICON.refresh}
                <span id="hpt-rate-label" class="hpt-idle">Inspect rates</span>
                <span class="hpt-busy">Loading…</span>
              </button>
            </div>

            <div id="hpt-rate-status" class="hpt-hint"></div>
          </div>

          <div id="hpt-rates"></div>

          <div class="hpt-footer">
            Rates as Hilton's room selection returns them for your dates, without Points &amp; Money.
            Markup compares the nightly rate. AAA and Senior rates need a membership or ID at check-in.
          </div>
        </div>

        <div id="hpt-view-suites" hidden>
          <div id="hpt-suite-controls" class="hpt-controls">
            <div class="hpt-free-intro">
              Suites and upgrades of each hotel with what they cost over its cheapest room,
              in cash and in points.
            </div>

            <label class="hpt-settings hpt-rate-pick">
              <span>Hotels</span>
              <select id="hpt-suite-hotel" aria-label="Hotels to look at"></select>
            </label>

            <div class="hpt-split-pick">
              <div class="hpt-seg" role="group" aria-label="Room types to show">
                <button type="button" data-suite-show="suites" aria-pressed="true">Suites</button>
                <button type="button" data-suite-show="all" aria-pressed="false">All upgrades</button>
              </div>

              <button id="hpt-suite-load" class="hpt-primary" type="button">
                ${ICON.refresh}
                <span id="hpt-suite-label" class="hpt-idle">Find suites</span>
                <span class="hpt-busy">Loading…</span>
              </button>
            </div>

            <div id="hpt-suite-status" class="hpt-hint"></div>
          </div>

          <div id="hpt-suites"></div>

          <div class="hpt-footer">
            Prices are the cheapest nightly rate of each room type and its lowest reward per night,
            compared with the hotel's cheapest room. <b>ct/pt</b> is what each extra point is worth
            when you pay the upgrade in points instead of cash; blue means more than your point value.
          </div>
        </div>

        <div id="hpt-view-watch" hidden>
          <div class="hpt-controls">
            <div class="hpt-free-intro">
              Remembers stays you booked or plan to book and checks their rate again whenever
              you open hilton.com, at most every ${WATCH.everyHours} hours per stay.
            </div>

            <div class="hpt-split-pick">
              <span id="hpt-watch-status" class="hpt-hint"></span>

              <button id="hpt-watch-check" class="hpt-primary" type="button">
                ${ICON.refresh}
                <span class="hpt-idle">Check now</span>
                <span class="hpt-busy">Checking…</span>
              </button>
            </div>
          </div>

          <div id="hpt-watch"></div>

          <div class="hpt-footer">
            Prices are the stay's total as Hilton's room selection shows it, in the currency you
            searched in. Enter what you paid under <b>Paid</b>. Before cancelling, book the lower
            rate first and check its cancellation policy.
          </div>
        </div>

        <div id="hpt-view-credit" hidden>
          <form id="hpt-credit-form" class="hpt-controls" autocomplete="off">
            <div class="hpt-free-intro">
              Counts how much of the Aspire card's resort credit you used. It renews on Jan 1
              and Jul 1 and can't be read from Hilton, so add each charge yourself.
            </div>

            <label class="hpt-settings hpt-rate-pick hpt-credit-field">
              <span>Hotel</span>
              <input
                id="hpt-credit-hotel"
                type="text"
                list="hpt-credit-hotels"
                placeholder="Optional"
                aria-label="Hotel"
              >
              <datalist id="hpt-credit-hotels"></datalist>
            </label>

            <label class="hpt-settings hpt-rate-pick hpt-credit-field">
              <span>Date</span>
              <input id="hpt-credit-date" type="date" aria-label="Date of the charge">
            </label>

            <div class="hpt-split-pick">
              <label class="hpt-settings hpt-rate-pick hpt-credit-field">
                <span>Amount</span>
                <input
                  id="hpt-credit-amount"
                  type="text"
                  inputmode="decimal"
                  placeholder="USD"
                  aria-label="Amount in USD"
                >
              </label>

              <button id="hpt-credit-add" class="hpt-primary" type="submit">
                ${ICON.plus}
                <span>Add charge</span>
              </button>
            </div>
          </form>

          <div id="hpt-credit"></div>

          <div class="hpt-controls">
            <label class="hpt-settings">
              Credit per half year
              <input
                id="hpt-credit-total"
                type="text"
                inputmode="decimal"
                aria-label="Resort credit per half year in USD"
              >
              USD
            </label>
          </div>

          <div class="hpt-footer">
            Saved in this browser only. Amounts are in US dollars, as on your card statement;
            the credit is used once the charge posts to your Aspire card at the hotel.
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
 
    $('hpt-scan').onclick = () => {
      state.paused = false;
      clearTimeout(autoTimer);
      runScan(true);
    };
 
    $('hpt-stop').onclick = () => {
      state.paused = true;
      state.stop = true;
 
      clearTimeout(autoTimer);
 
      status('Stopped; click Quick scan to retry incomplete hotels');
    };
 
    $('hpt-clear').onclick = () => {
      state.paused = true;
      invalidate('Cleared; please run the Hilton search again');
    };
 
    $('hpt-csv').onclick = exportCSV;

    panel.querySelectorAll('[data-view]').forEach(button => {
      button.addEventListener('click', () => {
        showView(button.dataset.view);
      });
    });

    panel.addEventListener('click', event => {
      const action = event.target.closest('[data-update]')?.dataset.update;

      if (action === 'check') checkUpdate(true);
      if (action === 'install') installUpdate();
      if (action === 'skip') skipUpdate();

      const sort = event.target.closest('[data-free-sort]')?.dataset.freeSort;
      if (sort) setFreeSort(sort);

      const mode = event.target.closest('[data-cal-mode]')?.dataset.calMode;
      if (mode) setCalendarMode(mode);

      const show = event.target.closest('[data-suite-show]')?.dataset.suiteShow;
      if (show) setSuiteShow(show);

      const inspect = event.target.closest('[data-inspect]');
      if (inspect) openInspector(inspect.dataset.inspect, inspect.dataset.inspectRoom || null);

      const watch = event.target.closest('[data-watch]')?.dataset.watch;
      if (watch) watchRate(watch);

      const unwatch = event.target.closest('[data-unwatch]')?.dataset.unwatch;
      if (unwatch) unwatchStay(unwatch);

      const uncredit = event.target.closest('[data-uncredit]')?.dataset.uncredit;
      if (uncredit) removeCredit(uncredit);
    });

    panel.addEventListener('change', event => {
      const id = event.target.dataset?.watchPaid;
      if (id) setPaid(id, event.target.value);
    });

    $('hpt-split-load').onclick = loadSplit;
    $('hpt-certs').onchange = event => setCertificates(event.target.value);
    $('hpt-cal-load').onclick = loadCalendar;
    $('hpt-cal-range').onchange = event => setCalendarRange(event.target.value);

    $('hpt-rate-load').onclick = () => inspectRates();
    $('hpt-suite-load').onclick = loadSuites;
    $('hpt-suite-hotel').onchange = event => {
      state.suites.pick = event.target.value;
      render();
    };
    $('hpt-watch-check').onclick = () => checkWatch(true);
    $('hpt-credit-form').onsubmit = event => {
      event.preventDefault();
      addCredit();
    };
    $('hpt-credit-total').onchange = event => setCreditAmount(event.target.value);
    $('hpt-rate-hotel').onchange = event => {
      state.inspect = freshInspect(event.target.value);
      render();
    };
    $('hpt-rate-room').onchange = event => inspectRates(state.inspect.code, event.target.value);
    $('hpt-rate-special').onchange = event => {
      state.inspectSpecial = event.target.checked;

      try {
        localStorage.setItem(RATES_SPECIAL_KEY, state.inspectSpecial ? 'on' : 'off');
      } catch {}

      render();
    };

    $('hpt-update-auto').onchange = event => {
      state.update.auto = event.target.checked;

      try {
        localStorage.setItem(
          UPDATE_AUTO_KEY,
          state.update.auto ? 'on' : 'off'
        );
      } catch {}

      if (state.update.auto) checkUpdate();
    };

    // Change on the Cash vs. Points page leads to the shared settings.
    $('hpt-all-change').addEventListener('click', () => {
      $('hpt-settings-acc').open = true;
      $('hpt-point').focus();
    });

    $('hpt-auto').checked = state.autoScan;

    panel.querySelectorAll('[data-tool]').forEach(input => {
      input.onchange = () => setTool(input.dataset.tool, input.checked);
    });

    $('hpt-point').onchange = saveSettings;
    $('hpt-currency').onchange = saveSettings;

    $('hpt-auto').onchange = event => {
      state.autoScan = event.target.checked;

      try {
        localStorage.setItem(
          AUTO_KEY,
          state.autoScan ? 'on' : 'off'
        );
      } catch {}

      if (state.autoScan) {
        state.paused = false;
        status('Auto scan on');
        scheduleAutoScan();
      } else {
        clearTimeout(autoTimer);
        status('Auto scan off; click Quick scan to start');
      }
    };
 
    $('hpt-min').onclick = () => {
      state.minimized = !state.minimized;

      panel.classList.toggle('hpt-min', state.minimized);
      renderView();

      const button = $('hpt-min');

      button.innerHTML =
        state.minimized ? ICON.plus : ICON.minus;

      button.setAttribute(
        'aria-label',
        state.minimized ? 'Expand panel' : 'Minimize panel'
      );

      button.title = state.minimized ? 'Expand' : 'Minimize';
    };
 
    const head = $('hpt-head');
 
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;
 
    head.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
 
      dragging = true;
 
      offsetX =
        event.clientX -
        panel.getBoundingClientRect().left;
 
      offsetY =
        event.clientY -
        panel.getBoundingClientRect().top;
 
      head.setPointerCapture(event.pointerId);
    });
 
    head.addEventListener('pointermove', event => {
      if (!dragging) return;
 
      panel.style.left = Math.max(
        0,
        Math.min(
          innerWidth - panel.offsetWidth,
          event.clientX - offsetX
        )
      ) + 'px';
 
      panel.style.top = Math.max(
        0,
        Math.min(
          innerHeight - 35,
          event.clientY - offsetY
        )
      ) + 'px';
 
      panel.style.right = 'auto';
    });
 
    head.addEventListener('pointerup', () => {
      dragging = false;
    });
 
    head.addEventListener('pointercancel', () => {
      dragging = false;
    });
 
    render();

    if (state.update.auto) {
      setTimeout(() => checkUpdate(), UPDATE.startDelay);
    }

    if (state.tools.watch) {
      setTimeout(() => checkWatch(), WATCH.startDelay);
    }

    // Stays watched or removed and charges added in another tab.
    addEventListener('storage', event => {
      if (event.key === CREDIT_KEY) {
        state.credit = loadCredit();
        render();
      }

      if (event.key !== WATCH_KEY || state.watch.status === 'checking') return;

      state.watch.items = loadWatchItems();
      render();
    });
  }
 
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      mount,
      { once: true }
    );
  } else {
    mount();
  }
})();