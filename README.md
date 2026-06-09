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

- the prediction engine is still a simple strength-rating baseline
- knockout routing for third-placed teams uses a provisional assignment layer
- the UI is ready for a later Poules-style prediction flow with exact-score picks and pool scoring

## Good next steps

1. replace the baseline model with a data-driven predictor
2. add exact-score entry and points logic inspired by bracket pool products
3. implement the full official FIFA Annex C third-place routing matrix
4. store simulations so one user can compare multiple tournament scenarios
5. add knockout match prediction once group qualification is locked
