# Hilton Pro Tools

A userscript that adds a small panel to search results on [hilton.com](https://www.hilton.com) with five tools:

- **Resort Finder:** finds **Semi-Flex** rates with a **deposit required** at hotels on Hilton's official [Resort Credit list](https://www.hilton.com/en/p/hilton-honors/resort-credit-eligible-hotels/), built for holders of the Hilton Honors American Express Aspire card.
- **Cash vs. Points:** compares the cash price of every hotel in the search with its points price, based on your own value per point.
- **Free Night Finder:** shows where a Free Night Certificate can be used (Standard Room Reward available) and where it is worth the most.
- **Split Stay:** finds the cheapest mix of cash nights, points nights and Free Night Certificates for your stay, also with one hotel change.
- **Flexible Dates:** compares the same stay with the arrival up to 3 days earlier or later, as a hotel × arrival day calendar in cash or points.

Each tool can be turned off under **Settings** on the panel's home page; a tool that is off sends no requests. All tool requests go to hilton.com with your own session. The only other request is the update check, which reads the script header and `changelog.md` from this repository on GitHub without cookies; it can be turned off under **Settings**.

See [info.md](info.md) for the full description and [changelog.md](changelog.md) for what changed in each version.

## Installation

### 1. Install Tampermonkey

Tampermonkey is a browser extension that runs userscripts. Install it from your browser's extension store:

| Browser | Link |
| --- | --- |
| Chrome, Brave, Opera | [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Microsoft Edge | [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/) |
| Safari and others | [tampermonkey.net](https://www.tampermonkey.net/) |

**Chrome and other Chromium browsers** only run userscripts once you allow it:

- Open `chrome://extensions`, click **Details** on Tampermonkey and turn on **Allow User Scripts**.
- If your browser has no such switch, turn on **Developer mode** in the top right of `chrome://extensions` instead.

Then pin Tampermonkey to the toolbar (puzzle icon → pin) so you can see when it is active.

[Violentmonkey](https://violentmonkey.github.io/) works as well; the steps are the same.

### 2. Install the script

1. Open the install link: **[hilton-pro-tools.user.js](https://raw.githubusercontent.com/sydev/hilton-pro-tools/main/hilton-pro-tools.user.js)**
2. Tampermonkey opens its install page with the script's name, version and the sites it runs on (`https://www.hilton.com/*`). Click **Install**.
3. If you see the raw code instead, Tampermonkey is not active yet: check step 1, then open the link again.

### 3. Use it

1. Open <https://www.hilton.com> (reload any tab that was already open).
2. Search for a destination and dates as usual, for example "Maldives".
3. The **Hilton Pro Tools** panel appears in the top right. Once the results load, the Resort Finder starts scanning automatically, Cash vs. Points loads the points prices and Free Night Finder ranks the hotels for your certificates. Split Stay loads nightly prices when you click **Load nightly prices**, Flexible Dates loads other arrival days when you click **Load other dates**.

### Updates

The panel looks for a new version a few seconds after a hilton.com page loads (at most every 6 hours) and shows **Update available** with what changed; **Install** opens the new version in Tampermonkey, and the Hilton tab reloads when you come back to it. You can also click **Check for updates** under **Settings**.

Tampermonkey also updates the script on its own (by default once a day), or right away via the Tampermonkey icon → **Check for userscript updates**.

### Uninstall

Tampermonkey icon → **Dashboard**, then the trash icon next to **Hilton Pro Tools**.

## Development

The script is plain JavaScript in one file, `hilton-pro-tools.user.js`; there is no build step. `hilton-pro-tools.meta.js` is a copy of its header that Tampermonkey fetches for update checks, so keep both in sync, especially `@version`.

A Playwright harness runs the script against mocked hilton.com responses and saves screenshots of the panel to `test/shots/`:

```sh
pnpm install && pnpm exec playwright install chromium
pnpm test
```

## License

MIT
