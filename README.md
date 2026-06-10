# World Cup Betting System

Browser MVP for simulating the 2026 FIFA World Cup format.

## What it does now

- models the 2026 structure with 12 groups from `A` to `L`
- shows all 72 group-stage matches
- generates a baseline prediction with `Try to predict`
- accepts the prediction into standings with `Accept`
- saves predictions and accepted results in browser storage
- calculates group tables automatically
- ranks all third-placed teams and promotes the best eight
- lets you predict the knockout bracket from the `Round of 32` to the final
- routes the eight best third-placed teams through the official FIFA `Annex C` matrix

## Run locally

```bash
npm install
npm run dev
```

## Current assumptions

- the prediction engine now uses a lightweight expected-goals and Poisson baseline
- most matches are treated as neutral-venue matches
- host advantage is applied only when a host nation plays in its own country
- high-altitude Mexican venues slightly affect the model
- team-profile inputs such as chance creation, finishing, defensive shape and tournament experience are included
- recent-team signals such as form, scoring trend, defensive trend and injury burden are included
- group-stage predictions also account for rest days and travel between host cities
- state is persisted locally in the browser through `localStorage`
- knockout routing for third-placed teams now follows the official FIFA `Annex C` combinations
- the UI is ready for a later Poules-style prediction flow with exact-score picks and pool scoring

## Good next steps

1. replace the current seeded team-form inputs with live team form and historical match data
2. add exact-score entry and points logic inspired by bracket pool products
3. store simulations so one user can compare multiple tournament scenarios
4. add venue and recovery scheduling for knockout rounds once the bracket calendar is fixed
5. connect an automated refresh script for official ranking snapshots and recent results
