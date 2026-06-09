import { useState } from 'react'
import './App.css'

type Team = {
  id: string
  name: string
  group: string
  rating: number
}

type GroupDefinition = {
  name: string
  teams: Team[]
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
  kickoffLabel: string
  kickoffUtc: string
  localDateLabel: string
  localTimeLabel: string
  polishDateLabel: string
  polishTimeLabel: string
  venueCity: string
  stadium: string
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

type RankedThird = Standing & {
  rank: number
}

type RoundOf32Match = {
  id: string
  label: string
  homeSlot: string
  awaySlot: string
  homeTeam: string
  awayTeam: string
  note?: string
}

type RawScheduleItem = {
  date: string
  et: string
  match: string
  venue: string
}

const groupDefinitions: GroupDefinition[] = [
  {
    name: 'A',
    teams: [
      { id: 'mex', name: 'Mexico', group: 'A', rating: 80 },
      { id: 'rsa', name: 'South Africa', group: 'A', rating: 71 },
      { id: 'kor', name: 'Korea Republic', group: 'A', rating: 78 },
      { id: 'cze', name: 'Czechia', group: 'A', rating: 77 },
    ],
  },
  {
    name: 'B',
    teams: [
      { id: 'can', name: 'Canada', group: 'B', rating: 79 },
      { id: 'bih', name: 'Bosnia and Herzegovina', group: 'B', rating: 74 },
      { id: 'qat', name: 'Qatar', group: 'B', rating: 68 },
      { id: 'sui', name: 'Switzerland', group: 'B', rating: 83 },
    ],
  },
  {
    name: 'C',
    teams: [
      { id: 'bra', name: 'Brazil', group: 'C', rating: 94 },
      { id: 'mar', name: 'Morocco', group: 'C', rating: 84 },
      { id: 'hai', name: 'Haiti', group: 'C', rating: 63 },
      { id: 'sco', name: 'Scotland', group: 'C', rating: 78 },
    ],
  },
  {
    name: 'D',
    teams: [
      { id: 'usa', name: 'United States', group: 'D', rating: 80 },
      { id: 'par', name: 'Paraguay', group: 'D', rating: 76 },
      { id: 'aus', name: 'Australia', group: 'D', rating: 77 },
      { id: 'tur', name: 'Turkiye', group: 'D', rating: 81 },
    ],
  },
  {
    name: 'E',
    teams: [
      { id: 'ger', name: 'Germany', group: 'E', rating: 90 },
      { id: 'cuw', name: 'Curacao', group: 'E', rating: 63 },
      { id: 'civ', name: 'Ivory Coast', group: 'E', rating: 79 },
      { id: 'ecu', name: 'Ecuador', group: 'E', rating: 80 },
    ],
  },
  {
    name: 'F',
    teams: [
      { id: 'ned', name: 'Netherlands', group: 'F', rating: 88 },
      { id: 'jpn', name: 'Japan', group: 'F', rating: 80 },
      { id: 'swe', name: 'Sweden', group: 'F', rating: 79 },
      { id: 'tun', name: 'Tunisia', group: 'F', rating: 72 },
    ],
  },
  {
    name: 'G',
    teams: [
      { id: 'bel', name: 'Belgium', group: 'G', rating: 84 },
      { id: 'egy', name: 'Egypt', group: 'G', rating: 78 },
      { id: 'irn', name: 'Iran', group: 'G', rating: 74 },
      { id: 'nzl', name: 'New Zealand', group: 'G', rating: 67 },
    ],
  },
  {
    name: 'H',
    teams: [
      { id: 'esp', name: 'Spain', group: 'H', rating: 91 },
      { id: 'cpv', name: 'Cape Verde', group: 'H', rating: 71 },
      { id: 'ksa', name: 'Saudi Arabia', group: 'H', rating: 70 },
      { id: 'uru', name: 'Uruguay', group: 'H', rating: 84 },
    ],
  },
  {
    name: 'I',
    teams: [
      { id: 'fra', name: 'France', group: 'I', rating: 92 },
      { id: 'sen', name: 'Senegal', group: 'I', rating: 82 },
      { id: 'irq', name: 'Iraq', group: 'I', rating: 66 },
      { id: 'nor', name: 'Norway', group: 'I', rating: 81 },
    ],
  },
  {
    name: 'J',
    teams: [
      { id: 'arg', name: 'Argentina', group: 'J', rating: 93 },
      { id: 'alg', name: 'Algeria', group: 'J', rating: 78 },
      { id: 'aut', name: 'Austria', group: 'J', rating: 81 },
      { id: 'jor', name: 'Jordan', group: 'J', rating: 69 },
    ],
  },
  {
    name: 'K',
    teams: [
      { id: 'por', name: 'Portugal', group: 'K', rating: 88 },
      { id: 'cod', name: 'DR Congo', group: 'K', rating: 74 },
      { id: 'uzb', name: 'Uzbekistan', group: 'K', rating: 72 },
      { id: 'col', name: 'Colombia', group: 'K', rating: 85 },
    ],
  },
  {
    name: 'L',
    teams: [
      { id: 'eng', name: 'England', group: 'L', rating: 89 },
      { id: 'cro', name: 'Croatia', group: 'L', rating: 82 },
      { id: 'gha', name: 'Ghana', group: 'L', rating: 72 },
      { id: 'pan', name: 'Panama', group: 'L', rating: 69 },
    ],
  },
]

const groupMatchTemplate: [number, number, string][] = [
  [0, 1, 'Matchday 1'],
  [2, 3, 'Matchday 1'],
  [0, 2, 'Matchday 2'],
  [1, 3, 'Matchday 2'],
  [0, 3, 'Matchday 3'],
  [1, 2, 'Matchday 3'],
]

const groupScheduleSource: Record<string, RawScheduleItem[]> = {
  A: [
    { date: 'Thu, Jun 11', et: '3:00 PM ET', match: 'Mexico vs South Africa', venue: 'Mexico City | Estadio Azteca' },
    { date: 'Thu, Jun 11', et: '10:00 PM ET', match: 'Korea Republic vs Czechia', venue: 'Guadalajara | Estadio Akron' },
    { date: 'Thu, Jun 18', et: '12:00 PM ET', match: 'Czechia vs South Africa', venue: 'Atlanta | Mercedes-Benz Stadium' },
    { date: 'Thu, Jun 18', et: '11:00 PM ET', match: 'Mexico vs Korea Republic', venue: 'Guadalajara | Estadio Akron' },
    { date: 'Wed, Jun 24', et: '9:00 PM ET', match: 'Czechia vs Mexico', venue: 'Mexico City | Estadio Azteca' },
    { date: 'Wed, Jun 24', et: '9:00 PM ET', match: 'South Africa vs Korea Republic', venue: 'Monterrey | Estadio BBVA' },
  ],
  B: [
    { date: 'Fri, Jun 12', et: '3:00 PM ET', match: 'Canada vs Bosnia and Herzegovina', venue: 'Toronto | BMO Field' },
    { date: 'Sat, Jun 13', et: '3:00 PM ET', match: 'Qatar vs Switzerland', venue: "San Francisco Bay Area | Levi's Stadium" },
    { date: 'Thu, Jun 18', et: '3:00 PM ET', match: 'Switzerland vs Bosnia and Herzegovina', venue: 'Los Angeles | SoFi Stadium' },
    { date: 'Thu, Jun 18', et: '6:00 PM ET', match: 'Canada vs Qatar', venue: 'Vancouver | BC Place' },
    { date: 'Wed, Jun 24', et: '3:00 PM ET', match: 'Switzerland vs Canada', venue: 'Vancouver | BC Place' },
    { date: 'Wed, Jun 24', et: '3:00 PM ET', match: 'Bosnia and Herzegovina vs Qatar', venue: 'Seattle | Lumen Field' },
  ],
  C: [
    { date: 'Sat, Jun 13', et: '6:00 PM ET', match: 'Brazil vs Morocco', venue: 'New York/New Jersey | MetLife Stadium' },
    { date: 'Sat, Jun 13', et: '9:00 PM ET', match: 'Haiti vs Scotland', venue: 'Boston | Gillette Stadium' },
    { date: 'Fri, Jun 19', et: '6:00 PM ET', match: 'Scotland vs Morocco', venue: 'Boston | Gillette Stadium' },
    { date: 'Fri, Jun 19', et: '9:00 PM ET', match: 'Brazil vs Haiti', venue: 'Philadelphia | Lincoln Financial Field' },
    { date: 'Wed, Jun 24', et: '6:00 PM ET', match: 'Scotland vs Brazil', venue: 'Miami | Hard Rock Stadium' },
    { date: 'Wed, Jun 24', et: '6:00 PM ET', match: 'Morocco vs Haiti', venue: 'Atlanta | Mercedes-Benz Stadium' },
  ],
  D: [
    { date: 'Fri, Jun 12', et: '9:00 PM ET', match: 'United States vs Paraguay', venue: 'Los Angeles | SoFi Stadium' },
    { date: 'Sat, Jun 13', et: '12:00 AM ET', match: 'Australia vs Turkiye', venue: 'Vancouver | BC Place' },
    { date: 'Fri, Jun 19', et: '3:00 PM ET', match: 'United States vs Australia', venue: 'Seattle | Lumen Field' },
    { date: 'Fri, Jun 19', et: '12:00 AM ET', match: 'Turkiye vs Paraguay', venue: "San Francisco Bay Area | Levi's Stadium" },
    { date: 'Thu, Jun 25', et: '10:00 PM ET', match: 'Turkiye vs United States', venue: 'Los Angeles | SoFi Stadium' },
    { date: 'Thu, Jun 25', et: '10:00 PM ET', match: 'Paraguay vs Australia', venue: "San Francisco Bay Area | Levi's Stadium" },
  ],
  E: [
    { date: 'Sun, Jun 14', et: '1:00 PM ET', match: 'Germany vs Curacao', venue: 'Houston | NRG Stadium' },
    { date: 'Sun, Jun 14', et: '7:00 PM ET', match: 'Ivory Coast vs Ecuador', venue: 'Philadelphia | Lincoln Financial Field' },
    { date: 'Sat, Jun 20', et: '4:00 PM ET', match: 'Germany vs Ivory Coast', venue: 'Toronto | BMO Field' },
    { date: 'Sat, Jun 20', et: '8:00 PM ET', match: 'Ecuador vs Curacao', venue: 'Kansas City | Arrowhead Stadium' },
    { date: 'Thu, Jun 25', et: '4:00 PM ET', match: 'Ecuador vs Germany', venue: 'New York/New Jersey | MetLife Stadium' },
    { date: 'Thu, Jun 25', et: '4:00 PM ET', match: 'Curacao vs Ivory Coast', venue: 'Philadelphia | Lincoln Financial Field' },
  ],
  F: [
    { date: 'Sun, Jun 14', et: '4:00 PM ET', match: 'Netherlands vs Japan', venue: 'Dallas | AT&T Stadium' },
    { date: 'Sun, Jun 14', et: '10:00 PM ET', match: 'Sweden vs Tunisia', venue: 'Monterrey | Estadio BBVA' },
    { date: 'Sat, Jun 20', et: '1:00 PM ET', match: 'Netherlands vs Sweden', venue: 'Houston | NRG Stadium' },
    { date: 'Sat, Jun 20', et: '12:00 AM ET', match: 'Tunisia vs Japan', venue: 'Monterrey | Estadio BBVA' },
    { date: 'Thu, Jun 25', et: '7:00 PM ET', match: 'Japan vs Sweden', venue: 'Dallas | AT&T Stadium' },
    { date: 'Thu, Jun 25', et: '7:00 PM ET', match: 'Tunisia vs Netherlands', venue: 'Kansas City | Arrowhead Stadium' },
  ],
  G: [
    { date: 'Mon, Jun 15', et: '6:00 PM ET', match: 'Belgium vs Egypt', venue: 'Seattle | Lumen Field' },
    { date: 'Mon, Jun 15', et: '12:00 AM ET', match: 'Iran vs New Zealand', venue: 'Los Angeles | SoFi Stadium' },
    { date: 'Sun, Jun 21', et: '3:00 PM ET', match: 'Belgium vs Iran', venue: 'Los Angeles | SoFi Stadium' },
    { date: 'Sun, Jun 21', et: '9:00 PM ET', match: 'New Zealand vs Egypt', venue: 'Vancouver | BC Place' },
    { date: 'Fri, Jun 26', et: '11:00 PM ET', match: 'Egypt vs Iran', venue: 'Seattle | Lumen Field' },
    { date: 'Fri, Jun 26', et: '11:00 PM ET', match: 'New Zealand vs Belgium', venue: 'Vancouver | BC Place' },
  ],
  H: [
    { date: 'Mon, Jun 15', et: '1:00 PM ET', match: 'Spain vs Cape Verde', venue: 'Atlanta | Mercedes-Benz Stadium' },
    { date: 'Mon, Jun 15', et: '6:00 PM ET', match: 'Saudi Arabia vs Uruguay', venue: 'Miami | Hard Rock Stadium' },
    { date: 'Sun, Jun 21', et: '12:00 PM ET', match: 'Spain vs Saudi Arabia', venue: 'Atlanta | Mercedes-Benz Stadium' },
    { date: 'Sun, Jun 21', et: '6:00 PM ET', match: 'Uruguay vs Cape Verde', venue: 'Miami | Hard Rock Stadium' },
    { date: 'Fri, Jun 26', et: '8:00 PM ET', match: 'Cape Verde vs Saudi Arabia', venue: 'Houston | NRG Stadium' },
    { date: 'Fri, Jun 26', et: '8:00 PM ET', match: 'Uruguay vs Spain', venue: 'Guadalajara | Estadio Akron' },
  ],
  I: [
    { date: 'Tue, Jun 16', et: '3:00 PM ET', match: 'France vs Senegal', venue: 'New York/New Jersey | MetLife Stadium' },
    { date: 'Tue, Jun 16', et: '6:00 PM ET', match: 'Iraq vs Norway', venue: 'Boston | Gillette Stadium' },
    { date: 'Mon, Jun 22', et: '5:00 PM ET', match: 'France vs Iraq', venue: 'Philadelphia | Lincoln Financial Field' },
    { date: 'Mon, Jun 22', et: '8:00 PM ET', match: 'Norway vs Senegal', venue: 'New York/New Jersey | MetLife Stadium' },
    { date: 'Fri, Jun 26', et: '3:00 PM ET', match: 'Norway vs France', venue: 'Boston | Gillette Stadium' },
    { date: 'Fri, Jun 26', et: '3:00 PM ET', match: 'Senegal vs Iraq', venue: 'Toronto | BMO Field' },
  ],
  J: [
    { date: 'Tue, Jun 16', et: '9:00 PM ET', match: 'Argentina vs Algeria', venue: 'Kansas City | Arrowhead Stadium' },
    { date: 'Tue, Jun 16', et: '12:00 AM ET', match: 'Austria vs Jordan', venue: "San Francisco Bay Area | Levi's Stadium" },
    { date: 'Mon, Jun 22', et: '1:00 PM ET', match: 'Argentina vs Austria', venue: 'Dallas | AT&T Stadium' },
    { date: 'Mon, Jun 22', et: '11:00 PM ET', match: 'Jordan vs Algeria', venue: "San Francisco Bay Area | Levi's Stadium" },
    { date: 'Sat, Jun 27', et: '10:00 PM ET', match: 'Algeria vs Austria', venue: 'Kansas City | Arrowhead Stadium' },
    { date: 'Sat, Jun 27', et: '10:00 PM ET', match: 'Jordan vs Argentina', venue: 'Dallas | AT&T Stadium' },
  ],
  K: [
    { date: 'Wed, Jun 17', et: '1:00 PM ET', match: 'Portugal vs DR Congo', venue: 'Houston | NRG Stadium' },
    { date: 'Wed, Jun 17', et: '10:00 PM ET', match: 'Uzbekistan vs Colombia', venue: 'Mexico City | Estadio Azteca' },
    { date: 'Tue, Jun 23', et: '1:00 PM ET', match: 'Portugal vs Uzbekistan', venue: 'Houston | NRG Stadium' },
    { date: 'Tue, Jun 23', et: '10:00 PM ET', match: 'Colombia vs DR Congo', venue: 'Guadalajara | Estadio Akron' },
    { date: 'Sat, Jun 27', et: '7:30 PM ET', match: 'Colombia vs Portugal', venue: 'Miami | Hard Rock Stadium' },
    { date: 'Sat, Jun 27', et: '7:30 PM ET', match: 'DR Congo vs Uzbekistan', venue: 'Atlanta | Mercedes-Benz Stadium' },
  ],
  L: [
    { date: 'Wed, Jun 17', et: '4:00 PM ET', match: 'England vs Croatia', venue: 'Dallas | AT&T Stadium' },
    { date: 'Wed, Jun 17', et: '7:00 PM ET', match: 'Ghana vs Panama', venue: 'Toronto | BMO Field' },
    { date: 'Tue, Jun 23', et: '4:00 PM ET', match: 'England vs Ghana', venue: 'Boston | Gillette Stadium' },
    { date: 'Tue, Jun 23', et: '7:00 PM ET', match: 'Panama vs Croatia', venue: 'Toronto | BMO Field' },
    { date: 'Sat, Jun 27', et: '5:00 PM ET', match: 'Panama vs England', venue: 'New York/New Jersey | MetLife Stadium' },
    { date: 'Sat, Jun 27', et: '5:00 PM ET', match: 'Croatia vs Ghana', venue: 'Philadelphia | Lincoln Financial Field' },
  ],
}

const venueTimeZones: Record<string, string> = {
  'Mexico City': 'America/Mexico_City',
  Guadalajara: 'America/Mexico_City',
  Monterrey: 'America/Monterrey',
  Atlanta: 'America/New_York',
  Toronto: 'America/Toronto',
  'San Francisco Bay Area': 'America/Los_Angeles',
  'Los Angeles': 'America/Los_Angeles',
  Vancouver: 'America/Vancouver',
  Seattle: 'America/Los_Angeles',
  'New York/New Jersey': 'America/New_York',
  Boston: 'America/New_York',
  Philadelphia: 'America/New_York',
  Miami: 'America/New_York',
  Houston: 'America/Chicago',
  'Kansas City': 'America/Chicago',
  Dallas: 'America/Chicago',
}

const fixedRoundOf32Rules = [
  ['73', '2A', '2B'],
  ['75', '1F', '2C'],
  ['76', '1C', '2F'],
  ['78', '2E', '2I'],
  ['83', '2K', '2L'],
  ['84', '1H', '2J'],
  ['86', '1J', '2H'],
  ['88', '2D', '2G'],
] as const

const wildcardRoundOf32Rules = [
  ['74', '1E', ['A', 'B', 'C', 'D', 'F']],
  ['77', '1I', ['C', 'D', 'F', 'G', 'H']],
  ['79', '1A', ['C', 'E', 'F', 'H', 'I']],
  ['80', '1L', ['E', 'H', 'I', 'J', 'K']],
  ['81', '1D', ['B', 'E', 'F', 'I', 'J']],
  ['82', '1G', ['A', 'E', 'H', 'I', 'J']],
  ['85', '1B', ['E', 'F', 'G', 'I', 'J']],
  ['87', '1K', ['D', 'E', 'I', 'J', 'L']],
] as const

const knockoutPath = {
  roundOf16: [
    ['89', 'W73', 'W75'],
    ['90', 'W74', 'W77'],
    ['91', 'W76', 'W78'],
    ['92', 'W79', 'W80'],
    ['93', 'W83', 'W84'],
    ['94', 'W81', 'W82'],
    ['95', 'W86', 'W88'],
    ['96', 'W85', 'W87'],
  ],
  quarterFinals: [
    ['97', 'W89', 'W90'],
    ['98', 'W93', 'W94'],
    ['99', 'W91', 'W92'],
    ['100', 'W95', 'W96'],
  ],
  semiFinals: [
    ['101', 'W97', 'W98'],
    ['102', 'W99', 'W100'],
  ],
  finals: [
    ['103', 'L101', 'L102', 'Third-place match'],
    ['104', 'W101', 'W102', 'Final'],
  ],
}

function parseEtDateTime(dateLabel: string, etLabel: string) {
  const monthMap: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  }

  const dateMatch = dateLabel.match(/^[A-Za-z]{3}, ([A-Za-z]{3}) (\d{1,2})$/)
  const timeMatch = etLabel.match(/^(\d{1,2}):(\d{2}) (AM|PM) ET$/)

  if (!dateMatch || !timeMatch) {
    throw new Error(`Unsupported schedule format: ${dateLabel} ${etLabel}`)
  }

  const month = monthMap[dateMatch[1]]
  const day = Number(dateMatch[2])
  let hours = Number(timeMatch[1]) % 12
  const minutes = Number(timeMatch[2])

  if (timeMatch[3] === 'PM') {
    hours += 12
  }

  // Group-stage dates fall in daylight saving time, so ET is UTC-4.
  return new Date(Date.UTC(2026, month, day, hours + 4, minutes))
}

function formatDateTime(date: Date, timeZone: string) {
  const dateLabel = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(date)

  const timeLabel = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)

  return { dateLabel, timeLabel }
}

function createInitialMatches(): Match[] {
  return groupDefinitions.flatMap((groupDefinition) =>
    groupMatchTemplate.map(([homeIndex, awayIndex, kickoffLabel], roundIndex) => {
      const scheduleItem = groupScheduleSource[groupDefinition.name][roundIndex]
      const kickoff = parseEtDateTime(scheduleItem.date, scheduleItem.et)
      const [venueCity, stadium] = scheduleItem.venue.split('|').map((part) => part.trim())
      const localTimeZone = venueTimeZones[venueCity] ?? 'UTC'
      const localDateTime = formatDateTime(kickoff, localTimeZone)
      const polishDateTime = formatDateTime(kickoff, 'Europe/Warsaw')

      return {
        id: `${groupDefinition.name}-${roundIndex + 1}`,
        group: groupDefinition.name,
        round: roundIndex + 1,
        kickoffLabel,
        kickoffUtc: kickoff.toISOString(),
        localDateLabel: localDateTime.dateLabel,
        localTimeLabel: localDateTime.timeLabel,
        polishDateLabel: polishDateTime.dateLabel,
        polishTimeLabel: polishDateTime.timeLabel,
        venueCity,
        stadium,
        homeTeam: groupDefinition.teams[homeIndex],
        awayTeam: groupDefinition.teams[awayIndex],
      }
    }),
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
  const homeExpectedGoals = clamp(1.1 + ratingGap / 18 + homeNoise, 0.2, 3.7)
  const awayExpectedGoals = clamp(1.0 - ratingGap / 22 + awayNoise, 0.2, 3.3)

  let homeGoals = clamp(Math.round(homeExpectedGoals), 0, 5)
  let awayGoals = clamp(Math.round(awayExpectedGoals), 0, 5)

  if (Math.abs(ratingGap) < 5 && Math.abs(homeGoals - awayGoals) > 1) {
    awayGoals = homeGoals
  }

  if (ratingGap > 10 && homeGoals <= awayGoals) {
    homeGoals = awayGoals + 1
  }

  if (ratingGap < -10 && awayGoals <= homeGoals) {
    awayGoals = homeGoals + 1
  }

  const confidence = clamp(52 + Math.abs(ratingGap) * 1.1 + Math.abs(homeGoals - awayGoals) * 5, 50, 92)
  const outcome =
    homeGoals === awayGoals
      ? 'Draw looks plausible'
      : homeGoals > awayGoals
        ? `${homeTeam.name} look stronger`
        : `${awayTeam.name} look stronger`

  return {
    homeGoals,
    awayGoals,
    confidence,
    summary: `${outcome}. This is still a simple strength-based baseline model.`,
  }
}

function buildStandings(matches: Match[]) {
  return groupDefinitions.reduce<Record<string, Standing[]>>((accumulator, groupDefinition) => {
    const table = new Map<string, Standing>(
      groupDefinition.teams.map((team) => [
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
      .filter((match) => match.group === groupDefinition.name && match.acceptedPrediction)
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

    accumulator[groupDefinition.name] = [...table.values()].sort((left, right) => {
      if (right.points !== left.points) return right.points - left.points
      if (right.goalDifference !== left.goalDifference) return right.goalDifference - left.goalDifference
      if (right.goalsFor !== left.goalsFor) return right.goalsFor - left.goalsFor
      return right.team.rating - left.team.rating
    })

    return accumulator
  }, {})
}

function rankThirdPlacedTeams(standings: Record<string, Standing[]>) {
  const thirdPlacedRows = groupDefinitions
    .map((groupDefinition) => standings[groupDefinition.name]?.[2])
    .filter((standing): standing is Standing => Boolean(standing))
    .sort((left, right) => {
      if (right.points !== left.points) return right.points - left.points
      if (right.goalDifference !== left.goalDifference) return right.goalDifference - left.goalDifference
      if (right.goalsFor !== left.goalsFor) return right.goalsFor - left.goalsFor
      return right.team.rating - left.team.rating
    })

  return thirdPlacedRows.map((standing, index) => ({
    ...standing,
    rank: index + 1,
  }))
}

function createPositionMap(standings: Record<string, Standing[]>) {
  const positionMap = new Map<string, Standing>()

  groupDefinitions.forEach((groupDefinition) => {
    const table = standings[groupDefinition.name] ?? []
    table.forEach((standing, index) => {
      positionMap.set(`${index + 1}${groupDefinition.name}`, standing)
    })
  })

  return positionMap
}

function buildRoundOf32(standings: Record<string, Standing[]>, rankedThirds: RankedThird[]) {
  const positionMap = createPositionMap(standings)
  const qualifiedThirds = rankedThirds.slice(0, 8)
  const usedThirdTeamIds = new Set<string>()

  const fixedMatches: RoundOf32Match[] = fixedRoundOf32Rules.map(([id, homeSlot, awaySlot]) => ({
    id,
    label: `Match ${id}`,
    homeSlot,
    awaySlot,
    homeTeam: positionMap.get(homeSlot)?.team.name ?? 'TBD',
    awayTeam: positionMap.get(awaySlot)?.team.name ?? 'TBD',
  }))

  // FIFA uses Annex C for the exact 3rd-place routing. This is a valid provisional assignment layer
  // that keeps the official 2026 slot families while we prepare the exact matrix.
  const wildcardMatches: RoundOf32Match[] = wildcardRoundOf32Rules.map(([id, homeSlot, allowedGroups]) => {
    const wildcardTeam = qualifiedThirds.find(
      (standing) =>
        (allowedGroups as readonly string[]).includes(standing.team.group) && !usedThirdTeamIds.has(standing.team.id),
    )

    if (wildcardTeam) {
      usedThirdTeamIds.add(wildcardTeam.team.id)
    }

    return {
      id,
      label: `Match ${id}`,
      homeSlot,
      awaySlot: `3${allowedGroups.join('/')}`,
      homeTeam: positionMap.get(homeSlot)?.team.name ?? 'TBD',
      awayTeam: wildcardTeam?.team.name ?? 'Best 3rd place TBD',
      note: wildcardTeam
        ? `Current provisional wildcard from Group ${wildcardTeam.team.group}.`
        : 'Waiting for a qualified 3rd-place team.',
    }
  })

  return [...fixedMatches, ...wildcardMatches].sort((left, right) => Number(left.id) - Number(right.id))
}

function App() {
  const [matches, setMatches] = useState<Match[]>(createInitialMatches)
  const standings = buildStandings(matches)
  const rankedThirds = rankThirdPlacedTeams(standings)
  const roundOf32 = buildRoundOf32(standings, rankedThirds)
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
          <p className="eyebrow">World Cup 2026 format</p>
          <h1>World Cup 2026 predictor rebuilt for 12 groups and a 32-team knockout stage</h1>
          <p className="hero-copy">
            This MVP now follows the expanded tournament structure: 48 teams, 12 groups, 72 group-stage matches,
            the best eight third-placed teams and a new Round of 32.
          </p>
        </div>

        <div className="hero-stats">
          <article>
            <span>Accepted predictions</span>
            <strong>{acceptedCount}/72</strong>
          </article>
          <article>
            <span>Qualified to knockouts</span>
            <strong>{24 + Math.min(rankedThirds.filter((row) => row.played > 0 || row.points > 0).length, 8)}/32</strong>
          </article>
          <article>
            <span>Next product step</span>
            <strong>Poules-style picks</strong>
          </article>
          <button type="button" className="secondary-button" onClick={handleReset}>
            Reset simulation
          </button>
        </div>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <h2>Real 2026 shape</h2>
          <p>We now model Groups A-L, six matches per group and the new Round of 32 introduced for the 48-team World Cup.</p>
        </article>
        <article className="info-card">
          <h2>Best third places</h2>
          <p>The app ranks all twelve third-placed teams and promotes the best eight into the knockout phase.</p>
        </article>
        <article className="info-card">
          <h2>Poules-style direction</h2>
          <p>The next layer can add exact-score picks, points for correct outcomes and prediction pools shared with friends.</p>
        </article>
      </section>

      <section className="layout-grid">
        <div className="panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Group stage</p>
              <h2>All 72 group matches</h2>
            </div>
            <span className="badge">12 groups</span>
          </div>

          <div className="group-list">
            {groupDefinitions.map((groupDefinition) => (
              <section key={groupDefinition.name} className="group-card">
                <div className="group-card-header">
                  <div>
                    <p className="eyebrow">Group {groupDefinition.name}</p>
                    <h3>
                      {groupDefinition.teams.map((team) => team.name).join(' | ')}
                    </h3>
                  </div>
                  <span className="badge">
                    {
                      matches.filter(
                        (match) => match.group === groupDefinition.name && Boolean(match.acceptedPrediction),
                      ).length
                    }
                    /6 accepted
                  </span>
                </div>

                <div className="match-list">
                  {matches
                    .filter((match) => match.group === groupDefinition.name)
                    .map((match) => (
                      <article key={match.id} className="match-card">
                        <div className="match-meta">
                          <span>{match.kickoffLabel}</span>
                          <span>Group {match.group} / Match {match.round}</span>
                        </div>

                        <div className="schedule-box">
                          <div>
                            <strong>{match.venueCity}</strong>
                            <span>{match.stadium}</span>
                          </div>
                          <div>
                            <strong>Local</strong>
                            <span>
                              {match.localDateLabel} / {match.localTimeLabel}
                            </span>
                          </div>
                          <div>
                            <strong>Poland</strong>
                            <span>
                              {match.polishDateLabel} / {match.polishTimeLabel}
                            </span>
                          </div>
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
                            <p>Generate a baseline score first, then accept it into the standings.</p>
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
                <h2>Group tables A-L</h2>
              </div>
            </div>

            <div className="standings-list">
              {groupDefinitions.map((groupDefinition) => (
                <section key={groupDefinition.name} className="standings-card">
                  <div className="standings-header">
                    <h3>Group {groupDefinition.name}</h3>
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
                      {(standings[groupDefinition.name] ?? []).map((row, index) => (
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
                <p className="eyebrow">Wild cards</p>
                <h2>Best third-placed teams</h2>
              </div>
            </div>

            <div className="bracket-list">
              {rankedThirds.map((row) => (
                <article key={row.team.id} className="bracket-card">
                  <span>
                    Rank {row.rank} / Group {row.team.group}
                  </span>
                  <strong>{row.team.name}</strong>
                  <p>
                    {row.points} pts, GD {row.goalDifference}, GF {row.goalsFor}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Round of 32</p>
                <h2>2026 knockout entry bracket</h2>
              </div>
            </div>

            <div className="bracket-list">
              {roundOf32.map((match) => (
                <article key={match.id} className="bracket-card">
                  <span>{match.label}</span>
                  <strong>
                    {match.homeSlot} {match.homeTeam}
                  </strong>
                  <strong>
                    {match.awaySlot} {match.awayTeam}
                  </strong>
                  {match.note ? <p>{match.note}</p> : null}
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Knockout path</p>
                <h2>Later rounds scaffold</h2>
              </div>
            </div>

            <div className="path-grid">
              <div className="path-column">
                <h3>Round of 16</h3>
                {knockoutPath.roundOf16.map(([id, homeSlot, awaySlot]) => (
                  <article key={id} className="path-card">
                    <span>Match {id}</span>
                    <strong>
                      {homeSlot} vs {awaySlot}
                    </strong>
                  </article>
                ))}
              </div>

              <div className="path-column">
                <h3>Quarter-finals</h3>
                {knockoutPath.quarterFinals.map(([id, homeSlot, awaySlot]) => (
                  <article key={id} className="path-card">
                    <span>Match {id}</span>
                    <strong>
                      {homeSlot} vs {awaySlot}
                    </strong>
                  </article>
                ))}
              </div>

              <div className="path-column">
                <h3>Semi-finals and finals</h3>
                {knockoutPath.semiFinals.map(([id, homeSlot, awaySlot]) => (
                  <article key={id} className="path-card">
                    <span>Match {id}</span>
                    <strong>
                      {homeSlot} vs {awaySlot}
                    </strong>
                  </article>
                ))}
                {knockoutPath.finals.map(([id, homeSlot, awaySlot, label]) => (
                  <article key={id} className="path-card">
                    <span>{label}</span>
                    <strong>
                      {homeSlot} vs {awaySlot}
                    </strong>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default App
