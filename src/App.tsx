import { useState } from 'react'
import './App.css'

type Team = {
  id: string
  name: string
  group: string
  rating: number
}

type Prediction = {
  homeGoals: number
  awayGoals: number
  confidence: number
  summary: string
}

type Match = {
  id: string
  group: string
  round: number
  kickoff: string
  homeTeam: Team
  awayTeam: Team
  prediction?: Prediction
  acceptedPrediction?: Prediction
}

type Standing = {
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

const groups: Record<string, Team[]> = {
  A: [
    { id: 'ned', name: 'Netherlands', group: 'A', rating: 89 },
    { id: 'sen', name: 'Senegal', group: 'A', rating: 81 },
    { id: 'ecu', name: 'Ecuador', group: 'A', rating: 75 },
    { id: 'qat', name: 'Qatar', group: 'A', rating: 67 },
  ],
  B: [
    { id: 'eng', name: 'England', group: 'B', rating: 90 },
    { id: 'usa', name: 'USA', group: 'B', rating: 78 },
    { id: 'wal', name: 'Wales', group: 'B', rating: 74 },
    { id: 'irn', name: 'Iran', group: 'B', rating: 72 },
  ],
  C: [
    { id: 'arg', name: 'Argentina', group: 'C', rating: 94 },
    { id: 'pol', name: 'Poland', group: 'C', rating: 76 },
    { id: 'mex', name: 'Mexico', group: 'C', rating: 80 },
    { id: 'ksa', name: 'Saudi Arabia', group: 'C', rating: 68 },
  ],
  D: [
    { id: 'fra', name: 'France', group: 'D', rating: 92 },
    { id: 'den', name: 'Denmark', group: 'D', rating: 82 },
    { id: 'tun', name: 'Tunisia', group: 'D', rating: 71 },
    { id: 'aus', name: 'Australia', group: 'D', rating: 70 },
  ],
  E: [
    { id: 'esp', name: 'Spain', group: 'E', rating: 89 },
    { id: 'ger', name: 'Germany', group: 'E', rating: 88 },
    { id: 'jpn', name: 'Japan', group: 'E', rating: 77 },
    { id: 'crc', name: 'Costa Rica', group: 'E', rating: 69 },
  ],
  F: [
    { id: 'bel', name: 'Belgium', group: 'F', rating: 85 },
    { id: 'cro', name: 'Croatia', group: 'F', rating: 84 },
    { id: 'mar', name: 'Morocco', group: 'F', rating: 80 },
    { id: 'can', name: 'Canada', group: 'F', rating: 74 },
  ],
  G: [
    { id: 'bra', name: 'Brazil', group: 'G', rating: 93 },
    { id: 'sui', name: 'Switzerland', group: 'G', rating: 79 },
    { id: 'srb', name: 'Serbia', group: 'G', rating: 78 },
    { id: 'cmr', name: 'Cameroon', group: 'G', rating: 71 },
  ],
  H: [
    { id: 'por', name: 'Portugal', group: 'H', rating: 87 },
    { id: 'uru', name: 'Uruguay', group: 'H', rating: 82 },
    { id: 'kor', name: 'South Korea', group: 'H', rating: 76 },
    { id: 'gha', name: 'Ghana', group: 'H', rating: 70 },
  ],
}

const roundOf16Template = [
  ['1A', '2B'],
  ['1C', '2D'],
  ['1E', '2F'],
  ['1G', '2H'],
  ['1B', '2A'],
  ['1D', '2C'],
  ['1F', '2E'],
  ['1H', '2G'],
] as const

const scheduleLabels = [
  'Matchday 1',
  'Matchday 1',
  'Matchday 2',
  'Matchday 2',
  'Matchday 3',
  'Matchday 3',
]

function createInitialMatches(): Match[] {
  const templates: [number, number][] = [
    [0, 1],
    [2, 3],
    [0, 2],
    [1, 3],
    [0, 3],
    [1, 2],
  ]

  return Object.entries(groups).flatMap(([groupName, teams]) =>
    templates.map(([homeIndex, awayIndex], matchIndex) => ({
      id: `${groupName}-${matchIndex + 1}`,
      group: groupName,
      round: matchIndex + 1,
      kickoff: scheduleLabels[matchIndex],
      homeTeam: teams[homeIndex],
      awayTeam: teams[awayIndex],
    })),
  )
}

function teamHash(team: Team) {
  return [...team.id].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function predictMatch(homeTeam: Team, awayTeam: Team): Prediction {
  const ratingGap = homeTeam.rating - awayTeam.rating
  const homeNoise = ((teamHash(homeTeam) + teamHash(awayTeam)) % 5) * 0.12
  const awayNoise = ((teamHash(awayTeam) + teamHash(homeTeam) * 2) % 5) * 0.1
  const homeExpectedGoals = clamp(1.15 + ratingGap / 18 + homeNoise, 0.2, 3.6)
  const awayExpectedGoals = clamp(1.05 - ratingGap / 22 + awayNoise, 0.2, 3.2)

  let homeGoals = clamp(Math.round(homeExpectedGoals), 0, 5)
  let awayGoals = clamp(Math.round(awayExpectedGoals), 0, 5)

  if (Math.abs(ratingGap) < 5 && Math.abs(homeGoals - awayGoals) > 1) {
    awayGoals = homeGoals
  }

  if (ratingGap > 9 && homeGoals <= awayGoals) {
    homeGoals = awayGoals + 1
  }

  if (ratingGap < -9 && awayGoals <= homeGoals) {
    awayGoals = homeGoals + 1
  }

  const confidence = clamp(54 + Math.abs(ratingGap) * 1.2 + Math.abs(homeGoals - awayGoals) * 4, 51, 92)
  const outcome =
    homeGoals === awayGoals
      ? 'Draw looks most likely'
      : homeGoals > awayGoals
        ? `${homeTeam.name} look stronger`
        : `${awayTeam.name} look stronger`

  return {
    homeGoals,
    awayGoals,
    confidence,
    summary: `${outcome}. Model leans on a simple strength rating.`,
  }
}

function buildStandings(matches: Match[]) {
  return Object.entries(groups).reduce<Record<string, Standing[]>>((accumulator, [groupName, teams]) => {
    const table = new Map<string, Standing>(
      teams.map((team) => [
        team.id,
        {
          team,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        },
      ]),
    )

    matches
      .filter((match) => match.group === groupName && match.acceptedPrediction)
      .forEach((match) => {
        const result = match.acceptedPrediction!
        const home = table.get(match.homeTeam.id)!
        const away = table.get(match.awayTeam.id)!

        home.played += 1
        away.played += 1
        home.goalsFor += result.homeGoals
        home.goalsAgainst += result.awayGoals
        away.goalsFor += result.awayGoals
        away.goalsAgainst += result.homeGoals

        if (result.homeGoals > result.awayGoals) {
          home.won += 1
          away.lost += 1
          home.points += 3
        } else if (result.homeGoals < result.awayGoals) {
          away.won += 1
          home.lost += 1
          away.points += 3
        } else {
          home.drawn += 1
          away.drawn += 1
          home.points += 1
          away.points += 1
        }

        home.goalDifference = home.goalsFor - home.goalsAgainst
        away.goalDifference = away.goalsFor - away.goalsAgainst
      })

    accumulator[groupName] = [...table.values()].sort((left, right) => {
      if (right.points !== left.points) return right.points - left.points
      if (right.goalDifference !== left.goalDifference) return right.goalDifference - left.goalDifference
      if (right.goalsFor !== left.goalsFor) return right.goalsFor - left.goalsFor
      return right.team.rating - left.team.rating
    })

    return accumulator
  }, {})
}

function App() {
  const [matches, setMatches] = useState<Match[]>(createInitialMatches)
  const standings = buildStandings(matches)
  const acceptedCount = matches.filter((match) => match.acceptedPrediction).length

  function handleTryToPredict(matchId: string) {
    setMatches((currentMatches) =>
      currentMatches.map((match) =>
        match.id === matchId
          ? {
              ...match,
              prediction: predictMatch(match.homeTeam, match.awayTeam),
            }
          : match,
      ),
    )
  }

  function handleAccept(matchId: string) {
    setMatches((currentMatches) =>
      currentMatches.map((match) =>
        match.id === matchId && match.prediction
          ? {
              ...match,
              acceptedPrediction: match.prediction,
            }
          : match,
      ),
    )
  }

  function handleReset() {
    setMatches(createInitialMatches())
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">World Cup Predictor MVP</p>
          <h1>Przegladarkowy system do symulacji fazy grupowej i budowy drabinki</h1>
          <p className="hero-copy">
            To jest pierwsza wersja demonstracyjna. Model wykorzystuje proste ratingi druzyn, przewiduje wyniki
            grupowe, liczy tabele i automatycznie przypisuje druzyny do fazy pucharowej.
          </p>
        </div>

        <div className="hero-stats">
          <article>
            <span>Accepted</span>
            <strong>{acceptedCount}/48</strong>
          </article>
          <article>
            <span>Groups</span>
            <strong>8</strong>
          </article>
          <article>
            <span>Status</span>
            <strong>Demo data</strong>
          </article>
          <button type="button" className="secondary-button" onClick={handleReset}>
            Reset simulation
          </button>
        </div>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <h2>Jak to dziala teraz</h2>
          <p>Klikasz `Try to predict`, ogladasz propozycje modelu, a potem zatwierdzasz ja przyciskiem `Accept`.</p>
        </article>
        <article className="info-card">
          <h2>Co liczymy</h2>
          <p>Po zaakceptowaniu wynikow system aktualizuje punkty, bilans bramek i kolejnosc druzyn w kazdej grupie.</p>
        </article>
        <article className="info-card">
          <h2>Co dalej</h2>
          <p>Nastepny krok to podpiecie prawdziwego terminarza i statystyk meczowych z zewnetrznego zrodla danych.</p>
        </article>
      </section>

      <section className="layout-grid">
        <div className="panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Group stage</p>
              <h2>Mecze i predykcje</h2>
            </div>
          </div>

          <div className="group-list">
            {Object.keys(groups).map((groupName) => (
              <section key={groupName} className="group-card">
                <div className="group-card-header">
                  <div>
                    <p className="eyebrow">Group {groupName}</p>
                    <h3>Matches</h3>
                  </div>
                  <span className="badge">
                    {matches.filter((match) => match.group === groupName && match.acceptedPrediction).length}/6 accepted
                  </span>
                </div>

                <div className="match-list">
                  {matches
                    .filter((match) => match.group === groupName)
                    .map((match) => (
                      <article key={match.id} className="match-card">
                        <div className="match-meta">
                          <span>{match.kickoff}</span>
                          <span>Match {match.round}</span>
                        </div>

                        <div className="match-teams">
                          <div>
                            <strong>{match.homeTeam.name}</strong>
                            <span>rating {match.homeTeam.rating}</span>
                          </div>
                          <div className="score-pill">
                            {match.acceptedPrediction
                              ? `${match.acceptedPrediction.homeGoals} : ${match.acceptedPrediction.awayGoals}`
                              : match.prediction
                                ? `${match.prediction.homeGoals} : ${match.prediction.awayGoals}`
                                : 'vs'}
                          </div>
                          <div>
                            <strong>{match.awayTeam.name}</strong>
                            <span>rating {match.awayTeam.rating}</span>
                          </div>
                        </div>

                        {match.prediction ? (
                          <div className="prediction-box">
                            <p>
                              <strong>{match.prediction.confidence}% confidence.</strong> {match.prediction.summary}
                            </p>
                          </div>
                        ) : (
                          <div className="prediction-box prediction-box-muted">
                            <p>Model jeszcze nie przygotowal propozycji dla tego meczu.</p>
                          </div>
                        )}

                        <div className="action-row">
                          <button type="button" className="primary-button" onClick={() => handleTryToPredict(match.id)}>
                            Try to predict
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleAccept(match.id)}
                            disabled={!match.prediction}
                          >
                            Accept
                          </button>
                        </div>
                      </article>
                    ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <aside className="sidebar">
          <section className="panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Standings</p>
                <h2>Tabele grupowe</h2>
              </div>
            </div>

            <div className="standings-list">
              {Object.entries(standings).map(([groupName, table]) => (
                <section key={groupName} className="standings-card">
                  <div className="standings-header">
                    <h3>Group {groupName}</h3>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Team</th>
                        <th>Pts</th>
                        <th>GD</th>
                        <th>P</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.map((row, index) => (
                        <tr key={row.team.id}>
                          <td>{index + 1}</td>
                          <td>{row.team.name}</td>
                          <td>{row.points}</td>
                          <td>{row.goalDifference}</td>
                          <td>{row.played}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Knockout</p>
                <h2>Drabinka 1/8 finalu</h2>
              </div>
            </div>

            <div className="bracket-list">
              {roundOf16Template.map(([homeSlot, awaySlot], index) => {
                const homeGroup = homeSlot[1]
                const awayGroup = awaySlot[1]
                const homePlace = Number(homeSlot[0]) - 1
                const awayPlace = Number(awaySlot[0]) - 1
                const homeTeam = standings[homeGroup]?.[homePlace]?.team.name ?? 'TBD'
                const awayTeam = standings[awayGroup]?.[awayPlace]?.team.name ?? 'TBD'

                return (
                  <article key={`${homeSlot}-${awaySlot}`} className="bracket-card">
                    <span>Round of 16 #{index + 1}</span>
                    <strong>
                      {homeSlot} {homeTeam}
                    </strong>
                    <strong>
                      {awaySlot} {awayTeam}
                    </strong>
                  </article>
                )
              })}
            </div>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default App
