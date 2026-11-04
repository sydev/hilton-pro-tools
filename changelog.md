# Changelog

## 0.10.0

### Added

- **Suite Finder:** an eighth tool that shows which suites and upgrades the hotels of your search have and what they cost over each hotel's cheapest room: in cash per night and in percent, in points per night with what those points are worth at your point value, and what each extra point is worth when you pay the upgrade in points (*ct/pt*). *No extra points* marks a suite that costs as many points as the cheapest room, *Certificate* one a Free Night Certificate covers.
- **Find suites:** loads the first 10 hotels of the search or one hotel you pick, with one request for the room types and one for their points prices per hotel (the page says how many before you start). Room types Resort Finder or the Rate Inspector already loaded need no request.
- **Suites or all upgrades:** switches between suites and villas and every pricier room type, without new requests (saved). **Rates** next to a suite opens the Rate Inspector on that room type.
- **Suite Finder card and switch:** the home card shows how many suites were found and the best one; Settings has its on/off switch. It sends nothing until you click **Find suites**.

## 0.9.0

### Added

- **Price Watch:** a seventh tool that remembers booked or planned stays and checks their rate again whenever you open hilton.com (at most every 6 hours per stay, two requests each). When the total drops by at least 1 % below what you paid, the stay shows *Rebook: −$3,250*, with **Book ↗** to book it again at the lower price.
- **Watch price** next to every rate in the Rate Inspector adds that hotel, room, rate, dates and guests to the watchlist (up to 10 stays).
- **Paid, Check now and Remove:** enter what you actually paid, check every upcoming stay right away, or take a stay off the list. Past stays are no longer checked.
- **Rebook badge:** the biggest saving shows on the Price Watch card and next to the title of the minimized panel. Settings has its on/off switch; off sends no requests.

## 0.8.0

### Added

- **Rate Inspector:** a sixth tool that shows every rate plan of one room type side by side: Flex, Semi-Flex, Advance Purchase, Honors discount and more, each with its price, *Refundable* or *Non-refundable*, *Deposit*, the cancellation policy and its markup over the cheapest rate (for example *+12 %*). Two tiles show the cheapest rate and what a refundable rate costs on top. Resort Credit rates (the Resort Finder rule) are marked.
- **Pick a hotel and room:** *Hotel* lists every hotel of the search, *Room* its room types, cheapest first. **Inspect rates** sends one request for the room types and one for the rates; rooms and rates Resort Finder already scanned need no request. Changing the room loads its rates.
- **AAA and Senior rates too:** asks for those special rates as well (two more requests, saved).
- **Inspect rates** links in Resort Finder and Cash vs. Points open the Rate Inspector on that hotel.
- **Rate Inspector card and switch:** the home card shows the inspected hotel and what flexibility costs there; Settings has its on/off switch. It sends nothing until you click **Inspect rates**.

## 0.7.0

### Added

- **Flexible Dates:** a fifth tool that prices the same stay with the arrival moved up to 3 days earlier or later. **Load other dates** sends one cash and one points request per other arrival day and results page (the page says how many before you start), then shows every hotel as a row of arrival days with the price per night, the cheapest day highlighted and your dates outlined. Click a price to open Hilton's rates for those dates.
- **Cheapest arrival:** two tiles show the cheapest arrival day and what it saves against your dates; the best hotel has **Book ↗** and **Search these dates**, which runs the Hilton search on the new dates so Resort Finder can scan them for Semi-Flex rates.
- **Arrival range and Show:** *Arrival* picks ±1, ±2 or ±3 days, *Show* switches between **Cash / night** and **Points / night** without new requests. Both are saved.
- **Flexible Dates card and switch:** the home card shows the cheapest arrival and what it saves; Settings has its on/off switch. It sends nothing until you click **Load other dates**.

## 0.6.0

### Added

- **Split Stay:** a fourth tool that finds the cheapest mix of cash nights, points nights and Free Night Certificates for your stay. **Load nightly prices** prices every night on its own (one cash and one points request per night and results page; the page says how many before you start), then shows the cheapest plan per hotel as legs with their dates, cost and **Book ↗**. In each reward booking the cheapest of every 5 Standard Room Reward nights counts as free; certificates only go on Standard Room Reward nights.
- **Change hotels once:** when moving to another hotel partway through saves at least 10 % over the best single hotel, that plan is shown first.
- **Certificates:** how many Free Night Certificates the Split Stay may use (0–5, saved). Changing it recalculates without new requests.
- **Split Stay card and switch:** the home card shows the cheapest stay and how much it saves against paying all cash or all points; Settings has its on/off switch. It works for stays of 2 to 14 nights and sends nothing until you click **Load nightly prices**.

## 0.5.0

### Added

- **Free Night Finder:** a third tool for Free Night Certificates. It shows which hotels of the search have a Standard Room Reward for your dates (the only award a certificate covers) and ranks them by what one night is worth, by **Cash price** (cheapest cash rate per night) or **Points saved** (points per night). The best one is highlighted with **Book with points ↗**, which opens Hilton's room selection with reward rates; hotels with only Premium Room Rewards or no reward rooms are listed under *Certificate not usable*. Its home card shows how many hotels are usable and the best value.
- **Shared points request:** Free Night Finder uses the same points prices as Cash vs. Points, so having both on sends no extra requests. Point value and currency are shown while either of them is on.

## 0.4.1

### Changed

- **5th night free in Cash vs. Points:** stays of 5 nights or more count every 5th night as free on the points side, as Hilton does for Standard Room Rewards (Silver and up). The points line shows it (for example *Points (60,000/night, 1 night free)*, *(1 free)* in the hotel list), and the CSV has a *Free nights* column.

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
