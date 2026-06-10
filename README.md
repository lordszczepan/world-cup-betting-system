# World Cup Betting System

Browser app for simulating, predicting and comparing `2026 FIFA World Cup` matches in the real tournament shape.

The project is built as a hobby predictor. It is not betting advice and is not intended for commercial gambling use.

## Current Feature Set

- Full `2026 World Cup` setup with `12 groups` from `A` to `L`.
- All `72` group-stage matches with teams, flags, stadium, host city, local kickoff time and viewer timezone kickoff time.
- Dedicated tabs for `Group Phase`, `Bracket Phase` and `Teams`.
- Group tables updated from accepted predictions.
- Side-by-side predicted, accepted and real-score views in match cards.
- Side-by-side predicted and real group-table columns.
- Real completed results support through the backend refresh flow when score data is available.
- Best third-place ranking for the `8` promoted third-placed teams.
- Official `Annex C` routing support for Round of 32 third-place assignments.
- Full knockout bracket from `Round of 32` through `Round of 16`, quarter-finals, semi-finals, third-place match and final.
- Knockout unlock diagnostics that explain why a match cannot be predicted yet.
- Per-match actions: `Try to predict`, `Accept`, `Reset` and manual score entry.
- Per-group actions: `Try to predict Group` and `Accept All`.
- Per-knockout-round actions: `Try to predict all` and `Accept all`, plus accepted-match counters for each stage.
- Browser persistence through `localStorage` for predictions, accepted results, bracket progression, active tab, live form and prediction history.
- Backend-backed market odds layer with selectable broker slots.
- Per-match bookmaker strip with `Broker 1`, `Broker 2` and `Broker 3`, source switching, `Load missing` and `Reload` controls.
- The Odds API key entry in the UI, kept in the running local backend session instead of being hardcoded.
- Odds API credit counters with a separate `Refresh credits` action.
- STS adapter support for mapped markets, with `No data` shown when a broker has no odds for a match.
- Team directory view with flag-first navigation, sorting by group, alphabetical order or team rating, and per-team refresh support.
- Team roster cards with players, staff, tournament stats, national-team stats, availability badges and provider freshness hints.

## Prediction Engine

The model is heuristic, but it combines multiple inputs instead of relying on one rating value.

- Seeded team strength and rating baseline.
- Expected-goals style score projection.
- Poisson score distribution for outcome generation.
- Team-profile inputs: chance creation, finishing, defensive shape, set pieces and tournament experience.
- Recent-team signals: points per match, goals scored, goals conceded, clean-sheet rate and injury burden.
- Venue context: neutral-match assumption, host-country advantage where relevant and altitude effect for higher Mexican venues.
- Schedule context: rest days and travel distance between host cities.
- Group-state logic: current points, current group position, motivation boost, rotation risk and draw-tolerance effects.
- Squad context: roster depth, goalkeeper quality, likely penalty-taker strength, discipline risk and key absences from the loaded team directory.
- Continuity context: coach continuity, tactical stability and core-squad continuity.
- Matchup context: same-confederation familiarity, similar-tier opponent handling and seeded rivalry-style pair adjustments.
- Knockout logic: regular-time wins, extra time and penalties, now strengthened by bench depth, goalkeeper layer, penalty-unit quality and stability inputs.
- Market signal blending when trusted bookmaker odds are available.

Each generated prediction exposes the predicted score, win/draw/loss probabilities, expected goals, model strength, confidence, model inputs, factor breakdown and prediction history.

## Live Data And Backend

The app has a local backend used for live team data, market odds, API-key handling and real completed scores.

- `Refresh Live Data` refreshes team-form and roster providers without spending Odds API credits.
- `Refresh Bets` refreshes bookmaker market odds and real completed scores through the market backend.
- `Backend connection` shows whether the local backend is reachable.
- `The Odds API key` can be submitted in the browser. It is stored only in the running backend process.
- `API-Football` and `football-data.org` keys can also be submitted in the browser for richer roster coverage.
- `Refresh credits` checks Odds API credit headers without downloading odds for all matches again.
- Team and market caches are restored after reload, so already-saved predictions and downloaded odds do not need to be fetched again every time.
- Runtime market state is written under `server/data/`, which is intentionally ignored by git.
- Runtime live team state is also stored under `server/data/`.

Real results stay empty until a provider returns completed World Cup fixtures matching the current schedule.

## Run Locally

Install dependencies:

```bash
npm install
```

Run frontend and backend together:

```bash
npm run dev:all
```

Then open the local Vite address shown in the terminal, usually:

```bash
http://localhost:5173
```

You can also run them separately:

```bash
npm run server
npm run dev
```

## Environment

Create a local `.env` file if you want to start the backend with an API key already loaded:

```bash
THE_ODDS_API_KEY=your_the_odds_api_key_here
API_FOOTBALL_KEY=your_api_football_key_here
FOOTBALL_DATA_API_KEY=your_football_data_key_here
BACKEND_PORT=8787
```

Do not commit real API keys. Use `.env.example` as the shared template.

## Tech Stack

- `React`
- `TypeScript`
- `Vite`
- `Express`
- browser `localStorage`
- local backend JSON state

## Current Limitations

- Real odds and scores depend on external provider availability, matching quality and API limits.
- STS support is currently adapter-based and only works reliably for mapped markets.
- Some team roster providers still return partial squads or partial player metadata for specific national teams.
- The model is still heuristic and not trained on a large historical World Cup dataset.
- Head-to-head, coaching and absence effects are now modeled, but still partly heuristic when providers do not return full historical context.
- There is no multi-user backend or shared database yet.
- There is no Poules-style scoring game layer yet.

## Next Improvements

1. Add stronger official or premium data feeds for results, injuries, rankings and lineups.
2. Add Poules-style scoring for exact-score picks and bracket points.
3. Add scenario comparison for multiple saved tournament simulations.
4. Improve STS and Polish bookmaker adapters.
5. Move persistence from local browser storage to a shared backend when multiplayer usage becomes useful.
