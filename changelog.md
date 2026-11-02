# Changelog

## 0.4.0

### Added

- **Update check:** a few seconds after a hilton.com page loads, the script compares its version with the one published on GitHub (at most every 6 hours). When there is a newer one, the home page shows *Update available* with the changelog entries since your version, **Install** and **Skip this version**. When minimized, a dot on the logo and an *Update* badge show it.
- **Install** opens the new version in your userscript manager; the Hilton tab reloads once you come back to it.
- **Version row in Settings:** the installed version, **Check for updates** (*Checking…*, *Up to date*, *X available*, *Check failed*) and *Check for updates automatically* to turn the automatic check off.

## 0.3.0

### Added

- **Turn tools on or off:** *Settings* on the home page has a switch per tool. A tool that is off has no card and sends no requests: without Resort Finder there is no resort list and no scan, without Cash vs. Points no points prices, exchange rates or points comparisons. Turning a tool back on catches up on the current search.
- **Loading indicator on the home page:** a tool card shows a small spinner on its icon while that tool is still working (Resort Finder: list loading or scan running; Cash vs. Points: points prices or exchange rates loading).

### Changed

- **Settings accordion:** the tool switches and the shared settings (point value, currency) are in a collapsible *Settings* section at the bottom of the home page, closed by default; its header summarizes them. Point value and currency are only shown while Cash vs. Points is on. **Change** on the Cash vs. Points page opens it.

## 0.2.0

### Added

- **Home page:** the panel opens on an overview with one card per tool and its live summary (*N matches*, *Scanning hotel X of Y*, *Points 4/6*, best value per point), the **Top find** (cheapest Semi-Flex match with the points comparison) and the shared settings. More tools will get their own card here.
- **Back button** in the header returns from a tool to the home page. The panel remembers the open page.
- **View rates ↗ in Cash vs. Points:** every bookable hotel links to its room selection on Hilton for your dates, as in the Resort Finder.

### Changed

- **Resort Finder and Cash vs. Points are separate pages** instead of one long panel.
- **Point value and currency** moved to *Shared settings* on the home page; **Change** on the Cash vs. Points page leads there.
- **CSV export** moved to the header, since it covers both tools.
- **Resort Finder tiles:** *Resort Credit hotels* and *with candidates*; the number of hotels found is no longer a tile.

## 0.1.2

**New script identity:** the script was renamed to **Hilton Pro Tools** (previously *Hilton Aspire Resort Finder*) and has a new namespace, `hilton-pro-tools`. Userscript managers treat it as a new script: install it fresh and remove the old one. Saved settings (auto scan, point value, currency) start from their defaults once.

### Added

- **Cash vs. points for every hotel:** a new section lists all hotels of the search with the cheapest cash rate, the Standard Room Reward points for the stay, their value, the value per point in euro cents, and whether *Points* or *Cash* is cheaper. It is sorted by value per point; resort credit hotels are marked.
- **Cash vs. points for resort matches:** below a Semi-Flex match, the panel compares the Semi-Flex price with the points price.
- **Point value setting:** the value of one Hilton Honors point in euro cents (default 0.433), saved in `localStorage`.
- **Currency dropdown:** "Show in" picks the currency of the comparison. Exchange rates come from Hilton's currency converter and are cached for 12 hours.
- **Points prices without "Use Points":** the script requests the points prices itself, with one request per page of search results.
- **Hotel names** for all hotels, read from Hilton's own map request (`hotelSummaryOptions`).
- **Not bookable hotels** are listed at the end of the comparison with Hilton's reason (for example *Hotel no longer a hilton*).
- **CSV export:** new columns for points per night, total points, points value, cash, value per point and the cheaper option.

### Changed

- **Renamed to Hilton Pro Tools,** since the script now does more than find resorts. The CSV export is now `hilton_pro_tools.csv`.
- **Internal names:** `localStorage` keys, the panel ID and the CSS class prefix (`hpt-`) now use the new name.

## 0.1.1

### Added

- **Auto scan switch:** "Auto scan after search results" can now be turned off. The setting is saved in `localStorage`. When it is off, scans only run when you click **Quick scan**.
- **Scan progress:** while scanning, the panel shows *Scanning hotel X of Y*, a progress bar and the room type currently being checked.
- **Time left:** an estimate (for example *≈ 40 s left*) based on how long requests have taken so far, updated every second.
- **Queue:** every hotel in the current round with its state: *Checking…*, *Queued*, or its result once done.
- **Minimized view:** the collapsed header shows the scan progress (for example *2/4*) with a thin progress bar, or the number of matches.
- **Empty state:** before a search, the panel explains how to get started.

### Changed

- **New panel design:**
  - Header with an icon and your stay (for example *Feb 21 → Mar 1, 2027 · 8 nights*).
  - Three tiles: hotels found, eligible for the Resort Credit, and candidates.
  - **Quick scan** is the main button and shows *Scanning…* while a scan runs. **Stop** turns red while scanning. Export and Clear are now icon buttons.
  - Per hotel: a status badge, a progress bar for the checked room types, and the cheapest match in a highlighted box. More candidates and diagnostics can be expanded.
  - The panel styles are scoped to the panel, so Hilton's own CSS has little effect on them.
- **English UI:** all texts in the panel and in the CSV export are now in English (previously Chinese). This includes status and error messages, CSV column headers and code comments.

### Fixed

- **CSV formula injection:** cells in the CSV export that start with `=`, `+`, `-`, `@`, a tab or a line break get a leading `'`, so spreadsheet apps don't run them as formulas.
- **HTML escaping:** a hotel-code-based attribute (`data-detail`) in the panel is now escaped like every other value.

## 0.1.0

- First release.
