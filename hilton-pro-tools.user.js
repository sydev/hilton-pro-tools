// ==UserScript==
// @name         Hilton Pro Tools
// @namespace    hilton-pro-tools
// @version      0.4.1
// @description  Aspire resort credit finder (Semi-Flex deposit rates) and cash vs. points comparison for Hilton searches
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

  // Panel pages: the home overview and one page per tool.
  const VIEWS = {
    home: 'Hilton Pro Tools',
    resort: 'Resort Finder',
    points: 'Cash vs. Points'
  };

  // Description of each tool in the home page's on/off switches.
  const TOOL_INFO = {
    resort: 'Scans Resort Credit hotels for Semi-Flex rates',
    points: 'Loads points prices and exchange rates'
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
    tools: { resort: true, points: true },
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

  async function loadPoints(codes, input, generation) {
    const missing = codes.filter(code =>
      !state.extras.points.has(code) &&
      !state.hotels.get(code)?.points
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
          // Standard Room Reward points per night, if Hilton returned one.
          points:
            Number.isFinite(points) && points > 0
              ? points
              : old.points || null,
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

      if (state.tools.points) {
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
 
  function variables(code, room, cacheId) {
    const s = state.search;
 
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
 
  async function ask(query, values) {
    if (state.scan) state.scan.requests++;

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
 
  function rateURL(entry) {
    const s = state.search;
    if (!s) return '';
 
    const url = new URL(
      '/en/book/reservation/rooms/',
      location.origin
    );
 
    url.searchParams.set(
      'ctyhocn',
      entry.codeUsed || entry.code
    );
 
    url.searchParams.set('arrivalDate', s.arrival);
    url.searchParams.set('departureDate', s.departure);
 
    url.searchParams.set(
      'room1NumAdults',
      String(s.adults || 1)
    );
 
    if (s.currency) {
      url.searchParams.set('displayCurrency', s.currency);
    }
 
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

  const money = value => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: state.currency,
        maximumFractionDigits: 0
      }).format(value);
    } catch {
      return `${state.currency} ${Math.round(value)}`;
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
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    `;
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
        : 'Off · sends no requests';
    }

    const on = Object.values(state.tools).filter(Boolean).length;
    const total = Object.keys(state.tools).length;

    $('hpt-tools').hidden = !on;
    // Point value and currency only matter for points comparisons.
    $('hpt-shared').hidden = !state.tools.points;

    $('hpt-settings-sum').textContent = state.tools.points
      ? `${on === total ? `${on} tools on` : `${on} of ${total} tools on`} · ` +
        `${state.pointValue} ct · ${state.currency}`
      : `${on} of ${total} tools on`;

    // Each tool card shows a spinner while that tool is still loading.
    state.panel.querySelector('.hpt-tool[data-view="resort"]')
      .setAttribute('aria-busy', String(Boolean(s && state.busy)));

    state.panel.querySelector('.hpt-tool[data-view="points"]')
      .setAttribute('aria-busy', String(Boolean(
        s && (state.extras.pending > 0 || state.currencies?.size === 0)
      )));

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

    if (tool === 'points' && on && state.search) {
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
    });

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