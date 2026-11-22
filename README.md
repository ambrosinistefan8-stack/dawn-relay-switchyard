# Dawn Relay: Switchyard

Switchyard is a local browser game for a shared event screen. Restore three four-by-four city circuits in a 75-second run. Each circuit redirects the pulse to a different pair of neighbouring towers. Visitors can play solo, pass the controls between two players or try untimed practice with a solver hint.

## Run at a booth

With Node.js installed, run `npm run serve` from this folder and open `http://127.0.0.1:5836/`. Set `SWITCHYARD_PORT` to use a different loopback port. No package installation or account is needed. The five application files `index.html`, `styles.css`, `game.mjs`, `relay.mjs` and `grid.mjs` can also be served from an ordinary static web host.

Tap a tower to pulse it. Keyboard players use Tab to reach the controls, the arrow keys to move along the grid and Enter or Space to pulse. The game labels lit and dark towers in text, previews the affected cells and announces changes. In two-player mode, the handoff screen asks players to swap controls and the clock keeps running. In practice, each hint points to a move on the shortest route. The Circuit recap shows how many pulses each district used, its exact par and which districts remain unfinished. Scores stay on the current device. The game collects no names and makes no requests to another service.

## Changes from Dawn Relay for Reddit

The original daily Reddit game couples a single circuit with a community vote that sets tomorrow's wiring. Switchyard keeps the original directional pulse, solver and coordinate conventions from Stefan Ambrosini's engine. The booth build adds a real-time three-circuit sequence, changing wiring, cooperative handoffs, untimed practice, a score based on time and accuracy, sixteen replay layouts per circuit, and a separate standalone interface. It uses an original CSS skyline. The previous Reddit installation, post, SDK, account data and voting service are separate from this build. [Original Dawn Relay entry](https://devpost.com/software/dawn-relay)

This edition follows the BSD-3-Clause licence identified in the original package metadata. The standalone game uses original graphics and contains no Riot Games or Cloud9 assets.

## Check the game

`npm test` checks all 48 generated layouts, a full relay, expiry at the time limit and untimed practice. With the local server running, use `node test/browser.mjs` for the desktop and mobile-width browser checks. Set `SWITCHYARD_PLAYWRIGHT` to an installed Playwright package path and optionally set `SWITCHYARD_BROWSER` to the browser executable. Browser captures are saved under `test-artifacts/`.

## JetBrains development

The Circuit recap in `game.mjs` and its layout in `styles.css` were implemented and saved in IntelliJ IDEA 2026.3, build 263.7307.200. The feature was then checked in a complete run and a timed-out two-player run. The locally tested implementation keeps unfinished rows and their par values visible for the next player. Codex assisted with implementation and testing.

## Cloud9 Category 3 materials

**Project name:** Dawn Relay: Switchyard

**Elevator pitch:** Restore three circuits against the clock in a short booth game that visitors can play solo or share by passing the controls.

**Project story:** A booth visitor can play a complete run in 75 seconds. Each cleared district changes the wiring and gives the player a new decision. Two players can trade roles between circuits. The practice mode lets visitors try the controls and assess the puzzle at their own pace. I adapted the directional pulse system from my own Dawn Relay entry and built a standalone relay format with a new interface, timed progression and local scoring for this event.

The Cloud9 application calls for a concrete JetBrains development record, a judge-accessible source repository and browser demo, and a publicly visible YouTube demonstration under three minutes. Keep the links accessible through judging. The official submission deadline is 12 January 2027 at 20:00 in Zürich. [Official rules](https://cloud9.devpost.com/rules) · [Official dates](https://cloud9.devpost.com/details/dates)
