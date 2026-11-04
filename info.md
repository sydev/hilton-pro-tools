# Hilton Pro Tools

Eight tools for a normal search on hilton.com, in one small panel:

- **Resort credit finder:** finds **Semi-Flex** rates with a **deposit required** at hotels that are eligible for the **Resort Credit**.
- **Cash vs. points:** compares the cash price of every hotel in the search with its points price, based on your own value per point.
- **Free night finder:** shows where a **Free Night Certificate** can be used (a **Standard Room Reward** is available for your dates) and where it is worth the most.
- **Split stay:** finds the cheapest mix of **cash nights, points nights and Free Night Certificates** for your stay, also with one hotel change.
- **Flexible dates:** compares the same stay with the arrival **a few days earlier or later**, as a hotel × arrival day calendar in cash or points.
- **Rate inspector:** shows **every rate plan** of a hotel side by side, with deposit, cancellation and the markup over the cheapest rate.
- **Suite finder:** shows which **suites and upgrades** each hotel has, with what they cost over its cheapest room in cash and in points.
- **Price watch:** remembers a booked or planned stay and checks its rate again whenever you open hilton.com, so you see when **rebooking** would save money.

The resort credit finder is built for holders of the Hilton Honors American Express Aspire card. The resort credit only applies at certain resorts and only to charges that are actually posted. Finding a matching rate by hand means opening every resort, every room type and every rate plan. This script does that for you.

## How to use it

1. Install the script and open <https://www.hilton.com>.
2. Search for a destination and dates as usual (for example "Maldives").
3. The **Hilton Pro Tools** panel appears in the top right. As soon as the search results load, the script reads the hotel list and starts the scan automatically (you can turn this off).
4. The panel opens on its home page: one card per tool with a live summary, the top find and the collapsed **Settings** (tool switches, shared settings). Click a card to open the tool; **‹** takes you back.
5. **Resort Finder** shows the scan progress, an estimated time left and the queue of hotels, then each eligible resort with its cheapest matching rate. **View rates ↗** opens the room selection on Hilton for that hotel and your dates.
6. **Cash vs. Points** lists every hotel of the search and shows whether paying with points or cash is cheaper.
7. **Free Night Finder** ranks the hotels where a Free Night Certificate can be used by what one night is worth.
8. **Split Stay** prices every night of the stay on demand and shows the cheapest mix of cash, points and certificates.
9. **Flexible Dates** prices the stay on nearby arrival days on demand and shows which day is cheapest at each hotel.
10. **Rate Inspector** shows every rate plan of one hotel and room type, with what flexibility costs there.
11. **Suite Finder** loads the room types of the hotels on demand and shows their suites with the markup in cash and points.
12. **Price Watch** keeps the rates you clicked **Watch price** on and checks them again on later visits.
13. **Credit Tracker** counts the resort credit you used this half year from the charges you add.

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
- **Free Night Finder** card: how many hotels are usable for a certificate (for example *5 usable*) and the best value (for example *Best: ≈ €2,576 a night at …*).
- **Split Stay** card: before loading, how many requests it would send; afterwards the cheapest stay (for example *Best: ≈ €1,067 · 6 cash · 2 points*) and what it saves (for example *−€313*).
- **Flexible Dates** card: before loading, how many requests it would send; afterwards the cheapest arrival (for example *Best: arrive Feb 19 · ≈ €90 a night at …*) and what it saves against your dates (for example *−€180*).
- **Rate Inspector** card: the inspected hotel and what a refundable rate costs over the cheapest (for example *Conrad …: refundable +12 % over cheapest*), with the number of rates.
- **Suite Finder** card: before loading, how many requests it would send; afterwards how many suites were found (for example *4 suites*) and the best one: a suite at no extra points, else the cheapest upgrade (for example *Best: Water Villa +50 % · …*).
- **Price Watch** card: how many stays are watched and when they were last checked, or the stay to rebook and its new price with what it saves (for example *−$3,250*).
- **Credit Tracker** card: what is left of the resort credit this half year (for example *$114.50 left*) and how much was used; in the last 45 days of a half year it counts down the days (*expires in 27 days*).
- **Top find:** the cheapest Semi-Flex match of all resorts, with the points comparison.
- **Loading indicator:** a spinner on a card's icon shows that the tool is still loading or scanning.
- **Settings** (collapsed by default, click to open):
  - **Tools:** turn each tool on or off. A tool that is off has no card and sends no requests to Hilton; turning it back on catches up on the current search.
  - **Shared settings:** point value and currency for the points comparisons, shown while Cash vs. Points, Free Night Finder, Split Stay, Flexible Dates or Suite Finder is on. Cash vs. Points and Free Night Finder share the same points request.
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
| **Inspect rates** | Opens the Rate Inspector on that hotel (also in Cash vs. Points) |

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

## Free night finder

A Free Night Certificate (for example from the Aspire card) covers one night of a **Standard Room Reward**. The **Free Night Finder** page shows where that is possible for your dates:

- Two tiles: how many hotels have a Standard Room Reward (for example *5 of 8*) and the best value per certificate.
- **Value by:** rank by **Cash price** (the cheapest cash rate per night, what the certificate saves you if you'd otherwise pay cash) or **Points saved** (the points per night). The choice is saved.
- The best hotel in a violet box with the value, the other side (points or cash) and **Book with points ↗**, which opens Hilton's room selection for your dates with reward rates. The other hotels follow with **Book ↗**.
- **Certificate not usable:** hotels with only Premium Room Rewards (*Premium only*) or without reward rooms (*No reward rooms*). Hotels Hilton can't book are left out.
- If no hotel has a Standard Room Reward, the page says so; try other dates.

The finder uses Hilton's lowest points price for the whole stay. A single certificate night can still differ, so check it on Hilton before booking.

## Split stay

On longer stays, mixing is often cheapest: cash on cheap weeknights, points on expensive weekend nights, a Free Night Certificate on the priciest Standard Room Reward night, or a move to another hotel for the last nights. The **Split Stay** page works this out:

- **Certificates:** how many Free Night Certificates to use (0–5, saved). Changing it recalculates right away.
- **Load nightly prices:** asks Hilton for the cash and points price of every single night of the stay, for all hotels of the search: two requests per night and results page (the page shows the number and the time it takes, for example *16 requests, about 1 min*). Nothing is sent before you click it. It works for stays of 2 to 14 nights.
- **Two tiles:** the cheapest stay and what it saves against the cheapest stay paid all cash or all points.
- **Change hotels once:** if staying at one hotel first and another one afterwards saves at least 10 % over the best single hotel, that plan comes first.
- **Best hotel:** the cheapest plan at one hotel, split into legs (*Cash*, *Points*, *Certificate*) with dates, nights, cost and **Book ↗** for exactly those dates (points and certificate legs open the reward rates).
- **Other hotels:** their cheapest plan; click one to see its legs.

How it counts:

- Cash is the cheapest one-night rate after tax; points are the lowest reward price of that night, valued at your point value.
- In each reward booking, the cheapest of every 5 Standard Room Reward nights is free (Silver and up). Premium Room Reward nights get no free night.
- A certificate covers one Standard Room Reward night and is booked on its own.
- Every leg is a separate reservation. One-night prices can differ from a longer stay's rates, so check each leg on Hilton before booking.

## Flexible dates

Hotels often cost noticeably less, or open up reward rooms, when you arrive a day or two earlier or later. The **Flexible Dates** page compares that:

- **Arrival:** how far to move the arrival each way, **±1**, **±2** or **±3 days** (saved). The stay keeps its length; days in the past are left out.
- **Load other dates:** asks Hilton for the cash and points price of the stay on each other arrival day, for all hotels of the search: two requests per arrival day and results page (the page shows the number and the time it takes, for example *8 requests, about 1 min*). Your own dates come from the search itself. Nothing is sent before you click it.
- **Show:** **Cash / night** (the cheapest cash rate of the stay after tax, divided by the nights) or **Points / night** (the lowest reward price per night). Switching sends no requests; the choice is saved.
- **Two tiles:** the cheapest arrival day and what it saves against the cheapest stay on your dates (for the whole stay; on points every 5th night counts as free, as in Cash vs. Points).
- **Best hotel:** its dates, price per night, **Book ↗** for those dates and **Search these dates**, which runs the same Hilton search on the new dates. Resort Finder then scans them, since Semi-Flex rates for the Resort Credit are not offered on every date.
- **Calendar:** one row per hotel, cheapest first, with a cell per arrival day: the cheapest day is highlighted (green for cash, blue for points), your dates are outlined, *–* means sold out or no reward rooms. Click a price to open Hilton's rates for that hotel and those dates. Resort credit hotels are marked.
- Hotels without a price on any of the days are listed at the end.

## Rate inspector

Hilton's room selection shows many rate plans per room, but not how they compare. The **Rate Inspector** puts them side by side:

- **Hotel** and **Room:** any hotel of the search and its room types, cheapest first. **Inspect rates** in Resort Finder or Cash vs. Points opens the inspector on that hotel right away.
- **Inspect rates:** one request for the room types and one for the rates of the room type (the page says how many before you click). Room types and rates Resort Finder already scanned are shown without a request. Changing the room loads its rates; **Reload rates** asks again.
- **AAA and Senior rates too:** also asks for AAA and Senior rates, one request each (saved). They need a membership or ID at check-in.
- **Two tiles:** the cheapest rate, and what the cheapest refundable rate costs on top (for example *+12 %*: what flexibility costs here).
- **Every rate**, cheapest first: name, Hilton's total price, its kind (*Flex*, *Semi-Flex*, *Advance Purchase*, *Honors discount*, *AAA*, *Senior*), *Refundable* or *Non-refundable*, *Deposit*, the markup over the cheapest nightly rate, the cancellation policy and the rate code. Rates that meet the Resort Finder rule at a Resort Credit hotel are marked *Resort Credit*.
- **View rates on Hilton ↗** opens the room selection for the hotel and your dates.

Points & Money rates are not included.

## Suite finder

Which hotels have suites or better rooms for your dates, and what does the upgrade cost? The **Suite Finder** page answers that for the hotels of the search:

- **Hotels:** the first 10 hotels of the search, or any single hotel.
- **Find suites:** one request for a hotel's room types and one for their points prices (the page says how many before you click, for example *10 requests, about 1 min*). Room types Resort Finder or the Rate Inspector already loaded need no request, and hotels the search shows without reward rooms are not asked for points. **Reload rooms** asks again.
- **Suites** / **All upgrades:** **Suites** shows suites and villas, by the room name) or **All upgrades** (every room type that costs more than the cheapest one, for example club or ocean view rooms). Switching sends no requests; the choice is saved.
- **Two tiles:** the cheapest suite over its hotel's cheapest room (for example *+50 %*), and a suite at no extra points if there is one, else how many suites were found.
- **Each hotel**, cheapest upgrade first: its cheapest room with the price in cash and points per night, then each suite with
  - the cash markup per night (for example *≈ +€460*) and in percent,
  - the points markup per night and what those points are worth at your point value (for example *+60,000 pts (≈ €260)*), or *No extra points* / *Not on points*,
  - **ct/pt:** what each extra point is worth when you pay the upgrade in points instead of cash; blue when it beats your point value,
  - *Certificate* when the suite is a Standard Room Reward, so a Free Night Certificate covers it,
  - **Rates**, which opens the Rate Inspector on that room type.
- **View rooms ↗** and **Rooms on points ↗** open Hilton's room selection for that hotel and your dates. Hotels without suites, sold out or failed are listed at the end.

Cash prices are the cheapest nightly rate of each room type as Hilton's room selection lists it; points are its lowest reward per night.

## Price watch

Semi-Flex and Flex rates can be cancelled, so when the price of a booked stay drops you can book again at the lower price and cancel the old booking. **Price Watch** notices that for you:

- **Watch price** next to every rate in the Rate Inspector adds that hotel, room type, rate plan, dates, guests and currency to the watchlist, at its current total. Up to 10 stays; *Watching* marks rates already on the list.
- **Automatic check:** a few seconds after any hilton.com page loads, every upcoming watched stay that was last checked more than 6 hours ago (30 minutes after a failed check) is priced again: one request for its room types, one for the rates of its room type. There is no server, so this only happens while you browse hilton.com.
- **Check now** checks every upcoming stay right away (the page says how many requests that sends).
- **Each stay** shows the latest total, the dates, room and rate, when it was last checked and a chip: *Rebook: −$3,250* when the total dropped by at least 1 % below what you paid, otherwise the difference or *Same price*; *Sold out*, *Rate not offered* or *Check failed* when there is no price. Past stays are kept, marked *Past stay* and no longer checked.
- **Paid:** what you paid for the stay, in the currency you searched in. It starts at the price when you clicked **Watch price**; enter your booked total if it differs.
- **Book ↗** opens Hilton's room selection for that hotel and those dates; **Remove** takes the stay off the list.
- **Rebook badge:** the biggest saving also shows on the Price Watch card and, when minimized, next to the panel title (*Rebook: −$3,250*).

## Credit tracker

The Aspire card's resort credit is $200 per half year (January – June and July – December) for charges at Resort Credit hotels. Hilton doesn't show how much of it you used, so **Credit Tracker** keeps count from what you enter:

- **Add charge:** the hotel (optional; the Resort Credit hotels of your current search are suggested), the date and the amount in USD as on your card statement. The date decides which half year the charge counts for.
- **This half year:** what is left and until when, what was used out of the credit, a bar and every charge with **Remove**.
- **Other half years:** what was used in each earlier (or later) half year with charges.
- **Credit per half year:** $200 by default; change it if your card terms differ.
- The tool sends no requests. Turning it off only hides its card; the charges stay saved.

## How it works

- **Read only:** The script observes Hilton's search requests (`/graphql/customer`) to get the hotel list and your search settings (dates, guests, rooms, currency). Hilton's responses are never modified.
- **Room types:** For each eligible resort it requests the room types, sorted by price, cheapest first.
- **Quick mode:** A hotel's scan stops at the first match. A full scan of every room type runs only when you click **Scan N more room types**.
- **Gentle on the site:** About 0.85 s between requests, at most 40 eligible hotels per search and 25 room types per hotel.
- **Points prices:** Hilton's search only returns points prices when you switch on "Use Points". The script requests them itself, once per page of search results, while Cash vs. Points or Free Night Finder is on. The rate plan name tells a Standard from a Premium Room Reward.
- **Nightly prices:** Split Stay asks for cash and points prices one night at a time, only when you click **Load nightly prices**, with the same pause between requests as the scan.
- **Other dates:** Flexible Dates asks for cash and points prices of the moved stays only when you click **Load other dates**, with the same pause between requests.
- **Rate plans:** the Rate Inspector asks for one hotel at a time, only when you click **Inspect rates** or change the room, and reuses what Resort Finder already loaded.
- **Suites:** Suite Finder sends at most two requests per hotel, only when you click **Find suites**, with the same pause between requests.
- **Watched stays:** Price Watch sends two requests per watched upcoming stay, at most every 6 hours per stay, with the same pause between requests.
- **Hotel names and exchange rates** come from Hilton's own map request and currency converter. The exchange rates are cached for 12 hours.
- **New destination:** If you change the destination or dates, results are discarded and the page reloads once so the new search is captured cleanly.

## Privacy

- `@grant none`, runs on `www.hilton.com` only.
- **No external servers.** All requests go to hilton.com only, using your existing browser session.
- In `localStorage` the script stores only the official resort list (cached for 30 days), the exchange rates (cached for 12 hours) and your settings (auto scan, point value, currency, tool switches, Free Night Finder ranking, Split Stay certificates, Flexible Dates range and view, Rate Inspector's AAA and Senior choice, Suite Finder's view), the Price Watch list (hotel, room, rate, dates, guests, paid and latest price) and the Credit Tracker charges (hotel, date, amount) with the credit per half year.
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
