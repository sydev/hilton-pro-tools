# Ideas

Possible further tools for Hilton Pro Tools, ordered by value and effort. Each builds on data the script already reads: `shopMultiPropAvail` (hotel list with cash and points prices) and `shopPropAvail` (rooms and rate plans per hotel).

## High value, builds on what exists

1. **Free Night Certificate finder** *(done in 0.5.0 as Free Night Finder)*. Aspire cardholders get Free Night Certificates, which are only valid for Standard Room Rewards. Show the hotels of the search where a Standard Room Reward is available, sorted by what the certificate is worth there (points price, or cash price per night). Needs little more than the points prices `loadPoints()` already loads, plus telling Standard apart from Premium Room Rewards.
2. **Split stay / mix optimizer** *(done in 0.6.0 as Split Stay)*. Builds on the 5th night free (0.4.1). For an 8-night stay, "5 nights on points (one free) + 3 nights cash" is often cheapest, sometimes also switching hotels mid-stay. Computes the cheapest mix of points, cash and certificates. Needs prices per night or per partial stay, so more requests.
3. **Flexible dates / price calendar** *(done in 0.7.0 as Flexible Dates)*. Query the same destination for ±1–3 days or shifted stays and show a hotel × arrival day matrix with the cheapest cash or points price. Especially handy for the resort credit search, since Semi-Flex is not offered on every date. Request-heavy: throttle strictly (`CONFIG` caps like the scan).

## Medium value

4. **Rate inspector** *(done in 0.8.0 as Rate Inspector, without Points & Money)*. All rate plans of a hotel side by side: Flex, Semi-Flex, Advance Purchase, Honors discount, AAA/Senior, Points & Money, with cancellation deadline, deposit and markup over the cheapest rate ("flexibility costs +12 % here"). `discoverRooms()` and `extractRates()` already fetch this data; it just isn't shown.
5. **Price watchlist** *(done in 0.9.0 as Price Watch)*. Remember a booked or planned stay (hotel, dates, rate, price) in `localStorage`; on every visit to hilton.com quietly check whether the price dropped and show a badge ("Rebook: −€140"). Makes sense because Semi-Flex and Flex are refundable. No server, so it only runs while hilton.com is open.
6. **Premium room / suite finder** *(done in 0.10.0 as Suite Finder)*. Which suites or upgrades are available on points or cash, and the markup over the standard room, in cash and in point value.

## Nice to have

7. **All-in price.** Include resort fee and taxes so Cash vs. Points compares fairly. Award stays have no resort fee, which often shifts the valuation noticeably.
8. **Resort credit tracker.** A small counter of how much of the semi-annual credit is used. It can't fill itself automatically, so low value.

## Suggested order

Start with **1** (smallest effort, fits the Aspire audience, hardly any extra requests), then **4** (data is already there). **2** and **3** bring the most but also put the most load on Hilton; set request budgets deliberately first.
