# World Cup Betting System

Browser app for simulating, predicting and comparing `2026 FIFA World Cup` matches in the real tournament shape.

The project is built as a hobby predictor. It is not betting advice and is not intended for commercial gambling use.

## Current Feature Set

- Full `2026 World Cup` setup with `12 groups` from `A` to `L`.
- All `72` group-stage matches with teams, flags, stadium, host city, local kickoff time and viewer timezone kickoff time.
- Dedicated tabs for `Group Phase` and `Bracket Phase`.
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
- Browser persistence through `localStorage` for predictions, accepted results, bracket progression, active tab, live form and prediction history.
- Backend-backed market odds layer with selectable broker slots.
- The Odds API key entry in the UI, kept in the running local backend session instead of being hardcoded.
- Odds API credit counters with a separate `Refresh credits` action.
- STS adapter support for mapped markets, with `No data` shown when a broker has no odds for a match.

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
- Knockout logic: regular-time wins, extra time and penalties.
- Market signal blending when trusted bookmaker odds are available.

Each generated prediction exposes the predicted score, win/draw/loss probabilities, expected goals, model strength, confidence, model inputs, factor breakdown and prediction history.

## Live Data And Backend

The app has a local backend used for market odds, API-key handling and real completed scores.

- `Refresh live data & odds` refreshes public recent-team form, bookmaker market odds and real completed scores.
- `Backend connection` shows whether the local backend is reachable.
- `The Odds API key` can be submitted in the browser. It is stored only in the running backend process.
- `Refresh credits` checks Odds API credit headers without downloading odds for all matches again.
- Runtime market state is written under `server/data/`, which is intentionally ignored by git.

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
- The model is still heuristic and not trained on a large historical World Cup dataset.
- Injury, lineup and rotation inputs are simplified.
- There is no multi-user backend or shared database yet.
- There is no Poules-style scoring game layer yet.

## Next Improvements

1. Add stronger official or premium data feeds for results, injuries, rankings and lineups.
2. Add Poules-style scoring for exact-score picks and bracket points.
3. Add scenario comparison for multiple saved tournament simulations.
4. Improve STS and Polish bookmaker adapters.
5. Move persistence from local browser storage to a shared backend when multiplayer usage becomes useful.
