# World Cup Betting System

Przegladarkowy MVP do symulowania fazy grupowej mistrzostw swiata w pilce noznej.

## Co potrafi teraz

- pokazuje mecze fazy grupowej w ukladzie grup `A-H`
- ma przycisk `Try to predict`, ktory tworzy prosta predykcje wyniku
- ma przycisk `Accept`, ktory zatwierdza wynik do tabeli
- automatycznie liczy punkty, bilans bramek i kolejnosc w grupach
- automatycznie ustawia druzyny w drabince `Round of 16`

## Jak uruchomic

```bash
npm install
npm run dev
```

## Obecne zalozenia

- dane druzyn sa demonstracyjne
- model predykcyjny jest prosty i bazuje na recznie wpisanym ratingu sily zespolu
- celem tej wersji jest sprawdzenie przeplywu produktu, a nie dokladnosci typowania

## Rozsadny kierunek rozwoju

1. podpiac prawdziwy terminarz i sklady grup
2. pobierac aktualne statystyki druzyn z API
3. dodac mozliwosc recznej edycji lub odrzucenia predykcji
4. rozszerzyc drabinke o cwiercfinaly, polfinaly i final
5. dodac historie symulacji i porownywanie wielu scenariuszy
