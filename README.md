# World Cup Betting System

Browser app for simulating and predicting the `2026 FIFA World Cup` in its real tournament shape.

## Current feature set

- full `2026 World Cup` setup with `12 groups` from `A` to `L`
- all `72` group-stage matches rendered in chronological group order
- dedicated tabs for `Group Phase` and `Bracket Phase`
- national flag graphics shown in groups, match cards and bracket slots
- match cards with:
  - teams
  - stadium
  - host city
  - local kickoff time
  - Polish kickoff time
- automatic group tables updated from accepted results
- automatic ranking of all third-placed teams
- promotion of the best eight third-placed teams
- official `Annex C` routing for the `Round of 32`
- full knockout bracket from the `Round of 32` to the `Final` and `Third-place match`
- per-match actions:
  - `Try to predict`
  - `Accept`
  - `Reset`
  - manual score entry
- per-group actions:
  - `Try to predict Group`
  - `Accept All`
- knockout matches can also be predicted and accepted all the way to the final
- browser persistence through `localStorage` for:
  - generated predictions
  - accepted results
  - knockout progression
  - active tab
  - live team-form snapshots
  - prediction history
- prediction history per match with overwrite tracking and confidence snapshot
- collapsible match insight panels:
  - `Why this prediction?`
  - `Model inputs`
  - `Prediction history`
- `Refresh live data` flow that updates team-form inputs from internet data

## Prediction engine

The current model is still a hobby model, but it already uses several layers instead of a single rating number.

- seeded team strength and rating baseline
- expected-goals style scoring model
- Poisson score distribution for match outcome generation
- team-profile inputs:
  - chance creation
  - finishing
  - defensive shape
  - set pieces
  - tournament experience
- recent-team signals:
  - points per match
  - goals scored per match
  - goals conceded per match
  - clean-sheet rate
  - injury burden
- venue context:
  - neutral-match assumption for most games
  - host-country advantage only when relevant
  - altitude effect for higher Mexican venues
- schedule context:
  - rest days
  - travel distance between host cities
- knockout resolution logic:
  - regular time
  - extra time
  - penalties
- group-state logic:
  - current table position before the match
  - current points before the match
  - motivation boost when a team still needs points
  - rotation risk when a team is already close to secure qualification
  - draw-tolerance effect when a draw may already be useful

## Match explanations

Each generated prediction exposes:

- the predicted score
- win / draw / loss probabilities
- expected goals for both teams
- model strength
- confidence percentage
- factor breakdown showing which model inputs moved the prediction
- input snapshot showing the concrete data used for that run
- prediction history showing regenerated, accepted, manual and reset states

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite address shown in the terminal, usually:

```bash
http://localhost:5173
```

## Tech stack

- `React`
- `TypeScript`
- `Vite`
- browser `localStorage`

## Current limitations

- live data refresh uses lightweight public football data, not a full official or premium data feed
- the model is still heuristic and not trained on a large historical World Cup dataset
- group-state logic is simplified and does not yet model full squad-rotation probability trees
- knockout fatigue and travel are modeled from the current tournament schedule layer, but not from deeper player-level workload data
- there is no multi-user backend or shared database yet
- there is no Poules-style scoring game layer yet

## Next improvements

1. add stronger live and historical data sources for rankings, results and injuries
2. add a Poules-style points system for exact score picks and bracket scoring
3. allow saving and comparing multiple tournament scenarios
4. add richer tactical context such as stronger draw management and likely line-up rotation
5. move persistence from local browser storage to a backend when shared usage becomes useful
