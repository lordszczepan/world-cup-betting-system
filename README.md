# World Cup Betting System

Browser MVP for simulating the 2026 FIFA World Cup format.

## What it does now

- models the 2026 structure with 12 groups from `A` to `L`
- shows all 72 group-stage matches
- generates a baseline prediction with `Try to predict`
- accepts the prediction into standings with `Accept`
- calculates group tables automatically
- ranks all third-placed teams and promotes the best eight
- builds a `Round of 32` bracket scaffold plus later knockout rounds

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
- knockout routing for third-placed teams uses a provisional assignment layer
- the UI is ready for a later Poules-style prediction flow with exact-score picks and pool scoring

## Good next steps

1. replace the current baseline inputs with real team form and historical match data
2. add exact-score entry and points logic inspired by bracket pool products
3. implement the full official FIFA Annex C third-place routing matrix
4. store simulations so one user can compare multiple tournament scenarios
5. add knockout match prediction once group qualification is locked
