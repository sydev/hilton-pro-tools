# Hilton Pro Tools

Two tools for a normal search on hilton.com, in one small panel:

- **Resort credit finder:** finds **Semi-Flex** rates with a **deposit required** at hotels that are eligible for the **Resort Credit**.
- **Cash vs. points:** compares the cash price of every hotel in the search with its points price, based on your own value per point.

The resort credit finder is built for holders of the Hilton Honors American Express Aspire card. The resort credit only applies at certain resorts and only to charges that are actually posted. Finding a matching rate by hand means opening every resort, every room type and every rate plan. This script does that for you.

## How to use it

1. Install the script and open <https://www.hilton.com>.
2. Search for a destination and dates as usual (for example "Maldives").
3. The **Hilton Pro Tools** panel appears in the top right. As soon as the search results load, the script reads the hotel list and starts the scan automatically (you can turn this off).
4. The panel opens on its home page: one card per tool with a live summary, the top find and the collapsed **Settings** (tool switches, shared settings). Click a card to open the tool; **‹** takes you back.
5. **Resort Finder** shows the scan progress, an estimated time left and the queue of hotels, then each eligible resort with its cheapest matching rate. **View rates ↗** opens the room selection on Hilton for that hotel and your dates.
6. **Cash vs. Points** lists every hotel of the search and shows whether paying with points or cash is cheaper.

## What counts as a match?

A rate is listed only if **all** of these are true:

- The rate plan name or description contains **"Semi-Flex"**
- `depositRequired` is **true**
- `nonRefundable` is **false** (the rate stays refundable)
- It is **not** an Advance Purchase rate

Only hotels on Hilton's official list of [Resort Credit eligible hotels](https://www.hilton.com/en/p/hilton-honors/resort-credit-eligible-hotels/) are checked.

## Panel

The header shows the open page and your stay (for example *Feb 21 → Mar 1, 2027 · 8 nights*). The panel remembers which page was open.

### Home

- **Resort Finder** card: how many hotels are eligible for the Resort Credit, how many were checked or can be retried, *Scanning hotel X of Y* during a scan, and *N matches* once something was found.
- **Cash vs. Points** card: how often points win (for example *Points 4/6*) and the best value per point.
- **Top find:** the cheapest Semi-Flex match of all resorts, with the points comparison.
- **Loading indicator:** a spinner on a card's icon shows that the tool is still loading or scanning.
- **Settings** (collapsed by default, click to open):
  - **Tools:** turn each tool on or off. A tool that is off has no card and sends no requests to Hilton; turning it back on catches up on the current search.
  - **Shared settings:** point value and currency for the points comparisons, shown while Cash vs. Points is on.
  - **Version:** the installed version and **Check for updates**. *Check for updates automatically* (on by default) looks for a new version a few seconds after a page loads, at most every 6 hours.
- **Update available:** when a newer version is published, the home page shows what changed. **Install** opens it in your userscript manager and reloads the Hilton tab when you come back; **Skip this version** hides the notice until the next version.

| Element | Function |
|---|---|
| **Point value** | What one Hilton Honors point is worth to you, in euro cents (default 0.433, saved) |
| **Show in** | Currency for prices and point values (saved) |
| **Download icon** (header) | Exports the results of both tools as `hilton_pro_tools.csv` |
| **‹** (header) | Back to the home page |
| **−** / **+** | Collapses or expands the panel; drag the header to move it |

### Resort Finder

Two tiles show how many hotels are eligible for the Resort Credit and how many have candidates.

| Element | Function |
|---|---|
| **Quick scan** | Retries only hotels that failed or are incomplete and have no hit yet. Shows *Scanning…* while a scan runs |
| **Stop** | Stops the running scan and pauses auto scan (highlighted in red while scanning) |
| **Trash icon** | Clears all results (then run the Hilton search again) |
| **Auto scan after search results** | Switch: scans automatically once results load (setting is saved) |
| **Scan N more** | Checks the remaining room types of a hotel too |

### While scanning

- **Progress:** *Scanning hotel 2 of 4*, a progress bar and the room type currently being checked.
- **Time left:** an estimate such as *≈ 40 s left*, based on how long requests have taken so far. It is usually on the high side, because a quick scan stops at a hotel's first match.
- **Queue:** every hotel in the round with its state: *Checking…*, *Queued*, or the result once done.
- **Minimized:** the header shows the progress (for example *2/4*) with a thin progress bar, or *1 match* once something was found.

### Per hotel

- A status badge: *N candidates*, *No qualifying rate*, *Incomplete*, *Not fully verified* or *Sold out (1740)*
- How many room types were checked, with a progress bar
- The cheapest match in a green box: price, rate name, room type, rate code and cancellation policy
- **N more candidates** and **Diagnostics** (failed queries) to expand
- Below a match: the Semi-Flex price compared with the points price

## Cash vs. points

The **Cash vs. Points** page lists every hotel of the search (**Change** next to the summary opens the shared settings):

- **Cash:** the cheapest cash rate of the stay after tax, as Hilton's search returns it.
- **Points:** the Standard Room Reward points per night times the nights, minus every 5th night (free on Standard Room Rewards for Silver members and up, for example *(1 free)* on a 5-night stay), and what they are worth at your point value.
- **Value per point:** the cash price divided by the points, in euro cents (for example *2.54 ct/pt*). If it is higher than your point value, paying with points is the better deal.
- **Points** / **Cash** chip: whichever is cheaper. Resort credit hotels are marked.
- **View rates ↗** opens the room selection on Hilton for that hotel and your dates.

The list is sorted by value per point, best first. Hotels without reward rooms follow, and hotels Hilton can't book (for example *Hotel no longer a hilton*) come last with Hilton's reason.

Prices are converted with the exchange rates from Hilton's currency converter.

## How it works

- **Read only:** The script observes Hilton's search requests (`/graphql/customer`) to get the hotel list and your search settings (dates, guests, rooms, currency). Hilton's responses are never modified.
- **Room types:** For each eligible resort it requests the room types, sorted by price, cheapest first.
- **Quick mode:** A hotel's scan stops at the first match. A full scan of every room type runs only when you click **Scan N more room types**.
- **Gentle on the site:** About 0.85 s between requests, at most 40 eligible hotels per search and 25 room types per hotel.
- **Points prices:** Hilton's search only returns points prices when you switch on "Use Points". The script requests them itself, once per page of search results.
- **Hotel names and exchange rates** come from Hilton's own map request and currency converter. The exchange rates are cached for 12 hours.
- **New destination:** If you change the destination or dates, results are discarded and the page reloads once so the new search is captured cleanly.

## Privacy

- `@grant none`, runs on `www.hilton.com` only.
- **No external servers.** All requests go to hilton.com only, using your existing browser session.
- In `localStorage` the script stores only the official resort list (cached for 30 days), the exchange rates (cached for 12 hours) and your settings (auto scan, point value, currency).
- In the CSV export, cells that start with `=`, `+`, `-` or `@` get a leading `'`, so Excel and other spreadsheet apps don't run them as formulas.

## Notes and limitations

- **No guarantee:** A rate with a deposit does not guarantee that you're charged immediately or that the Aspire resort credit is applied. Always check the cancellation and payment terms on Hilton's booking page.
- **Cash vs. points is an estimate:** the cash side is the cheapest rate Hilton shows, which may be a non-refundable Advance Purchase rate. The points side assumes the same points price every night and always counts the 5th night free, which needs Silver status or higher.
- Rate names are queried in English. The script only finds rates whose name or description contains "Semi-Flex".
- **Many requests:** A scan can send several hundred requests to Hilton with your logged-in session. Hilton may answer with captchas or rate limits (*HTTP 429* under **Diagnostics**). Turn off auto scan if you only want to scan on demand.
- Hilton can change its website or API at any time. If that happens, the script may stop working until it's updated.
- This is an unofficial script, not affiliated with Hilton or American Express.

## Feedback

Found a bug or have an idea? Feel free to post in the feedback section. Please include the destination, dates, and the text under **Diagnostics** if possible.
