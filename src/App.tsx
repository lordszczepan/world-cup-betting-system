import { useCallback, useEffect, useState, type FormEvent } from 'react'
import './App.css'
import { getAnnexCAssignment } from './annexC'
import { knockoutScheduleByMatchId, type KnockoutScheduleItem } from './knockoutSchedule'

type ViewMode = 'group' | 'bracket'
type BookmakerSourceKey = 'betfair' | 'pinnacle' | 'fanduel' | 'sts'
type BrokerSlotKey = 'broker1' | 'broker2' | 'broker3'

type TeamModelProfile = {
  chanceCreation: number
  finishing: number
  defensiveShape: number
  setPieces: number
  tournamentExperience: number
  volatility: number
}

type TeamRecentData = {
  lastFivePointsPerMatch: number
  goalsForPerMatch: number
  goalsAgainstPerMatch: number
  cleanSheetRate: number
  injuryBurden: number
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
  factorBreakdown: PredictionFactor[]
  inputSnapshot: PredictionInputSnapshot[]
  marketSourceKey?: BookmakerSourceKey
  knockoutWinnerTeamId?: string
  knockoutResolution?: 'regularTime' | 'extraTime' | 'penalties'
  penaltyScore?: string
}

type PredictionFactor = {
  label: string
  impact: number
}

type PredictionInputSnapshot = {
  label: string
  value: string
}

type GroupStateContext = {
  homeGroupPosition: number
  awayGroupPosition: number
  homePointsBefore: number
  awayPointsBefore: number
  homeRotationRisk: number
  awayRotationRisk: number
  homeMotivationBoost: number
  awayMotivationBoost: number
  drawToleranceSwing: number
}

type PredictionHistoryEntry = {
  id: string
  createdAt: string
  action: 'generated' | 'accepted' | 'manual' | 'reset' | 'invalidated' | 'live_refresh'
  stage: 'group' | 'knockout'
  summary: string
  source: 'model' | 'manual' | 'system'
  prediction?: Prediction
}

type TeamLiveForm = TeamRecentData & {
  source: string
  refreshedAt: string
  sampleSize: number
}

type BookmakerOddsSnapshot = {
  sourceKey: BookmakerSourceKey
  sourceLabel: string
  homeOdds: number
  drawOdds: number
  awayOdds: number
  homeProbability: number
  drawProbability: number
  awayProbability: number
  refreshedAt: string
  note?: string
}

type MatchBookmakerOdds = Partial<Record<BookmakerSourceKey, BookmakerOddsSnapshot>>

type MarketConsensusSnapshot = {
  sourceKeys: BookmakerSourceKey[]
  sourceLabel: string
  homeProbability: number
  drawProbability: number
  awayProbability: number
  refreshedAt: string
}

type ActualResultSnapshot = {
  homeGoals: number
  awayGoals: number
  sourceLabel: string
  refreshedAt: string
  note?: string
}

type MarketTarget = {
  id: string
  kickoffUtc: string
  homeTeam: Team
  awayTeam: Team
}

type BookmakerSourceDefinition = {
  key: BookmakerSourceKey
  label: string
  shortLabel: string
  accent: string
  featured: boolean
  note?: string
}

type MarketApiState = {
  availableSources: BookmakerSourceDefinition[]
  brokerSlots: Record<BrokerSlotKey, BookmakerSourceKey>
  oddsByMatchId: Record<string, MatchBookmakerOdds>
  consensusByMatchId: Record<string, MarketConsensusSnapshot>
  actualResultsByMatchId: Record<string, ActualResultSnapshot>
  trustedSources: BookmakerSourceKey[]
  marketStatus: string
  actualResultStatus: string
  stsStatus: string
  latestRefreshAt?: string
  latestActualResultsRefreshAt?: string
  apiKeyConfigured: boolean
  oddsApiUsage?: {
    remaining: string | null
    used: string | null
    last: string | null
  }
}

type RefreshFeedback = {
  kind: 'idle' | 'loading' | 'success' | 'error'
  title: string
  details: string[]
}

type BackendConnectionStatus = 'checking' | 'online' | 'offline'

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
  venueCountryCode: 'MX' | 'CA' | 'US'
  stadium: string
  restDaysHome: number
  restDaysAway: number
  travelKmHome: number
  travelKmAway: number
  homeTeam: Team
  awayTeam: Team
  predictionAttempt?: number
  manualEditorOpen?: boolean
  manualHomeGoals?: string
  manualAwayGoals?: string
  prediction?: Prediction
  acceptedPrediction?: Prediction
  predictionHistory?: PredictionHistoryEntry[]
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
  routingMode: 'official' | 'provisional'
  note?: string
}

type KnockoutStage = 'roundOf32' | 'roundOf16' | 'quarterFinals' | 'semiFinals' | 'thirdPlace' | 'final'

type KnockoutMatch = {
  id: string
  label: string
  stage: KnockoutStage
  homeSlot: string
  awaySlot: string
  predictionAttempt?: number
  manualEditorOpen?: boolean
  manualHomeGoals?: string
  manualAwayGoals?: string
  prediction?: Prediction
  acceptedPrediction?: Prediction
  lastResolvedHomeTeamId?: string
  lastResolvedAwayTeamId?: string
  predictionHistory?: PredictionHistoryEntry[]
}

type ResolvedKnockoutMatch = {
  match: KnockoutMatch
  homeTeam: Team | null
  awayTeam: Team | null
  displayHomeSlot: string
  displayAwaySlot: string
  schedule: KnockoutMatchScheduleContext | null
  note?: string
  lockReasons: string[]
}

type KnockoutMatchScheduleContext = KnockoutScheduleItem & {
  kickoffUtc: string
  localDateLabel: string
  localTimeLabel: string
  polishDateLabel: string
  polishTimeLabel: string
  restDaysHome: number
  restDaysAway: number
  travelKmHome: number
  travelKmAway: number
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
  latitude: number
  longitude: number
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
  'Mexico City': { countryCode: 'MX', timeZone: 'America/Mexico_City', altitudeMeters: 2240, latitude: 19.4326, longitude: -99.1332 },
  Guadalajara: { countryCode: 'MX', timeZone: 'America/Mexico_City', altitudeMeters: 1560, latitude: 20.6597, longitude: -103.3496 },
  Monterrey: { countryCode: 'MX', timeZone: 'America/Monterrey', altitudeMeters: 540, latitude: 25.6866, longitude: -100.3161 },
  Atlanta: { countryCode: 'US', timeZone: 'America/New_York', altitudeMeters: 320, latitude: 33.749, longitude: -84.388 },
  Toronto: { countryCode: 'CA', timeZone: 'America/Toronto', altitudeMeters: 75, latitude: 43.6532, longitude: -79.3832 },
  'San Francisco Bay Area': { countryCode: 'US', timeZone: 'America/Los_Angeles', altitudeMeters: 15, latitude: 37.3382, longitude: -121.8863 },
  'Los Angeles': { countryCode: 'US', timeZone: 'America/Los_Angeles', altitudeMeters: 90, latitude: 34.0522, longitude: -118.2437 },
  Vancouver: { countryCode: 'CA', timeZone: 'America/Vancouver', altitudeMeters: 70, latitude: 49.2827, longitude: -123.1207 },
  Seattle: { countryCode: 'US', timeZone: 'America/Los_Angeles', altitudeMeters: 50, latitude: 47.6062, longitude: -122.3321 },
  'New York/New Jersey': { countryCode: 'US', timeZone: 'America/New_York', altitudeMeters: 5, latitude: 40.7128, longitude: -74.006 },
  Boston: { countryCode: 'US', timeZone: 'America/New_York', altitudeMeters: 45, latitude: 42.3601, longitude: -71.0589 },
  Philadelphia: { countryCode: 'US', timeZone: 'America/New_York', altitudeMeters: 12, latitude: 39.9526, longitude: -75.1652 },
  Miami: { countryCode: 'US', timeZone: 'America/New_York', altitudeMeters: 2, latitude: 25.7617, longitude: -80.1918 },
  Houston: { countryCode: 'US', timeZone: 'America/Chicago', altitudeMeters: 13, latitude: 29.7604, longitude: -95.3698 },
  'Kansas City': { countryCode: 'US', timeZone: 'America/Chicago', altitudeMeters: 270, latitude: 39.0997, longitude: -94.5786 },
  Dallas: { countryCode: 'US', timeZone: 'America/Chicago', altitudeMeters: 131, latitude: 32.7767, longitude: -96.797 },
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

const teamRecentDataOverrides: Partial<Record<string, Partial<TeamRecentData>>> = {
  arg: { lastFivePointsPerMatch: 2.4, goalsForPerMatch: 2.2, goalsAgainstPerMatch: 0.6, cleanSheetRate: 0.6, injuryBurden: 0.06 },
  bra: { lastFivePointsPerMatch: 2.2, goalsForPerMatch: 2.1, goalsAgainstPerMatch: 0.7, cleanSheetRate: 0.52, injuryBurden: 0.08 },
  esp: { lastFivePointsPerMatch: 2.3, goalsForPerMatch: 2.0, goalsAgainstPerMatch: 0.7, cleanSheetRate: 0.56, injuryBurden: 0.05 },
  fra: { lastFivePointsPerMatch: 2.2, goalsForPerMatch: 1.9, goalsAgainstPerMatch: 0.8, cleanSheetRate: 0.5, injuryBurden: 0.09 },
  ger: { lastFivePointsPerMatch: 2.0, goalsForPerMatch: 1.8, goalsAgainstPerMatch: 0.9, cleanSheetRate: 0.44, injuryBurden: 0.08 },
  por: { lastFivePointsPerMatch: 2.1, goalsForPerMatch: 1.9, goalsAgainstPerMatch: 0.8, cleanSheetRate: 0.48, injuryBurden: 0.06 },
  eng: { lastFivePointsPerMatch: 2.2, goalsForPerMatch: 1.95, goalsAgainstPerMatch: 0.85, cleanSheetRate: 0.46, injuryBurden: 0.07 },
  usa: { lastFivePointsPerMatch: 1.7, goalsForPerMatch: 1.45, goalsAgainstPerMatch: 1.1, cleanSheetRate: 0.28, injuryBurden: 0.11 },
  mex: { lastFivePointsPerMatch: 1.6, goalsForPerMatch: 1.35, goalsAgainstPerMatch: 1.0, cleanSheetRate: 0.32, injuryBurden: 0.08 },
  can: { lastFivePointsPerMatch: 1.6, goalsForPerMatch: 1.4, goalsAgainstPerMatch: 1.2, cleanSheetRate: 0.25, injuryBurden: 0.09 },
  mar: { lastFivePointsPerMatch: 1.95, goalsForPerMatch: 1.5, goalsAgainstPerMatch: 0.8, cleanSheetRate: 0.46, injuryBurden: 0.05 },
  uru: { lastFivePointsPerMatch: 1.9, goalsForPerMatch: 1.55, goalsAgainstPerMatch: 0.85, cleanSheetRate: 0.42, injuryBurden: 0.06 },
  col: { lastFivePointsPerMatch: 2.0, goalsForPerMatch: 1.65, goalsAgainstPerMatch: 0.8, cleanSheetRate: 0.45, injuryBurden: 0.05 },
  jpn: { lastFivePointsPerMatch: 1.95, goalsForPerMatch: 1.7, goalsAgainstPerMatch: 0.9, cleanSheetRate: 0.38, injuryBurden: 0.05 },
  sen: { lastFivePointsPerMatch: 1.8, goalsForPerMatch: 1.55, goalsAgainstPerMatch: 0.9, cleanSheetRate: 0.35, injuryBurden: 0.07 },
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

const storageKeys = {
  groupMatches: 'world-cup-betting-system/group-matches',
  knockoutMatches: 'world-cup-betting-system/knockout-matches',
  activeView: 'world-cup-betting-system/active-view',
  liveTeamForm: 'world-cup-betting-system/live-team-form',
} as const

const bookmakerSources: BookmakerSourceDefinition[] = [
  { key: 'betfair', label: 'Betfair Exchange', shortLabel: 'BF', accent: '#f59e0b', featured: true },
  { key: 'pinnacle', label: 'Pinnacle', shortLabel: 'PN', accent: '#0f766e', featured: true },
  { key: 'sts', label: 'STS', shortLabel: 'STS', accent: '#dc2626', featured: true, note: 'No data for this match.' },
  { key: 'fanduel', label: 'FanDuel', shortLabel: 'FD', accent: '#2563eb', featured: false },
] as const

const defaultMarketApiState: MarketApiState = {
  availableSources: [...bookmakerSources],
  brokerSlots: {
    broker1: 'betfair',
    broker2: 'pinnacle',
    broker3: 'sts',
  },
  oddsByMatchId: {},
  consensusByMatchId: {},
  actualResultsByMatchId: {},
  trustedSources: ['betfair', 'pinnacle'],
  marketStatus: 'Market odds will appear here after the backend refresh runs.',
  actualResultStatus: 'Real match results will appear here after completed fixtures are available.',
  stsStatus: 'STS backend adapter is ready for mapped match URLs.',
  apiKeyConfigured: false,
  oddsApiUsage: undefined,
}

const defaultRefreshFeedback: RefreshFeedback = {
  kind: 'idle',
  title: 'No refresh is running right now.',
  details: ['Use `Refresh live data & odds` to update team form and backend market odds.'],
}

const liveSearchTeamNames: Partial<Record<string, string>> = {
  usa: 'United States',
  kor: 'South Korea',
  cze: 'Czech Republic',
  bih: 'Bosnia and Herzegovina',
  sco: 'Scotland',
  tur: 'Turkiye',
  cuw: 'Curacao',
  civ: "Ivory Coast",
  cpv: 'Cape Verde',
  irq: 'Iraq',
  alg: 'Algeria',
  cod: 'DR Congo',
  eng: 'England',
}

function findBookmakerSource(sourceKey: BookmakerSourceKey) {
  return bookmakerSources.find((source) => source.key === sourceKey) ?? bookmakerSources[0]
}

function getMarketBlendWeight(sourceKey: BookmakerSourceKey) {
  switch (sourceKey) {
    case 'betfair':
      return 0.42
    case 'pinnacle':
      return 0.38
    case 'fanduel':
      return 0.26
    case 'sts':
      return 0.24
    default:
      return 0.3
  }
}

function blendPercent(modelPercent: number, marketPercent: number, sourceKey: BookmakerSourceKey) {
  const weight = getMarketBlendWeight(sourceKey)
  return modelPercent * (1 - weight) + marketPercent * weight
}

function selectScoreFromOutcome(
  currentHomeGoals: number,
  currentAwayGoals: number,
  homeExpectedGoals: number,
  awayExpectedGoals: number,
  homePercent: number,
  drawPercent: number,
  awayPercent: number,
) {
  let nextHomeGoals = currentHomeGoals
  let nextAwayGoals = currentAwayGoals
  const preferredOutcome = Math.max(homePercent, drawPercent, awayPercent)

  if (preferredOutcome === drawPercent) {
    const sharedGoals = clamp(Math.round((homeExpectedGoals + awayExpectedGoals) / 2), 0, 3)
    nextHomeGoals = sharedGoals
    nextAwayGoals = sharedGoals
  } else if (preferredOutcome === homePercent && nextHomeGoals <= nextAwayGoals) {
    nextHomeGoals = clamp(Math.max(nextAwayGoals + 1, Math.round(homeExpectedGoals)), 1, 5)
    nextAwayGoals = clamp(Math.min(nextAwayGoals, Math.max(0, nextHomeGoals - 1)), 0, 4)
  } else if (preferredOutcome === awayPercent && nextAwayGoals <= nextHomeGoals) {
    nextAwayGoals = clamp(Math.max(nextHomeGoals + 1, Math.round(awayExpectedGoals)), 1, 5)
    nextHomeGoals = clamp(Math.min(nextHomeGoals, Math.max(0, nextAwayGoals - 1)), 0, 4)
  }

  return { homeGoals: nextHomeGoals, awayGoals: nextAwayGoals }
}

const knockoutMatchTemplates: Omit<KnockoutMatch, 'prediction' | 'acceptedPrediction'>[] = [
  ...fixedRoundOf32Rules.map(([id, homeSlot, awaySlot]) => ({
    id,
    label: `Match ${id}`,
    stage: 'roundOf32' as const,
    homeSlot,
    awaySlot,
  })),
  ...wildcardRoundOf32Rules.map(([id, homeSlot, allowedGroups]) => ({
    id,
    label: `Match ${id}`,
    stage: 'roundOf32' as const,
    homeSlot,
    awaySlot: `3${allowedGroups.join('/')}`,
  })),
  ...knockoutPath.roundOf16.map(([id, homeSlot, awaySlot]) => ({
    id,
    label: `Match ${id}`,
    stage: 'roundOf16' as const,
    homeSlot,
    awaySlot,
  })),
  ...knockoutPath.quarterFinals.map(([id, homeSlot, awaySlot]) => ({
    id,
    label: `Match ${id}`,
    stage: 'quarterFinals' as const,
    homeSlot,
    awaySlot,
  })),
  ...knockoutPath.semiFinals.map(([id, homeSlot, awaySlot]) => ({
    id,
    label: `Match ${id}`,
    stage: 'semiFinals' as const,
    homeSlot,
    awaySlot,
  })),
  {
    id: '103',
    label: 'Third-place match',
    stage: 'thirdPlace' as const,
    homeSlot: 'L101',
    awaySlot: 'L102',
  },
  {
    id: '104',
    label: 'Final',
    stage: 'final' as const,
    homeSlot: 'W101',
    awaySlot: 'W102',
  },
]

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

function parseVenueLocalDateTime(dateIso: string, localTime: string, venueCity: string) {
  const venueMeta = venueMetaByCity[venueCity]

  if (!venueMeta) {
    throw new Error(`Unsupported venue city for knockout schedule: ${venueCity}`)
  }

  const [year, month, day] = dateIso.split('-').map(Number)
  const [hours, minutes] = localTime.split(':').map(Number)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: venueMeta.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const target = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

  for (let hourOffset = -12; hourOffset <= 14; hourOffset += 1) {
    const candidate = new Date(Date.UTC(year, month - 1, day, hours - hourOffset, minutes))
    const parts = formatter.formatToParts(candidate)
    const candidateLabel = `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value} ${parts.find((part) => part.type === 'hour')?.value}:${parts.find((part) => part.type === 'minute')?.value}`

    if (candidateLabel === target) {
      return candidate
    }
  }

  return new Date(Date.UTC(year, month - 1, day, hours, minutes))
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

function getViewerTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function formatViewerDateTime(date: Date) {
  return formatDateTime(date, getViewerTimeZone())
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (/Failed to fetch/i.test(error.message)) {
      return 'Backend market server is unreachable from the browser. Start `npm run server` and try again.'
    }

    return error.message
  }

  return 'Unknown refresh error.'
}

function buildHistoryEntry(entry: Omit<PredictionHistoryEntry, 'id' | 'createdAt'>): PredictionHistoryEntry {
  return {
    ...entry,
    id: `${entry.stage}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  }
}

function appendHistory(
  existingHistory: PredictionHistoryEntry[] | undefined,
  entry: Omit<PredictionHistoryEntry, 'id' | 'createdAt'>,
) {
  return [...(existingHistory ?? []), buildHistoryEntry(entry)]
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
  return groupDefinitions.flatMap((groupDefinition) => {
    const lastAppearanceByTeam = new Map<string, { kickoff: Date; venueCity: string }>()

    return groupMatchTemplate.map(([homeIndex, awayIndex, kickoffLabel], roundIndex) => {
      const scheduleItem = groupScheduleSource[groupDefinition.name][roundIndex]
      const kickoff = parseEtDateTime(scheduleItem.date, scheduleItem.et)
      const [venueCity, stadium] = scheduleItem.venue.split('|').map((part) => part.trim())
      const venueMeta = venueMetaByCity[venueCity]
      const localTimeZone = venueMeta?.timeZone ?? 'UTC'
      const localDateTime = formatDateTime(kickoff, localTimeZone)
      const polishDateTime = formatDateTime(kickoff, 'Europe/Warsaw')
      const homeTeam = groupDefinition.teams[homeIndex]
      const awayTeam = groupDefinition.teams[awayIndex]
      const previousHomeAppearance = lastAppearanceByTeam.get(homeTeam.id)
      const previousAwayAppearance = lastAppearanceByTeam.get(awayTeam.id)
      const restDaysHome = previousHomeAppearance
        ? roundTo((kickoff.getTime() - previousHomeAppearance.kickoff.getTime()) / (1000 * 60 * 60 * 24), 1)
        : 7
      const restDaysAway = previousAwayAppearance
        ? roundTo((kickoff.getTime() - previousAwayAppearance.kickoff.getTime()) / (1000 * 60 * 60 * 24), 1)
        : 7
      const previousHomeVenue = previousHomeAppearance ? venueMetaByCity[previousHomeAppearance.venueCity] : null
      const previousAwayVenue = previousAwayAppearance ? venueMetaByCity[previousAwayAppearance.venueCity] : null
      const travelKmHome =
        previousHomeVenue && venueMeta
          ? Math.round(
              calculateDistanceKm(previousHomeVenue.latitude, previousHomeVenue.longitude, venueMeta.latitude, venueMeta.longitude),
            )
          : 0
      const travelKmAway =
        previousAwayVenue && venueMeta
          ? Math.round(
              calculateDistanceKm(previousAwayVenue.latitude, previousAwayVenue.longitude, venueMeta.latitude, venueMeta.longitude),
            )
          : 0

      lastAppearanceByTeam.set(homeTeam.id, { kickoff, venueCity })
      lastAppearanceByTeam.set(awayTeam.id, { kickoff, venueCity })

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
        venueCountryCode: venueMeta?.countryCode ?? 'US',
        stadium,
        restDaysHome,
        restDaysAway,
        travelKmHome,
        travelKmAway,
        homeTeam,
        awayTeam,
      }
    })
  })
}

function createInitialKnockoutMatches(): KnockoutMatch[] {
  return knockoutMatchTemplates.map((match) => ({
    ...match,
    predictionAttempt: 0,
    manualEditorOpen: false,
    manualHomeGoals: '',
    manualAwayGoals: '',
  }))
}

function loadStoredState<T>(storageKey: string) {
  if (typeof window === 'undefined') {
    return null as T | null
  }

  const rawValue = window.localStorage.getItem(storageKey)

  if (!rawValue) {
    return null as T | null
  }

  try {
    return JSON.parse(rawValue) as T
  } catch {
    return null as T | null
  }
}

function mergeStoredGroupMatches(storedMatches: Match[] | null) {
  const freshMatches = createInitialMatches()

  if (!storedMatches) {
    return freshMatches
  }

  const storedById = new Map(storedMatches.map((match) => [match.id, match]))

  return freshMatches.map((match) => {
    const storedMatch = storedById.get(match.id)

    return storedMatch
      ? {
          ...match,
          predictionAttempt: storedMatch.predictionAttempt ?? 0,
          manualEditorOpen: storedMatch.manualEditorOpen ?? false,
          manualHomeGoals: storedMatch.manualHomeGoals ?? '',
          manualAwayGoals: storedMatch.manualAwayGoals ?? '',
          prediction: storedMatch.prediction,
          acceptedPrediction: storedMatch.acceptedPrediction,
          predictionHistory: storedMatch.predictionHistory ?? [],
        }
      : match
  })
}

function mergeStoredKnockoutMatches(storedMatches: KnockoutMatch[] | null) {
  const freshMatches = createInitialKnockoutMatches()

  if (!storedMatches) {
    return freshMatches
  }

  const storedById = new Map(storedMatches.map((match) => [match.id, match]))

  return freshMatches.map((match) => {
    const storedMatch = storedById.get(match.id)

    return storedMatch
      ? {
          ...match,
          predictionAttempt: storedMatch.predictionAttempt ?? 0,
          manualEditorOpen: storedMatch.manualEditorOpen ?? false,
          manualHomeGoals: storedMatch.manualHomeGoals ?? '',
          manualAwayGoals: storedMatch.manualAwayGoals ?? '',
          prediction: storedMatch.prediction,
          acceptedPrediction: storedMatch.acceptedPrediction,
          lastResolvedHomeTeamId: storedMatch.lastResolvedHomeTeamId,
          lastResolvedAwayTeamId: storedMatch.lastResolvedAwayTeamId,
          predictionHistory: storedMatch.predictionHistory ?? [],
        }
      : match
  })
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

function formatSigned(value: number, digits = 2) {
  const rounded = roundTo(value, digits)
  return `${rounded >= 0 ? '+' : ''}${rounded}`
}

function getTeamRecentData(team: Team, liveTeamForm?: Partial<Record<string, TeamLiveForm>>): TeamRecentData {
  const liveOverride = liveTeamForm?.[team.id]

  if (liveOverride) {
    return {
      lastFivePointsPerMatch: liveOverride.lastFivePointsPerMatch,
      goalsForPerMatch: liveOverride.goalsForPerMatch,
      goalsAgainstPerMatch: liveOverride.goalsAgainstPerMatch,
      cleanSheetRate: liveOverride.cleanSheetRate,
      injuryBurden: liveOverride.injuryBurden,
    }
  }

  const ratingBase = (team.rating - 70) / 20
  const hashBase = teamHash(team)
  const overrides = teamRecentDataOverrides[team.id]

  return {
    lastFivePointsPerMatch: overrides?.lastFivePointsPerMatch ?? clamp(1.15 + ratingBase * 0.5 + (hashBase % 5) * 0.07, 0.8, 2.4),
    goalsForPerMatch: overrides?.goalsForPerMatch ?? clamp(1 + ratingBase * 0.42 + ((hashBase * 3) % 5) * 0.08, 0.7, 2.3),
    goalsAgainstPerMatch:
      overrides?.goalsAgainstPerMatch ?? clamp(1.35 - ratingBase * 0.26 + ((hashBase * 5) % 4) * 0.06, 0.55, 1.8),
    cleanSheetRate: overrides?.cleanSheetRate ?? clamp(0.18 + ratingBase * 0.12 + ((hashBase * 7) % 4) * 0.04, 0.1, 0.62),
    injuryBurden: overrides?.injuryBurden ?? clamp(0.05 + ((hashBase * 11) % 6) * 0.015, 0.04, 0.16),
  }
}

async function fetchLiveTeamForm(team: Team): Promise<TeamLiveForm | null> {
  const searchName = liveSearchTeamNames[team.id] ?? team.name
  const teamResponse = await fetch(`https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(searchName)}`)

  if (!teamResponse.ok) {
    return null
  }

  const teamPayload = (await teamResponse.json()) as { teams?: Array<{ idTeam?: string; strTeam?: string; strSport?: string }> }
  const selectedTeam = teamPayload.teams?.find((candidate) => candidate.strSport === 'Soccer' && candidate.idTeam)

  if (!selectedTeam?.idTeam) {
    return null
  }

  const lastEventsResponse = await fetch(`https://www.thesportsdb.com/api/v1/json/123/eventslast.php?id=${selectedTeam.idTeam}`)

  if (!lastEventsResponse.ok) {
    return null
  }

  const lastEventsPayload = (await lastEventsResponse.json()) as {
    results?: Array<{
      strHomeTeam?: string
      strAwayTeam?: string
      intHomeScore?: string
      intAwayScore?: string
      strStatus?: string
    }>
  }
  const results = (lastEventsPayload.results ?? [])
    .filter((event) => event.strStatus === 'Match Finished' || event.intHomeScore !== undefined)
    .slice(0, 5)

  if (results.length === 0) {
    return null
  }

  let points = 0
  let goalsFor = 0
  let goalsAgainst = 0
  let cleanSheets = 0

  results.forEach((event) => {
    const homeGoals = Number(event.intHomeScore ?? 0)
    const awayGoals = Number(event.intAwayScore ?? 0)
    const isHome = event.strHomeTeam?.toLowerCase() === (selectedTeam.strTeam ?? searchName).toLowerCase()
    const teamGoals = isHome ? homeGoals : awayGoals
    const opponentGoals = isHome ? awayGoals : homeGoals

    goalsFor += teamGoals
    goalsAgainst += opponentGoals

    if (opponentGoals === 0) {
      cleanSheets += 1
    }

    if (teamGoals > opponentGoals) {
      points += 3
    } else if (teamGoals === opponentGoals) {
      points += 1
    }
  })

  const sampleSize = results.length
  const ratingInjuryBaseline = teamRecentDataOverrides[team.id]?.injuryBurden ?? clamp(0.05 + (5 - sampleSize) * 0.01, 0.04, 0.12)

  return {
    lastFivePointsPerMatch: roundTo(points / sampleSize, 2),
    goalsForPerMatch: roundTo(goalsFor / sampleSize, 2),
    goalsAgainstPerMatch: roundTo(goalsAgainst / sampleSize, 2),
    cleanSheetRate: roundTo(cleanSheets / sampleSize, 2),
    injuryBurden: ratingInjuryBaseline,
    source: 'TheSportsDB recent team results',
    refreshedAt: new Date().toISOString(),
    sampleSize,
  }
}

async function fetchMarketStateFromBackend() {
  const response = await fetch('/api/market/state')

  if (!response.ok) {
    throw new Error(`Market state request failed with ${response.status}.`)
  }

  return (await response.json()) as MarketApiState
}

async function refreshMarketStateInBackend(matches: MarketTarget[]) {
  const response = await fetch('/api/market/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ matches }),
  })

  if (!response.ok) {
    throw new Error(`Market refresh request failed with ${response.status}.`)
  }

  return (await response.json()) as MarketApiState
}

async function updateBrokerSlotInBackend(slotKey: BrokerSlotKey, sourceKey: BookmakerSourceKey) {
  const response = await fetch(`/api/market/slots/${slotKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sourceKey }),
  })

  if (!response.ok) {
    throw new Error(`Broker slot update failed with ${response.status}.`)
  }

  return (await response.json()) as MarketApiState
}

async function submitOddsApiKeyToBackend(apiKey: string) {
  const response = await fetch('/api/market/api-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ apiKey }),
  })

  if (!response.ok) {
    throw new Error(`Odds API key submit failed with ${response.status}.`)
  }

  return (await response.json()) as MarketApiState
}

async function refreshOddsApiUsageInBackend() {
  const response = await fetch('/api/market/usage', {
    method: 'POST',
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(payload?.message ?? `Odds API usage refresh failed with ${response.status}.`)
  }

  return (await response.json()) as MarketApiState
}


function calculateDistanceKm(fromLatitude: number, fromLongitude: number, toLatitude: number, toLongitude: number) {
  const earthRadiusKm = 6371
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const latitudeDelta = toRadians(toLatitude - fromLatitude)
  const longitudeDelta = toRadians(toLongitude - fromLongitude)
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(fromLatitude)) * Math.cos(toRadians(toLatitude)) * Math.sin(longitudeDelta / 2) ** 2

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getRestImpact(restDays: number) {
  if (restDays >= 6) {
    return 0.04
  }

  if (restDays >= 4) {
    return 0
  }

  return -0.05
}

function getTravelImpact(travelKm: number) {
  if (travelKm <= 400) {
    return 0.02
  }

  if (travelKm <= 1400) {
    return 0
  }

  if (travelKm <= 2600) {
    return -0.03
  }

  return -0.06
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

function predictMatch(
  homeTeam: Team,
  awayTeam: Team,
  venueCity: string,
  attempt = 0,
  context?: Pick<Match, 'restDaysHome' | 'restDaysAway' | 'travelKmHome' | 'travelKmAway'>,
  liveTeamForm?: Partial<Record<string, TeamLiveForm>>,
  options?: { knockout?: boolean; groupState?: GroupStateContext; marketSignal?: MarketConsensusSnapshot },
): Prediction {
  const ratingGap = homeTeam.rating - awayTeam.rating
  const homeAttack = getAttackStrength(homeTeam)
  const awayAttack = getAttackStrength(awayTeam)
  const homeDefense = getDefenseStrength(homeTeam)
  const awayDefense = getDefenseStrength(awayTeam)
  const homeProfile = getTeamModelProfile(homeTeam)
  const awayProfile = getTeamModelProfile(awayTeam)
  const homeRecent = getTeamRecentData(homeTeam, liveTeamForm)
  const awayRecent = getTeamRecentData(awayTeam, liveTeamForm)
  const homeLiveSource = liveTeamForm?.[homeTeam.id]
  const awayLiveSource = liveTeamForm?.[awayTeam.id]
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
  const recentFormSwing = (homeRecent.lastFivePointsPerMatch - awayRecent.lastFivePointsPerMatch) * 0.06
  const scoringSwing = (homeRecent.goalsForPerMatch - awayRecent.goalsForPerMatch) * 0.08
  const defensiveRecordSwing = (awayRecent.goalsAgainstPerMatch - homeRecent.goalsAgainstPerMatch) * 0.06
  const cleanSheetSwing = (homeRecent.cleanSheetRate - awayRecent.cleanSheetRate) * 0.08
  const injurySwing = (awayRecent.injuryBurden - homeRecent.injuryBurden) * 0.2
  const restSwing = getRestImpact(context?.restDaysHome ?? 5) - getRestImpact(context?.restDaysAway ?? 5)
  const travelSwing = getTravelImpact(context?.travelKmHome ?? 0) - getTravelImpact(context?.travelKmAway ?? 0)
  const rotationSwing = (options?.groupState?.awayRotationRisk ?? 0) - (options?.groupState?.homeRotationRisk ?? 0)
  const motivationSwing = (options?.groupState?.homeMotivationBoost ?? 0) - (options?.groupState?.awayMotivationBoost ?? 0)
  const drawToleranceSwing = options?.groupState?.drawToleranceSwing ?? 0
  const homeExpectedGoals = clamp(
    1.18 +
      homeAttack * 0.62 -
      awayDefense * 0.33 +
      ratingGap / 90 +
      formSwing +
      recentFormSwing +
      scoringSwing +
      defensiveRecordSwing +
      cleanSheetSwing +
      injurySwing +
      restSwing +
      travelSwing +
      rotationSwing +
      motivationSwing +
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
      recentFormSwing * -0.85 +
      scoringSwing * -0.85 +
      defensiveRecordSwing * -0.85 +
      cleanSheetSwing * -0.9 +
      injurySwing * -0.95 +
      restSwing * -0.95 +
      travelSwing * -0.95 +
      rotationSwing * -0.95 +
      motivationSwing * -0.95 +
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
  const drawBiasMultiplier = clamp(1 + drawToleranceSwing * 4.5, 0.78, 1.26)
  const decisiveBiasMultiplier = clamp(1 - drawToleranceSwing * 2.1, 0.88, 1.12)

  for (let homeGoalCount = 0; homeGoalCount <= 6; homeGoalCount += 1) {
    const homeProbability = poissonProbability(homeGoalCount, homeExpectedGoals)

    for (let awayGoalCount = 0; awayGoalCount <= 6; awayGoalCount += 1) {
      const awayProbability = poissonProbability(awayGoalCount, awayExpectedGoals)
      const rawScoreProbability = homeProbability * awayProbability
      const scoreProbability = homeGoalCount === awayGoalCount ? rawScoreProbability * drawBiasMultiplier : rawScoreProbability * decisiveBiasMultiplier

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

  const totalProbability = homeWinProbability + drawProbability + awayWinProbability
  const normalizedHomeWinProbability = totalProbability > 0 ? homeWinProbability / totalProbability : homeWinProbability
  const normalizedDrawProbability = totalProbability > 0 ? drawProbability / totalProbability : drawProbability
  const normalizedAwayWinProbability = totalProbability > 0 ? awayWinProbability / totalProbability : awayWinProbability
  const marketSignal = options?.marketSignal
  const homeWinPercent = roundTo(
    marketSignal
      ? blendPercent(normalizedHomeWinProbability * 100, marketSignal.homeProbability, marketSignal.sourceKeys[0] ?? 'betfair')
      : normalizedHomeWinProbability * 100,
    1,
  )
  const drawPercent = roundTo(
    marketSignal
      ? blendPercent(normalizedDrawProbability * 100, marketSignal.drawProbability, marketSignal.sourceKeys[0] ?? 'betfair')
      : normalizedDrawProbability * 100,
    1,
  )
  const awayWinPercent = roundTo(
    marketSignal
      ? blendPercent(normalizedAwayWinProbability * 100, marketSignal.awayProbability, marketSignal.sourceKeys[0] ?? 'betfair')
      : normalizedAwayWinProbability * 100,
    1,
  )
  const renormalizedPercentTotal = homeWinPercent + drawPercent + awayWinPercent
  const finalHomeWinPercent = roundTo((homeWinPercent / renormalizedPercentTotal) * 100, 1)
  const finalDrawPercent = roundTo((drawPercent / renormalizedPercentTotal) * 100, 1)
  const finalAwayWinPercent = roundTo((awayWinPercent / renormalizedPercentTotal) * 100, 1)
  const adjustedScore = selectScoreFromOutcome(homeGoals, awayGoals, homeExpectedGoals, awayExpectedGoals, finalHomeWinPercent, finalDrawPercent, finalAwayWinPercent)
  homeGoals = adjustedScore.homeGoals
  awayGoals = adjustedScore.awayGoals
  const confidence = clamp(
    Math.round(
        Math.max(finalHomeWinPercent, finalDrawPercent, finalAwayWinPercent) +
        Math.abs(drawToleranceSwing) * 18 +
        Math.abs(motivationSwing) * 12 +
        (marketSignal ? 5 : 0),
    ),
    40,
    92,
  )
  const modelStrength = clamp(
    Math.round(
      58 +
        Math.abs(ratingGap) * 0.45 +
        Math.abs(creationSwing + finishingSwing + defensiveSwing + experienceSwing) * 14 +
        Math.abs(homeHostBoost - awayHostBoost) * 20 +
        Math.abs(recentFormSwing + scoringSwing + injurySwing + restSwing + travelSwing + rotationSwing + motivationSwing) * 18,
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
  const scheduleContextSummary =
    context
      ? 'Recent form, rest windows and inter-city travel are also included.'
      : 'The schedule layer is using neutral knockout assumptions for now.'
  const groupStateSummary = options?.groupState
    ? 'The group-state layer considers points, table position, likely rotation and whether a draw may already suit one side.'
    : 'The group-state layer is not active for this match.'
  const marketContextSummary = marketSignal
    ? `${marketSignal.sourceLabel} odds are blended into the model as an additional market signal from the backend market consensus layer.`
    : 'No bookmaker market feed is blended into this run.'
  const factorBreakdown: PredictionFactor[] = [
    { label: 'Rating edge', impact: ratingGap / 90 },
    { label: 'Team profile edge', impact: creationSwing * 0.18 + finishingSwing * 0.12 + setPieceSwing * 0.08 + experienceSwing * 0.05 },
    { label: 'Recent form edge', impact: recentFormSwing + scoringSwing + defensiveRecordSwing + cleanSheetSwing },
    { label: 'Injury edge', impact: injurySwing },
    { label: 'Rest edge', impact: restSwing },
    { label: 'Travel edge', impact: travelSwing },
    { label: 'Rotation risk edge', impact: rotationSwing },
    { label: 'Motivation edge', impact: motivationSwing },
    { label: 'Draw tolerance swing', impact: drawToleranceSwing },
    { label: 'Market odds edge', impact: marketSignal ? (marketSignal.homeProbability - marketSignal.awayProbability) / 100 : 0 },
    { label: 'Venue and altitude edge', impact: homeHostBoost - awayHostBoost * 0.4 + homeAltitudeAdjustment - awayAltitudeAdjustment * 0.35 },
  ]
    .sort((left, right) => Math.abs(right.impact) - Math.abs(left.impact))
    .map((factor) => ({
      label: factor.label,
      impact: roundTo(factor.impact, 3),
    }))
  const inputSnapshot: PredictionInputSnapshot[] = [
    { label: `${homeTeam.name} rating`, value: String(homeTeam.rating) },
    { label: `${awayTeam.name} rating`, value: String(awayTeam.rating) },
    { label: 'Venue', value: venueCity },
    { label: 'Data source', value: homeLiveSource || awayLiveSource ? 'Live team form refresh + seeded team model' : 'Seeded team model' },
    { label: 'Rest days', value: context ? `${context.restDaysHome} vs ${context.restDaysAway}` : 'neutral knockout assumption' },
    { label: 'Travel km', value: context ? `${context.travelKmHome} vs ${context.travelKmAway}` : 'neutral knockout assumption' },
    { label: 'Recent points per match', value: `${roundTo(homeRecent.lastFivePointsPerMatch, 2)} vs ${roundTo(awayRecent.lastFivePointsPerMatch, 2)}` },
    { label: 'Goals for per match', value: `${roundTo(homeRecent.goalsForPerMatch, 2)} vs ${roundTo(awayRecent.goalsForPerMatch, 2)}` },
    { label: 'Goals against per match', value: `${roundTo(homeRecent.goalsAgainstPerMatch, 2)} vs ${roundTo(awayRecent.goalsAgainstPerMatch, 2)}` },
    { label: 'Injury burden', value: `${roundTo(homeRecent.injuryBurden, 2)} vs ${roundTo(awayRecent.injuryBurden, 2)}` },
    {
      label: 'Market source',
      value: marketSignal ? `${marketSignal.sourceLabel} (${marketSignal.homeProbability}% / ${marketSignal.drawProbability}% / ${marketSignal.awayProbability}%)` : 'not applied',
    },
    {
      label: 'Group stakes',
      value: options?.groupState
        ? `P${options.groupState.homeGroupPosition} ${options.groupState.homePointsBefore} pts vs P${options.groupState.awayGroupPosition} ${options.groupState.awayPointsBefore} pts`
        : 'not applied',
    },
  ]
  let knockoutWinnerTeamId: string | undefined
  let knockoutResolution: Prediction['knockoutResolution']
  let penaltyScore: string | undefined

  if (options?.knockout) {
    if (homeGoals !== awayGoals) {
      knockoutWinnerTeamId = homeGoals > awayGoals ? homeTeam.id : awayTeam.id
      knockoutResolution = 'regularTime'
    } else {
      const extraTimeHomeExpectedGoals = clamp(homeExpectedGoals * 0.32 + experienceSwing * 0.05 + restSwing * 0.4 + travelSwing * 0.25, 0.08, 1.2)
      const extraTimeAwayExpectedGoals = clamp(awayExpectedGoals * 0.32 - experienceSwing * 0.05 - restSwing * 0.35 - travelSwing * 0.25, 0.08, 1.2)
      let extraTimeBestProbability = -1
      let extraTimeHomeGoals = 0
      let extraTimeAwayGoals = 0
      let extraTimeDrawProbability = 0

      for (let homeGoalCount = 0; homeGoalCount <= 2; homeGoalCount += 1) {
        const homeProbability = poissonProbability(homeGoalCount, extraTimeHomeExpectedGoals)

        for (let awayGoalCount = 0; awayGoalCount <= 2; awayGoalCount += 1) {
          const awayProbability = poissonProbability(awayGoalCount, extraTimeAwayExpectedGoals)
          const scoreProbability = homeProbability * awayProbability

          if (homeGoalCount === awayGoalCount) {
            extraTimeDrawProbability += scoreProbability
          }

          if (scoreProbability > extraTimeBestProbability) {
            extraTimeBestProbability = scoreProbability
            extraTimeHomeGoals = homeGoalCount
            extraTimeAwayGoals = awayGoalCount
          }
        }
      }

      if (extraTimeHomeGoals !== extraTimeAwayGoals && extraTimeDrawProbability <= 0.62) {
        homeGoals += extraTimeHomeGoals
        awayGoals += extraTimeAwayGoals
        knockoutWinnerTeamId = homeGoals > awayGoals ? homeTeam.id : awayTeam.id
        knockoutResolution = 'extraTime'
      } else {
        const penaltyEdge =
          experienceSwing * 0.7 +
          finishingSwing * 0.55 +
          injurySwing * 0.25 +
          restSwing * 0.35 +
          (getFormFactor(homeTeam, attempt + 3) - getFormFactor(awayTeam, attempt + 3)) * 0.4
        const homePenaltyWins = penaltyEdge >= 0
        knockoutWinnerTeamId = homePenaltyWins ? homeTeam.id : awayTeam.id
        knockoutResolution = 'penalties'
        penaltyScore = homePenaltyWins ? '4-3' : '3-4'
      }
    }
  }

  return {
    homeGoals,
    awayGoals,
    confidence,
    homeWinProbability: finalHomeWinPercent,
    drawProbability: finalDrawPercent,
    awayWinProbability: finalAwayWinPercent,
    homeExpectedGoals: roundTo(homeExpectedGoals, 2),
    awayExpectedGoals: roundTo(awayExpectedGoals, 2),
    modelStrength,
    factorBreakdown,
    inputSnapshot,
    marketSourceKey: marketSignal?.sourceKeys[0],
    knockoutWinnerTeamId,
    knockoutResolution,
    penaltyScore,
    summary:
      attempt > 0
        ? `${outcome}. This refreshed model run uses probabilistic xG, venue context and team-profile inputs. ${venueContextSummary} ${styleContextSummary} ${scheduleContextSummary} ${groupStateSummary} ${marketContextSummary}${knockoutResolution === 'extraTime' ? ' Knockout resolution projects extra time.' : knockoutResolution === 'penalties' ? ' Knockout resolution projects penalties.' : ''}`
        : `${outcome}. This version uses expected goals, Poisson score distribution, venue context and team-profile inputs. ${venueContextSummary} ${styleContextSummary} ${scheduleContextSummary} ${groupStateSummary} ${marketContextSummary}${knockoutResolution === 'extraTime' ? ' Knockout resolution projects extra time.' : knockoutResolution === 'penalties' ? ' Knockout resolution projects penalties.' : ''}`,
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

function buildActualStandings(matches: Match[], actualResultsByMatchId: Record<string, ActualResultSnapshot>) {
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
      .filter((match) => match.group === groupDefinition.name && actualResultsByMatchId[match.id])
      .forEach((match) => {
        const result = actualResultsByMatchId[match.id]
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

function getGroupStateContext(match: Match, matches: Match[]): GroupStateContext {
  const priorMatches = matches.filter(
    (candidate) =>
      candidate.group === match.group &&
      candidate.id !== match.id &&
      Boolean(candidate.acceptedPrediction) &&
      (new Date(candidate.kickoffUtc).getTime() < new Date(match.kickoffUtc).getTime() ||
        (candidate.kickoffUtc === match.kickoffUtc && candidate.id < match.id)),
  )

  const standingsBeforeMatch = buildStandings(priorMatches)
  const table = standingsBeforeMatch[match.group] ?? []
  const homeStanding = table.find((standing) => standing.team.id === match.homeTeam.id)
  const awayStanding = table.find((standing) => standing.team.id === match.awayTeam.id)
  const homeGroupPosition = homeStanding ? table.findIndex((standing) => standing.team.id === match.homeTeam.id) + 1 : 4
  const awayGroupPosition = awayStanding ? table.findIndex((standing) => standing.team.id === match.awayTeam.id) + 1 : 4
  const homePointsBefore = homeStanding?.points ?? 0
  const awayPointsBefore = awayStanding?.points ?? 0
  const isLastRound = match.round === 5 || match.round === 6
  const homeLead = homePointsBefore - awayPointsBefore
  const awayLead = awayPointsBefore - homePointsBefore
  const homeRotationRisk =
    isLastRound && homeGroupPosition === 1 && homePointsBefore >= 6 && homeLead >= 2
      ? 0.08
      : isLastRound && homePointsBefore >= 4 && homeGroupPosition <= 2
        ? 0.03
        : 0
  const awayRotationRisk =
    isLastRound && awayGroupPosition === 1 && awayPointsBefore >= 6 && awayLead >= 2
      ? 0.08
      : isLastRound && awayPointsBefore >= 4 && awayGroupPosition <= 2
        ? 0.03
        : 0
  const homeMotivationBoost =
    isLastRound && homePointsBefore <= 3
      ? 0.05
      : homeGroupPosition >= 3 && homePointsBefore < 4
        ? 0.03
        : 0
  const awayMotivationBoost =
    isLastRound && awayPointsBefore <= 3
      ? 0.05
      : awayGroupPosition >= 3 && awayPointsBefore < 4
        ? 0.03
        : 0
  const drawToleranceSwing =
    isLastRound
      ? clamp(
          (homeGroupPosition <= 2 && homePointsBefore >= 4 ? -0.03 : 0) +
            (awayGroupPosition <= 2 && awayPointsBefore >= 4 ? 0.03 : 0),
          -0.06,
          0.06,
        )
      : 0

  return {
    homeGroupPosition,
    awayGroupPosition,
    homePointsBefore,
    awayPointsBefore,
    homeRotationRisk,
    awayRotationRisk,
    homeMotivationBoost,
    awayMotivationBoost,
    drawToleranceSwing,
  }
}

function rankThirdPlacedTeams(standings: Record<string, Standing[]>, matches: Match[]) {
  const thirdPlacedRows = groupDefinitions
    .filter((groupDefinition) => isGroupComplete(matches, groupDefinition.name))
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

function getAcceptedGroupMatchCount(matches: Match[], groupName: string) {
  return matches.filter((match) => match.group === groupName && match.acceptedPrediction).length
}

function isGroupComplete(matches: Match[], groupName: string) {
  return getAcceptedGroupMatchCount(matches, groupName) === 6
}

function describeSlot(slot: string) {
  if (/^[123][A-L]$/.test(slot)) {
    const placeLabels = ['1st', '2nd', '3rd']
    return `${placeLabels[Number(slot[0]) - 1]} place in Group ${slot[1]}`
  }

  if (/^W\d+$/.test(slot)) {
    return `winner of Match ${slot.slice(1)}`
  }

  if (/^L\d+$/.test(slot)) {
    return `loser of Match ${slot.slice(1)}`
  }

  if (/^3[A-L](\/[A-L])+$/.test(slot)) {
    return `best third-place team from Groups ${slot.slice(1).replaceAll('/', ', ')}`
  }

  return slot
}

function getUniqueMessages(messages: string[]) {
  return [...new Set(messages.filter(Boolean))]
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
  const annexCAssignment = getAnnexCAssignment(qualifiedThirds.map((standing) => standing.team.group))
  const qualifiedThirdMap = new Map(qualifiedThirds.map((standing) => [`3${standing.team.group}`, standing]))

  const fixedMatches: RoundOf32Match[] = fixedRoundOf32Rules.map(([id, homeSlot, awaySlot]) => ({
    id,
    label: `Match ${id}`,
    homeSlot,
    awaySlot,
    homeTeam: positionMap.get(homeSlot)?.team.name ?? 'TBD',
    awayTeam: positionMap.get(awaySlot)?.team.name ?? 'TBD',
    routingMode: 'official',
  }))

  const wildcardMatches: RoundOf32Match[] = annexCAssignment
    ? wildcardRoundOf32Rules.map(([id, homeSlot]) => {
        const awaySlot = annexCAssignment[homeSlot as keyof typeof annexCAssignment]
        const wildcardTeam = qualifiedThirdMap.get(awaySlot)

        return {
          id,
          label: `Match ${id}`,
          homeSlot,
          awaySlot,
          homeTeam: positionMap.get(homeSlot)?.team.name ?? 'TBD',
          awayTeam: wildcardTeam?.team.name ?? 'Best 3rd place TBD',
          routingMode: 'official',
          note: wildcardTeam
            ? `Official Annex C routing: ${homeSlot} faces ${awaySlot}.`
            : `Official Annex C routing reserved for ${awaySlot}.`,
        }
      })
    : (() => {
        const usedThirdTeamIds = new Set<string>()

        return wildcardRoundOf32Rules.map(([id, homeSlot, allowedGroups]) => {
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
            routingMode: 'provisional' as const,
            note: wildcardTeam
              ? `Temporary routing before Annex C can be applied. Current third-place team comes from Group ${wildcardTeam.team.group}.`
              : 'Waiting for enough third-placed teams to activate the exact Annex C routing.',
          }
        })
      })()

  return [...fixedMatches, ...wildcardMatches].sort((left, right) => Number(left.id) - Number(right.id))
}

function getLastPlayedMatchContext(
  teamId: string,
  matches: Match[],
  resolvedKnockoutMatches: ResolvedKnockoutMatch[],
  currentMatchId: string,
) {
  const acceptedGroupMatch = matches
    .filter((match) => match.acceptedPrediction && (match.homeTeam.id === teamId || match.awayTeam.id === teamId))
    .sort((left, right) => new Date(right.kickoffUtc).getTime() - new Date(left.kickoffUtc).getTime())[0]

  const acceptedKnockoutMatch = resolvedKnockoutMatches
    .filter(
      (resolvedMatch) =>
        resolvedMatch.match.id !== currentMatchId &&
        resolvedMatch.match.acceptedPrediction &&
        (resolvedMatch.homeTeam?.id === teamId || resolvedMatch.awayTeam?.id === teamId) &&
        resolvedMatch.schedule,
    )
    .sort(
      (left, right) =>
        new Date(right.schedule!.kickoffUtc).getTime() - new Date(left.schedule!.kickoffUtc).getTime(),
    )[0]

  const groupTimestamp = acceptedGroupMatch ? new Date(acceptedGroupMatch.kickoffUtc).getTime() : -1
  const knockoutTimestamp = acceptedKnockoutMatch?.schedule ? new Date(acceptedKnockoutMatch.schedule.kickoffUtc).getTime() : -1

  if (knockoutTimestamp > groupTimestamp && acceptedKnockoutMatch?.schedule) {
    return {
      kickoffUtc: acceptedKnockoutMatch.schedule.kickoffUtc,
      venueCity: acceptedKnockoutMatch.schedule.venueCity,
    }
  }

  if (acceptedGroupMatch) {
    return {
      kickoffUtc: acceptedGroupMatch.kickoffUtc,
      venueCity: acceptedGroupMatch.venueCity,
    }
  }

  return null
}

function getKnockoutWinner(match: KnockoutMatch, homeTeam: Team | null, awayTeam: Team | null) {
  if (!match.acceptedPrediction || !homeTeam || !awayTeam) {
    return null
  }

  if (match.acceptedPrediction.knockoutWinnerTeamId) {
    return match.acceptedPrediction.knockoutWinnerTeamId === homeTeam.id ? homeTeam : awayTeam
  }

  return match.acceptedPrediction.homeGoals > match.acceptedPrediction.awayGoals ? homeTeam : awayTeam
}

function getKnockoutLoser(match: KnockoutMatch, homeTeam: Team | null, awayTeam: Team | null) {
  if (!match.acceptedPrediction || !homeTeam || !awayTeam) {
    return null
  }

  if (match.acceptedPrediction.knockoutWinnerTeamId) {
    return match.acceptedPrediction.knockoutWinnerTeamId === homeTeam.id ? awayTeam : homeTeam
  }

  return match.acceptedPrediction.homeGoals > match.acceptedPrediction.awayGoals ? awayTeam : homeTeam
}

function resolveKnockoutMatches(
  knockoutMatches: KnockoutMatch[],
  groupMatches: Match[],
  standings: Record<string, Standing[]>,
  rankedThirds: RankedThird[],
) {
  const roundOf32 = buildRoundOf32(standings, rankedThirds)
  const roundOf32ById = new Map(roundOf32.map((match) => [match.id, match]))
  const resolvedById = new Map<string, ResolvedKnockoutMatch>()
  const knockoutById = new Map(knockoutMatches.map((match) => [match.id, match]))
  const allStandingTeams = Object.values(standings).flat().map((standing) => standing.team)
  const teamByName = new Map(allStandingTeams.map((team) => [team.name, team]))

  function resolveFromSlot(slot: string): Team | null {
    return resolveSlot(slot).team
  }

  function resolveSlot(slot: string): { team: Team | null; reasons: string[] } {
    if (/^[123][A-L]$/.test(slot)) {
      const place = Number(slot[0]) - 1
      const groupName = slot[1]
      const acceptedGroupMatches = getAcceptedGroupMatchCount(groupMatches, groupName)

      if (acceptedGroupMatches < 6) {
        return {
          team: null,
          reasons: [`${describeSlot(slot)} is not final yet. Accept all Group ${groupName} matches first (${acceptedGroupMatches}/6 accepted).`],
        }
      }

      return {
        team: standings[groupName]?.[place]?.team ?? null,
        reasons: standings[groupName]?.[place]?.team ? [] : [`${describeSlot(slot)} could not be resolved from the Group ${groupName} table.`],
      }
    }

    if (/^W\d+$/.test(slot)) {
      const sourceMatchId = slot.slice(1)
      const sourceResolved = resolvedById.get(sourceMatchId)
      const sourceMatch = knockoutById.get(sourceMatchId)

      if (!sourceResolved || !sourceMatch) {
        return { team: null, reasons: [`${describeSlot(slot)} is not available yet.`] }
      }

      const winner = getKnockoutWinner(sourceMatch, sourceResolved.homeTeam, sourceResolved.awayTeam)

      return {
        team: winner,
        reasons: winner ? [] : [`Accept Match ${sourceMatchId} first to unlock ${describeSlot(slot)}.`],
      }
    }

    if (/^L\d+$/.test(slot)) {
      const sourceMatchId = slot.slice(1)
      const sourceResolved = resolvedById.get(sourceMatchId)
      const sourceMatch = knockoutById.get(sourceMatchId)

      if (!sourceResolved || !sourceMatch) {
        return { team: null, reasons: [`${describeSlot(slot)} is not available yet.`] }
      }

      const loser = getKnockoutLoser(sourceMatch, sourceResolved.homeTeam, sourceResolved.awayTeam)

      return {
        team: loser,
        reasons: loser ? [] : [`Accept Match ${sourceMatchId} first to unlock ${describeSlot(slot)}.`],
      }
    }

    if (/^3[A-L](\/[A-L])+$/.test(slot)) {
      const completedGroups = groupDefinitions.filter((groupDefinition) => isGroupComplete(groupMatches, groupDefinition.name)).length

      return {
        team: null,
        reasons: [`${describeSlot(slot)} needs the final best-third-place ranking. Complete more group tables first (${completedGroups}/12 groups complete).`],
      }
    }

    return { team: null, reasons: [`${describeSlot(slot)} could not be resolved.`] }
  }

  const stageOrder: KnockoutStage[] = ['roundOf32', 'roundOf16', 'quarterFinals', 'semiFinals', 'thirdPlace', 'final']

  stageOrder.forEach((stage) => {
    knockoutMatches
      .filter((match) => match.stage === stage)
      .sort((left, right) => Number(left.id) - Number(right.id))
      .forEach((match) => {
        if (stage === 'roundOf32') {
          const baseMatch = roundOf32ById.get(match.id)
          const homeSlotResolution = baseMatch ? resolveSlot(baseMatch.homeSlot) : { team: null, reasons: ['This Round of 32 slot is not available yet.'] }
          const awaySlotResolution = baseMatch ? resolveSlot(baseMatch.awaySlot) : { team: null, reasons: ['This Round of 32 slot is not available yet.'] }
          const homeTeam =
            baseMatch && baseMatch.homeTeam !== 'TBD'
              ? homeSlotResolution.team ?? (homeSlotResolution.reasons.length === 0 ? teamByName.get(baseMatch.homeTeam) ?? null : null)
              : null
          const awayTeam =
            baseMatch && baseMatch.awayTeam !== 'TBD'
              ? awaySlotResolution.team ??
                (awaySlotResolution.reasons.length === 0
                  ? teamByName.get(baseMatch.awayTeam) ?? rankedThirds.find((standing) => standing.team.name === baseMatch.awayTeam)?.team ?? null
                  : null)
              : null
          const lockReasons = getUniqueMessages([
            ...(!homeTeam ? homeSlotResolution.reasons : []),
            ...(!awayTeam ? awaySlotResolution.reasons : []),
          ])
          const scheduleBase = knockoutScheduleByMatchId[match.id]
          const schedule = scheduleBase
            ? (() => {
                const kickoff = parseVenueLocalDateTime(scheduleBase.dateIso, scheduleBase.localTime, scheduleBase.venueCity)
                const localDateTime = formatDateTime(kickoff, venueMetaByCity[scheduleBase.venueCity].timeZone)
                const polishDateTime = formatDateTime(kickoff, 'Europe/Warsaw')
                const previousHomeMatch = homeTeam ? getLastPlayedMatchContext(homeTeam.id, groupMatches, [], match.id) : null
                const previousAwayMatch = awayTeam ? getLastPlayedMatchContext(awayTeam.id, groupMatches, [], match.id) : null
                const restDaysHome = previousHomeMatch
                  ? roundTo((kickoff.getTime() - new Date(previousHomeMatch.kickoffUtc).getTime()) / (1000 * 60 * 60 * 24), 1)
                  : 5
                const restDaysAway = previousAwayMatch
                  ? roundTo((kickoff.getTime() - new Date(previousAwayMatch.kickoffUtc).getTime()) / (1000 * 60 * 60 * 24), 1)
                  : 5
                const previousHomeVenue = previousHomeMatch ? venueMetaByCity[previousHomeMatch.venueCity] : null
                const previousAwayVenue = previousAwayMatch ? venueMetaByCity[previousAwayMatch.venueCity] : null
                const currentVenue = venueMetaByCity[scheduleBase.venueCity]
                const travelKmHome =
                  previousHomeVenue && currentVenue
                    ? Math.round(
                        calculateDistanceKm(previousHomeVenue.latitude, previousHomeVenue.longitude, currentVenue.latitude, currentVenue.longitude),
                      )
                    : 0
                const travelKmAway =
                  previousAwayVenue && currentVenue
                    ? Math.round(
                        calculateDistanceKm(previousAwayVenue.latitude, previousAwayVenue.longitude, currentVenue.latitude, currentVenue.longitude),
                      )
                    : 0

                return {
                  ...scheduleBase,
                  kickoffUtc: kickoff.toISOString(),
                  localDateLabel: localDateTime.dateLabel,
                  localTimeLabel: localDateTime.timeLabel,
                  polishDateLabel: polishDateTime.dateLabel,
                  polishTimeLabel: polishDateTime.timeLabel,
                  restDaysHome,
                  restDaysAway,
                  travelKmHome,
                  travelKmAway,
                }
              })()
            : null

          resolvedById.set(match.id, {
            match,
            homeTeam,
            awayTeam,
            displayHomeSlot: baseMatch?.homeSlot ?? match.homeSlot,
            displayAwaySlot: baseMatch?.awaySlot ?? match.awaySlot,
            schedule,
            note: baseMatch?.note,
            lockReasons,
          })
          return
        }
        const homeSlotResolution = resolveSlot(match.homeSlot)
        const awaySlotResolution = resolveSlot(match.awaySlot)
        const homeTeam = homeSlotResolution.team
        const awayTeam = awaySlotResolution.team
        const lockReasons = getUniqueMessages([
          ...(!homeTeam ? homeSlotResolution.reasons : []),
          ...(!awayTeam ? awaySlotResolution.reasons : []),
        ])
        const scheduleBase = knockoutScheduleByMatchId[match.id]
        const schedule = scheduleBase
          ? (() => {
              const kickoff = parseVenueLocalDateTime(scheduleBase.dateIso, scheduleBase.localTime, scheduleBase.venueCity)
              const localDateTime = formatDateTime(kickoff, venueMetaByCity[scheduleBase.venueCity].timeZone)
              const polishDateTime = formatDateTime(kickoff, 'Europe/Warsaw')
              const earlierResolvedMatches = Array.from(resolvedById.values())
              const previousHomeMatch = resolveFromSlot(match.homeSlot)
                ? getLastPlayedMatchContext(resolveFromSlot(match.homeSlot)!.id, groupMatches, earlierResolvedMatches, match.id)
                : null
              const previousAwayMatch = resolveFromSlot(match.awaySlot)
                ? getLastPlayedMatchContext(resolveFromSlot(match.awaySlot)!.id, groupMatches, earlierResolvedMatches, match.id)
                : null
              const restDaysHome = previousHomeMatch
                ? roundTo((kickoff.getTime() - new Date(previousHomeMatch.kickoffUtc).getTime()) / (1000 * 60 * 60 * 24), 1)
                : 5
              const restDaysAway = previousAwayMatch
                ? roundTo((kickoff.getTime() - new Date(previousAwayMatch.kickoffUtc).getTime()) / (1000 * 60 * 60 * 24), 1)
                : 5
              const previousHomeVenue = previousHomeMatch ? venueMetaByCity[previousHomeMatch.venueCity] : null
              const previousAwayVenue = previousAwayMatch ? venueMetaByCity[previousAwayMatch.venueCity] : null
              const currentVenue = venueMetaByCity[scheduleBase.venueCity]
              const travelKmHome =
                previousHomeVenue && currentVenue
                  ? Math.round(
                      calculateDistanceKm(previousHomeVenue.latitude, previousHomeVenue.longitude, currentVenue.latitude, currentVenue.longitude),
                    )
                  : 0
              const travelKmAway =
                previousAwayVenue && currentVenue
                  ? Math.round(
                      calculateDistanceKm(previousAwayVenue.latitude, previousAwayVenue.longitude, currentVenue.latitude, currentVenue.longitude),
                    )
                  : 0

              return {
                ...scheduleBase,
                kickoffUtc: kickoff.toISOString(),
                localDateLabel: localDateTime.dateLabel,
                localTimeLabel: localDateTime.timeLabel,
                polishDateLabel: polishDateTime.dateLabel,
                polishTimeLabel: polishDateTime.timeLabel,
                restDaysHome,
                restDaysAway,
                travelKmHome,
                travelKmAway,
              }
            })()
          : null
        resolvedById.set(match.id, {
          match,
          homeTeam,
          awayTeam,
          displayHomeSlot: match.homeSlot,
          displayAwaySlot: match.awaySlot,
          schedule,
          lockReasons,
        })
      })
  })

  return knockoutMatches.map((match) => resolvedById.get(match.id)!)
}

function sanitizeKnockoutMatches(knockoutMatches: KnockoutMatch[], resolvedMatches: ResolvedKnockoutMatch[]) {
  return knockoutMatches.map((match) => {
    const resolvedMatch = resolvedMatches.find((item) => item.match.id === match.id)
    const currentHomeId = resolvedMatch?.homeTeam?.id
    const currentAwayId = resolvedMatch?.awayTeam?.id
    const hadResolvedParticipants = Boolean(match.lastResolvedHomeTeamId || match.lastResolvedAwayTeamId)
    const participantsChanged =
      hadResolvedParticipants && (match.lastResolvedHomeTeamId !== currentHomeId || match.lastResolvedAwayTeamId !== currentAwayId)

    if (!participantsChanged) {
      return {
        ...match,
        lastResolvedHomeTeamId: currentHomeId,
        lastResolvedAwayTeamId: currentAwayId,
      }
    }

    return {
      ...match,
      lastResolvedHomeTeamId: currentHomeId,
      lastResolvedAwayTeamId: currentAwayId,
      predictionAttempt: 0,
      manualEditorOpen: false,
      manualHomeGoals: '',
      manualAwayGoals: '',
      prediction: undefined,
      acceptedPrediction: undefined,
      predictionHistory:
        match.prediction || match.acceptedPrediction
          ? appendHistory(match.predictionHistory, {
              action: 'invalidated',
              stage: 'knockout',
              source: 'system',
              summary: 'Stored knockout prediction was cleared because the participating teams changed.',
            })
          : match.predictionHistory,
    }
  })
}

function renderPredictionExplanation(prediction: Prediction) {
  return (
    <div className="prediction-explanation">
      <details className="prediction-details">
        <summary className="prediction-summary">Why this prediction?</summary>
        <div className="prediction-explanation-section prediction-details-content">
          <div className="prediction-factor-list">
            {prediction.factorBreakdown.map((factor) => (
              <span key={factor.label} className={`factor-pill ${factor.impact >= 0 ? 'factor-pill-positive' : 'factor-pill-negative'}`}>
                {factor.label} {formatSigned(factor.impact, 3)}
              </span>
            ))}
          </div>
        </div>
      </details>
      <details className="prediction-details">
        <summary className="prediction-summary">Model inputs</summary>
        <div className="prediction-explanation-section prediction-details-content">
          <div className="prediction-input-grid">
            {prediction.inputSnapshot.map((item) => (
              <span key={item.label} className="prediction-input-item">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </span>
            ))}
          </div>
        </div>
      </details>
    </div>
  )
}

function renderPredictionHistory(history: PredictionHistoryEntry[] | undefined) {
  if (!history || history.length === 0) {
    return null
  }

  return (
    <details className="prediction-history prediction-details">
      <summary className="prediction-summary">Prediction history</summary>
      <div className="prediction-history-list prediction-details-content">
        {[...history]
          .slice(-5)
          .reverse()
          .map((entry) => (
            <div key={entry.id} className="prediction-history-item">
              <span>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(entry.createdAt))}</span>
              <strong>{entry.action}</strong>
              <span>
                {entry.summary}
                {entry.prediction ? ` · ${entry.prediction.confidence}% confidence` : ''}
              </span>
            </div>
          ))}
      </div>
    </details>
  )
}

function App() {
  const [matches, setMatches] = useState<Match[]>(() => mergeStoredGroupMatches(loadStoredState<Match[]>(storageKeys.groupMatches)))
  const [knockoutMatches, setKnockoutMatches] = useState<KnockoutMatch[]>(() =>
    mergeStoredKnockoutMatches(loadStoredState<KnockoutMatch[]>(storageKeys.knockoutMatches)),
  )
  const [activeView, setActiveView] = useState<ViewMode>(() => loadStoredState<ViewMode>(storageKeys.activeView) ?? 'group')
  const [liveTeamForm, setLiveTeamForm] = useState<Partial<Record<string, TeamLiveForm>>>(() =>
    loadStoredState<Partial<Record<string, TeamLiveForm>>>(storageKeys.liveTeamForm) ?? {},
  )
  const [marketApiState, setMarketApiState] = useState<MarketApiState>(defaultMarketApiState)
  const [isRefreshingLiveData, setIsRefreshingLiveData] = useState(false)
  const [liveRefreshStatus, setLiveRefreshStatus] = useState('Refresh uses public recent-results data to enrich the prediction model.')
  const [sourcePickerSlotKey, setSourcePickerSlotKey] = useState<BrokerSlotKey | null>(null)
  const [refreshFeedback, setRefreshFeedback] = useState<RefreshFeedback>(defaultRefreshFeedback)
  const [backendConnectionStatus, setBackendConnectionStatus] = useState<BackendConnectionStatus>('checking')
  const [oddsApiKeyInput, setOddsApiKeyInput] = useState('')
  const [oddsApiKeyStatus, setOddsApiKeyStatus] = useState('The key stays local in the running backend session.')
  const [isRefreshingOddsUsage, setIsRefreshingOddsUsage] = useState(false)
  const standings = buildStandings(matches)
  const actualStandings = buildActualStandings(matches, marketApiState.actualResultsByMatchId)
  const rankedThirds = rankThirdPlacedTeams(standings, matches)
  const preliminaryResolvedKnockoutMatches = resolveKnockoutMatches(knockoutMatches, matches, standings, rankedThirds)
  const displayKnockoutMatches = sanitizeKnockoutMatches(knockoutMatches, preliminaryResolvedKnockoutMatches)
  const resolvedKnockoutMatches = resolveKnockoutMatches(displayKnockoutMatches, matches, standings, rankedThirds)
  const acceptedCount = matches.filter((match) => match.acceptedPrediction).length
  const viewerTimeZone = getViewerTimeZone()
  const latestLiveRefresh = Object.values(liveTeamForm)
    .map((entry) => (entry?.refreshedAt ? new Date(entry.refreshedAt).getTime() : 0))
    .sort((left, right) => right - left)[0]
  const latestMarketRefresh = Object.values(marketApiState.oddsByMatchId)
    .flatMap((item) => Object.values(item))
    .map((entry) => (entry?.refreshedAt ? new Date(entry.refreshedAt).getTime() : 0))
    .sort((left, right) => right - left)[0]
  const marketRefreshTimestamp = latestMarketRefresh || (marketApiState.latestRefreshAt ? new Date(marketApiState.latestRefreshAt).getTime() : 0)
  const actualResultsRefreshTimestamp = marketApiState.latestActualResultsRefreshAt ? new Date(marketApiState.latestActualResultsRefreshAt).getTime() : 0
  const knockoutStageConfig: { stage: KnockoutStage; title: string; subtitle: string }[] = [
    { stage: 'roundOf32', title: 'Round of 32', subtitle: '32 teams enter the bracket here.' },
    { stage: 'roundOf16', title: 'Round of 16', subtitle: 'Winners from the opening knockout round.' },
    { stage: 'quarterFinals', title: 'Quarter-finals', subtitle: 'The last eight teams.' },
    { stage: 'semiFinals', title: 'Semi-finals', subtitle: 'Four teams remain.' },
    { stage: 'thirdPlace', title: 'Third-place match', subtitle: 'Losers of the semi-finals.' },
    { stage: 'final', title: 'Final', subtitle: 'The tournament decider.' },
  ]

  useEffect(() => {
    window.localStorage.setItem(storageKeys.groupMatches, JSON.stringify(matches))
  }, [matches])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.knockoutMatches, JSON.stringify(displayKnockoutMatches))
  }, [displayKnockoutMatches])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.activeView, JSON.stringify(activeView))
  }, [activeView])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.liveTeamForm, JSON.stringify(liveTeamForm))
  }, [liveTeamForm])

  useEffect(() => {
    void fetchMarketStateFromBackend()
      .then((state) => {
        setMarketApiState(state)
        setBackendConnectionStatus('online')
      })
      .catch(() => {
        setMarketApiState(defaultMarketApiState)
        setBackendConnectionStatus('offline')
      })
  }, [])

  const handleRefreshLiveData = useCallback(async () => {
    setIsRefreshingLiveData(true)
    setBackendConnectionStatus('checking')
    setLiveRefreshStatus('Refreshing recent public team results...')
    setRefreshFeedback({
      kind: 'loading',
      title: 'Refreshing live data and backend market odds...',
      details: [
        'Team form is being pulled from the public recent-results source.',
        'Backend market odds are being refreshed from the bookmaker adapters.',
      ],
    })

    try {
      const uniqueTeams = groupDefinitions.flatMap((groupDefinition) => groupDefinition.teams)
      const marketTargets: MarketTarget[] = [
        ...matches.map((match) => ({
          id: match.id,
          kickoffUtc: match.kickoffUtc,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
        })),
        ...resolvedKnockoutMatches
          .filter((item) => item.homeTeam && item.awayTeam && item.schedule)
          .map((item) => ({
            id: item.match.id,
            kickoffUtc: item.schedule!.kickoffUtc,
            homeTeam: item.homeTeam!,
            awayTeam: item.awayTeam!,
          })),
      ]
      const [liveResults, marketResult] = await Promise.all([
        Promise.all(
          uniqueTeams.map(async (team) => ({
            teamId: team.id,
            liveForm: await fetchLiveTeamForm(team).catch(() => null),
          })),
        ),
        refreshMarketStateInBackend(marketTargets)
          .then((state) => ({ state, error: null }))
          .catch((error) => ({ state: defaultMarketApiState, error: getErrorMessage(error) })),
      ])

      const nextLiveTeamForm = liveResults.reduce<Partial<Record<string, TeamLiveForm>>>((accumulator, item) => {
        if (item.liveForm) {
          accumulator[item.teamId] = item.liveForm
        }

        return accumulator
      }, {})

      if (Object.keys(nextLiveTeamForm).length > 0) {
        setLiveTeamForm((currentValue) => ({ ...currentValue, ...nextLiveTeamForm }))
        setLiveRefreshStatus(
          `Loaded live form for ${Object.keys(nextLiveTeamForm).length} of ${uniqueTeams.length} teams from TheSportsDB recent results.`,
        )
      } else {
        setLiveRefreshStatus(
          'No live team form was loaded. TheSportsDB may be unavailable, rate-limited, or some national-team names may not match the public dataset.',
        )
      }
      setMarketApiState(marketResult.state)
      setBackendConnectionStatus(marketResult.error ? 'offline' : 'online')
      setRefreshFeedback({
        kind: marketResult.error ? 'error' : 'success',
        title: marketResult.error ? 'Refresh finished with problems.' : 'Refresh completed successfully.',
        details: [
          Object.keys(nextLiveTeamForm).length > 0
            ? `Live team form updated for ${Object.keys(nextLiveTeamForm).length} of ${uniqueTeams.length} teams.`
            : 'Live team form did not return any new team snapshots.',
          marketResult.error
            ? marketResult.error
            : marketResult.state.marketStatus,
          marketResult.state.actualResultStatus,
          marketResult.state.stsStatus,
        ],
      })
    } finally {
      setIsRefreshingLiveData(false)
    }
  }, [matches, resolvedKnockoutMatches])

  useEffect(() => {
    if (latestLiveRefresh && Date.now() - latestLiveRefresh < 1000 * 60 * 60 * 6) {
      return
    }

    queueMicrotask(() => {
      void handleRefreshLiveData()
    })
  }, [handleRefreshLiveData, latestLiveRefresh])

  function handleScrollToGroup(groupName: string) {
    setActiveView('group')

    window.requestAnimationFrame(() => {
      const target = document.getElementById(`group-section-${groupName}`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function handleOpenSourcePicker(slotKey: BrokerSlotKey) {
    setSourcePickerSlotKey(slotKey)
  }

  async function handleSelectBookmakerSource(sourceKey: BookmakerSourceKey) {
    if (!sourcePickerSlotKey) {
      return
    }

    setBackendConnectionStatus('checking')
    const nextState = await updateBrokerSlotInBackend(sourcePickerSlotKey, sourceKey).catch(() => null)

    if (nextState) {
      setMarketApiState(nextState)
      setBackendConnectionStatus('online')
    } else {
      setBackendConnectionStatus('offline')
    }

    setSourcePickerSlotKey(null)
  }

  async function handleSubmitOddsApiKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!oddsApiKeyInput.trim()) {
      setOddsApiKeyStatus('Paste your Odds API key first.')
      return
    }

    setBackendConnectionStatus('checking')
    setOddsApiKeyStatus('Submitting key to the local backend...')

    const nextState = await submitOddsApiKeyToBackend(oddsApiKeyInput).catch(() => null)

    if (!nextState) {
      setBackendConnectionStatus('offline')
      setOddsApiKeyStatus('Could not submit the key. Make sure `npm run server` is running.')
      return
    }

    setMarketApiState(nextState)
    setBackendConnectionStatus('online')
    setOddsApiKeyInput('')
    setOddsApiKeyStatus('Key accepted for this backend session. Now run Refresh live data & odds.')
  }

  async function handleRefreshOddsApiUsage() {
    setIsRefreshingOddsUsage(true)
    setBackendConnectionStatus('checking')
    setOddsApiKeyStatus('Refreshing Odds API credit counters...')

    const nextState = await refreshOddsApiUsageInBackend().catch((error) => {
      const message = getErrorMessage(error)
      setOddsApiKeyStatus(message)
      setBackendConnectionStatus(message.includes('Odds API key is missing') ? 'online' : 'offline')
      return null
    })

    if (nextState) {
      setMarketApiState(nextState)
      setBackendConnectionStatus('online')
      setOddsApiKeyStatus('Credit counters refreshed.')
    }

    setIsRefreshingOddsUsage(false)
  }

  function handleTryToPredict(matchId: string) {
    setMatches((currentMatches) =>
      currentMatches.map((match) =>
        match.id === matchId
          ? (() => {
              const nextAttempt = (match.predictionAttempt ?? 0) + 1
              const groupState = getGroupStateContext(match, currentMatches)
              const prediction = predictMatch(match.homeTeam, match.awayTeam, match.venueCity, nextAttempt, match, liveTeamForm, {
                groupState,
                marketSignal: marketApiState.consensusByMatchId[match.id],
              })

              return {
                ...match,
                predictionAttempt: nextAttempt,
                manualEditorOpen: false,
                prediction,
                predictionHistory: appendHistory(match.predictionHistory, {
                  action: 'generated',
                  stage: 'group',
                  source: 'model',
                  summary: `Model prediction v${nextAttempt} generated.`,
                  prediction,
                }),
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
        const groupState = getGroupStateContext(match, currentMatches)
        const prediction = predictMatch(match.homeTeam, match.awayTeam, match.venueCity, nextAttempt, match, liveTeamForm, {
          groupState,
          marketSignal: marketApiState.consensusByMatchId[match.id],
        })

        return {
          ...match,
          predictionAttempt: nextAttempt,
          manualEditorOpen: false,
          prediction,
          predictionHistory: appendHistory(match.predictionHistory, {
            action: 'generated',
            stage: 'group',
            source: 'model',
            summary: `Model prediction v${nextAttempt} generated.`,
            prediction,
          }),
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
              predictionHistory: appendHistory(match.predictionHistory, {
                action: 'accepted',
                stage: 'group',
                source: 'system',
                summary: 'Prediction accepted into the standings.',
                prediction: match.prediction,
              }),
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
              predictionHistory: appendHistory(match.predictionHistory, {
                action: 'accepted',
                stage: 'group',
                source: 'system',
                summary: 'Prediction accepted into the standings.',
                prediction: match.prediction,
              }),
            }
          : match,
      ),
    )
  }

  function handleReset() {
    setMatches(createInitialMatches())
    setKnockoutMatches(createInitialKnockoutMatches())
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
              predictionHistory: appendHistory(match.predictionHistory, {
                action: 'reset',
                stage: 'group',
                source: 'system',
                summary: 'Prediction and accepted result were reset.',
              }),
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

        const prediction = {
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
          factorBreakdown: [{ label: 'Manual override', impact: 1 }],
          inputSnapshot: [
            { label: 'Source', value: 'manual entry' },
            { label: `${match.homeTeam.name} goals`, value: match.manualHomeGoals },
            { label: `${match.awayTeam.name} goals`, value: match.manualAwayGoals },
          ],
        } satisfies Prediction

        return {
          ...match,
          manualEditorOpen: false,
          prediction,
          predictionHistory: appendHistory(match.predictionHistory, {
            action: 'manual',
            stage: 'group',
            source: 'manual',
            summary: 'Manual prediction saved.',
            prediction,
          }),
        }
      }),
    )
  }

  function handleTryToPredictKnockout(matchId: string) {
    const resolvedMatch = resolvedKnockoutMatches.find((item) => item.match.id === matchId)

    if (!resolvedMatch?.homeTeam || !resolvedMatch.awayTeam) {
      return
    }

    setKnockoutMatches((currentMatches) =>
      currentMatches.map((match) =>
        match.id === matchId
          ? (() => {
              const nextAttempt = (match.predictionAttempt ?? 0) + 1
              const prediction = predictMatch(
                resolvedMatch.homeTeam!,
                resolvedMatch.awayTeam!,
                resolvedMatch.schedule?.venueCity ?? 'New York/New Jersey',
                nextAttempt,
                resolvedMatch.schedule
                  ? {
                      restDaysHome: resolvedMatch.schedule.restDaysHome,
                      restDaysAway: resolvedMatch.schedule.restDaysAway,
                      travelKmHome: resolvedMatch.schedule.travelKmHome,
                      travelKmAway: resolvedMatch.schedule.travelKmAway,
                    }
                  : undefined,
                liveTeamForm,
                {
                  knockout: true,
                  marketSignal: marketApiState.consensusByMatchId[match.id],
                },
              )

              return {
                ...match,
                predictionAttempt: nextAttempt,
                manualEditorOpen: false,
                lastResolvedHomeTeamId: resolvedMatch.homeTeam!.id,
                lastResolvedAwayTeamId: resolvedMatch.awayTeam!.id,
                prediction,
                predictionHistory: appendHistory(match.predictionHistory, {
                  action: 'generated',
                  stage: 'knockout',
                  source: 'model',
                  summary: `Knockout prediction v${nextAttempt} generated.`,
                  prediction,
                }),
              }
            })()
          : match,
      ),
    )
  }

  function handleAcceptKnockout(matchId: string) {
    const resolvedMatch = resolvedKnockoutMatches.find((item) => item.match.id === matchId)

    setKnockoutMatches((currentMatches) =>
      currentMatches.map((match) =>
        match.id === matchId && match.prediction
          ? {
              ...match,
              lastResolvedHomeTeamId: resolvedMatch?.homeTeam?.id,
              lastResolvedAwayTeamId: resolvedMatch?.awayTeam?.id,
              acceptedPrediction: match.prediction,
              predictionHistory: appendHistory(match.predictionHistory, {
                action: 'accepted',
                stage: 'knockout',
                source: 'system',
                summary: 'Knockout prediction accepted.',
                prediction: match.prediction,
              }),
            }
          : match,
      ),
    )
  }

  function handleResetKnockoutMatch(matchId: string) {
    setKnockoutMatches((currentMatches) =>
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
              predictionHistory: appendHistory(match.predictionHistory, {
                action: 'reset',
                stage: 'knockout',
                source: 'system',
                summary: 'Knockout prediction was reset.',
              }),
            }
          : match,
      ),
    )
  }

  function handleToggleKnockoutManualEditor(matchId: string) {
    setKnockoutMatches((currentMatches) =>
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

  function handleKnockoutManualScoreChange(matchId: string, side: 'home' | 'away', value: string) {
    if (!/^\d{0,2}$/.test(value)) {
      return
    }

    setKnockoutMatches((currentMatches) =>
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

  function handleSaveKnockoutManualPrediction(matchId: string) {
    setKnockoutMatches((currentMatches) =>
      currentMatches.map((match) => {
        if (match.id !== matchId) {
          return match
        }

        if (!match.manualHomeGoals || !match.manualAwayGoals) {
          return match
        }

        const homeGoals = Number(match.manualHomeGoals)
        const awayGoals = Number(match.manualAwayGoals)

        const prediction = {
          homeGoals,
          awayGoals,
          confidence: 100,
          homeWinProbability: homeGoals > awayGoals ? 100 : 0,
          drawProbability: homeGoals === awayGoals ? 100 : 0,
          awayWinProbability: awayGoals > homeGoals ? 100 : 0,
          homeExpectedGoals: homeGoals,
          awayExpectedGoals: awayGoals,
          modelStrength: 100,
          summary:
            homeGoals === awayGoals
              ? 'Manual knockout prediction entered by the user. Winner resolved by penalties.'
              : 'Manual knockout prediction entered by the user.',
          factorBreakdown: [{ label: 'Manual override', impact: 1 }],
          inputSnapshot: [
            { label: 'Source', value: 'manual entry' },
            { label: 'Home goals', value: match.manualHomeGoals },
            { label: 'Away goals', value: match.manualAwayGoals },
          ],
          knockoutWinnerTeamId:
            homeGoals === awayGoals
              ? (resolvedKnockoutMatches.find((item) => item.match.id === matchId)?.homeTeam?.id ?? undefined)
              : homeGoals > awayGoals
                ? resolvedKnockoutMatches.find((item) => item.match.id === matchId)?.homeTeam?.id
                : resolvedKnockoutMatches.find((item) => item.match.id === matchId)?.awayTeam?.id,
          knockoutResolution: homeGoals === awayGoals ? 'penalties' : 'regularTime',
          penaltyScore: homeGoals === awayGoals ? '4-3' : undefined,
        } satisfies Prediction

        const resolvedMatch = resolvedKnockoutMatches.find((item) => item.match.id === matchId)

        return {
          ...match,
          manualEditorOpen: false,
          lastResolvedHomeTeamId: resolvedMatch?.homeTeam?.id,
          lastResolvedAwayTeamId: resolvedMatch?.awayTeam?.id,
          prediction,
          predictionHistory: appendHistory(match.predictionHistory, {
            action: 'manual',
            stage: 'knockout',
            source: 'manual',
            summary: 'Manual knockout prediction saved.',
            prediction,
          }),
        }
      }),
    )
  }

  function handleClearSavedData() {
    window.localStorage.removeItem(storageKeys.groupMatches)
    window.localStorage.removeItem(storageKeys.knockoutMatches)
    window.localStorage.removeItem(storageKeys.activeView)
    window.localStorage.removeItem(storageKeys.liveTeamForm)
    setMatches(createInitialMatches())
    setKnockoutMatches(createInitialKnockoutMatches())
    setActiveView('group')
    setLiveTeamForm({})
    setMarketApiState(defaultMarketApiState)
  }

  function renderBookmakerStrip(matchId: string) {
    const oddsBySource = marketApiState.oddsByMatchId[matchId] ?? {}
    const brokerSlots = marketApiState.brokerSlots
    const consensus = marketApiState.consensusByMatchId[matchId]

    return (
      <div className="bookmaker-box">
        <div className="bookmaker-box-header">
          <div>
            <strong>Bookmaker market</strong>
            <span>
              Backend consensus for predictions:{' '}
              {consensus ? `${consensus.sourceLabel} (${consensus.homeProbability}% / ${consensus.drawProbability}% / ${consensus.awayProbability}%)` : 'not loaded yet'}
            </span>
          </div>
        </div>
        <div className="bookmaker-grid">
          {(Object.entries(brokerSlots) as Array<[BrokerSlotKey, BookmakerSourceKey]>).map(([slotKey, sourceKey], index) => {
              const source = findBookmakerSource(sourceKey)
              const snapshot = oddsBySource[sourceKey]

              return (
                <button
                  key={slotKey}
                  type="button"
                  className={`bookmaker-card ${sourcePickerSlotKey === slotKey ? 'bookmaker-card-selected' : ''}`}
                  onClick={() => handleOpenSourcePicker(slotKey)}
                >
                  <div className="bookmaker-card-top">
                    <span className="bookmaker-brand-badge" style={{ backgroundColor: source.accent }}>
                      {source.shortLabel}
                    </span>
                    <div className="bookmaker-card-title">
                      <strong>Broker {index + 1}</strong>
                      <span>{source.label}</span>
                    </div>
                  </div>
                  {snapshot ? (
                    <>
                      <span className="bookmaker-odds-line">
                        {snapshot.homeOdds} / {snapshot.drawOdds} / {snapshot.awayOdds}
                      </span>
                      <span className="bookmaker-probability-line">
                        {snapshot.homeProbability}% / {snapshot.drawProbability}% / {snapshot.awayProbability}%
                      </span>
                    </>
                  ) : (
                    <span className="bookmaker-empty-copy">No data</span>
                  )}
                </button>
              )
            })}
        </div>
      </div>
    )
  }

  function formatPredictionScore(prediction?: Prediction) {
    if (!prediction) {
      return ''
    }

    return `${prediction.homeGoals} : ${prediction.awayGoals}${prediction.knockoutResolution === 'extraTime' ? ' aet' : prediction.knockoutResolution === 'penalties' ? ` pens ${prediction.penaltyScore}` : ''}`
  }

  function formatActualResultScore(matchId: string) {
    const actualResult = marketApiState.actualResultsByMatchId[matchId]

    return actualResult ? `${actualResult.homeGoals} : ${actualResult.awayGoals}` : ''
  }

  function renderScoreComparison(matchId: string, prediction?: Prediction, acceptedPrediction?: Prediction) {
    const actualResult = marketApiState.actualResultsByMatchId[matchId]

    return (
      <div className="score-comparison-grid">
        <span className="score-comparison-item">
          <span>Prediction</span>
          <strong>{formatPredictionScore(prediction)}</strong>
        </span>
        <span className="score-comparison-item">
          <span>Accepted</span>
          <strong>{formatPredictionScore(acceptedPrediction)}</strong>
        </span>
        <span className={`score-comparison-item ${actualResult ? 'score-comparison-item-live' : ''}`}>
          <span>Actual</span>
          <strong>{formatActualResultScore(matchId)}</strong>
          {actualResult?.sourceLabel ? <small>{actualResult.sourceLabel}</small> : null}
        </span>
      </div>
    )
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy-block">
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
        </div>

        <div className="hero-refresh-panel">
          <article className={`hero-refresh-card hero-refresh-card-${refreshFeedback.kind}`}>
            <div className="hero-refresh-meta">
              <div>
                <span>Backend connection</span>
                <strong className={`backend-status-pill backend-status-pill-${backendConnectionStatus}`}>
                  {backendConnectionStatus === 'checking'
                    ? 'Checking...'
                    : backendConnectionStatus === 'online'
                      ? 'Online'
                      : 'Offline'}
                </strong>
                <span className={`api-key-status ${marketApiState.apiKeyConfigured ? 'api-key-status-ready' : ''}`}>
                  {marketApiState.apiKeyConfigured ? 'Odds API key active' : 'Odds API key missing'}
                </span>
              </div>
              <div>
                <span>Live form refresh</span>
                <strong>
                  {latestLiveRefresh
                    ? new Intl.DateTimeFormat('en-GB', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                        timeZone: viewerTimeZone,
                      }).format(new Date(latestLiveRefresh))
                    : 'Not loaded yet'}
                </strong>
              </div>
              <div>
                <span>Market odds refresh</span>
                <strong>
                  {marketRefreshTimestamp
                    ? new Intl.DateTimeFormat('en-GB', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                        timeZone: viewerTimeZone,
                      }).format(new Date(marketRefreshTimestamp))
                    : 'Not loaded yet'}
                </strong>
              </div>
              <div>
                <span>Real results refresh</span>
                <strong>
                  {actualResultsRefreshTimestamp
                    ? new Intl.DateTimeFormat('en-GB', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                        timeZone: viewerTimeZone,
                      }).format(new Date(actualResultsRefreshTimestamp))
                    : 'Not loaded yet'}
                </strong>
              </div>
            </div>
            <p className="hero-status-copy">{liveRefreshStatus}</p>
            <p className="hero-status-copy">{marketApiState.marketStatus}</p>
            <p className="hero-status-copy">{marketApiState.actualResultStatus}</p>
            <p className="hero-status-copy">{marketApiState.stsStatus}</p>
            <div className="odds-api-usage-box">
              <div>
                <span>Credits remaining</span>
                <strong>{marketApiState.oddsApiUsage?.remaining ?? 'Unknown'}</strong>
              </div>
              <div>
                <span>Credits used</span>
                <strong>{marketApiState.oddsApiUsage?.used ?? 'Unknown'}</strong>
              </div>
              <div>
                <span>Last refresh cost</span>
                <strong>{marketApiState.oddsApiUsage?.last ?? 'Unknown'}</strong>
              </div>
              <button
                type="button"
                className="secondary-button compact-button odds-api-usage-button"
                onClick={() => void handleRefreshOddsApiUsage()}
                disabled={isRefreshingOddsUsage}
              >
                {isRefreshingOddsUsage ? 'Checking...' : 'Refresh credits'}
              </button>
            </div>
            <form className="api-key-form" onSubmit={(event) => void handleSubmitOddsApiKey(event)}>
              <label>
                <span>The Odds API key</span>
                <input
                  type="password"
                  value={oddsApiKeyInput}
                  onChange={(event) => setOddsApiKeyInput(event.target.value)}
                  placeholder="Paste your key"
                  autoComplete="off"
                />
              </label>
              <button type="submit" className="secondary-button compact-button">
                Submit
              </button>
            </form>
            <p className="hero-status-copy">{oddsApiKeyStatus}</p>
            <div className="refresh-feedback-box">
              <strong>{refreshFeedback.title}</strong>
              <div className="refresh-feedback-list">
                {refreshFeedback.details.map((detail) => (
                  <span key={detail}>{detail}</span>
                ))}
              </div>
            </div>
          </article>
          <div className="hero-button-stack">
            <button type="button" className="secondary-button" onClick={() => void handleRefreshLiveData()} disabled={isRefreshingLiveData}>
              {isRefreshingLiveData ? 'Refreshing live data & odds...' : 'Refresh live data & odds'}
            </button>
            <button type="button" className="secondary-button" onClick={handleReset}>
              Reset simulation
            </button>
            <button type="button" className="secondary-button" onClick={handleClearSavedData}>
              Clear saved data
            </button>
          </div>
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

            <div className="group-jump-list" aria-label="Jump to group matches">
              {groupDefinitions.map((groupDefinition) => (
                <button
                  key={groupDefinition.name}
                  type="button"
                  className="group-jump-button"
                  onClick={() => handleScrollToGroup(groupDefinition.name)}
                >
                  Group {groupDefinition.name}
                </button>
              ))}
            </div>

            <div className="standings-grid">
              {groupDefinitions.map((groupDefinition) => (
                <section key={groupDefinition.name} className="standings-card">
                  <div className="standings-header">
                    <button
                      type="button"
                      className="standings-group-link"
                      onClick={() => handleScrollToGroup(groupDefinition.name)}
                    >
                      Group {groupDefinition.name}
                    </button>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Team</th>
                        <th>Pred Pts</th>
                        <th>Pred GD</th>
                        <th>Pred P</th>
                        <th>Real Pts</th>
                        <th>Real GD</th>
                        <th>Real P</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(standings[groupDefinition.name] ?? []).map((row, index) => {
                        const actualRow = actualStandings[groupDefinition.name]?.find((standing) => standing.team.id === row.team.id)

                        return (
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
                            <td>{actualRow?.played ? actualRow.points : ''}</td>
                            <td>{actualRow?.played ? actualRow.goalDifference : ''}</td>
                            <td>{actualRow?.played ? actualRow.played : ''}</td>
                          </tr>
                        )
                      })}
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
                <section key={groupDefinition.name} id={`group-section-${groupDefinition.name}`} className="group-card">
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
                              <strong>Your time zone</strong>
                              <span>
                                {formatViewerDateTime(new Date(match.kickoffUtc)).dateLabel} / {formatViewerDateTime(new Date(match.kickoffUtc)).timeLabel}
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

                          {renderScoreComparison(match.id, match.prediction, match.acceptedPrediction)}

                          {renderBookmakerStrip(match.id)}

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
                          {renderPredictionExplanation(match.prediction)}
                          {renderPredictionHistory(match.predictionHistory)}
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
        <>
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

          {knockoutStageConfig.map(({ stage, title, subtitle }) => (
            <section key={stage} className="panel">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Bracket phase</p>
                  <h2>{title}</h2>
                  <p>{subtitle}</p>
                </div>
              </div>

              <div className="knockout-stage-grid">
                {resolvedKnockoutMatches
                  .filter((resolvedMatch) => resolvedMatch.match.stage === stage)
                  .sort((left, right) => Number(left.match.id) - Number(right.match.id))
                  .map((resolvedMatch) => {
                    const match = resolvedMatch.match
                    const homeTeam = resolvedMatch.homeTeam
                    const awayTeam = resolvedMatch.awayTeam
                    const canPredict = Boolean(homeTeam && awayTeam && resolvedMatch.lockReasons.length === 0)
                    const scoreLabel = match.acceptedPrediction
                      ? `${match.acceptedPrediction.homeGoals} : ${match.acceptedPrediction.awayGoals}${match.acceptedPrediction.knockoutResolution === 'extraTime' ? ' aet' : match.acceptedPrediction.knockoutResolution === 'penalties' ? ` pens ${match.acceptedPrediction.penaltyScore}` : ''}`
                      : match.prediction
                        ? `${match.prediction.homeGoals} : ${match.prediction.awayGoals}${match.prediction.knockoutResolution === 'extraTime' ? ' aet' : match.prediction.knockoutResolution === 'penalties' ? ` pens ${match.prediction.penaltyScore}` : ''}`
                        : 'vs'

                    return (
                      <article key={match.id} className="match-card knockout-match-card">
                        <div className="match-meta">
                          <span>{match.label}</span>
                          <span>{title}</span>
                        </div>

                        <div className="knockout-slot-box">
                          <span>{resolvedMatch.displayHomeSlot}</span>
                          <span>{resolvedMatch.displayAwaySlot}</span>
                        </div>

                        {resolvedMatch.schedule ? (
                          <div className="schedule-box">
                            <div>
                              <strong>{resolvedMatch.schedule.venueCity}</strong>
                              <span>{resolvedMatch.schedule.stadium}</span>
                            </div>
                            <div>
                              <strong>Local</strong>
                              <span>
                                {resolvedMatch.schedule.localDateLabel} / {resolvedMatch.schedule.localTimeLabel}
                              </span>
                            </div>
                            <div>
                              <strong>Your time zone</strong>
                              <span>
                                {formatViewerDateTime(new Date(resolvedMatch.schedule.kickoffUtc)).dateLabel} / {formatViewerDateTime(new Date(resolvedMatch.schedule.kickoffUtc)).timeLabel}
                              </span>
                            </div>
                          </div>
                        ) : null}

                        <div className="match-teams">
                          <div className="team-entry">
                            <strong className="team-name">
                              {homeTeam ? (
                                <img className="team-flag" src={getFlagUrl(homeTeam)} alt={`Flag of ${homeTeam.name}`} />
                              ) : (
                                <span className="team-flag team-flag-placeholder" aria-hidden="true"></span>
                              )}
                              <span>{homeTeam?.name ?? 'Waiting for qualifier'}</span>
                            </strong>
                          </div>
                          <div className="score-pill">{scoreLabel}</div>
                          <div className="team-entry">
                            <strong className="team-name">
                              {awayTeam ? (
                                <img className="team-flag" src={getFlagUrl(awayTeam)} alt={`Flag of ${awayTeam.name}`} />
                              ) : (
                                <span className="team-flag team-flag-placeholder" aria-hidden="true"></span>
                              )}
                              <span>{awayTeam?.name ?? 'Waiting for qualifier'}</span>
                            </strong>
                          </div>
                        </div>

                        {renderScoreComparison(match.id, match.prediction, match.acceptedPrediction)}

                        {homeTeam && awayTeam ? renderBookmakerStrip(match.id) : null}

                        {resolvedMatch.note ? (
                          <div className="prediction-box prediction-box-muted">
                            <p>{resolvedMatch.note}</p>
                          </div>
                        ) : null}

                        {!canPredict && resolvedMatch.lockReasons.length > 0 ? (
                          <div className="prediction-box prediction-box-muted">
                            <p>Unlock requirements:</p>
                            <ul className="lock-reason-list">
                              {resolvedMatch.lockReasons.map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {match.prediction ? (
                          <div className="prediction-box">
                            <div className="prediction-metrics">
                              <span className="metric-pill">{homeTeam?.name ?? 'Home'} {match.prediction.homeWinProbability}%</span>
                              <span className="metric-pill">Draw {match.prediction.drawProbability}%</span>
                              <span className="metric-pill">{awayTeam?.name ?? 'Away'} {match.prediction.awayWinProbability}%</span>
                              <span className="metric-pill">
                                xG {match.prediction.homeExpectedGoals} - {match.prediction.awayExpectedGoals}
                              </span>
                              <span className="metric-pill">Model strength {match.prediction.modelStrength}%</span>
                            </div>
                            <p>
                              <strong>{match.prediction.confidence}% confidence.</strong> {match.prediction.summary}
                            </p>
                            {renderPredictionExplanation(match.prediction)}
                            {renderPredictionHistory(match.predictionHistory)}
                          </div>
                        ) : (
                          <div className="prediction-box prediction-box-muted">
                            <p>{canPredict ? 'Predict this knockout match and accept the winner to move forward.' : 'This match unlocks when both teams are known.'}</p>
                          </div>
                        )}

                        {match.manualEditorOpen ? (
                          <div className="manual-entry-box">
                            <div className="manual-score-row">
                              <label className="manual-score-field">
                                <span>{homeTeam?.name ?? 'Home team'}</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={match.manualHomeGoals ?? ''}
                                  onChange={(event) => handleKnockoutManualScoreChange(match.id, 'home', event.target.value)}
                                />
                              </label>
                              <label className="manual-score-field">
                                <span>{awayTeam?.name ?? 'Away team'}</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={match.manualAwayGoals ?? ''}
                                  onChange={(event) => handleKnockoutManualScoreChange(match.id, 'away', event.target.value)}
                                />
                              </label>
                            </div>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => handleSaveKnockoutManualPrediction(match.id)}
                              disabled={match.manualHomeGoals === '' || match.manualAwayGoals === ''}
                            >
                              Save manual prediction
                            </button>
                          </div>
                        ) : null}

                        <div className="action-row">
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => handleTryToPredictKnockout(match.id)}
                            disabled={!canPredict}
                          >
                            {match.prediction ? 'Predict again' : 'Try to predict'}
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleToggleKnockoutManualEditor(match.id)}
                            disabled={!canPredict}
                          >
                            {match.manualEditorOpen ? 'Close manual entry' : 'Manual prediction'}
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleAcceptKnockout(match.id)}
                            disabled={!match.prediction}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleResetKnockoutMatch(match.id)}
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
                    )
                  })}
              </div>
            </section>
          ))}
        </>
      )}

      {sourcePickerSlotKey ? (
        <div className="source-picker-overlay" role="presentation" onClick={() => setSourcePickerSlotKey(null)}>
          <div className="source-picker-dialog" role="dialog" aria-modal="true" aria-label="Choose bookmaker source" onClick={(event) => event.stopPropagation()}>
            <div className="source-picker-header">
              <div>
                <p className="eyebrow">Bookmaker source</p>
                <h3>Choose the source for {sourcePickerSlotKey === 'broker1' ? 'Broker 1' : sourcePickerSlotKey === 'broker2' ? 'Broker 2' : 'Broker 3'}</h3>
              </div>
              <button type="button" className="secondary-button compact-button" onClick={() => setSourcePickerSlotKey(null)}>
                Close
              </button>
            </div>
            <div className="source-picker-grid">
              {marketApiState.availableSources.map((source) => (
                <button
                  key={source.key}
                  type="button"
                  className={`source-picker-option ${marketApiState.brokerSlots[sourcePickerSlotKey] === source.key ? 'source-picker-option-active' : ''}`}
                  onClick={() => void handleSelectBookmakerSource(source.key)}
                >
                  <span className="bookmaker-brand-badge" style={{ backgroundColor: source.accent }}>
                    {source.shortLabel}
                  </span>
                  <strong>{source.label}</strong>
                  <span>
                    {source.note ?? 'Displayed in the UI through the backend broker slot mapping.'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default App
