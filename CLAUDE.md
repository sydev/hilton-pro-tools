# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single userscript, `hilton-pro-tools.user.js` (Tampermonkey/Violentmonkey, `@match https://www.hilton.com/*`, `@run-at document-start`, `@grant none`). It adds a panel to hilton.com search results with two tools: an Aspire **resort credit finder** (Semi-Flex, deposit-required, refundable, non-Advance-Purchase rates at hotels on Hilton's official Resort Credit list) and a **cash vs. points** comparison.

There is no build step, linter or bundler. The file is **plain JavaScript**: it is installed as-is and the preview harness injects it verbatim with `page.addInitScript`. `package.json` exists only for the preview harness (Playwright as a dev dependency, `pnpm test`).

## Files

- `hilton-pro-tools.user.js` — the whole script, one IIFE.
- `hilton-pro-tools.meta.js` — a copy of the userscript header only. `@updateURL` points here so update checks fetch just the header; `@downloadURL` points at `hilton-pro-tools.user.js`. Keep it identical to the header in `hilton-pro-tools.user.js` (especially `@version`).
- `info.md` — user-facing description (published script page). Keep it in sync when behaviour, UI labels, settings or limits change.
- `changelog.md` — per-version changes, newest first, grouped as Added / Changed / Fixed. Bump `@version` in the userscript header together with a new changelog entry.
- `test/preview.js` — Playwright harness that runs the script against mocked hilton.com responses and screenshots the panel.

## Panel design

The panel design lives in a private Claude Design canvas: https://claude.ai/artifact/MWT4zQt917AVHKoYsVEUgm. Its only board, "Hilton Pro Tools 0.3.0 · Home + tool pages" (`T3-Home.dc.html`), mirrors the current panel: the home page with one card per tool, the home page while tools are still loading, the home page with the Settings accordion open and a tool turned off, the Resort Finder page and the Cash vs. Points page. Read the canvas and its comments before changing it, and carry agreed design changes over into `mount()`, `render()` and `STYLE`.

## Running the preview

Playwright is a dev dependency; its browser is downloaded separately once:

```sh
pnpm install && pnpm exec playwright install chromium
pnpm test   # = node test/preview.js [hilton-pro-tools.user.js] [test/shots]
```

Set `CHROMIUM_PATH` to use an existing Chromium. It prints the CSV header plus one row, the requests sent and any page errors, and writes into `test/shots/` (gitignored) `home-scanning.png`, `scanning.png`, `minimized-scanning.png`, `done-no-fx.png`, `done.png`, `home.png`, `home-settings.png`, `all-hotels.png`, `minimized.png` and `home-points-off.png` (a second run with Cash vs. Points off; its requests are printed separately). Mocks (hotels, cash/points prices, the official resort list page) live at the top of `test/preview.js`; `graphql(body)` there answers each `/graphql/customer` request, so new GraphQL queries in the script need a matching mock branch. This is the only verification available — run it and look at the screenshots after UI or scan-logic changes.

## Architecture

The script is organized into sections marked by `// ====` banner comments. The flow across them:

1. **Passive capture.** `window.fetch` and `XMLHttpRequest` are wrapped to *observe* (never modify) Hilton's own requests to `/graphql/customer`. Each request/response pair goes to `ingest()`, which picks up the destination search (hotel list, cash prices, search input/currency), hotel names from `hotelSummaryOptions`, etc. Own requests use `nativeFetch` (captured before wrapping) so they are not re-ingested.
2. **Search generations.** `state.generation` is bumped by `invalidate()` when `syncLocation()` / `locationKey()` detects a new destination or dates; async work carries the generation it started with and drops results if it changed. A destination change discards results and reloads the page once (`RELOAD_KEY`) so the new search is captured cleanly.
3. **Resort list.** `loadResorts()` fetches the official eligible-hotels page, extracts hotel codes from links, and caches them in `localStorage` for `CONFIG.cacheDays`.
4. **Scanning.** `scheduleAutoScan()` → `runScan()` iterates eligible hotels; `scanHotel()` → `discoverRooms()` (room types, cheapest first) → per-room rate GraphQL via `post()`/`ask()` → `extractRates()` applies the match rules. Quick mode stops at a hotel's first match; `expandHotel()` does the full scan. `needsRetry()` decides what "Quick scan" retries. Throttling and caps are in `CONFIG` (`delay`, `maxHotels`, `maxRooms`) — keep the script gentle on Hilton.
5. **Points & currencies.** `loadPoints()` re-issues the search asking only for points prices (what Hilton's "Use Points" toggle would do), one request per results page. `loadCurrencies()` caches Hilton's converter factors (relative to USD) for 12 h; `convert()`/`valuation()` compute value per point in euro cents against the user's `pointValue`.
6. **UI.** `mount()` builds one page per key of `VIEWS` (`#hpt-view-home`, `#hpt-view-resort`, `#hpt-view-points`); `state.view` picks the visible one, `showView()` switches and persists it, `renderView()` updates the header. A new tool needs a `VIEWS` entry, a `state.tools` and `TOOL_INFO` entry, a page, a card and a switch in the home page's Settings accordion, its summary in `renderHome()`, and a `state.tools` guard on every request it sends. `render()` refreshes everything from `state` (scoped styles, `hpt-` CSS prefix, panel can be dragged/collapsed via `mount()`); `renderProgress()` handles the scan progress/ETA/queue; `exportCSV()` writes `hilton_pro_tools.csv`.

## Conventions

- All persisted keys, the panel ID and CSS classes use the `hilton-pro-tools` / `hpt-` prefix.
- Escape every interpolated value in panel HTML, including attributes, with the `html()` helper; CSV cells starting with `=`, `+`, `-`, `@`, tab or newline get a leading `'`.
- UI text, CSV headers and comments are in English.
- No external servers: all requests go to hilton.com with the user's session.
