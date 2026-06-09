import { useState } from 'react'
import './App.css'

type ViewMode = 'group' | 'bracket'

type TeamModelProfile = {
  chanceCreation: number
  finishing: number
  defensiveShape: number
  setPieces: number
  tournamentExperience: number
  volatility: number
}

type Team = {
  id: string
  name: string
  group: string
  rating: number
  countryCode: string
  hostCountry?: 'MX' | 'CA' | 'US'
}

type GroupDefinition = {
  name: string
  teams: Team[]
}

type Prediction = {
  homeGoals: number
  awayGoals: number
  confidence: number
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
  homeExpectedGoals: number
  awayExpectedGoals: number
  modelStrength: number
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
  predictionAttempt?: number
  manualEditorOpen?: boolean
  manualHomeGoals?: string
  manualAwayGoals?: string
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

type VenueMeta = {
  countryCode: 'MX' | 'CA' | 'US'
  timeZone: string
  altitudeMeters: number
}

const groupDefinitions: GroupDefinition[] = [
  {
    name: 'A',
    teams: [
      { id: 'mex', name: 'Mexico', group: 'A', rating: 80, countryCode: 'MX', hostCountry: 'MX' },
      { id: 'rsa', name: 'South Africa', group: 'A', rating: 71, countryCode: 'ZA' },
      { id: 'kor', name: 'Korea Republic', group: 'A', rating: 78, countryCode: 'KR' },
      { id: 'cze', name: 'Czechia', group: 'A', rating: 77, countryCode: 'CZ' },
    ],
  },
  {
    name: 'B',
    teams: [
      { id: 'can', name: 'Canada', group: 'B', rating: 79, countryCode: 'CA', hostCountry: 'CA' },
      { id: 'bih', name: 'Bosnia and Herzegovina', group: 'B', rating: 74, countryCode: 'BA' },
      { id: 'qat', name: 'Qatar', group: 'B', rating: 68, countryCode: 'QA' },
      { id: 'sui', name: 'Switzerland', group: 'B', rating: 83, countryCode: 'CH' },
    ],
  },
  {
    name: 'C',
    teams: [
      { id: 'bra', name: 'Brazil', group: 'C', rating: 94, countryCode: 'BR' },
      { id: 'mar', name: 'Morocco', group: 'C', rating: 84, countryCode: 'MA' },
      { id: 'hai', name: 'Haiti', group: 'C', rating: 63, countryCode: 'HT' },
      { id: 'sco', name: 'Scotland', group: 'C', rating: 78, countryCode: 'GB' },
    ],
  },
  {
    name: 'D',
    teams: [
      { id: 'usa', name: 'United States', group: 'D', rating: 80, countryCode: 'US', hostCountry: 'US' },
      { id: 'par', name: 'Paraguay', group: 'D', rating: 76, countryCode: 'PY' },
      { id: 'aus', name: 'Australia', group: 'D', rating: 77, countryCode: 'AU' },
      { id: 'tur', name: 'Turkiye', group: 'D', rating: 81, countryCode: 'TR' },
    ],
  },
  {
    name: 'E',
    teams: [
      { id: 'ger', name: 'Germany', group: 'E', rating: 90, countryCode: 'DE' },
      { id: 'cuw', name: 'Curacao', group: 'E', rating: 63, countryCode: 'CW' },
      { id: 'civ', name: 'Ivory Coast', group: 'E', rating: 79, countryCode: 'CI' },
      { id: 'ecu', name: 'Ecuador', group: 'E', rating: 80, countryCode: 'EC' },
    ],
  },
  {
    name: 'F',
    teams: [
      { id: 'ned', name: 'Netherlands', group: 'F', rating: 88, countryCode: 'NL' },
      { id: 'jpn', name: 'Japan', group: 'F', rating: 80, countryCode: 'JP' },
      { id: 'swe', name: 'Sweden', group: 'F', rating: 79, countryCode: 'SE' },
      { id: 'tun', name: 'Tunisia', group: 'F', rating: 72, countryCode: 'TN' },
    ],
  },
  {
    name: 'G',
    teams: [
      { id: 'bel', name: 'Belgium', group: 'G', rating: 84, countryCode: 'BE' },
      { id: 'egy', name: 'Egypt', group: 'G', rating: 78, countryCode: 'EG' },
      { id: 'irn', name: 'Iran', group: 'G', rating: 74, countryCode: 'IR' },
      { id: 'nzl', name: 'New Zealand', group: 'G', rating: 67, countryCode: 'NZ' },
    ],
  },
  {
    name: 'H',
    teams: [
      { id: 'esp', name: 'Spain', group: 'H', rating: 91, countryCode: 'ES' },
      { id: 'cpv', name: 'Cape Verde', group: 'H', rating: 71, countryCode: 'CV' },
      { id: 'ksa', name: 'Saudi Arabia', group: 'H', rating: 70, countryCode: 'SA' },
      { id: 'uru', name: 'Uruguay', group: 'H', rating: 84, countryCode: 'UY' },
    ],
  },
  {
    name: 'I',
    teams: [
      { id: 'fra', name: 'France', group: 'I', rating: 92, countryCode: 'FR' },
      { id: 'sen', name: 'Senegal', group: 'I', rating: 82, countryCode: 'SN' },
      { id: 'irq', name: 'Iraq', group: 'I', rating: 66, countryCode: 'IQ' },
      { id: 'nor', name: 'Norway', group: 'I', rating: 81, countryCode: 'NO' },
    ],
  },
  {
    name: 'J',
    teams: [
      { id: 'arg', name: 'Argentina', group: 'J', rating: 93, countryCode: 'AR' },
      { id: 'alg', name: 'Algeria', group: 'J', rating: 78, countryCode: 'DZ' },
      { id: 'aut', name: 'Austria', group: 'J', rating: 81, countryCode: 'AT' },
      { id: 'jor', name: 'Jordan', group: 'J', rating: 69, countryCode: 'JO' },
    ],
  },
  {
    name: 'K',
    teams: [
      { id: 'por', name: 'Portugal', group: 'K', rating: 88, countryCode: 'PT' },
      { id: 'cod', name: 'DR Congo', group: 'K', rating: 74, countryCode: 'CD' },
      { id: 'uzb', name: 'Uzbekistan', group: 'K', rating: 72, countryCode: 'UZ' },
      { id: 'col', name: 'Colombia', group: 'K', rating: 85, countryCode: 'CO' },
    ],
  },
  {
    name: 'L',
    teams: [
      { id: 'eng', name: 'England', group: 'L', rating: 89, countryCode: 'GB' },
      { id: 'cro', name: 'Croatia', group: 'L', rating: 82, countryCode: 'HR' },
      { id: 'gha', name: 'Ghana', group: 'L', rating: 72, countryCode: 'GH' },
      { id: 'pan', name: 'Panama', group: 'L', rating: 69, countryCode: 'PA' },
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

const venueMetaByCity: Record<string, VenueMeta> = {
  'Mexico City': { countryCode: 'MX', timeZone: 'America/Mexico_City', altitudeMeters: 2240 },
  Guadalajara: { countryCode: 'MX', timeZone: 'America/Mexico_City', altitudeMeters: 1560 },
  Monterrey: { countryCode: 'MX', timeZone: 'America/Monterrey', altitudeMeters: 540 },
  Atlanta: { countryCode: 'US', timeZone: 'America/New_York', altitudeMeters: 320 },
  Toronto: { countryCode: 'CA', timeZone: 'America/Toronto', altitudeMeters: 75 },
  'San Francisco Bay Area': { countryCode: 'US', timeZone: 'America/Los_Angeles', altitudeMeters: 15 },
  'Los Angeles': { countryCode: 'US', timeZone: 'America/Los_Angeles', altitudeMeters: 90 },
  Vancouver: { countryCode: 'CA', timeZone: 'America/Vancouver', altitudeMeters: 70 },
  Seattle: { countryCode: 'US', timeZone: 'America/Los_Angeles', altitudeMeters: 50 },
  'New York/New Jersey': { countryCode: 'US', timeZone: 'America/New_York', altitudeMeters: 5 },
  Boston: { countryCode: 'US', timeZone: 'America/New_York', altitudeMeters: 45 },
  Philadelphia: { countryCode: 'US', timeZone: 'America/New_York', altitudeMeters: 12 },
  Miami: { countryCode: 'US', timeZone: 'America/New_York', altitudeMeters: 2 },
  Houston: { countryCode: 'US', timeZone: 'America/Chicago', altitudeMeters: 13 },
  'Kansas City': { countryCode: 'US', timeZone: 'America/Chicago', altitudeMeters: 270 },
  Dallas: { countryCode: 'US', timeZone: 'America/Chicago', altitudeMeters: 131 },
}

const teamProfileOverrides: Partial<Record<string, Partial<TeamModelProfile>>> = {
  arg: { chanceCreation: 1.34, finishing: 1.31, defensiveShape: 1.26, tournamentExperience: 1.32, volatility: 0.92 },
  bra: { chanceCreation: 1.33, finishing: 1.26, defensiveShape: 1.22, setPieces: 1.11, tournamentExperience: 1.3 },
  esp: { chanceCreation: 1.31, finishing: 1.2, defensiveShape: 1.24, tournamentExperience: 1.24, volatility: 0.9 },
  fra: { chanceCreation: 1.29, finishing: 1.28, defensiveShape: 1.18, setPieces: 1.13, tournamentExperience: 1.28 },
  ger: { chanceCreation: 1.28, finishing: 1.22, defensiveShape: 1.17, setPieces: 1.14, tournamentExperience: 1.26 },
  por: { chanceCreation: 1.24, finishing: 1.22, defensiveShape: 1.14, setPieces: 1.16, tournamentExperience: 1.2 },
  eng: { chanceCreation: 1.26, finishing: 1.22, defensiveShape: 1.16, setPieces: 1.17, tournamentExperience: 1.18 },
  ned: { chanceCreation: 1.2, finishing: 1.17, defensiveShape: 1.16, setPieces: 1.14, tournamentExperience: 1.16 },
  uru: { chanceCreation: 1.14, finishing: 1.14, defensiveShape: 1.17, setPieces: 1.12, tournamentExperience: 1.2 },
  col: { chanceCreation: 1.18, finishing: 1.12, defensiveShape: 1.13, setPieces: 1.08, tournamentExperience: 1.08 },
  mar: { chanceCreation: 1.08, finishing: 1.06, defensiveShape: 1.18, setPieces: 1.1, tournamentExperience: 1.08 },
  cro: { chanceCreation: 1.08, finishing: 1.04, defensiveShape: 1.11, setPieces: 1.08, tournamentExperience: 1.18 },
  usa: { chanceCreation: 1.04, finishing: 1.02, defensiveShape: 1.01, setPieces: 1.02, tournamentExperience: 0.98, volatility: 1.02 },
  mex: { chanceCreation: 1.02, finishing: 1.01, defensiveShape: 1.02, setPieces: 1.06, tournamentExperience: 1.04, volatility: 1.03 },
  can: { chanceCreation: 1.03, finishing: 1.01, defensiveShape: 0.98, setPieces: 1.01, tournamentExperience: 0.94, volatility: 1.06 },
  jpn: { chanceCreation: 1.06, finishing: 1.05, defensiveShape: 1.06, setPieces: 1.01, tournamentExperience: 1.0, volatility: 0.96 },
  sen: { chanceCreation: 1.07, finishing: 1.05, defensiveShape: 1.08, setPieces: 1.05, tournamentExperience: 1.02 },
  sui: { chanceCreation: 1.02, finishing: 1.0, defensiveShape: 1.07, setPieces: 1.03, tournamentExperience: 1.04, volatility: 0.95 },
  ecu: { chanceCreation: 1.04, finishing: 1.0, defensiveShape: 1.04, setPieces: 1.02, tournamentExperience: 0.98, volatility: 0.97 },
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

function getFlagUrl(team: Team) {
  if (team.id === 'eng') {
    return 'https://upload.wikimedia.org/wikipedia/en/b/be/Flag_of_England.svg'
  }

  if (team.id === 'sco') {
    return 'https://upload.wikimedia.org/wikipedia/commons/1/10/Flag_of_Scotland.svg'
  }

  return `https://flagcdn.com/${team.countryCode.toLowerCase()}.svg`
}

function createInitialMatches(): Match[] {
  return groupDefinitions.flatMap((groupDefinition) =>
    groupMatchTemplate.map(([homeIndex, awayIndex, kickoffLabel], roundIndex) => {
      const scheduleItem = groupScheduleSource[groupDefinition.name][roundIndex]
      const kickoff = parseEtDateTime(scheduleItem.date, scheduleItem.et)
      const [venueCity, stadium] = scheduleItem.venue.split('|').map((part) => part.trim())
      const localTimeZone = venueMetaByCity[venueCity]?.timeZone ?? 'UTC'
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

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function getAttackStrength(team: Team) {
  const base = 0.82 + (team.rating - 70) / 42
  const styleOffset = ((teamHash(team) % 7) - 3) * 0.035
  return clamp(base + styleOffset, 0.65, 1.75)
}

function getDefenseStrength(team: Team) {
  const base = 0.84 + (team.rating - 70) / 48
  const styleOffset = (((teamHash(team) * 3) % 7) - 3) * 0.03
  return clamp(base + styleOffset, 0.65, 1.7)
}

function getTeamModelProfile(team: Team): TeamModelProfile {
  const baseFromRating = (team.rating - 75) / 100
  const chanceCreation = clamp(0.95 + baseFromRating + ((teamHash(team) % 5) - 2) * 0.025, 0.78, 1.35)
  const finishing = clamp(0.94 + baseFromRating * 0.9 + (((teamHash(team) * 5) % 5) - 2) * 0.02, 0.8, 1.32)
  const defensiveShape = clamp(0.94 + baseFromRating * 0.85 + (((teamHash(team) * 7) % 5) - 2) * 0.02, 0.8, 1.3)
  const setPieces = clamp(0.96 + baseFromRating * 0.55 + (((teamHash(team) * 11) % 5) - 2) * 0.02, 0.82, 1.22)
  const tournamentExperience = clamp(0.94 + baseFromRating * 0.9, 0.82, 1.28)
  const volatility = clamp(1 + (((teamHash(team) * 13) % 7) - 3) * 0.03, 0.86, 1.16)
  const overrides = teamProfileOverrides[team.id]

  return {
    chanceCreation: overrides?.chanceCreation ?? chanceCreation,
    finishing: overrides?.finishing ?? finishing,
    defensiveShape: overrides?.defensiveShape ?? defensiveShape,
    setPieces: overrides?.setPieces ?? setPieces,
    tournamentExperience: overrides?.tournamentExperience ?? tournamentExperience,
    volatility: overrides?.volatility ?? volatility,
  }
}

function getFormFactor(team: Team, attempt: number) {
  const variation = attempt * 11
  const formSeed = ((teamHash(team) + variation) % 9) - 4
  return formSeed * 0.025
}

function getHostVenueBoost(team: Team, venueCity: string) {
  const venueMeta = venueMetaByCity[venueCity]

  if (!venueMeta || team.hostCountry !== venueMeta.countryCode) {
    return 0
  }

  let boost = 0.14

  if (team.hostCountry === 'MX') {
    boost += 0.05
  }

  if (venueMeta.altitudeMeters >= 1500) {
    boost += team.hostCountry === 'MX' ? 0.08 : 0.02
  }

  if (venueCity === 'Mexico City' && team.hostCountry === 'MX') {
    boost += 0.05
  }

  return boost
}

function getAltitudeAdjustment(team: Team, venueCity: string) {
  const venueMeta = venueMetaByCity[venueCity]

  if (!venueMeta || venueMeta.altitudeMeters < 1200) {
    return 0
  }

  if (team.hostCountry === 'MX' && venueMeta.countryCode === 'MX') {
    return 0.04
  }

  return -0.05
}

function poissonProbability(goals: number, lambda: number) {
  let factorial = 1

  for (let index = 2; index <= goals; index += 1) {
    factorial *= index
  }

  return (Math.exp(-lambda) * lambda ** goals) / factorial
}

function predictMatch(homeTeam: Team, awayTeam: Team, venueCity: string, attempt = 0): Prediction {
  const ratingGap = homeTeam.rating - awayTeam.rating
  const homeAttack = getAttackStrength(homeTeam)
  const awayAttack = getAttackStrength(awayTeam)
  const homeDefense = getDefenseStrength(homeTeam)
  const awayDefense = getDefenseStrength(awayTeam)
  const homeProfile = getTeamModelProfile(homeTeam)
  const awayProfile = getTeamModelProfile(awayTeam)
  const formSwing = getFormFactor(homeTeam, attempt) - getFormFactor(awayTeam, attempt)
  const homeHostBoost = getHostVenueBoost(homeTeam, venueCity)
  const awayHostBoost = getHostVenueBoost(awayTeam, venueCity)
  const homeAltitudeAdjustment = getAltitudeAdjustment(homeTeam, venueCity)
  const awayAltitudeAdjustment = getAltitudeAdjustment(awayTeam, venueCity)
  const creationSwing = homeProfile.chanceCreation - awayProfile.chanceCreation
  const finishingSwing = homeProfile.finishing - awayProfile.finishing
  const defensiveSwing = homeProfile.defensiveShape - awayProfile.defensiveShape
  const setPieceSwing = homeProfile.setPieces - awayProfile.setPieces
  const experienceSwing = homeProfile.tournamentExperience - awayProfile.tournamentExperience
  const homeExpectedGoals = clamp(
    1.18 +
      homeAttack * 0.62 -
      awayDefense * 0.33 +
      ratingGap / 90 +
      formSwing +
      creationSwing * 0.18 +
      finishingSwing * 0.12 +
      setPieceSwing * 0.08 +
      experienceSwing * 0.05 -
      (awayProfile.defensiveShape - 1) * 0.12 +
      homeHostBoost -
      awayHostBoost * 0.4 +
      homeAltitudeAdjustment,
    0.2,
    3.8,
  )
  const awayExpectedGoals = clamp(
    1.02 +
      awayAttack * 0.58 -
      homeDefense * 0.31 -
      ratingGap / 105 -
      formSwing * 0.7 +
      (awayProfile.chanceCreation - homeProfile.chanceCreation) * 0.17 +
      (awayProfile.finishing - homeProfile.finishing) * 0.12 +
      (awayProfile.setPieces - homeProfile.setPieces) * 0.08 +
      (awayProfile.tournamentExperience - homeProfile.tournamentExperience) * 0.05 -
      (homeProfile.defensiveShape - 1) * 0.12 +
      awayHostBoost -
      homeHostBoost * 0.45 +
      awayAltitudeAdjustment,
    0.15,
    3.4,
  )

  let homeWinProbability = 0
  let drawProbability = 0
  let awayWinProbability = 0
  let bestScoreProbability = -1
  let homeGoals = 0
  let awayGoals = 0

  for (let homeGoalCount = 0; homeGoalCount <= 6; homeGoalCount += 1) {
    const homeProbability = poissonProbability(homeGoalCount, homeExpectedGoals)

    for (let awayGoalCount = 0; awayGoalCount <= 6; awayGoalCount += 1) {
      const awayProbability = poissonProbability(awayGoalCount, awayExpectedGoals)
      const scoreProbability = homeProbability * awayProbability

      if (homeGoalCount > awayGoalCount) {
        homeWinProbability += scoreProbability
      } else if (homeGoalCount < awayGoalCount) {
        awayWinProbability += scoreProbability
      } else {
        drawProbability += scoreProbability
      }

      if (scoreProbability > bestScoreProbability) {
        bestScoreProbability = scoreProbability
        homeGoals = homeGoalCount
        awayGoals = awayGoalCount
      }
    }
  }

  const homeWinPercent = roundTo(homeWinProbability * 100, 1)
  const drawPercent = roundTo(drawProbability * 100, 1)
  const awayWinPercent = roundTo(awayWinProbability * 100, 1)
  const confidence = clamp(Math.round(Math.max(homeWinPercent, drawPercent, awayWinPercent)), 40, 92)
  const modelStrength = clamp(
    Math.round(
      58 +
        Math.abs(ratingGap) * 0.45 +
        Math.abs(creationSwing + finishingSwing + defensiveSwing + experienceSwing) * 14 +
        Math.abs(homeHostBoost - awayHostBoost) * 20,
    ),
    50,
    94,
  )
  const outcome =
    homeGoals === awayGoals
      ? 'Draw looks plausible'
      : homeGoals > awayGoals
        ? `${homeTeam.name} look stronger`
        : `${awayTeam.name} look stronger`
  const venueMeta = venueMetaByCity[venueCity]
  const venueContextSummary =
    homeHostBoost > 0 || awayHostBoost > 0
      ? 'Host-country context is included for this venue.'
      : venueMeta && venueMeta.altitudeMeters >= 1200
        ? 'This is treated as a neutral match with altitude impact.'
        : 'This is treated as a neutral-venue match.'
  const styleContextSummary =
    Math.abs(creationSwing) + Math.abs(finishingSwing) + Math.abs(defensiveSwing) > 0.2
      ? 'Team-profile factors such as chance creation, finishing and defensive shape are included.'
      : 'The team-profile layer sees these squads as relatively balanced.'

  return {
    homeGoals,
    awayGoals,
    confidence,
    homeWinProbability: homeWinPercent,
    drawProbability: drawPercent,
    awayWinProbability: awayWinPercent,
    homeExpectedGoals: roundTo(homeExpectedGoals, 2),
    awayExpectedGoals: roundTo(awayExpectedGoals, 2),
    modelStrength,
    summary:
      attempt > 0
        ? `${outcome}. This refreshed model run uses probabilistic xG, venue context and team-profile inputs. ${venueContextSummary} ${styleContextSummary}`
        : `${outcome}. This version uses expected goals, Poisson score distribution, venue context and team-profile inputs. ${venueContextSummary} ${styleContextSummary}`,
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
  const [activeView, setActiveView] = useState<ViewMode>('group')
  const standings = buildStandings(matches)
  const rankedThirds = rankThirdPlacedTeams(standings)
  const roundOf32 = buildRoundOf32(standings, rankedThirds)
  const acceptedCount = matches.filter((match) => match.acceptedPrediction).length

  function handleTryToPredict(matchId: string) {
    setMatches((currentMatches) =>
      currentMatches.map((match) =>
        match.id === matchId
          ? (() => {
              const nextAttempt = (match.predictionAttempt ?? 0) + 1

              return {
                ...match,
                predictionAttempt: nextAttempt,
                manualEditorOpen: false,
                prediction: predictMatch(match.homeTeam, match.awayTeam, match.venueCity, nextAttempt),
              }
            })()
          : match,
      ),
    )
  }

  function handleTryToPredictGroup(groupName: string) {
    setMatches((currentMatches) =>
      currentMatches.map((match) => {
        if (match.group !== groupName) {
          return match
        }

        const nextAttempt = (match.predictionAttempt ?? 0) + 1

        return {
          ...match,
          predictionAttempt: nextAttempt,
          manualEditorOpen: false,
          prediction: predictMatch(match.homeTeam, match.awayTeam, match.venueCity, nextAttempt),
        }
      }),
    )
  }

  function handleAcceptAllGroup(groupName: string) {
    setMatches((currentMatches) =>
      currentMatches.map((match) =>
        match.group === groupName && match.prediction
          ? {
              ...match,
              acceptedPrediction: match.prediction,
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

  function handleResetMatch(matchId: string) {
    setMatches((currentMatches) =>
      currentMatches.map((match) =>
        match.id === matchId
          ? {
              ...match,
              predictionAttempt: 0,
              manualEditorOpen: false,
              manualHomeGoals: '',
              manualAwayGoals: '',
              prediction: undefined,
              acceptedPrediction: undefined,
            }
          : match,
      ),
    )
  }

  function handleToggleManualEditor(matchId: string) {
    setMatches((currentMatches) =>
      currentMatches.map((match) => {
        if (match.id !== matchId) {
          return match
        }

        const resultToPrefill = match.acceptedPrediction ?? match.prediction

        return {
          ...match,
          manualEditorOpen: !match.manualEditorOpen,
          manualHomeGoals: resultToPrefill ? String(resultToPrefill.homeGoals) : (match.manualHomeGoals ?? ''),
          manualAwayGoals: resultToPrefill ? String(resultToPrefill.awayGoals) : (match.manualAwayGoals ?? ''),
        }
      }),
    )
  }

  function handleManualScoreChange(matchId: string, side: 'home' | 'away', value: string) {
    if (!/^\d{0,2}$/.test(value)) {
      return
    }

    setMatches((currentMatches) =>
      currentMatches.map((match) =>
        match.id === matchId
          ? {
              ...match,
              manualHomeGoals: side === 'home' ? value : (match.manualHomeGoals ?? ''),
              manualAwayGoals: side === 'away' ? value : (match.manualAwayGoals ?? ''),
            }
          : match,
      ),
    )
  }

  function handleSaveManualPrediction(matchId: string) {
    setMatches((currentMatches) =>
      currentMatches.map((match) => {
        if (match.id !== matchId) {
          return match
        }

        if (match.manualHomeGoals === undefined || match.manualAwayGoals === undefined) {
          return match
        }

        if (match.manualHomeGoals === '' || match.manualAwayGoals === '') {
          return match
        }

        return {
          ...match,
          manualEditorOpen: false,
          prediction: {
            homeGoals: Number(match.manualHomeGoals),
            awayGoals: Number(match.manualAwayGoals),
            confidence: 100,
            homeWinProbability: Number(match.manualHomeGoals) > Number(match.manualAwayGoals) ? 100 : 0,
            drawProbability: Number(match.manualHomeGoals) === Number(match.manualAwayGoals) ? 100 : 0,
            awayWinProbability: Number(match.manualAwayGoals) > Number(match.manualHomeGoals) ? 100 : 0,
            homeExpectedGoals: Number(match.manualHomeGoals),
            awayExpectedGoals: Number(match.manualAwayGoals),
            modelStrength: 100,
            summary: 'Manual prediction entered by the user.',
          },
        }
      }),
    )
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

      <section className="view-switcher">
        <button
          type="button"
          className={`tab-button ${activeView === 'group' ? 'tab-button-active' : ''}`}
          onClick={() => setActiveView('group')}
        >
          Group Phase
        </button>
        <button
          type="button"
          className={`tab-button ${activeView === 'bracket' ? 'tab-button-active' : ''}`}
          onClick={() => setActiveView('bracket')}
        >
          Bracket Phase
        </button>
      </section>

      {activeView === 'group' ? (
        <>
          <section className="panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Standings</p>
                <h2>Group tables A-L</h2>
              </div>
            </div>

            <div className="standings-grid">
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
                          <td>
                            <span className="table-team">
                              <img className="team-flag" src={getFlagUrl(row.team)} alt={`Flag of ${row.team.name}`} />
                              <span>{row.team.name}</span>
                            </span>
                          </td>
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
                <p className="eyebrow">Group stage</p>
                <h2>All 72 group matches</h2>
              </div>
              <span className="badge">paired by round</span>
            </div>

            <div className="group-list">
              {groupDefinitions.map((groupDefinition) => (
                <section key={groupDefinition.name} className="group-card">
                  <div className="group-card-header">
                  <div>
                    <p className="eyebrow">Group {groupDefinition.name}</p>
                    <div className="group-team-list" aria-label={`Teams in group ${groupDefinition.name}`}>
                        {groupDefinition.teams.map((team) => (
                          <span key={team.id} className="table-team">
                            <img className="team-flag" src={getFlagUrl(team)} alt={`Flag of ${team.name}`} />
                            <span>{team.name}</span>
                      </span>
                    ))}
                  </div>
                  </div>
                  <div className="group-actions">
                    <button
                      type="button"
                      className="secondary-button group-predict-button"
                      onClick={() => handleTryToPredictGroup(groupDefinition.name)}
                    >
                      Try to predict Group
                    </button>
                    <button
                      type="button"
                      className="secondary-button group-predict-button"
                      onClick={() => handleAcceptAllGroup(groupDefinition.name)}
                      disabled={
                        !matches.some((match) => match.group === groupDefinition.name && Boolean(match.prediction))
                      }
                    >
                      Accept All
                    </button>
                    <span className="badge">
                      {
                        matches.filter(
                          (match) => match.group === groupDefinition.name && Boolean(match.acceptedPrediction),
                        ).length
                      }
                      /6 accepted
                    </span>
                  </div>
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
                            <div className="team-entry">
                              <strong className="team-name">
                                <img className="team-flag" src={getFlagUrl(match.homeTeam)} alt={`Flag of ${match.homeTeam.name}`} />
                                <span>{match.homeTeam.name}</span>
                              </strong>
                              <span>rating {match.homeTeam.rating}</span>
                            </div>
                            <div className="score-pill">
                              {match.acceptedPrediction
                                ? `${match.acceptedPrediction.homeGoals} : ${match.acceptedPrediction.awayGoals}`
                                : match.prediction
                                  ? `${match.prediction.homeGoals} : ${match.prediction.awayGoals}`
                                  : 'vs'}
                            </div>
                            <div className="team-entry">
                              <strong className="team-name">
                                <img className="team-flag" src={getFlagUrl(match.awayTeam)} alt={`Flag of ${match.awayTeam.name}`} />
                                <span>{match.awayTeam.name}</span>
                              </strong>
                              <span>rating {match.awayTeam.rating}</span>
                            </div>
                          </div>

                      {match.prediction ? (
                        <div className="prediction-box">
                          <div className="prediction-metrics">
                            <span className="metric-pill">{match.homeTeam.name} {match.prediction.homeWinProbability}%</span>
                            <span className="metric-pill">Draw {match.prediction.drawProbability}%</span>
                            <span className="metric-pill">{match.awayTeam.name} {match.prediction.awayWinProbability}%</span>
                            <span className="metric-pill">
                              xG {match.prediction.homeExpectedGoals} - {match.prediction.awayExpectedGoals}
                            </span>
                            <span className="metric-pill">Model strength {match.prediction.modelStrength}%</span>
                          </div>
                          <p>
                            <strong>{match.prediction.confidence}% confidence.</strong> {match.prediction.summary}
                          </p>
                            </div>
                          ) : (
                          <div className="prediction-box prediction-box-muted">
                            <p>Generate a baseline score first, then accept it into the standings.</p>
                          </div>
                        )}

                      {match.manualEditorOpen ? (
                        <div className="manual-entry-box">
                          <div className="manual-score-row">
                            <label className="manual-score-field">
                              <span>{match.homeTeam.name}</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={match.manualHomeGoals ?? ''}
                                onChange={(event) => handleManualScoreChange(match.id, 'home', event.target.value)}
                              />
                            </label>
                            <label className="manual-score-field">
                              <span>{match.awayTeam.name}</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={match.manualAwayGoals ?? ''}
                                onChange={(event) => handleManualScoreChange(match.id, 'away', event.target.value)}
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleSaveManualPrediction(match.id)}
                            disabled={match.manualHomeGoals === '' || match.manualAwayGoals === ''}
                          >
                            Save manual prediction
                          </button>
                        </div>
                      ) : null}

                      <div className="action-row">
                        <button type="button" className="primary-button" onClick={() => handleTryToPredict(match.id)}>
                          {match.prediction ? 'Predict again' : 'Try to predict'}
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleToggleManualEditor(match.id)}
                        >
                          {match.manualEditorOpen ? 'Close manual entry' : 'Manual prediction'}
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleAccept(match.id)}
                          disabled={!match.prediction}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleResetMatch(match.id)}
                          disabled={
                            !match.prediction &&
                            !match.acceptedPrediction &&
                            !match.manualHomeGoals &&
                            !match.manualAwayGoals
                          }
                        >
                          Reset
                        </button>
                      </div>
                    </article>
                  ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="layout-grid layout-grid-bottom">
          <aside className="sidebar">
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
      )}
    </main>
  )
}

export default App
