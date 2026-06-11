import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import { getAnnexCAssignment } from './annexC'
import { knockoutScheduleByMatchId, type KnockoutScheduleItem } from './knockoutSchedule'

type ViewMode = 'group' | 'bracket' | 'matchDays' | 'teams' | 'simulation'
type StandingsMode = 'prediction' | 'real'
type TeamSortMode = 'alphabetical' | 'ranking' | 'group'
type MatchDayTimeMode = 'local' | 'viewer'
type BookmakerSourceKey = 'betfair' | 'pinnacle' | 'fanduel' | 'sts'
type BrokerSlotKey = 'broker1' | 'broker2' | 'broker3'
type PhaseAwardKey = 'goalMachine' | 'disastrousDefence' | 'cardKings' | 'nobleEleven'
type PhaseKey = 'group' | KnockoutStage
type AdaptiveFactorKey =
  | 'rating'
  | 'profile'
  | 'recentForm'
  | 'injury'
  | 'absences'
  | 'schedule'
  | 'rotation'
  | 'motivation'
  | 'continuity'
  | 'matchup'
  | 'squadDepth'
  | 'draw'
  | 'venue'
  | 'market'

type SimulationFocus = {
  stage: 'group' | 'knockout'
  matchId: string
  label: string
  homeTeamName: string
  awayTeamName: string
  venue: string
}

type DetailedSimulationReport = {
  stage: 'group' | 'knockout'
  iterations: number
  homeTeamName: string
  awayTeamName: string
  venue: string
  recommendedPrediction: Prediction
  topScorelines: Array<{ label: string; count: number; share: number }>
  summaryMetrics: Array<{ label: string; value: string }>
  chartBars: Array<{ label: string; share: number }>
  scorelineHeatmap: Array<{ homeGoals: string; awayGoals: string; share: number }>
  phaseFlow: Array<{ label: string; share: number }>
  notes: string[]
}

type MatchDayItem = {
  id: string
  stage: 'group' | 'knockout'
  stageLabel: string
  kickoffUtc: string
  localDateLabel: string
  localTimeLabel: string
  viewerDateLabel: string
  viewerTimeLabel: string
  homeTeamName: string
  awayTeamName: string
  homeFlagUrl?: string
  awayFlagUrl?: string
  predictionScore: string
  acceptedScore: string
  actualScore: string
  actualSourceLabel: string
}

type PhaseAwardSnapshot = {
  teamId: string
  teamName: string
  value: number
  confidence: number
  summary: string
}

type AdaptiveLearningEntry = {
  id: string
  createdAt: string
  matchId: string
  summary: string
  factorChanges: string[]
  bookmakerChanges: string[]
}

type AdaptiveLearningState = {
  factorWeights: Record<AdaptiveFactorKey, number>
  bookmakerWeights: Record<BookmakerSourceKey, number>
  processedActualMatchIds: string[]
  learningLog: AdaptiveLearningEntry[]
}

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

type Confederation = 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'AFC' | 'CAF' | 'OFC'

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

type TeamStaffMember = {
  name: string
  role: string
  nationality?: string
}

type TeamTournamentPlayerStats = {
  matchesPlayed?: number | null
  minutesPlayed?: number | null
  goals?: number | null
  assists?: number | null
  fouls?: number | null
  yellowCards?: number | null
  redCards?: number | null
  unavailableNextMatch?: boolean
  injured?: boolean
}

type TeamPlayerProfile = {
  id: string
  name: string
  lastName?: string
  number?: string
  nationality?: string
  club?: string
  position?: string
  age?: number | null
  dateOfBirth?: string
  height?: string
  weight?: string
  status?: string
  playerRating?: number | null
  nationalTeamMatches?: number | null
  nationalTeamGoals?: number | null
  nationalTeamAssists?: number | null
  nationalTeamYellowCards?: number | null
  nationalTeamRedCards?: number | null
  tournamentStats: TeamTournamentPlayerStats
  thumbUrl?: string
  cutoutUrl?: string
}

type TeamDirectoryEntry = {
  teamId: string
  teamName: string
  group: string
  source: string
  refreshedAt: string
  stadium?: string
  location?: string
  foundedYear?: string
  website?: string
  description?: string
  staff: TeamStaffMember[]
  players: TeamPlayerProfile[]
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

type LiveDataProviderState = {
  configured: boolean
  label: string
  status: string
}

type LiveDataState = {
  liveTeamFormById: Partial<Record<string, TeamLiveForm>>
  teamDirectoryById: Partial<Record<string, TeamDirectoryEntry>>
  latestRefreshAt?: string
  refreshStatus: string
  providers: {
    apiFootball: LiveDataProviderState
    footballData: LiveDataProviderState
    theSportsDb: LiveDataProviderState
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

const confederationByTeamId: Record<string, Confederation> = {
  mex: 'CONCACAF',
  rsa: 'CAF',
  kor: 'AFC',
  cze: 'UEFA',
  can: 'CONCACAF',
  bih: 'UEFA',
  qat: 'AFC',
  sui: 'UEFA',
  bra: 'CONMEBOL',
  mar: 'CAF',
  hai: 'CONCACAF',
  sco: 'UEFA',
  usa: 'CONCACAF',
  par: 'CONMEBOL',
  aus: 'AFC',
  tur: 'UEFA',
  ger: 'UEFA',
  cuw: 'CONCACAF',
  civ: 'CAF',
  ecu: 'CONMEBOL',
  ned: 'UEFA',
  jpn: 'AFC',
  swe: 'UEFA',
  tun: 'CAF',
  bel: 'UEFA',
  egy: 'CAF',
  irn: 'AFC',
  nzl: 'OFC',
  esp: 'UEFA',
  cpv: 'CAF',
  ksa: 'AFC',
  uru: 'CONMEBOL',
  fra: 'UEFA',
  sen: 'CAF',
  irq: 'AFC',
  nor: 'UEFA',
  arg: 'CONMEBOL',
  alg: 'CAF',
  aut: 'UEFA',
  jor: 'AFC',
  por: 'UEFA',
  cod: 'CAF',
  uzb: 'AFC',
  col: 'CONMEBOL',
  eng: 'UEFA',
  cro: 'UEFA',
  gha: 'CAF',
  pan: 'CONCACAF',
}

const notablePairBiasOverrides: Record<string, { favoredTeamId?: string; edge?: number; drawLean?: number }> = {
  'arg-bra': { drawLean: 0.015 },
  'eng-sco': { drawLean: 0.018 },
  'cro-eng': { drawLean: 0.012 },
  'mex-usa': { drawLean: 0.014 },
  'arg-uru': { drawLean: 0.016 },
  'por-esp': { drawLean: 0.012 },
  'aut-ger': { favoredTeamId: 'ger', edge: 0.012, drawLean: 0.01 },
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
  standingsMode: 'world-cup-betting-system/standings-mode',
  matchDayTimeMode: 'world-cup-betting-system/match-day-time-mode',
  liveTeamForm: 'world-cup-betting-system/live-team-form',
  teamDirectory: 'world-cup-betting-system/team-directory',
  phaseAwards: 'world-cup-betting-system/phase-awards',
  adaptiveLearning: 'world-cup-betting-system/adaptive-learning',
} as const

const TEAM_DATA_STALE_AFTER_MS = 1000 * 60 * 60 * 12

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
  details: ['Use `Refresh Live Data` for team data and `Refresh Bets` for bookmaker odds and results.'],
}

const phaseAwardDefinitions: { key: PhaseAwardKey; title: string; description: string }[] = [
  { key: 'goalMachine', title: 'Goal Machine', description: 'Most goals scored in this phase.' },
  { key: 'disastrousDefence', title: 'Disastrous Defence', description: 'Most goals conceded in this phase.' },
  { key: 'cardKings', title: 'Card Kings', description: 'Most cards collected in this phase.' },
  { key: 'nobleEleven', title: 'Noble Eleven', description: 'Fewest cards collected in this phase.' },
]

const phaseKeyOrder: PhaseKey[] = ['group', 'roundOf32', 'roundOf16', 'quarterFinals', 'semiFinals', 'thirdPlace', 'final']

const defaultAdaptiveFactorWeights: Record<AdaptiveFactorKey, number> = {
  rating: 1,
  profile: 1,
  recentForm: 1,
  injury: 1,
  absences: 1,
  schedule: 1,
  rotation: 1,
  motivation: 1,
  continuity: 1,
  matchup: 1,
  squadDepth: 1,
  draw: 1,
  venue: 1,
  market: 1,
}

const defaultAdaptiveBookmakerWeights: Record<BookmakerSourceKey, number> = {
  betfair: 1,
  pinnacle: 1,
  fanduel: 1,
  sts: 1,
}

const defaultAdaptiveLearningState: AdaptiveLearningState = {
  factorWeights: { ...defaultAdaptiveFactorWeights },
  bookmakerWeights: { ...defaultAdaptiveBookmakerWeights },
  processedActualMatchIds: [],
  learningLog: [],
}

const defaultLiveDataState: LiveDataState = {
  liveTeamFormById: {},
  teamDirectoryById: {},
  latestRefreshAt: undefined,
  refreshStatus: 'Refresh Live Data will load team data through backend providers.',
  providers: {
    apiFootball: {
      configured: false,
      label: 'API-Football',
      status: 'API-Football key missing.',
    },
    footballData: {
      configured: false,
      label: 'football-data.org',
      status: 'football-data.org key missing.',
    },
    theSportsDb: {
      configured: true,
      label: 'TheSportsDB',
      status: 'TheSportsDB fallback is available.',
    },
  },
}

function normalizeMarketApiState(state: Partial<MarketApiState>): MarketApiState {
  return {
    ...defaultMarketApiState,
    ...state,
    availableSources: state.availableSources ?? defaultMarketApiState.availableSources,
    brokerSlots: {
      ...defaultMarketApiState.brokerSlots,
      ...(state.brokerSlots ?? {}),
    },
    oddsByMatchId: state.oddsByMatchId ?? {},
    consensusByMatchId: state.consensusByMatchId ?? {},
    actualResultsByMatchId: state.actualResultsByMatchId ?? {},
    trustedSources: state.trustedSources ?? defaultMarketApiState.trustedSources,
  }
}

function normalizeAdaptiveLearningState(state: Partial<AdaptiveLearningState> | null | undefined): AdaptiveLearningState {
  return {
    factorWeights: {
      ...defaultAdaptiveFactorWeights,
      ...(state?.factorWeights ?? {}),
    },
    bookmakerWeights: {
      ...defaultAdaptiveBookmakerWeights,
      ...(state?.bookmakerWeights ?? {}),
    },
    processedActualMatchIds: state?.processedActualMatchIds ?? [],
    learningLog: (state?.learningLog ?? []).map((entry) => ({
      ...entry,
      factorChanges: entry.factorChanges ?? [],
      bookmakerChanges: entry.bookmakerChanges ?? [],
    })),
  }
}

function clampAdaptiveWeight(value: number) {
  return clamp(value, 0.82, 1.18)
}

function formatAdaptiveFactorLabel(factorKey: AdaptiveFactorKey) {
  switch (factorKey) {
    case 'recentForm':
      return 'recent form'
    case 'squadDepth':
      return 'squad depth'
    case 'matchup':
      return 'matchup'
    case 'continuity':
      return 'continuity'
    case 'absences':
      return 'absences'
    default:
      return factorKey
  }
}

function getPredictionOutcomeSignal(prediction: Prediction) {
  const maxProbability = Math.max(prediction.homeWinProbability, prediction.drawProbability, prediction.awayWinProbability)

  if (maxProbability === prediction.drawProbability) {
    return 0
  }

  return maxProbability === prediction.homeWinProbability ? 1 : -1
}

function getActualOutcomeSignal(actualResult: ActualResultSnapshot) {
  if (actualResult.homeGoals === actualResult.awayGoals) {
    return 0
  }

  return actualResult.homeGoals > actualResult.awayGoals ? 1 : -1
}

function getOutcomeVectorFromResult(actualResult: ActualResultSnapshot) {
  return {
    home: actualResult.homeGoals > actualResult.awayGoals ? 1 : 0,
    draw: actualResult.homeGoals === actualResult.awayGoals ? 1 : 0,
    away: actualResult.homeGoals < actualResult.awayGoals ? 1 : 0,
  }
}

function getThreeWayBrierScore(homeProbability: number, drawProbability: number, awayProbability: number, actualResult: ActualResultSnapshot) {
  const outcome = getOutcomeVectorFromResult(actualResult)
  return (
    ((homeProbability / 100 - outcome.home) ** 2 +
      (drawProbability / 100 - outcome.draw) ** 2 +
      (awayProbability / 100 - outcome.away) ** 2) /
    3
  )
}

function mapFactorLabelToAdaptiveKey(label: string): AdaptiveFactorKey | null {
  switch (label) {
    case 'Rating edge':
      return 'rating'
    case 'Team profile edge':
      return 'profile'
    case 'Recent form edge':
      return 'recentForm'
    case 'Injury edge':
      return 'injury'
    case 'Key absences edge':
      return 'absences'
    case 'Rest edge':
    case 'Travel edge':
      return 'schedule'
    case 'Rotation risk edge':
      return 'rotation'
    case 'Motivation edge':
      return 'motivation'
    case 'Coach continuity edge':
      return 'continuity'
    case 'Matchup history edge':
      return 'matchup'
    case 'Squad depth edge':
      return 'squadDepth'
    case 'Draw tolerance swing':
      return 'draw'
    case 'Market odds edge':
      return 'market'
    case 'Venue and altitude edge':
      return 'venue'
    default:
      return null
  }
}

function learnFromPredictionResult(
  currentState: AdaptiveLearningState,
  matchId: string,
  prediction: Prediction,
  actualResult: ActualResultSnapshot,
  oddsBySource: MatchBookmakerOdds | undefined,
): AdaptiveLearningState {
  if (currentState.processedActualMatchIds.includes(matchId)) {
    return currentState
  }

  const nextState = normalizeAdaptiveLearningState(currentState)
  const actualOutcomeSignal = getActualOutcomeSignal(actualResult)
  const predictionOutcomeSignal = getPredictionOutcomeSignal(prediction)
  const outcomeHit = actualOutcomeSignal === predictionOutcomeSignal
  const goalDistance = Math.abs(prediction.homeGoals - actualResult.homeGoals) + Math.abs(prediction.awayGoals - actualResult.awayGoals)
  const closenessFactor = clamp(1 - goalDistance / 6, 0.28, 1)
  const factorChanges: Array<{ key: AdaptiveFactorKey; delta: number }> = []
  const bookmakerChanges: Array<{ key: BookmakerSourceKey; delta: number }> = []

  prediction.factorBreakdown.forEach((factor) => {
    const adaptiveKey = mapFactorLabelToAdaptiveKey(factor.label)

    if (!adaptiveKey) {
      return
    }

    const magnitude = Math.min(Math.abs(factor.impact), 0.35)
    let alignment = 0

    if (actualOutcomeSignal === 0) {
      alignment = Math.abs(factor.impact) <= 0.05 ? 1 : -1
    } else if (Math.abs(factor.impact) >= 0.015) {
      alignment = Math.sign(factor.impact) === actualOutcomeSignal ? 1 : -1
    }

    if (alignment === 0) {
      return
    }

    const learningRate = outcomeHit ? 0.05 : 0.06
    const delta = alignment * magnitude * learningRate * closenessFactor
    nextState.factorWeights[adaptiveKey] = clampAdaptiveWeight(nextState.factorWeights[adaptiveKey] + delta)
    factorChanges.push({ key: adaptiveKey, delta })
  })

  Object.entries(oddsBySource ?? {}).forEach(([sourceKey, snapshot]) => {
    if (!snapshot) {
      return
    }

    const source = sourceKey as BookmakerSourceKey
    const brierScore = getThreeWayBrierScore(snapshot.homeProbability, snapshot.drawProbability, snapshot.awayProbability, actualResult)
    const centeredPerformance = 0.22 - brierScore
    const delta = clamp(centeredPerformance * 0.08 * closenessFactor, -0.012, 0.012)
    nextState.bookmakerWeights[source] = clampAdaptiveWeight(nextState.bookmakerWeights[source] + delta)
    bookmakerChanges.push({ key: source, delta })
  })

  nextState.processedActualMatchIds = [...nextState.processedActualMatchIds, matchId]
  nextState.learningLog = [
    ...nextState.learningLog,
    {
      id: `${matchId}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      matchId,
      summary: outcomeHit
        ? `Engine calibration reinforced signals that matched the real result for Match ${matchId}.`
        : `Engine calibration reduced signals that pointed away from the real result for Match ${matchId}.`,
      factorChanges: factorChanges
        .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
        .slice(0, 4)
        .map(
          (entry) =>
            `${formatAdaptiveFactorLabel(entry.key)} ${entry.delta >= 0 ? '+' : ''}${roundTo(entry.delta * 100, 2)}%`,
        ),
      bookmakerChanges: bookmakerChanges
        .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
        .slice(0, 4)
        .map(
          (entry) =>
            `${findBookmakerSource(entry.key).label} ${entry.delta >= 0 ? '+' : ''}${roundTo(entry.delta * 100, 2)}%`,
        ),
    },
  ].slice(-18)

  return nextState
}

function findBookmakerSource(sourceKey: BookmakerSourceKey) {
  return bookmakerSources.find((source) => source.key === sourceKey) ?? bookmakerSources[0]
}

function getMarketBlendWeight(sourceKey: BookmakerSourceKey, adaptiveLearningState?: AdaptiveLearningState) {
  const baseWeight =
    sourceKey === 'betfair'
      ? 0.42
      : sourceKey === 'pinnacle'
        ? 0.38
        : sourceKey === 'fanduel'
          ? 0.26
          : sourceKey === 'sts'
            ? 0.24
            : 0.3
  const trustWeight = adaptiveLearningState?.bookmakerWeights[sourceKey] ?? 1
  const marketFactorWeight = adaptiveLearningState?.factorWeights.market ?? 1
  return clamp(baseWeight * trustWeight * marketFactorWeight, 0.12, 0.62)
}

function blendPercent(modelPercent: number, marketPercent: number, sourceKey: BookmakerSourceKey, adaptiveLearningState?: AdaptiveLearningState) {
  const weight = getMarketBlendWeight(sourceKey, adaptiveLearningState)
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

const knockoutStageConfigStatic: { stage: KnockoutStage; title: string; subtitle: string }[] = [
  { stage: 'roundOf32', title: 'Round of 32', subtitle: '32 teams enter the bracket here.' },
  { stage: 'roundOf16', title: 'Round of 16', subtitle: 'Winners from the opening knockout round.' },
  { stage: 'quarterFinals', title: 'Quarter-finals', subtitle: 'The last eight teams.' },
  { stage: 'semiFinals', title: 'Semi-finals', subtitle: 'Four teams remain.' },
  { stage: 'thirdPlace', title: 'Third-place match', subtitle: 'Losers of the semi-finals.' },
  { stage: 'final', title: 'Final', subtitle: 'The tournament decider.' },
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

async function fetchMarketStateFromBackend() {
  const response = await fetch('/api/market/state')

  if (!response.ok) {
    throw new Error(`Market state request failed with ${response.status}.`)
  }

  return normalizeMarketApiState((await response.json()) as Partial<MarketApiState>)
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

  return normalizeMarketApiState((await response.json()) as Partial<MarketApiState>)
}

async function refreshSingleMatchMarketInBackend(match: MarketTarget, mode: 'missing' | 'reload') {
  const response = await fetch(`/api/market/match/${match.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ match, mode }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(payload?.message ?? `Single-match market refresh failed with ${response.status}.`)
  }

  return normalizeMarketApiState((await response.json()) as Partial<MarketApiState>)
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

  return normalizeMarketApiState((await response.json()) as Partial<MarketApiState>)
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

  return normalizeMarketApiState((await response.json()) as Partial<MarketApiState>)
}

async function refreshOddsApiUsageInBackend() {
  const response = await fetch('/api/market/usage', {
    method: 'POST',
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(payload?.message ?? `Odds API usage refresh failed with ${response.status}.`)
  }

  return normalizeMarketApiState((await response.json()) as Partial<MarketApiState>)
}

async function resetMarketStateInBackend() {
  const response = await fetch('/api/market/reset', {
    method: 'POST',
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(payload?.message ?? `Market reset failed with ${response.status}.`)
  }

  return normalizeMarketApiState((await response.json()) as Partial<MarketApiState>)
}

function normalizeLiveDataState(state: Partial<LiveDataState>): LiveDataState {
  return {
    ...defaultLiveDataState,
    ...state,
    liveTeamFormById: state.liveTeamFormById ?? defaultLiveDataState.liveTeamFormById,
    teamDirectoryById: state.teamDirectoryById ?? defaultLiveDataState.teamDirectoryById,
    providers: {
      apiFootball: { ...defaultLiveDataState.providers.apiFootball, ...(state.providers?.apiFootball ?? {}) },
      footballData: { ...defaultLiveDataState.providers.footballData, ...(state.providers?.footballData ?? {}) },
      theSportsDb: { ...defaultLiveDataState.providers.theSportsDb, ...(state.providers?.theSportsDb ?? {}) },
    },
  }
}

async function fetchLiveDataStateFromBackend() {
  const response = await fetch('/api/live/state')

  if (!response.ok) {
    throw new Error(`Live data state request failed with ${response.status}.`)
  }

  return normalizeLiveDataState((await response.json()) as Partial<LiveDataState>)
}

async function refreshLiveDataInBackend(teams: Team[]) {
  const response = await fetch('/api/live/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ teams }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(payload?.message ?? `Live data refresh failed with ${response.status}.`)
  }

  return normalizeLiveDataState((await response.json()) as Partial<LiveDataState>)
}

async function submitLiveProviderKeyToBackend(providerKey: 'api-football' | 'football-data', apiKey: string) {
  const response = await fetch(`/api/live/provider/${providerKey}/api-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ apiKey }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(payload?.message ?? `Live provider key submit failed with ${response.status}.`)
  }

  return normalizeLiveDataState((await response.json()) as Partial<LiveDataState>)
}

async function resetLiveDataInBackend() {
  const response = await fetch('/api/live/reset', {
    method: 'POST',
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(payload?.message ?? `Live data reset failed with ${response.status}.`)
  }

  return normalizeLiveDataState((await response.json()) as Partial<LiveDataState>)
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

function average(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function predictionModeLabelFromAdaptiveState(adaptiveLearningState?: AdaptiveLearningState) {
  if (!adaptiveLearningState || adaptiveLearningState.processedActualMatchIds.length === 0) {
    return 'seeded weights'
  }

  return `adaptive (${adaptiveLearningState.processedActualMatchIds.length} learned matches)`
}

function getConfederation(team: Team): Confederation {
  return confederationByTeamId[team.id] ?? 'UEFA'
}

function getHeadCoachName(entry?: TeamDirectoryEntry) {
  const coach = entry?.staff.find((member) => /head coach|manager|coach/i.test(member.role))
  return coach?.name
}

function getPlayerProjectedRating(player: TeamPlayerProfile) {
  if (typeof player.playerRating === 'number') {
    return clamp(player.playerRating, 45, 99)
  }

  const tournamentContribution =
    (player.tournamentStats.minutesPlayed ?? 0) / 90 * 1.2 +
    (player.tournamentStats.goals ?? 0) * 2.8 +
    (player.tournamentStats.assists ?? 0) * 1.9
  const nationalTeamContribution =
    (player.nationalTeamMatches ?? 0) * 0.12 +
    (player.nationalTeamGoals ?? 0) * 0.38 +
    (player.nationalTeamAssists ?? 0) * 0.28
  const ageAdjustment = player.age ? clamp((29 - Math.abs(player.age - 27)) * 0.45, -4, 5) : 0

  return clamp(58 + tournamentContribution + nationalTeamContribution + ageAdjustment, 50, 92)
}

function getPlayerRoleBucket(player: TeamPlayerProfile) {
  const normalizedPosition = (player.position ?? '').toLowerCase()

  if (normalizedPosition.includes('goal')) {
    return 'goalkeeper'
  }

  if (normalizedPosition.includes('def')) {
    return 'defender'
  }

  if (normalizedPosition.includes('mid')) {
    return 'midfielder'
  }

  if (normalizedPosition.includes('wing') || normalizedPosition.includes('for') || normalizedPosition.includes('strik') || normalizedPosition.includes('att')) {
    return 'forward'
  }

  return 'outfield'
}

function getPlayerImportanceScore(player: TeamPlayerProfile) {
  const rating = getPlayerProjectedRating(player)
  const roleBucket = getPlayerRoleBucket(player)
  const roleMultiplier =
    roleBucket === 'goalkeeper'
      ? 1.08
      : roleBucket === 'midfielder'
        ? 1.03
        : roleBucket === 'forward'
          ? 1.06
          : 1
  const experienceWeight = clamp((player.nationalTeamMatches ?? 0) / 55, 0, 1)
  const scoringWeight = clamp(((player.nationalTeamGoals ?? 0) + (player.nationalTeamAssists ?? 0)) / 28, 0, 1)
  const tournamentWeight = clamp((player.tournamentStats.minutesPlayed ?? 0) / 270, 0, 1)

  return clamp((rating / 100) * 0.72 * roleMultiplier + experienceWeight * 0.14 + scoringWeight * 0.08 + tournamentWeight * 0.12, 0.35, 1.55)
}

function getTeamSquadSignals(team: Team, entry?: TeamDirectoryEntry) {
  const players = entry?.players ?? []

  if (players.length === 0) {
    return {
      depthScore: clamp(0.64 + (team.rating - 70) / 90, 0.58, 0.92),
      extraTimeDepthScore: clamp(0.62 + (team.rating - 70) / 95, 0.56, 0.9),
      penaltyUnitScore: clamp(0.6 + (team.rating - 70) / 92, 0.56, 0.9),
      goalkeeperScore: clamp(0.6 + (team.rating - 70) / 96, 0.55, 0.88),
      availabilityImpact: 0,
      disciplineRisk: 0,
      injuredCount: 0,
      unavailableCount: 0,
      coreContinuityScore: clamp(0.54 + (team.rating - 70) / 115, 0.48, 0.82),
      starAbsenceNames: [] as string[],
    }
  }

  const ratedPlayers = players
    .map((player) => ({ player, rating: getPlayerProjectedRating(player), importance: getPlayerImportanceScore(player) }))
    .sort((left, right) => right.rating - left.rating)
  const topCore = ratedPlayers.slice(0, 11)
  const benchCore = ratedPlayers.slice(11, 22)
  const penaltyPool = ratedPlayers.filter(({ player }) => ['forward', 'midfielder', 'outfield'].includes(getPlayerRoleBucket(player))).slice(0, 6)
  const goalkeepers = ratedPlayers.filter(({ player }) => getPlayerRoleBucket(player) === 'goalkeeper')
  const unavailablePlayers = ratedPlayers.filter(({ player }) => player.tournamentStats.injured || player.tournamentStats.unavailableNextMatch)
  const starAbsences = unavailablePlayers.slice(0, 4)
  const availabilityImpact = clamp(
    starAbsences.reduce(
      (sum, { player, importance }) =>
        sum +
        importance *
          (player.tournamentStats.injured ? 0.08 : 0.05),
      0,
    ),
    0,
    0.24,
  )
  const disciplineRisk = clamp(
    average(
      ratedPlayers.slice(0, 14).map(
        ({ player }) => (player.tournamentStats.yellowCards ?? 0) * 0.035 + (player.tournamentStats.redCards ?? 0) * 0.09,
      ),
    ),
    0,
    0.2,
  )
  const coreContinuityScore = clamp(
    average(topCore.map(({ player }) => clamp((player.nationalTeamMatches ?? 0) / 70, 0.15, 1))) * 0.72 +
      clamp(1 - availabilityImpact * 1.8, 0.5, 1) * 0.28,
    0.35,
    0.95,
  )

  return {
    depthScore: clamp(average(ratedPlayers.slice(0, 18).map(({ rating }) => rating)) / 100, 0.55, 0.96),
    extraTimeDepthScore: clamp((average(benchCore.map(({ rating }) => rating)) * 0.55 + average(topCore.map(({ rating }) => rating)) * 0.45) / 100, 0.52, 0.98),
    penaltyUnitScore: clamp((average(penaltyPool.map(({ rating }) => rating)) || average(topCore.map(({ rating }) => rating))) / 100, 0.5, 0.99),
    goalkeeperScore: clamp(((goalkeepers[0]?.rating ?? average(topCore.map(({ rating }) => rating)) * 0.94) as number) / 100, 0.5, 0.97),
    availabilityImpact,
    disciplineRisk,
    injuredCount: ratedPlayers.filter(({ player }) => player.tournamentStats.injured).length,
    unavailableCount: ratedPlayers.filter(({ player }) => player.tournamentStats.unavailableNextMatch).length,
    coreContinuityScore,
    starAbsenceNames: starAbsences.map(({ player }) => player.name),
  }
}

function getTeamContinuitySignals(team: Team, profile: TeamModelProfile, squadSignals: ReturnType<typeof getTeamSquadSignals>, entry?: TeamDirectoryEntry) {
  const coachName = getHeadCoachName(entry)
  const rosterCompleteness = clamp((entry?.players.length ?? 0) / 26, 0.32, 1)
  const staffCompleteness = clamp((entry?.staff.length ?? 0) / 4, 0.2, 1)
  const seededCoachTenureMonths = clamp(8 + ((teamHash(team) * 7) % 38), 6, 46)
  const coachTenureMonths = coachName ? seededCoachTenureMonths + 4 : seededCoachTenureMonths - 2
  const tacticalContinuity = clamp(
    0.44 +
      rosterCompleteness * 0.12 +
      staffCompleteness * 0.05 +
      squadSignals.coreContinuityScore * 0.22 +
      (1.06 - profile.volatility) * 0.26 +
      clamp((coachTenureMonths - 12) / 95, -0.06, 0.14),
    0.34,
    0.92,
  )
  const recentCoachChangeRisk = coachTenureMonths <= 10 ? clamp((11 - coachTenureMonths) * 0.011, 0.01, 0.08) : 0
  const stabilityScore = clamp(
    tacticalContinuity * 0.7 +
      clamp(coachTenureMonths / 42, 0.16, 1) * 0.16 +
      staffCompleteness * 0.07 -
      recentCoachChangeRisk -
      squadSignals.availabilityImpact * 0.35,
    0.24,
    0.93,
  )

  return {
    coachName,
    coachTenureMonths,
    tacticalContinuity,
    recentCoachChangeRisk,
    stabilityScore,
  }
}

function getMatchupHistorySignals(homeTeam: Team, awayTeam: Team, homeRecent: TeamRecentData, awayRecent: TeamRecentData) {
  const homeConfederation = getConfederation(homeTeam)
  const awayConfederation = getConfederation(awayTeam)
  const sameConfederation = homeConfederation === awayConfederation
  const similarTier = Math.abs(homeTeam.rating - awayTeam.rating) <= 6
  const pairKey = [homeTeam.id, awayTeam.id].sort().join('-')
  const pairOverride = notablePairBiasOverrides[pairKey]
  const seededHeadToHeadEdge = pairOverride?.favoredTeamId
    ? pairOverride.favoredTeamId === homeTeam.id
      ? pairOverride.edge ?? 0
      : -(pairOverride.edge ?? 0)
    : 0
  const peerPerformanceEdge =
    sameConfederation && similarTier
      ? clamp(
          (homeRecent.lastFivePointsPerMatch - awayRecent.lastFivePointsPerMatch) * 0.028 +
            (homeRecent.goalsForPerMatch - awayRecent.goalsForPerMatch) * 0.018 +
            (awayRecent.goalsAgainstPerMatch - homeRecent.goalsAgainstPerMatch) * 0.014,
          -0.09,
          0.09,
        )
      : 0
  const regionalFamiliarityDrawLean = sameConfederation ? 0.01 : 0
  const similarTierDrawLean = similarTier ? 0.006 : 0
  const drawLean = clamp(regionalFamiliarityDrawLean + similarTierDrawLean + (pairOverride?.drawLean ?? 0), -0.02, 0.045)

  return {
    sameConfederation,
    similarTier,
    homeConfederation,
    awayConfederation,
    seededHeadToHeadEdge,
    peerPerformanceEdge,
    drawLean,
  }
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

function samplePoissonGoals(lambda: number) {
  const limit = Math.exp(-Math.max(lambda, 0.01))
  let product = 1
  let goals = -1

  do {
    goals += 1
    product *= Math.random()
  } while (product > limit && goals < 12)

  return goals
}

function getSimulationPenaltyEdge(homeTeam: Team, awayTeam: Team, homeEntry: TeamDirectoryEntry | undefined, awayEntry: TeamDirectoryEntry | undefined) {
  const homeSignals = getTeamSquadSignals(homeTeam, homeEntry)
  const awaySignals = getTeamSquadSignals(awayTeam, awayEntry)
  return (
    (homeSignals.penaltyUnitScore - awaySignals.penaltyUnitScore) * 0.95 +
    (homeSignals.goalkeeperScore - awaySignals.goalkeeperScore) * 0.75 +
    (homeSignals.coreContinuityScore - awaySignals.coreContinuityScore) * 0.2 +
    (homeTeam.rating - awayTeam.rating) / 180
  )
}

function buildDetailedSimulationPrediction(
  basePrediction: Prediction,
  stage: 'group' | 'knockout',
  homeTeam: Team,
  awayTeam: Team,
  summary: {
    iterations: number
    regularHomeWins: number
    regularDraws: number
    regularAwayWins: number
    knockoutHomeWins: number
    knockoutAwayWins: number
    extraTimeCount: number
    penaltiesCount: number
    scorelineCounts: Map<string, number>
    averageHomeGoals: number
    averageAwayGoals: number
    marketSourceKey?: BookmakerSourceKey
  },
): DetailedSimulationReport {
  const topScoreEntries = [...summary.scorelineCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
  const [recommendedScoreline, recommendedCount] = topScoreEntries[0] ?? [`${basePrediction.homeGoals}-${basePrediction.awayGoals}`, 0]
  const [recommendedHomeGoalsText, recommendedAwayGoalsText] = recommendedScoreline.split('-')
  const recommendedHomeGoals = Number(recommendedHomeGoalsText)
  const recommendedAwayGoals = Number(recommendedAwayGoalsText)
  const regularHomeWinProbability = roundTo((summary.regularHomeWins / summary.iterations) * 100, 1)
  const regularDrawProbability = roundTo((summary.regularDraws / summary.iterations) * 100, 1)
  const regularAwayWinProbability = roundTo((summary.regularAwayWins / summary.iterations) * 100, 1)
  const knockoutHomeWinProbability =
    stage === 'knockout' ? roundTo((summary.knockoutHomeWins / summary.iterations) * 100, 1) : regularHomeWinProbability
  const knockoutAwayWinProbability =
    stage === 'knockout' ? roundTo((summary.knockoutAwayWins / summary.iterations) * 100, 1) : regularAwayWinProbability
  const topScoreShare = recommendedCount > 0 ? recommendedCount / summary.iterations : 0
  const recommendedKnockoutWinner =
    stage === 'knockout'
      ? knockoutHomeWinProbability >= knockoutAwayWinProbability
        ? homeTeam.id
        : awayTeam.id
      : undefined
  const recommendedKnockoutResolution =
    stage === 'knockout'
      ? summary.penaltiesCount / summary.iterations >= 0.18
        ? 'penalties'
        : summary.extraTimeCount / summary.iterations >= 0.16
          ? 'extraTime'
          : 'regularTime'
      : undefined
  const confidence =
    stage === 'knockout'
      ? clamp(Math.round(Math.max(knockoutHomeWinProbability, knockoutAwayWinProbability) + topScoreShare * 100 * 0.55), 45, 97)
      : clamp(Math.round(Math.max(regularHomeWinProbability, regularDrawProbability, regularAwayWinProbability) + topScoreShare * 100 * 0.55), 45, 95)
  const simulationFactors: PredictionFactor[] = [
    { label: 'Simulation home win share', impact: roundTo((stage === 'knockout' ? knockoutHomeWinProbability : regularHomeWinProbability) / 100, 3) },
    { label: 'Simulation draw share', impact: roundTo(regularDrawProbability / 100, 3) },
    { label: 'Simulation away win share', impact: roundTo((stage === 'knockout' ? knockoutAwayWinProbability : regularAwayWinProbability) / 100, 3) },
    { label: 'Top scoreline share', impact: roundTo(topScoreShare, 3) },
    { label: 'Extra-time branch share', impact: roundTo(summary.extraTimeCount / summary.iterations, 3) },
    { label: 'Penalties branch share', impact: roundTo(summary.penaltiesCount / summary.iterations, 3) },
  ]
  const factorBreakdown: PredictionFactor[] = [
    ...simulationFactors,
    ...basePrediction.factorBreakdown.filter(
      (factor) =>
        !simulationFactors.some((simulationFactor) => simulationFactor.label === factor.label),
    ),
  ]
    .sort((left, right) => Math.abs(right.impact) - Math.abs(left.impact))
    .map((factor) => ({
      label: factor.label,
      impact: roundTo(factor.impact, 3),
    }))
  const simulationInputs: PredictionInputSnapshot[] = [
    { label: 'Simulation runs', value: String(summary.iterations) },
    { label: 'Stage rules', value: stage === 'knockout' ? 'knockout with ET and penalties' : 'group stage with draws allowed' },
    { label: 'Average goals', value: `${roundTo(summary.averageHomeGoals, 2)} vs ${roundTo(summary.averageAwayGoals, 2)}` },
    { label: 'Regular-time 1/X/2', value: `${regularHomeWinProbability}% / ${regularDrawProbability}% / ${regularAwayWinProbability}%` },
    {
      label: 'Knockout advancement',
      value: stage === 'knockout' ? `${homeTeam.name} ${knockoutHomeWinProbability}% / ${awayTeam.name} ${knockoutAwayWinProbability}%` : 'not applicable',
    },
    { label: 'Most likely scoreline', value: `${recommendedHomeGoals}:${recommendedAwayGoals} (${roundTo(topScoreShare * 100, 1)}%)` },
  ]
  const inputSnapshot: PredictionInputSnapshot[] = [
    ...simulationInputs,
    ...basePrediction.inputSnapshot.filter(
      (item) =>
        !simulationInputs.some((simulationInput) => simulationInput.label === item.label),
    ),
  ]
  const simulationSummary =
    stage === 'knockout'
      ? `Detailed simulation consensus after ${summary.iterations} runs. ${homeTeam.name} advanced in ${knockoutHomeWinProbability}% of runs and ${awayTeam.name} in ${knockoutAwayWinProbability}%. Extra time appeared in ${roundTo((summary.extraTimeCount / summary.iterations) * 100, 1)}% of runs and penalties in ${roundTo((summary.penaltiesCount / summary.iterations) * 100, 1)}%.`
      : `Detailed simulation consensus after ${summary.iterations} runs. ${homeTeam.name} won ${regularHomeWinProbability}% of runs, the draw branch landed at ${regularDrawProbability}% and ${awayTeam.name} won ${regularAwayWinProbability}%. Group-stage rules stayed at 90 minutes only, so the draw branch remains a valid final outcome.`
  const inheritedContextSummary = basePrediction.summary
    .replace(/^\d+% confidence\.\s*/i, '')
    .replace(/^Detailed simulation consensus.*?\.\s*/i, '')

  const recommendedPrediction: Prediction = {
    homeGoals: recommendedHomeGoals,
    awayGoals: recommendedAwayGoals,
    confidence,
    homeWinProbability: stage === 'knockout' ? knockoutHomeWinProbability : regularHomeWinProbability,
    drawProbability: regularDrawProbability,
    awayWinProbability: stage === 'knockout' ? knockoutAwayWinProbability : regularAwayWinProbability,
    homeExpectedGoals: roundTo(summary.averageHomeGoals, 2),
    awayExpectedGoals: roundTo(summary.averageAwayGoals, 2),
    modelStrength: clamp(Math.round(basePrediction.modelStrength + topScoreShare * 22), 55, 98),
    summary: `${simulationSummary} Base model context still applies: ${inheritedContextSummary}`,
    factorBreakdown,
    inputSnapshot,
    marketSourceKey: summary.marketSourceKey,
    knockoutWinnerTeamId: recommendedKnockoutWinner,
    knockoutResolution: recommendedKnockoutResolution,
    penaltyScore: recommendedKnockoutResolution === 'penalties' ? (recommendedKnockoutWinner === homeTeam.id ? '4-3' : '3-4') : undefined,
  }

  const heatmapCells = Array.from({ length: 7 }, (_, homeGoalIndex) =>
    Array.from({ length: 7 }, (_, awayGoalIndex) => {
      const homeKey = homeGoalIndex === 6 ? '6+' : String(homeGoalIndex)
      const awayKey = awayGoalIndex === 6 ? '6+' : String(awayGoalIndex)
      let count = 0

      for (const [scorelineLabel, scorelineCount] of summary.scorelineCounts.entries()) {
        const [homeGoalsText, awayGoalsText] = scorelineLabel.split('-')
        const homeGoalsValue = Number(homeGoalsText)
        const awayGoalsValue = Number(awayGoalsText)
        const homeBucket = homeGoalsValue >= 6 ? '6+' : String(homeGoalsValue)
        const awayBucket = awayGoalsValue >= 6 ? '6+' : String(awayGoalsValue)

        if (homeBucket === homeKey && awayBucket === awayKey) {
          count += scorelineCount
        }
      }

      return {
        homeGoals: homeKey,
        awayGoals: awayKey,
        share: roundTo((count / summary.iterations) * 100, 1),
      }
    }),
  ).flat()

  return {
    stage,
    iterations: summary.iterations,
    homeTeamName: homeTeam.name,
    awayTeamName: awayTeam.name,
    venue: '',
    recommendedPrediction,
    topScorelines: topScoreEntries.map(([label, count]) => ({
      label: label.replace('-', ':'),
      count,
      share: roundTo((count / summary.iterations) * 100, 1),
    })),
    summaryMetrics: stage === 'knockout'
      ? [
          { label: `${homeTeam.name} advance`, value: `${knockoutHomeWinProbability}%` },
          { label: `${awayTeam.name} advance`, value: `${knockoutAwayWinProbability}%` },
          { label: 'Extra time reached', value: `${roundTo((summary.extraTimeCount / summary.iterations) * 100, 1)}%` },
          { label: 'Penalties reached', value: `${roundTo((summary.penaltiesCount / summary.iterations) * 100, 1)}%` },
          { label: 'Avg goals', value: `${roundTo(summary.averageHomeGoals, 2)} : ${roundTo(summary.averageAwayGoals, 2)}` },
        ]
      : [
          { label: `${homeTeam.name} win`, value: `${regularHomeWinProbability}%` },
          { label: 'Draw', value: `${regularDrawProbability}%` },
          { label: `${awayTeam.name} win`, value: `${regularAwayWinProbability}%` },
          { label: 'Avg goals', value: `${roundTo(summary.averageHomeGoals, 2)} : ${roundTo(summary.averageAwayGoals, 2)}` },
          { label: 'Most common score', value: `${recommendedHomeGoals}:${recommendedAwayGoals}` },
        ],
    chartBars: stage === 'knockout'
      ? [
          { label: `${homeTeam.name} advance`, share: knockoutHomeWinProbability },
          { label: `${awayTeam.name} advance`, share: knockoutAwayWinProbability },
          { label: 'ET branch', share: roundTo((summary.extraTimeCount / summary.iterations) * 100, 1) },
          { label: 'Pens branch', share: roundTo((summary.penaltiesCount / summary.iterations) * 100, 1) },
        ]
      : [
          { label: `${homeTeam.name} win`, share: regularHomeWinProbability },
          { label: 'Draw', share: regularDrawProbability },
          { label: `${awayTeam.name} win`, share: regularAwayWinProbability },
        ],
    scorelineHeatmap: heatmapCells,
    phaseFlow:
      stage === 'knockout'
        ? [
            { label: 'Resolved in regular time', share: roundTo(((summary.iterations - summary.extraTimeCount) / summary.iterations) * 100, 1) },
            { label: 'Reached extra time', share: roundTo((summary.extraTimeCount / summary.iterations) * 100, 1) },
            { label: 'Reached penalties', share: roundTo((summary.penaltiesCount / summary.iterations) * 100, 1) },
          ]
        : [
            { label: 'Resolved in regular time', share: 100 },
            { label: 'Reached extra time', share: 0 },
            { label: 'Reached penalties', share: 0 },
          ],
    notes:
      stage === 'knockout'
        ? [
            'Regular time is simulated first. Only tied games branch into extra time and then penalties.',
            'This workbench stays fully local in the browser, so it does not consume API credits.',
          ]
        : [
            'Group-stage simulation stops at full time. No extra time or penalties are considered here.',
            'This workbench stays fully local in the browser, so it does not consume API credits.',
          ],
  }
}

function predictMatch(
  homeTeam: Team,
  awayTeam: Team,
  venueCity: string,
  attempt = 0,
  context?: Pick<Match, 'restDaysHome' | 'restDaysAway' | 'travelKmHome' | 'travelKmAway'>,
  liveTeamForm?: Partial<Record<string, TeamLiveForm>>,
  teamDirectory?: Partial<Record<string, TeamDirectoryEntry>>,
  adaptiveLearningState?: AdaptiveLearningState,
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
  const homeDirectoryEntry = teamDirectory?.[homeTeam.id]
  const awayDirectoryEntry = teamDirectory?.[awayTeam.id]
  const homeSquadSignals = getTeamSquadSignals(homeTeam, homeDirectoryEntry)
  const awaySquadSignals = getTeamSquadSignals(awayTeam, awayDirectoryEntry)
  const homeContinuitySignals = getTeamContinuitySignals(homeTeam, homeProfile, homeSquadSignals, homeDirectoryEntry)
  const awayContinuitySignals = getTeamContinuitySignals(awayTeam, awayProfile, awaySquadSignals, awayDirectoryEntry)
  const matchupHistorySignals = getMatchupHistorySignals(homeTeam, awayTeam, homeRecent, awayRecent)
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
  const availabilitySwing = awaySquadSignals.availabilityImpact - homeSquadSignals.availabilityImpact
  const continuitySwing = (homeContinuitySignals.stabilityScore - awayContinuitySignals.stabilityScore) * 0.18
  const tacticalSwing = (homeContinuitySignals.tacticalContinuity - awayContinuitySignals.tacticalContinuity) * 0.12
  const headToHeadSwing = matchupHistorySignals.seededHeadToHeadEdge
  const peerOppositionSwing = matchupHistorySignals.peerPerformanceEdge
  const depthSwing = (homeSquadSignals.depthScore - awaySquadSignals.depthScore) * 0.08
  const disciplineSwing = (awaySquadSignals.disciplineRisk - homeSquadSignals.disciplineRisk) * 0.08
  const factorWeights = adaptiveLearningState?.factorWeights ?? defaultAdaptiveFactorWeights
  const weightedRatingEdge = (ratingGap / 90) * factorWeights.rating
  const weightedProfileEdge =
    (creationSwing * 0.18 + finishingSwing * 0.12 + setPieceSwing * 0.08 + experienceSwing * 0.05) * factorWeights.profile
  const weightedRecentFormEdge = (recentFormSwing + scoringSwing + defensiveRecordSwing + cleanSheetSwing) * factorWeights.recentForm
  const weightedInjuryEdge = injurySwing * factorWeights.injury
  const weightedAbsenceEdge = availabilitySwing * factorWeights.absences
  const weightedScheduleEdge = (restSwing + travelSwing) * factorWeights.schedule
  const weightedRotationEdge = rotationSwing * factorWeights.rotation
  const weightedMotivationEdge = motivationSwing * factorWeights.motivation
  const weightedContinuityEdge = (continuitySwing + tacticalSwing) * factorWeights.continuity
  const weightedMatchupEdge = (headToHeadSwing + peerOppositionSwing) * factorWeights.matchup
  const weightedSquadDepthEdge = (depthSwing + disciplineSwing) * factorWeights.squadDepth
  const weightedVenueEdge = (homeHostBoost - awayHostBoost * 0.4 + homeAltitudeAdjustment - awayAltitudeAdjustment * 0.35) * factorWeights.venue
  const weightedDrawToleranceSwing = drawToleranceSwing * factorWeights.draw
  const homeExpectedGoals = clamp(
    1.18 +
      homeAttack * 0.62 -
      awayDefense * 0.33 +
      weightedRatingEdge +
      formSwing +
      weightedRecentFormEdge +
      weightedInjuryEdge +
      weightedAbsenceEdge +
      weightedScheduleEdge +
      weightedRotationEdge +
      weightedMotivationEdge +
      weightedContinuityEdge +
      weightedMatchupEdge +
      weightedSquadDepthEdge +
      weightedProfileEdge -
      (awayProfile.defensiveShape - 1) * 0.12 +
      weightedVenueEdge,
    0.2,
    3.8,
  )
  const awayExpectedGoals = clamp(
    1.02 +
      awayAttack * 0.58 -
      homeDefense * 0.31 -
      weightedRatingEdge * 0.86 -
      formSwing * 0.7 +
      weightedRecentFormEdge * -0.88 +
      weightedInjuryEdge * -0.95 +
      weightedAbsenceEdge * -0.92 +
      weightedScheduleEdge * -0.95 +
      weightedRotationEdge * -0.95 +
      weightedMotivationEdge * -0.95 +
      weightedContinuityEdge * -0.9 +
      weightedMatchupEdge * -0.86 +
      weightedSquadDepthEdge * -0.86 +
      (awayProfile.chanceCreation - homeProfile.chanceCreation) * 0.17 +
      (awayProfile.finishing - homeProfile.finishing) * 0.12 +
      (awayProfile.setPieces - homeProfile.setPieces) * 0.08 +
      (awayProfile.tournamentExperience - homeProfile.tournamentExperience) * 0.05 -
      (homeProfile.defensiveShape - 1) * 0.12 +
      (awayHostBoost - homeHostBoost * 0.45 + awayAltitudeAdjustment) * factorWeights.venue,
    0.15,
    3.4,
  )

  let homeWinProbability = 0
  let drawProbability = 0
  let awayWinProbability = 0
  let bestScoreProbability = -1
  let homeGoals = 0
  let awayGoals = 0
  const drawBiasMultiplier = clamp(1 + weightedDrawToleranceSwing * 4.5 + matchupHistorySignals.drawLean, 0.78, 1.3)
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
      ? blendPercent(normalizedHomeWinProbability * 100, marketSignal.homeProbability, marketSignal.sourceKeys[0] ?? 'betfair', adaptiveLearningState)
      : normalizedHomeWinProbability * 100,
    1,
  )
  const drawPercent = roundTo(
    marketSignal
      ? blendPercent(normalizedDrawProbability * 100, marketSignal.drawProbability, marketSignal.sourceKeys[0] ?? 'betfair', adaptiveLearningState)
      : normalizedDrawProbability * 100,
    1,
  )
  const awayWinPercent = roundTo(
    marketSignal
      ? blendPercent(normalizedAwayWinProbability * 100, marketSignal.awayProbability, marketSignal.sourceKeys[0] ?? 'betfair', adaptiveLearningState)
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
        Math.abs(weightedDrawToleranceSwing) * 18 +
        Math.abs(motivationSwing) * 12 +
        Math.abs(weightedAbsenceEdge + weightedContinuityEdge + weightedMatchupEdge) * 22 +
        (marketSignal ? 5 : 0),
    ),
    40,
    92,
  )
  const modelStrength = clamp(
    Math.round(
      58 +
        Math.abs(ratingGap) * 0.45 +
        Math.abs(weightedProfileEdge) * 24 +
        Math.abs(weightedVenueEdge) * 20 +
        Math.abs(weightedRecentFormEdge + weightedInjuryEdge + weightedAbsenceEdge + weightedScheduleEdge + weightedRotationEdge + weightedMotivationEdge + weightedContinuityEdge + weightedMatchupEdge) * 18,
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
  const squadContextSummary =
    homeDirectoryEntry || awayDirectoryEntry
      ? 'Squad depth, key absences, goalkeeper quality and likely penalty taker strength are also blended in from the roster layer.'
      : 'No enriched roster snapshot is active, so squad-level absence and depth effects stay mostly neutral.'
  const continuityContextSummary =
    homeContinuitySignals.coachName || awayContinuitySignals.coachName
      ? 'Coach continuity, tactical stability and core-squad continuity are included as an extra medium-term context layer.'
      : 'Coach and tactical continuity are estimated from roster stability because no named coach snapshot is currently loaded.'
  const matchupContextSummary =
    matchupHistorySignals.sameConfederation || matchupHistorySignals.similarTier
      ? 'The matchup layer also accounts for same-continent familiarity and how each team profiles against peers from a similar level.'
      : 'No strong regional familiarity or similar-tier matchup signal was detected for this pairing.'
  const marketContextSummary = marketSignal
    ? `${marketSignal.sourceLabel} odds are blended into the model as an additional market signal from the backend market consensus layer.`
    : 'No bookmaker market feed is blended into this run.'
  const factorBreakdown: PredictionFactor[] = [
    { label: 'Rating edge', impact: ratingGap / 90 },
    { label: 'Team profile edge', impact: creationSwing * 0.18 + finishingSwing * 0.12 + setPieceSwing * 0.08 + experienceSwing * 0.05 },
    { label: 'Recent form edge', impact: recentFormSwing + scoringSwing + defensiveRecordSwing + cleanSheetSwing },
    { label: 'Injury edge', impact: injurySwing },
    { label: 'Key absences edge', impact: availabilitySwing },
    { label: 'Rest edge', impact: restSwing },
    { label: 'Travel edge', impact: travelSwing },
    { label: 'Rotation risk edge', impact: rotationSwing },
    { label: 'Motivation edge', impact: motivationSwing },
    { label: 'Coach continuity edge', impact: continuitySwing + tacticalSwing },
    { label: 'Matchup history edge', impact: headToHeadSwing + peerOppositionSwing },
    { label: 'Squad depth edge', impact: depthSwing + disciplineSwing },
    { label: 'Draw tolerance swing', impact: drawToleranceSwing },
    { label: 'Market odds edge', impact: marketSignal ? (marketSignal.homeProbability - marketSignal.awayProbability) / 100 : 0 },
    { label: 'Venue and altitude edge', impact: homeHostBoost - awayHostBoost * 0.4 + homeAltitudeAdjustment - awayAltitudeAdjustment * 0.35 },
    {
      label: 'Adaptive calibration',
      impact: roundTo(
        average(Object.values(factorWeights)) - 1 +
          (marketSignal ? (adaptiveLearningState?.bookmakerWeights[marketSignal.sourceKeys[0] ?? 'betfair'] ?? 1) - 1 : 0),
        3,
      ),
    },
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
      label: 'Key absences',
      value: `${homeSquadSignals.injuredCount + homeSquadSignals.unavailableCount} vs ${awaySquadSignals.injuredCount + awaySquadSignals.unavailableCount}`,
    },
    {
      label: 'Absent core names',
      value: `${homeSquadSignals.starAbsenceNames.slice(0, 2).join(', ') || 'none'} vs ${awaySquadSignals.starAbsenceNames.slice(0, 2).join(', ') || 'none'}`,
    },
    {
      label: 'Squad depth',
      value: `${roundTo(homeSquadSignals.depthScore, 2)} vs ${roundTo(awaySquadSignals.depthScore, 2)}`,
    },
    {
      label: 'Penalty unit / goalkeeper',
      value: `${roundTo(homeSquadSignals.penaltyUnitScore, 2)} / ${roundTo(homeSquadSignals.goalkeeperScore, 2)} vs ${roundTo(awaySquadSignals.penaltyUnitScore, 2)} / ${roundTo(awaySquadSignals.goalkeeperScore, 2)}`,
    },
    {
      label: 'Head coach',
      value: `${homeContinuitySignals.coachName ?? 'not loaded'} vs ${awayContinuitySignals.coachName ?? 'not loaded'}`,
    },
    {
      label: 'Coach tenure / tactical continuity',
      value: `${homeContinuitySignals.coachTenureMonths}m / ${roundTo(homeContinuitySignals.tacticalContinuity, 2)} vs ${awayContinuitySignals.coachTenureMonths}m / ${roundTo(awayContinuitySignals.tacticalContinuity, 2)}`,
    },
    {
      label: 'Confederation / peer context',
      value: `${matchupHistorySignals.homeConfederation} vs ${matchupHistorySignals.awayConfederation}${matchupHistorySignals.similarTier ? ' | similar-tier matchup' : ''}`,
    },
    {
      label: 'Market source',
      value: marketSignal ? `${marketSignal.sourceLabel} (${marketSignal.homeProbability}% / ${marketSignal.drawProbability}% / ${marketSignal.awayProbability}%)` : 'not applied',
    },
    {
      label: 'Adaptive learning',
      value: `${predictionModeLabelFromAdaptiveState(adaptiveLearningState)} / avg factor ${roundTo(average(Object.values(factorWeights)), 2)}`,
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
      const extraTimeHomeExpectedGoals = clamp(
        homeExpectedGoals * 0.32 +
          experienceSwing * 0.05 +
          restSwing * 0.4 +
          travelSwing * 0.25 +
          (homeSquadSignals.extraTimeDepthScore - awaySquadSignals.extraTimeDepthScore) * 0.42 +
          continuitySwing * 0.28 +
          availabilitySwing * 0.2,
        0.08,
        1.25,
      )
      const extraTimeAwayExpectedGoals = clamp(
        awayExpectedGoals * 0.32 -
          experienceSwing * 0.05 -
          restSwing * 0.35 -
          travelSwing * 0.25 -
          (homeSquadSignals.extraTimeDepthScore - awaySquadSignals.extraTimeDepthScore) * 0.39 -
          continuitySwing * 0.24 -
          availabilitySwing * 0.18,
        0.08,
        1.25,
      )
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

      const extraTimeResolutionThreshold = clamp(
        0.62 - (homeSquadSignals.extraTimeDepthScore - awaySquadSignals.extraTimeDepthScore) * 0.22 - Math.abs(availabilitySwing) * 0.12,
        0.44,
        0.7,
      )

      if (extraTimeHomeGoals !== extraTimeAwayGoals && extraTimeDrawProbability <= extraTimeResolutionThreshold) {
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
          availabilitySwing * 0.42 +
          (homeSquadSignals.penaltyUnitScore - awaySquadSignals.penaltyUnitScore) * 0.95 +
          (homeSquadSignals.goalkeeperScore - awaySquadSignals.goalkeeperScore) * 0.75 +
          (homeContinuitySignals.stabilityScore - awayContinuitySignals.stabilityScore) * 0.28 +
          (getFormFactor(homeTeam, attempt + 3) - getFormFactor(awayTeam, attempt + 3)) * 0.4
        const homePenaltyWins = penaltyEdge >= 0
        const penaltyMargin = Math.abs(penaltyEdge)
        knockoutWinnerTeamId = homePenaltyWins ? homeTeam.id : awayTeam.id
        knockoutResolution = 'penalties'
        penaltyScore =
          penaltyMargin >= 0.32 ? (homePenaltyWins ? '5-3' : '3-5') : penaltyMargin >= 0.16 ? (homePenaltyWins ? '4-2' : '2-4') : homePenaltyWins ? '4-3' : '3-4'
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
        ? `${outcome}. This refreshed model run uses probabilistic xG, venue context and team-profile inputs. ${venueContextSummary} ${styleContextSummary} ${scheduleContextSummary} ${groupStateSummary} ${squadContextSummary} ${continuityContextSummary} ${matchupContextSummary} ${marketContextSummary}${knockoutResolution === 'extraTime' ? ' Knockout resolution projects extra time.' : knockoutResolution === 'penalties' ? ' Knockout resolution projects penalties.' : ''}`
        : `${outcome}. This version uses expected goals, Poisson score distribution, venue context and team-profile inputs. ${venueContextSummary} ${styleContextSummary} ${scheduleContextSummary} ${groupStateSummary} ${squadContextSummary} ${continuityContextSummary} ${matchupContextSummary} ${marketContextSummary}${knockoutResolution === 'extraTime' ? ' Knockout resolution projects extra time.' : knockoutResolution === 'penalties' ? ' Knockout resolution projects penalties.' : ''}`,
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

function runDetailedSimulation(
  stage: 'group' | 'knockout',
  iterations: number,
  homeTeam: Team,
  awayTeam: Team,
  venueCity: string,
  context: Pick<Match, 'restDaysHome' | 'restDaysAway' | 'travelKmHome' | 'travelKmAway'> | undefined,
  liveTeamForm: Partial<Record<string, TeamLiveForm>>,
  teamDirectory: Partial<Record<string, TeamDirectoryEntry>>,
  adaptiveLearningState: AdaptiveLearningState,
  marketSignal: MarketConsensusSnapshot | undefined,
  groupState: GroupStateContext | undefined,
): DetailedSimulationReport {
  const basePrediction = predictMatch(
    homeTeam,
    awayTeam,
    venueCity,
    0,
    context,
    liveTeamForm,
    teamDirectory,
    adaptiveLearningState,
    {
      knockout: stage === 'knockout',
      groupState,
      marketSignal,
    },
  )
  const scorelineCounts = new Map<string, number>()
  let totalHomeGoals = 0
  let totalAwayGoals = 0
  let regularHomeWins = 0
  let regularDraws = 0
  let regularAwayWins = 0
  let knockoutHomeWins = 0
  let knockoutAwayWins = 0
  let extraTimeCount = 0
  let penaltiesCount = 0
  const homeEntry = teamDirectory[homeTeam.id]
  const awayEntry = teamDirectory[awayTeam.id]
  const penaltyEdge = getSimulationPenaltyEdge(homeTeam, awayTeam, homeEntry, awayEntry)
  const extraTimeHomeLambda = clamp(
    basePrediction.homeExpectedGoals * 0.31 + (homeTeam.rating - awayTeam.rating) / 220 + penaltyEdge * 0.16,
    0.08,
    1.28,
  )
  const extraTimeAwayLambda = clamp(
    basePrediction.awayExpectedGoals * 0.31 - (homeTeam.rating - awayTeam.rating) / 240 - penaltyEdge * 0.14,
    0.08,
    1.28,
  )

  for (let index = 0; index < iterations; index += 1) {
    let homeGoals = samplePoissonGoals(basePrediction.homeExpectedGoals)
    let awayGoals = samplePoissonGoals(basePrediction.awayExpectedGoals)
    totalHomeGoals += homeGoals
    totalAwayGoals += awayGoals

    if (homeGoals > awayGoals) {
      regularHomeWins += 1
      knockoutHomeWins += 1
    } else if (homeGoals < awayGoals) {
      regularAwayWins += 1
      knockoutAwayWins += 1
    } else {
      regularDraws += 1

      if (stage === 'knockout') {
        extraTimeCount += 1
        const extraTimeHomeGoals = samplePoissonGoals(extraTimeHomeLambda)
        const extraTimeAwayGoals = samplePoissonGoals(extraTimeAwayLambda)
        homeGoals += extraTimeHomeGoals
        awayGoals += extraTimeAwayGoals
        totalHomeGoals += extraTimeHomeGoals
        totalAwayGoals += extraTimeAwayGoals

        if (extraTimeHomeGoals > extraTimeAwayGoals) {
          knockoutHomeWins += 1
        } else if (extraTimeAwayGoals > extraTimeHomeGoals) {
          knockoutAwayWins += 1
        } else {
          penaltiesCount += 1
          const homeWinsPens = Math.random() < clamp(0.5 + penaltyEdge, 0.18, 0.82)
          if (homeWinsPens) {
            knockoutHomeWins += 1
          } else {
            knockoutAwayWins += 1
          }
        }
      }
    }

    const scoreKey = `${homeGoals}-${awayGoals}`
    scorelineCounts.set(scoreKey, (scorelineCounts.get(scoreKey) ?? 0) + 1)
  }

  const report = buildDetailedSimulationPrediction(basePrediction, stage, homeTeam, awayTeam, {
    iterations,
    regularHomeWins,
    regularDraws,
    regularAwayWins,
    knockoutHomeWins,
    knockoutAwayWins,
    extraTimeCount,
    penaltiesCount,
    scorelineCounts,
    averageHomeGoals: totalHomeGoals / iterations,
    averageAwayGoals: totalAwayGoals / iterations,
    marketSourceKey: marketSignal?.sourceKeys[0],
  })

  return {
    ...report,
    venue: venueCity,
  }
}

function rankThirdPlacedTeams(
  standings: Record<string, Standing[]>,
  matches: Match[],
  actualResultsByMatchId: Record<string, ActualResultSnapshot>,
  standingsMode: StandingsMode,
) {
  const thirdPlacedRows = groupDefinitions
    .filter((groupDefinition) => isGroupCompleteByMode(matches, actualResultsByMatchId, groupDefinition.name, standingsMode))
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

function getActualGroupMatchCount(matches: Match[], actualResultsByMatchId: Record<string, ActualResultSnapshot>, groupName: string) {
  return matches.filter((match) => match.group === groupName && actualResultsByMatchId[match.id]).length
}

function getGroupMatchCountByMode(
  matches: Match[],
  actualResultsByMatchId: Record<string, ActualResultSnapshot>,
  groupName: string,
  standingsMode: StandingsMode,
) {
  return standingsMode === 'real'
    ? getActualGroupMatchCount(matches, actualResultsByMatchId, groupName)
    : getAcceptedGroupMatchCount(matches, groupName)
}

function isGroupCompleteByMode(
  matches: Match[],
  actualResultsByMatchId: Record<string, ActualResultSnapshot>,
  groupName: string,
  standingsMode: StandingsMode,
) {
  return getGroupMatchCountByMode(matches, actualResultsByMatchId, groupName, standingsMode) === 6
}

function getStandingsModeLabel(standingsMode: StandingsMode) {
  return standingsMode === 'real' ? 'real results' : 'accepted predictions'
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
  actualResultsByMatchId: Record<string, ActualResultSnapshot>,
  standingsMode: StandingsMode,
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
      const completedGroupMatches = getGroupMatchCountByMode(groupMatches, actualResultsByMatchId, groupName, standingsMode)

      if (completedGroupMatches < 6) {
        return {
          team: null,
          reasons: [
            standingsMode === 'real'
              ? `${describeSlot(slot)} is not final yet. Wait for all real Group ${groupName} results first (${completedGroupMatches}/6 loaded).`
              : `${describeSlot(slot)} is not final yet. Accept all Group ${groupName} matches first (${completedGroupMatches}/6 accepted).`,
          ],
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
      const completedGroups = groupDefinitions.filter((groupDefinition) =>
        isGroupCompleteByMode(groupMatches, actualResultsByMatchId, groupDefinition.name, standingsMode),
      ).length

      return {
        team: null,
        reasons: [
          `${describeSlot(slot)} needs the final best-third-place ranking from ${getStandingsModeLabel(standingsMode)}. Complete more group tables first (${completedGroups}/12 groups complete).`,
        ],
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

function formatNullableStat(value?: string | number | null) {
  if (value === undefined || value === null || value === '') {
    return 'No data yet'
  }

  return String(value)
}

function formatOptionalDate(dateValue?: string) {
  if (!dateValue) {
    return 'No data yet'
  }

  const parsedDate = new Date(dateValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return dateValue
  }

  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(parsedDate)
}

function isSnapshotStale(refreshedAt?: string, maxAgeMs = TEAM_DATA_STALE_AFTER_MS) {
  if (!refreshedAt) {
    return true
  }

  const timestamp = new Date(refreshedAt).getTime()

  if (Number.isNaN(timestamp)) {
    return true
  }

  return Date.now() - timestamp > maxAgeMs
}

function hasCompleteRoster(entry?: TeamDirectoryEntry) {
  return (entry?.players.length ?? 0) >= 23
}

function shouldRetryPartialRoster(entry: TeamDirectoryEntry | undefined, liveDataState: LiveDataState) {
  if (!entry || hasCompleteRoster(entry)) {
    return false
  }

  return liveDataState.providers.apiFootball.configured || liveDataState.providers.footballData.configured
}

function scrollToElementById(elementId: string) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const element = document.getElementById(elementId)
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  })
}

function App() {
  const [matches, setMatches] = useState<Match[]>(() => mergeStoredGroupMatches(loadStoredState<Match[]>(storageKeys.groupMatches)))
  const [knockoutMatches, setKnockoutMatches] = useState<KnockoutMatch[]>(() =>
    mergeStoredKnockoutMatches(loadStoredState<KnockoutMatch[]>(storageKeys.knockoutMatches)),
  )
  const [activeView, setActiveView] = useState<ViewMode>(() => loadStoredState<ViewMode>(storageKeys.activeView) ?? 'group')
  const [standingsMode, setStandingsMode] = useState<StandingsMode>(() => loadStoredState<StandingsMode>(storageKeys.standingsMode) ?? 'prediction')
  const [matchDayTimeMode, setMatchDayTimeMode] = useState<MatchDayTimeMode>(() => loadStoredState<MatchDayTimeMode>(storageKeys.matchDayTimeMode) ?? 'viewer')
  const [teamSortMode, setTeamSortMode] = useState<TeamSortMode>(() => loadStoredState<TeamSortMode>('world-cup-betting-system/team-sort-mode') ?? 'group')
  const [activeTeamId, setActiveTeamId] = useState<string>(
    () => loadStoredState<string>('world-cup-betting-system/active-team-id') ?? (groupDefinitions[0]?.teams[0]?.id ?? ''),
  )
  const [simulationFocus, setSimulationFocus] = useState<SimulationFocus | null>(null)
  const [simulationRunCount, setSimulationRunCount] = useState<number>(10000)
  const [simulationReport, setSimulationReport] = useState<DetailedSimulationReport | null>(null)
  const [isRunningSimulation, setIsRunningSimulation] = useState(false)
  const [adaptiveLearningState, setAdaptiveLearningState] = useState<AdaptiveLearningState>(() =>
    normalizeAdaptiveLearningState(loadStoredState<AdaptiveLearningState>(storageKeys.adaptiveLearning)),
  )
  const [phaseAwardPredictions, setPhaseAwardPredictions] = useState<
    Partial<Record<PhaseKey, Partial<Record<PhaseAwardKey, PhaseAwardSnapshot>>>>
  >(() => loadStoredState<Partial<Record<PhaseKey, Partial<Record<PhaseAwardKey, PhaseAwardSnapshot>>>>>(storageKeys.phaseAwards) ?? {})
  const [liveTeamForm, setLiveTeamForm] = useState<Partial<Record<string, TeamLiveForm>>>(() =>
    loadStoredState<Partial<Record<string, TeamLiveForm>>>(storageKeys.liveTeamForm) ?? {},
  )
  const [teamDirectory, setTeamDirectory] = useState<Partial<Record<string, TeamDirectoryEntry>>>(() =>
    loadStoredState<Partial<Record<string, TeamDirectoryEntry>>>(storageKeys.teamDirectory) ?? {},
  )
  const [liveDataState, setLiveDataState] = useState<LiveDataState>(defaultLiveDataState)
  const [marketApiState, setMarketApiState] = useState<MarketApiState>(defaultMarketApiState)
  const [isRefreshingLiveData, setIsRefreshingLiveData] = useState(false)
  const [refreshingTeamId, setRefreshingTeamId] = useState<string | null>(null)
  const [isRefreshingBets, setIsRefreshingBets] = useState(false)
  const [liveRefreshStatus, setLiveRefreshStatus] = useState('Use Refresh Live Data to load missing or stale national-team snapshots and squad information.')
  const [sourcePickerSlotKey, setSourcePickerSlotKey] = useState<BrokerSlotKey | null>(null)
  const [refreshFeedback, setRefreshFeedback] = useState<RefreshFeedback>(defaultRefreshFeedback)
  const [backendConnectionStatus, setBackendConnectionStatus] = useState<BackendConnectionStatus>('checking')
  const [oddsApiKeyInput, setOddsApiKeyInput] = useState('')
  const [oddsApiKeyStatus, setOddsApiKeyStatus] = useState('The key stays local in the running backend session.')
  const [apiFootballKeyInput, setApiFootballKeyInput] = useState('')
  const [footballDataKeyInput, setFootballDataKeyInput] = useState('')
  const [liveProviderKeyStatus, setLiveProviderKeyStatus] = useState('Provider keys stay local in the running backend session.')
  const [isRefreshingOddsUsage, setIsRefreshingOddsUsage] = useState(false)
  const [marketActionState, setMarketActionState] = useState<{ matchId: string; mode: 'missing' | 'reload' } | null>(null)
  const standings = buildStandings(matches)
  const actualStandings = buildActualStandings(matches, marketApiState.actualResultsByMatchId)
  const activeStandings = standingsMode === 'real' ? actualStandings : standings
  const rankedThirds = rankThirdPlacedTeams(activeStandings, matches, marketApiState.actualResultsByMatchId, standingsMode)
  const preliminaryResolvedKnockoutMatches = resolveKnockoutMatches(
    knockoutMatches,
    matches,
    activeStandings,
    rankedThirds,
    marketApiState.actualResultsByMatchId,
    standingsMode,
  )
  const displayKnockoutMatches = sanitizeKnockoutMatches(knockoutMatches, preliminaryResolvedKnockoutMatches)
  const resolvedKnockoutMatches = resolveKnockoutMatches(
    displayKnockoutMatches,
    matches,
    activeStandings,
    rankedThirds,
    marketApiState.actualResultsByMatchId,
    standingsMode,
  )
  const acceptedCount = matches.filter((match) => match.acceptedPrediction).length
  const acceptedKnockoutCount = displayKnockoutMatches.filter((match) => match.acceptedPrediction).length
  const topAdaptiveFactors = Object.entries(adaptiveLearningState.factorWeights)
    .sort((left, right) => Math.abs(right[1] - 1) - Math.abs(left[1] - 1))
    .slice(0, 3)
  const topAdaptiveBookmakers = Object.entries(adaptiveLearningState.bookmakerWeights)
    .sort((left, right) => Math.abs(right[1] - 1) - Math.abs(left[1] - 1))
    .slice(0, 3)
  const currentSimulationAcceptedPrediction = simulationFocus
    ? simulationFocus.stage === 'group'
      ? matches.find((match) => match.id === simulationFocus.matchId)?.acceptedPrediction
      : displayKnockoutMatches.find((match) => match.id === simulationFocus.matchId)?.acceptedPrediction
    : undefined
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
  const allTeams = groupDefinitions.flatMap((groupDefinition) => groupDefinition.teams)
  const teamsNeedingLiveFormRefresh = allTeams.filter((team) => isSnapshotStale(liveTeamForm[team.id]?.refreshedAt))
  const teamsNeedingDirectoryRefresh = allTeams.filter(
    (team) =>
      isSnapshotStale(teamDirectory[team.id]?.refreshedAt) ||
      shouldRetryPartialRoster(teamDirectory[team.id], liveDataState),
  )
  const teamRefreshTargets = allTeams.filter(
    (team) =>
      isSnapshotStale(liveTeamForm[team.id]?.refreshedAt) ||
      isSnapshotStale(teamDirectory[team.id]?.refreshedAt) ||
      shouldRetryPartialRoster(teamDirectory[team.id], liveDataState),
  )
  const sortedTeams = [...allTeams].sort((left, right) => {
    if (teamSortMode === 'alphabetical') {
      return left.name.localeCompare(right.name)
    }

    if (teamSortMode === 'ranking') {
      if (right.rating !== left.rating) {
        return right.rating - left.rating
      }

      return left.name.localeCompare(right.name)
    }

    if (left.group !== right.group) {
      return left.group.localeCompare(right.group)
    }

    return left.name.localeCompare(right.name)
  })
  const activeTeam = sortedTeams.find((team) => team.id === activeTeamId) ?? sortedTeams[0] ?? null
  const activeTeamDirectory = activeTeam ? teamDirectory[activeTeam.id] : undefined
  const knockoutStageConfig = knockoutStageConfigStatic
  const roundOf32Preview = buildRoundOf32(activeStandings, rankedThirds)
  const matchDayItems = [
    ...matches.map((match) => {
      const viewerDateTime = formatViewerDateTime(new Date(match.kickoffUtc))
      const actualResult = marketApiState.actualResultsByMatchId[match.id]

      return {
        id: match.id,
        stage: 'group' as const,
        stageLabel: `Group ${match.group}`,
        kickoffUtc: match.kickoffUtc,
        localDateLabel: match.localDateLabel,
        localTimeLabel: match.localTimeLabel,
        viewerDateLabel: viewerDateTime.dateLabel,
        viewerTimeLabel: viewerDateTime.timeLabel,
        homeTeamName: match.homeTeam.name,
        awayTeamName: match.awayTeam.name,
        homeFlagUrl: getFlagUrl(match.homeTeam),
        awayFlagUrl: getFlagUrl(match.awayTeam),
        predictionScore: formatPredictionScore(match.prediction),
        acceptedScore: formatPredictionScore(match.acceptedPrediction),
        actualScore: actualResult ? `${actualResult.homeGoals} : ${actualResult.awayGoals}` : '',
        actualSourceLabel: actualResult?.sourceLabel ?? '',
      }
    }),
    ...resolvedKnockoutMatches
      .filter((resolvedMatch) => resolvedMatch.homeTeam && resolvedMatch.awayTeam && resolvedMatch.schedule)
      .map((resolvedMatch) => {
        const viewerDateTime = formatViewerDateTime(new Date(resolvedMatch.schedule!.kickoffUtc))
        const actualResult = marketApiState.actualResultsByMatchId[resolvedMatch.match.id]

        return {
          id: resolvedMatch.match.id,
          stage: 'knockout' as const,
          stageLabel: knockoutStageConfig.find((item) => item.stage === resolvedMatch.match.stage)?.title ?? 'Knockout stage',
          kickoffUtc: resolvedMatch.schedule!.kickoffUtc,
          localDateLabel: resolvedMatch.schedule!.localDateLabel,
          localTimeLabel: resolvedMatch.schedule!.localTimeLabel,
          viewerDateLabel: viewerDateTime.dateLabel,
          viewerTimeLabel: viewerDateTime.timeLabel,
          homeTeamName: resolvedMatch.homeTeam!.name,
          awayTeamName: resolvedMatch.awayTeam!.name,
          homeFlagUrl: getFlagUrl(resolvedMatch.homeTeam!),
          awayFlagUrl: getFlagUrl(resolvedMatch.awayTeam!),
          predictionScore: formatPredictionScore(resolvedMatch.match.prediction),
          acceptedScore: formatPredictionScore(resolvedMatch.match.acceptedPrediction),
          actualScore: actualResult ? `${actualResult.homeGoals} : ${actualResult.awayGoals}` : '',
          actualSourceLabel: actualResult?.sourceLabel ?? '',
        }
      }),
  ].sort((left, right) => new Date(left.kickoffUtc).getTime() - new Date(right.kickoffUtc).getTime())
  const matchDaySections = matchDayItems.reduce<Array<{ dateLabel: string; matches: MatchDayItem[] }>>((sections, item) => {
    const dateLabel = matchDayTimeMode === 'local' ? item.localDateLabel : item.viewerDateLabel
    const lastSection = sections[sections.length - 1]

    if (!lastSection || lastSection.dateLabel !== dateLabel) {
      sections.push({ dateLabel, matches: [item] })
      return sections
    }

    lastSection.matches.push(item)
    return sections
  }, [])

  function handleJumpToKnockoutMatch(matchId: string) {
    setActiveView('bracket')
    scrollToElementById(`knockout-match-${matchId}`)
  }

  function handleOpenMatchFromMatchDays(matchDayItem: MatchDayItem) {
    if (matchDayItem.stage === 'group') {
      setActiveView('group')
      scrollToElementById(`group-match-${matchDayItem.id}`)
      return
    }

    setActiveView('bracket')
    scrollToElementById(`knockout-match-${matchDayItem.id}`)
  }

  function getPhaseOrderIndex(phaseKey: PhaseKey) {
    return phaseKeyOrder.indexOf(phaseKey)
  }

  function isPhaseBefore(left: PhaseKey, right: PhaseKey) {
    return getPhaseOrderIndex(left) < getPhaseOrderIndex(right)
  }

  function estimateCardsForTeamInMatch(team: Team, opponent: Team, phaseKey: PhaseKey, pressureBoost: number, closenessFactor: number) {
    const squadSignals = getTeamSquadSignals(team, teamDirectory[team.id])
    const opponentStrengthFactor = clamp((opponent.rating - team.rating) / 40, -0.35, 0.35)
    const knockoutBoost = phaseKey === 'group' ? 0 : 0.18
    return clamp(1.25 + squadSignals.disciplineRisk * 4.2 + pressureBoost + closenessFactor + knockoutBoost + opponentStrengthFactor, 0.7, 4.8)
  }

  function buildTournamentTrendBeforePhase(phaseKey: PhaseKey) {
    const trend = new Map<string, { matches: number; wins: number; draws: number; goalsFor: number; goalsAgainst: number; points: number }>()
    const ensure = (team: Team) => {
      if (!trend.has(team.id)) {
        trend.set(team.id, { matches: 0, wins: 0, draws: 0, goalsFor: 0, goalsAgainst: 0, points: 0 })
      }
      return trend.get(team.id)!
    }

    if (isPhaseBefore('group', phaseKey)) {
      matches
        .filter((match) => Boolean(match.acceptedPrediction))
        .forEach((match) => {
          const result = match.acceptedPrediction!
          const homeTrend = ensure(match.homeTeam)
          const awayTrend = ensure(match.awayTeam)
          homeTrend.matches += 1
          awayTrend.matches += 1
          homeTrend.goalsFor += result.homeGoals
          homeTrend.goalsAgainst += result.awayGoals
          awayTrend.goalsFor += result.awayGoals
          awayTrend.goalsAgainst += result.homeGoals

          if (result.homeGoals > result.awayGoals) {
            homeTrend.wins += 1
            homeTrend.points += 3
          } else if (result.homeGoals < result.awayGoals) {
            awayTrend.wins += 1
            awayTrend.points += 3
          } else {
            homeTrend.draws += 1
            awayTrend.draws += 1
            homeTrend.points += 1
            awayTrend.points += 1
          }
        })
    }

    displayKnockoutMatches.forEach((match) => {
      if (!match.acceptedPrediction) {
        return
      }

      if (!isPhaseBefore(match.stage, phaseKey)) {
        return
      }

      const resolvedMatch = resolvedKnockoutMatches.find((item) => item.match.id === match.id)

      if (!resolvedMatch?.homeTeam || !resolvedMatch.awayTeam) {
        return
      }

      const result = match.acceptedPrediction
      const homeTrend = ensure(resolvedMatch.homeTeam)
      const awayTrend = ensure(resolvedMatch.awayTeam)
      homeTrend.matches += 1
      awayTrend.matches += 1
      homeTrend.goalsFor += result.homeGoals
      homeTrend.goalsAgainst += result.awayGoals
      awayTrend.goalsFor += result.awayGoals
      awayTrend.goalsAgainst += result.homeGoals

      if ((result.knockoutWinnerTeamId ?? (result.homeGoals > result.awayGoals ? resolvedMatch.homeTeam.id : resolvedMatch.awayTeam.id)) === resolvedMatch.homeTeam.id) {
        homeTrend.wins += 1
        homeTrend.points += 3
      } else {
        awayTrend.wins += 1
        awayTrend.points += 3
      }
    })

    return trend
  }

  function getPhaseTeamPredictionCandidates(phaseKey: PhaseKey) {
    if (phaseKey === 'group') {
      return matches.map((match) => ({
        matchId: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        venueCity: match.venueCity,
        context: match as Pick<Match, 'restDaysHome' | 'restDaysAway' | 'travelKmHome' | 'travelKmAway'>,
        groupState: getGroupStateContext(match, matches),
        knockout: false,
      }))
    }

    return resolvedKnockoutMatches
      .filter((item) => item.match.stage === phaseKey && item.homeTeam && item.awayTeam)
      .map((item) => ({
        matchId: item.match.id,
        homeTeam: item.homeTeam!,
        awayTeam: item.awayTeam!,
        venueCity: item.schedule?.venueCity ?? 'New York/New Jersey',
        context: item.schedule
          ? {
              restDaysHome: item.schedule.restDaysHome,
              restDaysAway: item.schedule.restDaysAway,
              travelKmHome: item.schedule.travelKmHome,
              travelKmAway: item.schedule.travelKmAway,
            }
          : undefined,
        groupState: undefined,
        knockout: true,
      }))
  }

  function buildAcceptedAwardSnapshot(phaseKey: PhaseKey, awardKey: PhaseAwardKey) {
    const teamValues = new Map<string, { team: Team; value: number }>()
    const trendBeforePhase = buildTournamentTrendBeforePhase(phaseKey)
    const applyValue = (team: Team, value: number) => {
      const current = teamValues.get(team.id)
      if (current) {
        current.value += value
        return
      }

      teamValues.set(team.id, { team, value })
    }

    const applyMatch = (homeTeam: Team, awayTeam: Team, homeGoals: number, awayGoals: number) => {
      const homeTrend = trendBeforePhase.get(homeTeam.id)
      const awayTrend = trendBeforePhase.get(awayTeam.id)
      const homePressure = clamp(0.18 - (homeTrend?.points ?? 0) / Math.max(1, (homeTrend?.matches ?? 0) * 4), -0.05, 0.24)
      const awayPressure = clamp(0.18 - (awayTrend?.points ?? 0) / Math.max(1, (awayTrend?.matches ?? 0) * 4), -0.05, 0.24)
      const closeness = clamp(0.26 - Math.abs(homeGoals - awayGoals) * 0.06, 0.04, 0.26)
      const homeCards = estimateCardsForTeamInMatch(homeTeam, awayTeam, phaseKey, homePressure, closeness)
      const awayCards = estimateCardsForTeamInMatch(awayTeam, homeTeam, phaseKey, awayPressure, closeness)

      switch (awardKey) {
        case 'goalMachine':
          applyValue(homeTeam, homeGoals)
          applyValue(awayTeam, awayGoals)
          break
        case 'disastrousDefence':
          applyValue(homeTeam, awayGoals)
          applyValue(awayTeam, homeGoals)
          break
        case 'cardKings':
          applyValue(homeTeam, homeCards)
          applyValue(awayTeam, awayCards)
          break
        case 'nobleEleven':
          applyValue(homeTeam, homeCards)
          applyValue(awayTeam, awayCards)
          break
      }
    }

    if (phaseKey === 'group') {
      matches.filter((match) => match.acceptedPrediction).forEach((match) => {
        applyMatch(match.homeTeam, match.awayTeam, match.acceptedPrediction!.homeGoals, match.acceptedPrediction!.awayGoals)
      })
    } else {
      resolvedKnockoutMatches
        .filter((item) => item.match.stage === phaseKey && item.match.acceptedPrediction && item.homeTeam && item.awayTeam)
        .forEach((item) => {
          applyMatch(item.homeTeam!, item.awayTeam!, item.match.acceptedPrediction!.homeGoals, item.match.acceptedPrediction!.awayGoals)
        })
    }

    const entries = [...teamValues.values()]
    if (entries.length === 0) {
      return null
    }

    const sorted = [...entries].sort((left, right) =>
      awardKey === 'nobleEleven'
        ? left.value - right.value || right.team.rating - left.team.rating
        : right.value - left.value || right.team.rating - left.team.rating,
    )
    const winner = sorted[0]
    const runnerUp = sorted[1]
    const valueGap = Math.abs((winner?.value ?? 0) - (runnerUp?.value ?? 0))

    return {
      teamId: winner.team.id,
      teamName: winner.team.name,
      value: roundTo(winner.value, 2),
      confidence: clamp(Math.round(58 + valueGap * 12), 52, 93),
      summary:
        awardKey === 'nobleEleven'
          ? `${winner.team.name} currently projects as the cleanest team in this phase from accepted picks.`
          : `${winner.team.name} currently leads this phase when we derive the category from your accepted match picks.`,
    } satisfies PhaseAwardSnapshot
  }

  function buildEngineAwardSnapshot(phaseKey: PhaseKey, awardKey: PhaseAwardKey) {
    const phaseMatches = getPhaseTeamPredictionCandidates(phaseKey)

    if (phaseMatches.length === 0) {
      return null
    }

    const trendBeforePhase = buildTournamentTrendBeforePhase(phaseKey)
    const teamValues = new Map<string, { team: Team; value: number }>()
    const applyValue = (team: Team, value: number) => {
      const current = teamValues.get(team.id)
      if (current) {
        current.value += value
        return
      }

      teamValues.set(team.id, { team, value })
    }

    phaseMatches.forEach((phaseMatch, index) => {
      const prediction = predictMatch(
        phaseMatch.homeTeam,
        phaseMatch.awayTeam,
        phaseMatch.venueCity,
        index + 1,
        phaseMatch.context,
        liveTeamForm,
        teamDirectory,
        adaptiveLearningState,
        {
          knockout: phaseMatch.knockout,
          groupState: phaseMatch.groupState,
          marketSignal: marketApiState.consensusByMatchId[phaseMatch.matchId],
        },
      )
      const homeTrend = trendBeforePhase.get(phaseMatch.homeTeam.id)
      const awayTrend = trendBeforePhase.get(phaseMatch.awayTeam.id)
      const homeMomentum = clamp(
        ((homeTrend?.goalsFor ?? 0) - (homeTrend?.goalsAgainst ?? 0)) / Math.max(1, homeTrend?.matches ?? 1) * 0.1 +
          (homeTrend?.points ?? 0) / Math.max(1, homeTrend?.matches ?? 1) * 0.05,
        -0.2,
        0.34,
      )
      const awayMomentum = clamp(
        ((awayTrend?.goalsFor ?? 0) - (awayTrend?.goalsAgainst ?? 0)) / Math.max(1, awayTrend?.matches ?? 1) * 0.1 +
          (awayTrend?.points ?? 0) / Math.max(1, awayTrend?.matches ?? 1) * 0.05,
        -0.2,
        0.34,
      )
      const homeGoalsProjection = clamp(prediction.homeExpectedGoals + homeMomentum * 0.9 - awayMomentum * 0.25, 0.1, 5.2)
      const awayGoalsProjection = clamp(prediction.awayExpectedGoals + awayMomentum * 0.9 - homeMomentum * 0.25, 0.1, 5.2)
      const closeness = clamp(0.28 - Math.abs(homeGoalsProjection - awayGoalsProjection) * 0.06, 0.05, 0.28)
      const homeCards = estimateCardsForTeamInMatch(phaseMatch.homeTeam, phaseMatch.awayTeam, phaseKey, clamp(0.14 - homeMomentum * 0.4, -0.04, 0.22), closeness)
      const awayCards = estimateCardsForTeamInMatch(phaseMatch.awayTeam, phaseMatch.homeTeam, phaseKey, clamp(0.14 - awayMomentum * 0.4, -0.04, 0.22), closeness)

      switch (awardKey) {
        case 'goalMachine':
          applyValue(phaseMatch.homeTeam, homeGoalsProjection)
          applyValue(phaseMatch.awayTeam, awayGoalsProjection)
          break
        case 'disastrousDefence':
          applyValue(phaseMatch.homeTeam, awayGoalsProjection)
          applyValue(phaseMatch.awayTeam, homeGoalsProjection)
          break
        case 'cardKings':
          applyValue(phaseMatch.homeTeam, homeCards)
          applyValue(phaseMatch.awayTeam, awayCards)
          break
        case 'nobleEleven':
          applyValue(phaseMatch.homeTeam, homeCards)
          applyValue(phaseMatch.awayTeam, awayCards)
          break
      }
    })

    const entries = [...teamValues.values()]
    if (entries.length === 0) {
      return null
    }

    const sorted = [...entries].sort((left, right) =>
      awardKey === 'nobleEleven'
        ? left.value - right.value || right.team.rating - left.team.rating
        : right.value - left.value || right.team.rating - left.team.rating,
    )
    const winner = sorted[0]
    const runnerUp = sorted[1]
    const valueGap = Math.abs((winner?.value ?? 0) - (runnerUp?.value ?? 0))

    return {
      teamId: winner.team.id,
      teamName: winner.team.name,
      value: roundTo(winner.value, 2),
      confidence: clamp(Math.round(56 + valueGap * 14), 50, 94),
      summary:
        awardKey === 'goalMachine'
          ? `${winner.team.name} gets the edge because the phase engine likes its scoring output and its earlier tournament momentum.`
          : awardKey === 'disastrousDefence'
            ? `${winner.team.name} projects as the leakiest side in this phase once prior tournament performance is blended in.`
            : awardKey === 'cardKings'
              ? `${winner.team.name} projects as the most card-prone side in this phase after discipline profile and early-tournament pressure adjustments.`
              : `${winner.team.name} projects as the calmest side in this phase after discipline profile and earlier tournament form are blended together.`,
    } satisfies PhaseAwardSnapshot
  }

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
    window.localStorage.setItem(storageKeys.standingsMode, JSON.stringify(standingsMode))
  }, [standingsMode])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.matchDayTimeMode, JSON.stringify(matchDayTimeMode))
  }, [matchDayTimeMode])

  useEffect(() => {
    window.localStorage.setItem('world-cup-betting-system/team-sort-mode', JSON.stringify(teamSortMode))
  }, [teamSortMode])

  useEffect(() => {
    window.localStorage.setItem('world-cup-betting-system/active-team-id', JSON.stringify(activeTeamId))
  }, [activeTeamId])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.liveTeamForm, JSON.stringify(liveTeamForm))
  }, [liveTeamForm])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.teamDirectory, JSON.stringify(teamDirectory))
  }, [teamDirectory])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.phaseAwards, JSON.stringify(phaseAwardPredictions))
  }, [phaseAwardPredictions])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.adaptiveLearning, JSON.stringify(adaptiveLearningState))
  }, [adaptiveLearningState])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAdaptiveLearningState((currentState) => {
        let nextState = currentState

        matches.forEach((match) => {
          const actualResult = marketApiState.actualResultsByMatchId[match.id]
          const prediction = match.acceptedPrediction ?? match.prediction

          if (!actualResult || !prediction) {
            return
          }

          nextState = learnFromPredictionResult(nextState, match.id, prediction, actualResult, marketApiState.oddsByMatchId[match.id])
        })

        displayKnockoutMatches.forEach((match) => {
          const actualResult = marketApiState.actualResultsByMatchId[match.id]
          const prediction = match.acceptedPrediction ?? match.prediction

          if (!actualResult || !prediction) {
            return
          }

          nextState = learnFromPredictionResult(nextState, match.id, prediction, actualResult, marketApiState.oddsByMatchId[match.id])
        })

        return JSON.stringify(nextState) === JSON.stringify(currentState) ? currentState : nextState
      })
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [marketApiState.actualResultsByMatchId, marketApiState.oddsByMatchId, matches, displayKnockoutMatches])

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

  useEffect(() => {
    void fetchLiveDataStateFromBackend()
      .then((state) => {
        setLiveDataState(state)
        setLiveTeamForm((currentValue) => ({ ...currentValue, ...state.liveTeamFormById }))
        setTeamDirectory((currentValue) => ({ ...currentValue, ...state.teamDirectoryById }))
        setLiveRefreshStatus(state.refreshStatus)
      })
      .catch(() => {
        setLiveDataState(defaultLiveDataState)
      })
  }, [])

  async function handleRefreshLiveData() {
    if (teamRefreshTargets.length === 0) {
      setLiveRefreshStatus('All saved team snapshots are still fresh. No new federation data had to be downloaded.')
      setRefreshFeedback({
        kind: 'success',
        title: 'Team data is already up to date.',
        details: [
          `Live form snapshots already cover ${allTeams.length} of ${allTeams.length} teams inside the freshness window.`,
          `Roster snapshots already cover ${allTeams.length} of ${allTeams.length} teams inside the freshness window and do not need an upgrade pass.`,
        ],
      })
      return
    }

    setIsRefreshingLiveData(true)
    setLiveRefreshStatus('Refreshing public federation data for teams with missing or stale snapshots...')
    setRefreshFeedback({
      kind: 'loading',
      title: 'Refreshing live team data...',
      details: [
        `Backend providers are being queried for ${teamsNeedingDirectoryRefresh.length} teams with missing, stale or partial squad data.`,
        `Public recent-results refresh is being checked for ${teamsNeedingLiveFormRefresh.length} teams.`,
      ],
    })

    try {
      const nextLiveDataState = await refreshLiveDataInBackend(teamRefreshTargets)
      setLiveDataState(nextLiveDataState)
      setLiveTeamForm((currentValue) => ({ ...currentValue, ...nextLiveDataState.liveTeamFormById }))
      setTeamDirectory((currentValue) => ({ ...currentValue, ...nextLiveDataState.teamDirectoryById }))
      setLiveRefreshStatus(nextLiveDataState.refreshStatus)

      setRefreshFeedback({
        kind: 'success',
        title: 'Team data refreshed successfully.',
        details: [
          Object.keys(nextLiveDataState.liveTeamFormById).length > 0
            ? `Live team form cache now covers ${Object.keys(nextLiveDataState.liveTeamFormById).length} teams.`
            : teamsNeedingLiveFormRefresh.length > 0
              ? 'Live team form did not return any new team snapshots.'
              : 'All recent-form snapshots were already fresh.',
          Object.keys(nextLiveDataState.teamDirectoryById).length > 0
            ? `Team roster cache now covers ${Object.keys(nextLiveDataState.teamDirectoryById).length} teams.`
            : teamsNeedingDirectoryRefresh.length > 0
              ? 'Team roster provider did not return any new squad snapshots.'
              : 'All roster snapshots were already fresh.',
          nextLiveDataState.providers.apiFootball.status,
        ],
      })
    } catch (error) {
      setRefreshFeedback({
        kind: 'error',
        title: 'Live team data refresh failed.',
        details: [getErrorMessage(error)],
      })
    } finally {
      setIsRefreshingLiveData(false)
    }
  }

  async function handleRefreshSingleTeam(team: Team) {
    setRefreshingTeamId(team.id)
    setLiveRefreshStatus(`Refreshing squad data only for ${team.name}...`)
    setRefreshFeedback({
      kind: 'loading',
      title: `Refreshing ${team.name}...`,
      details: [
        `Backend providers are being queried only for ${team.name}.`,
        'Existing data for all other teams will be left unchanged.',
      ],
    })

    try {
      const nextLiveDataState = await refreshLiveDataInBackend([team])
      setLiveDataState(nextLiveDataState)
      setLiveTeamForm((currentValue) => ({ ...currentValue, ...nextLiveDataState.liveTeamFormById }))
      setTeamDirectory((currentValue) => ({ ...currentValue, ...nextLiveDataState.teamDirectoryById }))
      setLiveRefreshStatus(nextLiveDataState.refreshStatus)
      setRefreshFeedback({
        kind: 'success',
        title: `${team.name} refreshed successfully.`,
        details: [
          `Team roster cache now covers ${Object.keys(nextLiveDataState.teamDirectoryById).length} teams.`,
          nextLiveDataState.providers.apiFootball.status,
        ],
      })
    } catch (error) {
      setRefreshFeedback({
        kind: 'error',
        title: `Could not refresh ${team.name}.`,
        details: [getErrorMessage(error)],
      })
    } finally {
      setRefreshingTeamId(null)
    }
  }

  function handleOpenSimulationFromGroupMatch(match: Match) {
    setSimulationReport(null)
    setSimulationFocus({
      stage: 'group',
      matchId: match.id,
      label: `Group ${match.group} / ${match.id}`,
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
      venue: match.venueCity,
    })
    setActiveView('simulation')
  }

  function handleOpenSimulationFromKnockoutMatch(match: KnockoutMatch, resolvedMatch: ResolvedKnockoutMatch) {
    setSimulationReport(null)
    setSimulationFocus({
      stage: 'knockout',
      matchId: match.id,
      label: `${match.stage} / ${match.id}`,
      homeTeamName: resolvedMatch.homeTeam?.name ?? 'Waiting for qualifier',
      awayTeamName: resolvedMatch.awayTeam?.name ?? 'Waiting for qualifier',
      venue: resolvedMatch.schedule?.venueCity ?? 'TBC',
    })
    setActiveView('simulation')
  }

  async function handleRunDetailedSimulation() {
    if (!simulationFocus) {
      return
    }

    setIsRunningSimulation(true)

    try {
      if (simulationFocus.stage === 'group') {
        const match = matches.find((candidate) => candidate.id === simulationFocus.matchId)

        if (!match) {
          return
        }

        const report = runDetailedSimulation(
          'group',
          simulationRunCount,
          match.homeTeam,
          match.awayTeam,
          match.venueCity,
          match,
          liveTeamForm,
          teamDirectory,
          adaptiveLearningState,
          marketApiState.consensusByMatchId[match.id],
          getGroupStateContext(match, matches),
        )

        setSimulationReport(report)
        return
      }

      const resolvedMatch = resolvedKnockoutMatches.find((candidate) => candidate.match.id === simulationFocus.matchId)

      if (!resolvedMatch?.homeTeam || !resolvedMatch.awayTeam) {
        return
      }

      const report = runDetailedSimulation(
        'knockout',
        simulationRunCount,
        resolvedMatch.homeTeam,
        resolvedMatch.awayTeam,
        resolvedMatch.schedule?.venueCity ?? simulationFocus.venue,
        resolvedMatch.schedule
          ? {
              restDaysHome: resolvedMatch.schedule.restDaysHome,
              restDaysAway: resolvedMatch.schedule.restDaysAway,
              travelKmHome: resolvedMatch.schedule.travelKmHome,
              travelKmAway: resolvedMatch.schedule.travelKmAway,
            }
          : undefined,
        liveTeamForm,
        teamDirectory,
        adaptiveLearningState,
        marketApiState.consensusByMatchId[resolvedMatch.match.id],
        undefined,
      )

      setSimulationReport(report)
    } finally {
      setIsRunningSimulation(false)
    }
  }

  function handleImportSimulationResult(mode: 'prediction' | 'accepted') {
    if (!simulationFocus || !simulationReport) {
      return
    }

    if (simulationFocus.stage === 'group') {
      const targetMatch = matches.find((match) => match.id === simulationFocus.matchId)

      setMatches((currentMatches) =>
        currentMatches.map((match) =>
          match.id === simulationFocus.matchId
            ? {
                ...match,
                manualEditorOpen: false,
                prediction: simulationReport.recommendedPrediction,
                acceptedPrediction: mode === 'accepted' ? simulationReport.recommendedPrediction : match.acceptedPrediction,
                predictionHistory: appendHistory(match.predictionHistory, {
                  action: mode === 'accepted' ? 'accepted' : 'manual',
                  stage: 'group',
                  source: 'system',
                  summary:
                    mode === 'accepted'
                      ? 'Detailed simulation result imported and accepted.'
                      : 'Detailed simulation result imported as the active prediction.',
                  prediction: simulationReport.recommendedPrediction,
                }),
              }
            : match,
        ),
      )

      if (mode === 'accepted') {
        setActiveView('group')

        if (targetMatch) {
          scrollToElementById(`group-match-${targetMatch.id}`)
        }
      }

      return
    }

    const resolvedMatch = resolvedKnockoutMatches.find((candidate) => candidate.match.id === simulationFocus.matchId)

    setKnockoutMatches((currentMatches) =>
      currentMatches.map((match) =>
        match.id === simulationFocus.matchId
          ? {
              ...match,
              manualEditorOpen: false,
              lastResolvedHomeTeamId: resolvedMatch?.homeTeam?.id,
              lastResolvedAwayTeamId: resolvedMatch?.awayTeam?.id,
              prediction: simulationReport.recommendedPrediction,
              acceptedPrediction: mode === 'accepted' ? simulationReport.recommendedPrediction : match.acceptedPrediction,
              predictionHistory: appendHistory(match.predictionHistory, {
                action: mode === 'accepted' ? 'accepted' : 'manual',
                stage: 'knockout',
                source: 'system',
                summary:
                  mode === 'accepted'
                    ? 'Detailed simulation result imported and accepted.'
                    : 'Detailed simulation result imported as the active prediction.',
                prediction: simulationReport.recommendedPrediction,
              }),
            }
            : match,
        ),
      )

    if (mode === 'accepted') {
      setActiveView('bracket')
      scrollToElementById(`knockout-match-${simulationFocus.matchId}`)
    }
  }

  function handleGoBackFromSimulation() {
    if (!simulationFocus) {
      setActiveView('group')
      return
    }

    if (simulationFocus.stage === 'group') {
      setActiveView('group')
      scrollToElementById(`group-match-${simulationFocus.matchId}`)
      return
    }

    setActiveView('bracket')
    scrollToElementById(`knockout-match-${simulationFocus.matchId}`)
  }

  function handleTryToPredictPhaseAward(phaseKey: PhaseKey, awardKey: PhaseAwardKey) {
    const snapshot = buildEngineAwardSnapshot(phaseKey, awardKey)

    if (!snapshot) {
      return
    }

    setPhaseAwardPredictions((currentValue) => ({
      ...currentValue,
      [phaseKey]: {
        ...(currentValue[phaseKey] ?? {}),
        [awardKey]: snapshot,
      },
    }))
  }

  function handleResetEngineLearning() {
    window.localStorage.removeItem(storageKeys.adaptiveLearning)
    setAdaptiveLearningState(defaultAdaptiveLearningState)
  }

  function renderPhaseAwards(phaseKey: PhaseKey, phaseTitle: string, phaseNote: string) {
    return (
      <section className="phase-awards-box">
        <div className="phase-awards-header">
          <div>
            <p className="eyebrow">Poules-style extras</p>
            <h3>{phaseTitle}</h3>
            <p>{phaseNote}</p>
          </div>
        </div>
        <div className="phase-awards-grid">
          {phaseAwardDefinitions.map((award) => {
            const acceptedSnapshot = buildAcceptedAwardSnapshot(phaseKey, award.key)
            const engineSnapshot = phaseAwardPredictions[phaseKey]?.[award.key]

            return (
              <article key={award.key} className="phase-award-card">
                <strong>{award.title}</strong>
                <p>{award.description}</p>
                <div className="phase-award-columns">
                  <div className="phase-award-column">
                    <span>From accepted match picks</span>
                    {acceptedSnapshot ? (
                      <>
                        <strong>{acceptedSnapshot.teamName}</strong>
                        <small>
                          {acceptedSnapshot.value} projected value · {acceptedSnapshot.confidence}% confidence
                        </small>
                        <small>{acceptedSnapshot.summary}</small>
                      </>
                    ) : (
                      <>
                        <strong>Waiting for accepted picks</strong>
                        <small>Accept more matches in this phase to derive a live leader from your current tournament path.</small>
                      </>
                    )}
                  </div>
                  <div className="phase-award-column">
                    <span>Dedicated award engine</span>
                    {engineSnapshot ? (
                      <>
                        <strong>{engineSnapshot.teamName}</strong>
                        <small>
                          {engineSnapshot.value} projected value · {engineSnapshot.confidence}% confidence
                        </small>
                        <small>{engineSnapshot.summary}</small>
                      </>
                    ) : (
                      <>
                        <strong>Not predicted yet</strong>
                        <small>
                          This phase award predictor will also look at how teams performed in earlier tournament rounds.
                        </small>
                      </>
                    )}
                    <button
                      type="button"
                      className="secondary-button compact-button phase-award-button"
                      onClick={() => handleTryToPredictPhaseAward(phaseKey, award.key)}
                    >
                      {engineSnapshot ? 'Predict again' : 'Try to predict'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    )
  }

  async function handleRefreshBets() {
    setIsRefreshingBets(true)
    setBackendConnectionStatus('checking')
    setRefreshFeedback({
      kind: 'loading',
      title: 'Refreshing bets and bookmaker odds...',
      details: [
        'Backend market odds are being refreshed from bookmaker adapters.',
        'Completed match results from the odds provider are being refreshed too.',
      ],
    })

    try {
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

      const marketResult = await refreshMarketStateInBackend(marketTargets)
      setMarketApiState(marketResult)
      setBackendConnectionStatus('online')
      setRefreshFeedback({
        kind: 'success',
        title: 'Bets refreshed successfully.',
        details: [marketResult.marketStatus, marketResult.actualResultStatus, marketResult.stsStatus],
      })
    } catch (error) {
      const message = getErrorMessage(error)
      setBackendConnectionStatus(message.includes('Odds API key is missing') ? 'online' : 'offline')
      setRefreshFeedback({
        kind: 'error',
        title: 'Bets refresh failed.',
        details: [message],
      })
    } finally {
      setIsRefreshingBets(false)
    }
  }

  function handleScrollToGroup(groupName: string) {
    setActiveView('group')
    scrollToElementById(`group-section-${groupName}`)
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
    setOddsApiKeyStatus('Key accepted for this backend session. Now run Refresh Bets.')
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

  async function handleSubmitLiveProviderKey(providerKey: 'api-football' | 'football-data') {
    const apiKey = providerKey === 'api-football' ? apiFootballKeyInput.trim() : footballDataKeyInput.trim()

    if (!apiKey) {
      setLiveProviderKeyStatus('Paste the provider key first.')
      return
    }

    setLiveProviderKeyStatus(`Submitting ${providerKey === 'api-football' ? 'API-Football' : 'football-data.org'} key to the local backend...`)

    const nextState = await submitLiveProviderKeyToBackend(providerKey, apiKey).catch((error) => {
      setLiveProviderKeyStatus(getErrorMessage(error))
      return null
    })

    if (!nextState) {
      return
    }

    setLiveDataState(nextState)
    setLiveProviderKeyStatus(
      providerKey === 'api-football'
        ? 'API-Football key accepted. Refresh Live Data to load richer squads.'
        : 'football-data.org key accepted. Refresh Live Data to use it as a secondary provider.',
    )

    if (providerKey === 'api-football') {
      setApiFootballKeyInput('')
    } else {
      setFootballDataKeyInput('')
    }
  }

  function getMarketTargetByMatchId(matchId: string): MarketTarget | null {
    const groupMatch = matches.find((match) => match.id === matchId)

    if (groupMatch) {
      return {
        id: groupMatch.id,
        kickoffUtc: groupMatch.kickoffUtc,
        homeTeam: groupMatch.homeTeam,
        awayTeam: groupMatch.awayTeam,
      }
    }

    const knockoutMatch = resolvedKnockoutMatches.find((item) => item.match.id === matchId && item.homeTeam && item.awayTeam && item.schedule)

    if (!knockoutMatch?.homeTeam || !knockoutMatch.awayTeam || !knockoutMatch.schedule) {
      return null
    }

    return {
      id: knockoutMatch.match.id,
      kickoffUtc: knockoutMatch.schedule.kickoffUtc,
      homeTeam: knockoutMatch.homeTeam,
      awayTeam: knockoutMatch.awayTeam,
    }
  }

  async function handleRefreshSingleMatchMarket(matchId: string, mode: 'missing' | 'reload') {
    const target = getMarketTargetByMatchId(matchId)

    if (!target) {
      return
    }

    setMarketActionState({ matchId, mode })
    setBackendConnectionStatus('checking')

    const nextState = await refreshSingleMatchMarketInBackend(target, mode).catch((error) => {
      const message = getErrorMessage(error)
      setBackendConnectionStatus(message.includes('Odds API key is missing') ? 'online' : 'offline')
      setRefreshFeedback({
        kind: 'error',
        title: 'Single-match market refresh failed.',
        details: [message],
      })
      return null
    })

    if (nextState) {
      setMarketApiState(nextState)
      setBackendConnectionStatus('online')
      setRefreshFeedback({
        kind: 'success',
        title: mode === 'reload' ? 'Single-match bookmaker odds reloaded.' : 'Missing bookmaker odds loaded.',
        details: [nextState.marketStatus, nextState.stsStatus],
      })
    }

    setMarketActionState(null)
  }

  function handleTryToPredict(matchId: string) {
    setMatches((currentMatches) =>
      currentMatches.map((match) =>
        match.id === matchId
          ? (() => {
              const nextAttempt = (match.predictionAttempt ?? 0) + 1
              const groupState = getGroupStateContext(match, currentMatches)
              const prediction = predictMatch(match.homeTeam, match.awayTeam, match.venueCity, nextAttempt, match, liveTeamForm, teamDirectory, adaptiveLearningState, {
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
        const prediction = predictMatch(match.homeTeam, match.awayTeam, match.venueCity, nextAttempt, match, liveTeamForm, teamDirectory, adaptiveLearningState, {
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
    setStandingsMode('prediction')
    setPhaseAwardPredictions({})
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
                teamDirectory,
                adaptiveLearningState,
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

  function handleTryToPredictKnockoutStage(stage: KnockoutStage) {
    setKnockoutMatches((currentMatches) =>
      currentMatches.map((match) => {
        if (match.stage !== stage) {
          return match
        }

        const resolvedMatch = resolvedKnockoutMatches.find((item) => item.match.id === match.id)

        if (!resolvedMatch?.homeTeam || !resolvedMatch.awayTeam || resolvedMatch.lockReasons.length > 0) {
          return match
        }

        const nextAttempt = (match.predictionAttempt ?? 0) + 1
        const prediction = predictMatch(
          resolvedMatch.homeTeam,
          resolvedMatch.awayTeam,
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
          teamDirectory,
          adaptiveLearningState,
          {
            knockout: true,
            marketSignal: marketApiState.consensusByMatchId[match.id],
          },
        )

        return {
          ...match,
          predictionAttempt: nextAttempt,
          manualEditorOpen: false,
          lastResolvedHomeTeamId: resolvedMatch.homeTeam.id,
          lastResolvedAwayTeamId: resolvedMatch.awayTeam.id,
          prediction,
          predictionHistory: appendHistory(match.predictionHistory, {
            action: 'generated',
            stage: 'knockout',
            source: 'model',
            summary: `Knockout prediction v${nextAttempt} generated.`,
            prediction,
          }),
        }
      }),
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

  function handleAcceptAllKnockoutStage(stage: KnockoutStage) {
    setKnockoutMatches((currentMatches) =>
      currentMatches.map((match) => {
        if (match.stage !== stage || !match.prediction) {
          return match
        }

        const resolvedMatch = resolvedKnockoutMatches.find((item) => item.match.id === match.id)

        return {
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
      }),
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

  async function handleClearSavedData() {
    window.localStorage.removeItem(storageKeys.groupMatches)
    window.localStorage.removeItem(storageKeys.knockoutMatches)
    window.localStorage.removeItem(storageKeys.activeView)
    window.localStorage.removeItem(storageKeys.standingsMode)
    window.localStorage.removeItem(storageKeys.matchDayTimeMode)
    window.localStorage.removeItem(storageKeys.liveTeamForm)
    window.localStorage.removeItem(storageKeys.teamDirectory)
    window.localStorage.removeItem(storageKeys.phaseAwards)
    window.localStorage.removeItem(storageKeys.adaptiveLearning)
    window.localStorage.removeItem('world-cup-betting-system/team-sort-mode')
    window.localStorage.removeItem('world-cup-betting-system/active-team-id')
    setMatches(createInitialMatches())
    setKnockoutMatches(createInitialKnockoutMatches())
    setActiveView('group')
    setStandingsMode('prediction')
    setMatchDayTimeMode('viewer')
    setTeamSortMode('group')
    setActiveTeamId(groupDefinitions[0]?.teams[0]?.id ?? '')
    setPhaseAwardPredictions({})
    setAdaptiveLearningState(defaultAdaptiveLearningState)
    setLiveTeamForm({})
    setTeamDirectory({})
    setLiveDataState(defaultLiveDataState)
    setBackendConnectionStatus('checking')

    const [nextState, nextLiveDataState] = await Promise.all([
      resetMarketStateInBackend().catch(() => null),
      resetLiveDataInBackend().catch(() => null),
    ])

    if (nextState) {
      setMarketApiState(nextState)
      setBackendConnectionStatus('online')
    } else {
      setMarketApiState(defaultMarketApiState)
      setBackendConnectionStatus('offline')
    }

    if (nextLiveDataState) {
      setLiveDataState(nextLiveDataState)
      setLiveRefreshStatus(nextLiveDataState.refreshStatus)
    }
  }

  function renderBookmakerStrip(matchId: string) {
    const oddsBySource = marketApiState.oddsByMatchId[matchId] ?? {}
    const brokerSlots = marketApiState.brokerSlots
    const consensus = marketApiState.consensusByMatchId[matchId]
    const hasDisplayedOdds = (Object.values(brokerSlots) as BookmakerSourceKey[]).some((sourceKey) => Boolean(oddsBySource[sourceKey]))
    const actionMode = hasDisplayedOdds ? 'reload' : 'missing'
    const actionBusy = marketActionState?.matchId === matchId
    const actionLabel = actionBusy
      ? actionMode === 'reload'
        ? 'Reloading...'
        : 'Loading...'
      : actionMode === 'reload'
        ? 'Reload'
        : 'Load Missing'

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
          <button
            type="button"
            className="secondary-button compact-button"
            onClick={() => void handleRefreshSingleMatchMarket(matchId, actionMode)}
            disabled={actionBusy}
          >
            {actionLabel}
          </button>
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
            <span>Accepted knockout picks</span>
            <strong>{acceptedKnockoutCount}/32</strong>
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
            <div className="learning-status-box">
              <div>
                <span>Engine learning status</span>
                <strong>{adaptiveLearningState.processedActualMatchIds.length} real matches learned</strong>
              </div>
              <div>
                <span>Top factor shifts</span>
                <strong>
                  {topAdaptiveFactors
                    .map(([key, value]) => `${formatAdaptiveFactorLabel(key as AdaptiveFactorKey)} ${value >= 1 ? '+' : ''}${roundTo((value - 1) * 100, 1)}%`)
                    .join(' / ')}
                </strong>
              </div>
              <div>
                <span>Bookmaker trust shifts</span>
                <strong>
                  {topAdaptiveBookmakers
                    .map(([key, value]) => `${findBookmakerSource(key as BookmakerSourceKey).shortLabel} ${value >= 1 ? '+' : ''}${roundTo((value - 1) * 100, 1)}%`)
                    .join(' / ')}
                </strong>
              </div>
              <div className="learning-status-actions">
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={handleResetEngineLearning}
                >
                  Reset engine learning
                </button>
              </div>
            </div>
            <details className="learning-log-details">
              <summary className="prediction-summary">Learning log per match</summary>
              <div className="learning-log-list">
                {adaptiveLearningState.learningLog.length > 0 ? (
                  [...adaptiveLearningState.learningLog]
                    .slice(-8)
                    .reverse()
                    .map((entry) => (
                      <article key={entry.id} className="learning-log-item">
                        <span>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(entry.createdAt))}</span>
                        <strong>{entry.matchId}</strong>
                        <p>{entry.summary}</p>
                        <small>
                          Factors: {entry.factorChanges.length > 0 ? entry.factorChanges.join(' / ') : 'No factor shift recorded.'}
                        </small>
                        <small>
                          Bookmakers: {entry.bookmakerChanges.length > 0 ? entry.bookmakerChanges.join(' / ') : 'No bookmaker shift recorded.'}
                        </small>
                      </article>
                    ))
                ) : (
                  <div className="learning-log-item">
                    <strong>No learned matches yet</strong>
                    <p>Once real results arrive and the engine compares them with stored predictions, the per-match learning log will appear here.</p>
                  </div>
                )}
              </div>
            </details>
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
            <p className="api-key-help">
              Need a key?{' '}
              <a
                href="https://the-odds-api.com/"
                target="_blank"
                rel="noreferrer"
                className="api-key-link"
              >
                Open The Odds API
              </a>
            </p>
            <p className="hero-status-copy">{oddsApiKeyStatus}</p>
            <div className="live-provider-box">
              <div className="live-provider-status-grid">
                <div>
                  <span>API-Football</span>
                  <strong>{liveDataState.providers.apiFootball.configured ? 'Active' : 'Missing key'}</strong>
                  <small>{liveDataState.providers.apiFootball.status}</small>
                </div>
                <div>
                  <span>football-data.org</span>
                  <strong>{liveDataState.providers.footballData.configured ? 'Active' : 'Optional key'}</strong>
                  <small>{liveDataState.providers.footballData.status}</small>
                </div>
                <div>
                  <span>TheSportsDB</span>
                  <strong>Fallback</strong>
                  <small>{liveDataState.providers.theSportsDb.status}</small>
                </div>
              </div>
              <div className="live-provider-forms">
                <form className="api-key-form" onSubmit={(event) => { event.preventDefault(); void handleSubmitLiveProviderKey('api-football') }}>
                  <label>
                    <span>API-Football key</span>
                    <input
                      type="password"
                      value={apiFootballKeyInput}
                      onChange={(event) => setApiFootballKeyInput(event.target.value)}
                      placeholder="Paste your API-Football key"
                      autoComplete="off"
                    />
                  </label>
                  <button type="submit" className="secondary-button compact-button">
                    Submit
                  </button>
                </form>
                <form className="api-key-form" onSubmit={(event) => { event.preventDefault(); void handleSubmitLiveProviderKey('football-data') }}>
                  <label>
                    <span>football-data.org key</span>
                    <input
                      type="password"
                      value={footballDataKeyInput}
                      onChange={(event) => setFootballDataKeyInput(event.target.value)}
                      placeholder="Paste your football-data key"
                      autoComplete="off"
                    />
                  </label>
                  <button type="submit" className="secondary-button compact-button">
                    Submit
                  </button>
                </form>
              </div>
              <p className="api-key-help">
                Need provider access?{' '}
                <a href="https://www.api-football.com/pricing" target="_blank" rel="noreferrer" className="api-key-link">
                  Open API-Football
                </a>
                {' '}or{' '}
                <a href="https://www.football-data.org/" target="_blank" rel="noreferrer" className="api-key-link">
                  Open football-data.org
                </a>
              </p>
              <p className="hero-status-copy">{liveProviderKeyStatus}</p>
            </div>
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
            <button type="button" className="secondary-button hero-action-button" onClick={() => void handleRefreshLiveData()} disabled={isRefreshingLiveData}>
              {isRefreshingLiveData ? 'Refreshing live data...' : 'Refresh Live Data'}
            </button>
            <button type="button" className="secondary-button hero-action-button" onClick={() => void handleRefreshBets()} disabled={isRefreshingBets}>
              {isRefreshingBets ? 'Refreshing bets...' : 'Refresh Bets'}
            </button>
            <button type="button" className="secondary-button hero-action-button" onClick={handleReset}>
              Reset simulation
            </button>
            <button type="button" className="secondary-button hero-action-button" onClick={() => void handleClearSavedData()}>
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
        <button
          type="button"
          className={`tab-button ${activeView === 'matchDays' ? 'tab-button-active' : ''}`}
          onClick={() => setActiveView('matchDays')}
        >
          Match Days
        </button>
        <button
          type="button"
          className={`tab-button ${activeView === 'teams' ? 'tab-button-active' : ''}`}
          onClick={() => setActiveView('teams')}
        >
          Teams
        </button>
        <button
          type="button"
          className={`tab-button ${activeView === 'simulation' ? 'tab-button-active' : ''}`}
          onClick={() => setActiveView('simulation')}
        >
          Detailed Simulation
        </button>
      </section>

      {activeView === 'group' ? (
        <>
          <section className="panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Standings</p>
                <h2>Group tables A-L</h2>
                <p>Bracket seeding currently uses {getStandingsModeLabel(standingsMode)}.</p>
              </div>
              <div className="standings-mode-switcher" aria-label="Choose table source for bracket seeding">
                <button
                  type="button"
                  className={`tab-button ${standingsMode === 'prediction' ? 'tab-button-active' : ''}`}
                  onClick={() => setStandingsMode('prediction')}
                >
                  Prediction table
                </button>
                <button
                  type="button"
                  className={`tab-button ${standingsMode === 'real' ? 'tab-button-active' : ''}`}
                  onClick={() => setStandingsMode('real')}
                >
                  Real table
                </button>
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
                      {(activeStandings[groupDefinition.name] ?? []).map((row, index) => {
                        const actualRow = actualStandings[groupDefinition.name]?.find((standing) => standing.team.id === row.team.id)
                        const predictionRow = standings[groupDefinition.name]?.find((standing) => standing.team.id === row.team.id)

                        return (
                          <tr key={row.team.id}>
                            <td>{index + 1}</td>
                            <td>
                              <span className="table-team">
                                <img className="team-flag" src={getFlagUrl(row.team)} alt={`Flag of ${row.team.name}`} />
                                <span>{row.team.name}</span>
                              </span>
                            </td>
                            <td>{predictionRow?.points ?? 0}</td>
                            <td>{predictionRow?.goalDifference ?? 0}</td>
                            <td>{predictionRow?.played ?? 0}</td>
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

            {renderPhaseAwards(
              'group',
              'Group Phase side awards',
              'This is a lightweight placeholder for Poules-style side bets in the group stage. The two award columns are intentionally reserved for future logic.',
            )}

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
                        disabled={!matches.some((match) => match.group === groupDefinition.name && Boolean(match.prediction))}
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
                        <article key={match.id} id={`group-match-${match.id}`} className="match-card">
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
                              <div className="manual-entry-actions">
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => handleSaveManualPrediction(match.id)}
                                  disabled={match.manualHomeGoals === '' || match.manualAwayGoals === ''}
                                >
                                  Save manual prediction
                                </button>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => handleToggleManualEditor(match.id)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : null}

                        <div className="action-row">
                          <button type="button" className="primary-button" onClick={() => handleTryToPredict(match.id)}>
                            {match.prediction ? 'Predict again' : 'Try to predict'}
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleOpenSimulationFromGroupMatch(match)}
                          >
                            Detailed simulation
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
      ) : activeView === 'bracket' ? (
        <>
          <section className="panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Wild cards</p>
                <h2>Best third-placed teams</h2>
                <p>Round of 32 seeding uses {getStandingsModeLabel(standingsMode)}.</p>
              </div>
            </div>

            <div className="bracket-list">
              {rankedThirds.map((row) => {
                const opponentMatch = roundOf32Preview.find((match) => match.awayTeam === row.team.name)
                const opponentLabel = opponentMatch
                  ? `${opponentMatch.homeTeam} in Match ${opponentMatch.id}`
                  : 'Round of 32 opponent not locked yet'

                return (
                  <button
                    key={row.team.id}
                    type="button"
                    className="bracket-card bracket-card-button"
                    onClick={() => opponentMatch ? handleJumpToKnockoutMatch(opponentMatch.id) : undefined}
                    disabled={!opponentMatch}
                  >
                    <span>
                      Rank {row.rank} / Group {row.team.group}
                    </span>
                    <strong>{row.team.name}</strong>
                    <p>
                      {row.points} pts, GD {row.goalDifference}, GF {row.goalsFor}
                    </p>
                    <small>{opponentLabel}</small>
                  </button>
                )
              })}
            </div>
          </section>

          {knockoutStageConfig.map(({ stage, title, subtitle }) => {
            const stageMatches = displayKnockoutMatches.filter((match) => match.stage === stage)
            const stageAcceptedCount = stageMatches.filter((match) => Boolean(match.acceptedPrediction)).length
            const stageCanPredictCount = stageMatches.filter((match) => {
              const resolvedMatch = resolvedKnockoutMatches.find((item) => item.match.id === match.id)
              return Boolean(resolvedMatch?.homeTeam && resolvedMatch.awayTeam && resolvedMatch.lockReasons.length === 0)
            }).length
            const stageCanAcceptCount = stageMatches.filter((match) => Boolean(match.prediction)).length

            return (
            <section key={stage} className="panel">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Knockout stage</p>
                  <h2>{title}</h2>
                  <p>{subtitle}</p>
                </div>
                <div className="group-actions">
                  <button
                    type="button"
                    className="secondary-button group-predict-button"
                    onClick={() => handleTryToPredictKnockoutStage(stage)}
                    disabled={stageCanPredictCount === 0}
                  >
                    Try to predict all
                  </button>
                  <button
                    type="button"
                    className="secondary-button group-predict-button"
                    onClick={() => handleAcceptAllKnockoutStage(stage)}
                    disabled={stageCanAcceptCount === 0}
                  >
                    Accept all
                  </button>
                  <span className="badge">
                    {stageAcceptedCount}/{stageMatches.length} accepted
                  </span>
                </div>
              </div>

              {renderPhaseAwards(
                stage,
                `${title} side awards`,
                'Skeleton placeholder for phase-level side bets. Later this area can compare a table derived from your accepted picks with an independent award-prediction engine.',
              )}

              <div className="knockout-stage-grid">
                {stageMatches.map((match) => {
                    const resolvedMatch = resolvedKnockoutMatches.find((item) => item.match.id === match.id)!
                    const homeTeam = resolvedMatch.homeTeam
                    const awayTeam = resolvedMatch.awayTeam
                    const canPredict = Boolean(homeTeam && awayTeam && resolvedMatch.lockReasons.length === 0)
                    const scoreLabel = formatPredictionScore(match.acceptedPrediction ?? match.prediction) || '? : ?'

                    return (
                      <article key={match.id} id={`knockout-match-${match.id}`} className="match-card">
                        <div className="match-meta">
                          <span>{resolvedMatch.schedule ? `${resolvedMatch.schedule.localDateLabel} / ${resolvedMatch.schedule.localTimeLabel}` : 'TBC'}</span>
                          <span>{title} / {match.id}</span>
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
                            <div className="manual-entry-actions">
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => handleSaveKnockoutManualPrediction(match.id)}
                                disabled={match.manualHomeGoals === '' || match.manualAwayGoals === ''}
                              >
                                Save manual prediction
                              </button>
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => handleToggleKnockoutManualEditor(match.id)}
                              >
                                Cancel
                              </button>
                            </div>
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
                            onClick={() => handleOpenSimulationFromKnockoutMatch(match, resolvedMatch)}
                          >
                            Detailed simulation
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
            )
          })}
        </>
      ) : activeView === 'matchDays' ? (
        <section className="panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Calendar view</p>
              <h2>Match days</h2>
              <p>Read-only schedule ordered by kickoff time, with your saved prediction, accepted score and real result side by side.</p>
            </div>
            <div className="standings-mode-switcher" aria-label="Choose schedule time zone">
              <button
                type="button"
                className={`tab-button ${matchDayTimeMode === 'local' ? 'tab-button-active' : ''}`}
                onClick={() => setMatchDayTimeMode('local')}
              >
                Local
              </button>
              <button
                type="button"
                className={`tab-button ${matchDayTimeMode === 'viewer' ? 'tab-button-active' : ''}`}
                onClick={() => setMatchDayTimeMode('viewer')}
              >
                Your time zone
              </button>
            </div>
          </div>

          <div className="match-day-sections">
            {matchDaySections.map((section) => (
              <article key={section.dateLabel} className="match-day-section">
                <h3>{section.dateLabel}</h3>
                <div className="match-day-list">
                  {section.matches.map((item) => (
                    <div key={item.stage + item.id} className="match-day-row">
                      <div className="match-day-time-block">
                        <strong>{matchDayTimeMode === 'local' ? item.localTimeLabel : item.viewerTimeLabel}</strong>
                        <span>{item.stageLabel}</span>
                      </div>

                      <div className="match-day-teams-block">
                        <div className="match-day-team-line">
                          {item.homeFlagUrl ? (
                            <img className="team-flag" src={item.homeFlagUrl} alt={`Flag of ${item.homeTeamName}`} />
                          ) : (
                            <span className="team-flag team-flag-placeholder" aria-hidden="true"></span>
                          )}
                          <strong>{item.homeTeamName}</strong>
                        </div>
                        <div className="match-day-team-line">
                          {item.awayFlagUrl ? (
                            <img className="team-flag" src={item.awayFlagUrl} alt={`Flag of ${item.awayTeamName}`} />
                          ) : (
                            <span className="team-flag team-flag-placeholder" aria-hidden="true"></span>
                          )}
                          <strong>{item.awayTeamName}</strong>
                        </div>
                      </div>

                      <div className="match-day-score-stack" aria-label={`Saved scores for ${item.homeTeamName} vs ${item.awayTeamName}`}>
                        <div className="match-day-score-line">
                          <span>Prediction</span>
                          <strong>{item.predictionScore || '- : -'}</strong>
                        </div>
                        <div className="match-day-score-line">
                          <span>Accepted</span>
                          <strong>{item.acceptedScore || '- : -'}</strong>
                        </div>
                        <div className="match-day-score-line">
                          <span>Actual</span>
                          <strong>{item.actualScore || '- : -'}</strong>
                        </div>
                        {item.actualSourceLabel ? <small>{item.actualSourceLabel}</small> : null}
                      </div>

                      <button
                        type="button"
                        className="secondary-button compact-button match-day-open-button"
                        onClick={() => handleOpenMatchFromMatchDays(item)}
                      >
                        Open details
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : activeView === 'simulation' ? (
        <section className="panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Detailed simulation</p>
              <h2>Monte Carlo workbench</h2>
              <p>
                This workspace runs high-volume local simulations for the selected match and can import the consensus result
                back into Group Phase or Bracket Phase.
              </p>
            </div>
            <span className="badge">{simulationFocus?.stage === 'knockout' ? 'Knockout rules active' : 'Group rules active'}</span>
          </div>

          <div className="simulation-layout">
            <article className="simulation-focus-card">
              <span className="eyebrow">Selected match</span>
              {simulationFocus ? (
                <>
                  <h3>{simulationFocus.homeTeamName} vs {simulationFocus.awayTeamName}</h3>
                  <p>{simulationFocus.label}</p>
                  <p>Venue: {simulationFocus.venue}</p>
                  <div className="simulation-current-accepted-box">
                    <span>Current accepted prediction</span>
                    <strong>{formatPredictionScore(currentSimulationAcceptedPrediction) || 'No accepted result yet'}</strong>
                  </div>
                  <p>
                    Rules:{' '}
                    <strong>
                      {simulationFocus.stage === 'group'
                        ? 'Group match, so the simulation ends after 90 minutes and draws remain valid.'
                        : 'Knockout match, so tied games branch into extra time and then penalties.'}
                    </strong>
                  </p>
                </>
              ) : (
                <>
                  <h3>No match selected yet</h3>
                  <p>Open any group or knockout match and click <strong>Detailed simulation</strong> to prepare this workspace.</p>
                </>
              )}
            </article>

            <article className="simulation-focus-card">
              <span className="eyebrow">Run controls</span>
              <h3>High-volume stochastic model</h3>
              <div className="simulation-controls">
                <label className="simulation-control-field">
                  <span>Simulation runs</span>
                  <select value={simulationRunCount} onChange={(event) => setSimulationRunCount(Number(event.target.value))}>
                    <option value={1000}>1,000</option>
                    <option value={5000}>5,000</option>
                    <option value={10000}>10,000</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void handleRunDetailedSimulation()}
                  disabled={!simulationFocus || isRunningSimulation}
                >
                  {isRunningSimulation ? 'Running simulation...' : 'Run simulation'}
                </button>
              </div>
              <p>
                The run happens fully in your browser. It does not use API credits and respects the selected match type.
              </p>
            </article>
          </div>

          {simulationReport ? (
            <>
              <div className="simulation-grid">
                {simulationReport.summaryMetrics.map((metric) => (
                  <article key={metric.label} className="simulation-card">
                    <span className="eyebrow">{metric.label}</span>
                    <h3>{metric.value}</h3>
                  </article>
                ))}
              </div>

              <div className="simulation-grid simulation-grid-two-wide">
                <article className="simulation-card">
                  <h3>Recommended import result</h3>
                  <p>
                    <strong>{formatPredictionScore(simulationReport.recommendedPrediction)}</strong>
                  </p>
                  <p>{simulationReport.recommendedPrediction.summary}</p>
                  <div className="prediction-metrics">
                    <span className="metric-pill">{simulationReport.homeTeamName} {simulationReport.recommendedPrediction.homeWinProbability}%</span>
                    <span className="metric-pill">Draw {simulationReport.recommendedPrediction.drawProbability}%</span>
                    <span className="metric-pill">{simulationReport.awayTeamName} {simulationReport.recommendedPrediction.awayWinProbability}%</span>
                    <span className="metric-pill">xG {simulationReport.recommendedPrediction.homeExpectedGoals} - {simulationReport.recommendedPrediction.awayExpectedGoals}</span>
                  </div>
                  <div className="action-row">
                    <button type="button" className="secondary-button" onClick={() => handleImportSimulationResult('prediction')}>
                      Import as prediction
                    </button>
                    <button type="button" className="secondary-button" onClick={handleGoBackFromSimulation}>
                      Go back without import
                    </button>
                    <button type="button" className="primary-button" onClick={() => handleImportSimulationResult('accepted')}>
                      Import and accept
                    </button>
                  </div>
                </article>

                <article className="simulation-card">
                  <h3>Outcome distribution</h3>
                  <div className="simulation-bar-list">
                    {simulationReport.chartBars.map((bar) => (
                      <div key={bar.label} className="simulation-bar-row">
                        <div className="simulation-bar-label-row">
                          <span>{bar.label}</span>
                          <strong>{bar.share}%</strong>
                        </div>
                        <div className="simulation-bar-track">
                          <span className="simulation-bar-fill" style={{ width: `${clamp(bar.share, 0, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="simulation-card">
                  <h3>Phase flow</h3>
                  <div className="simulation-bar-list">
                    {simulationReport.phaseFlow.map((bar) => (
                      <div key={bar.label} className="simulation-bar-row">
                        <div className="simulation-bar-label-row">
                          <span>{bar.label}</span>
                          <strong>{bar.share}%</strong>
                        </div>
                        <div className="simulation-bar-track">
                          <span className="simulation-bar-fill simulation-bar-fill-alt" style={{ width: `${clamp(bar.share, 0, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="simulation-card">
                  <h3>Scoreline heatmap</h3>
                  <div className="simulation-heatmap-wrap">
                    <div className="simulation-heatmap-labels simulation-heatmap-labels-top">
                      <span />
                      {['0', '1', '2', '3', '4', '5', '6+'].map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                    <div className="simulation-heatmap-grid">
                      {['0', '1', '2', '3', '4', '5', '6+'].map((homeLabel) => (
                        <div key={homeLabel} className="simulation-heatmap-row">
                          <span className="simulation-heatmap-axis">{homeLabel}</span>
                          {['0', '1', '2', '3', '4', '5', '6+'].map((awayLabel) => {
                            const cell = simulationReport.scorelineHeatmap.find(
                              (candidate) => candidate.homeGoals === homeLabel && candidate.awayGoals === awayLabel,
                            )
                            const share = cell?.share ?? 0
                            return (
                              <span
                                key={`${homeLabel}-${awayLabel}`}
                                className="simulation-heatmap-cell"
                                style={{
                                  backgroundColor: `rgba(15, 118, 110, ${Math.max(0.08, share / 18)})`,
                                  color: share >= 7 ? '#f8fafc' : '#082c36',
                                }}
                                title={`${homeLabel}:${awayLabel} in ${share}% of runs`}
                              >
                                {share > 0 ? `${share}%` : '0'}
                              </span>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                    <p className="simulation-heatmap-caption">
                      Rows are {simulationReport.homeTeamName} goals, columns are {simulationReport.awayTeamName} goals.
                    </p>
                  </div>
                </article>

                <article className="simulation-card">
                  <h3>Most frequent scorelines</h3>
                  <div className="simulation-scoreline-list">
                    {simulationReport.topScorelines.map((scoreline) => (
                      <div key={scoreline.label} className="simulation-scoreline-item">
                        <strong>{scoreline.label}</strong>
                        <span>{scoreline.share}%</span>
                        <small>{scoreline.count} runs</small>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="simulation-card">
                  <h3>Simulation notes</h3>
                  <div className="refresh-feedback-list">
                    {simulationReport.notes.map((note) => (
                      <span key={note}>{note}</span>
                    ))}
                  </div>
                  {renderPredictionExplanation(simulationReport.recommendedPrediction)}
                </article>
              </div>
            </>
          ) : (
            <div className="simulation-grid">
              <article className="simulation-card">
                <h3>Outcome distributions</h3>
                <p>Run the simulation to see win/draw/win shares, top scorelines and, in knockout mode only, extra-time and penalties branches.</p>
              </article>
              <article className="simulation-card">
                <h3>Driver analysis</h3>
                <p>The imported recommendation will reuse the enriched model inputs: ratings, form, roster context, continuity and market signal.</p>
              </article>
              <article className="simulation-card">
                <h3>Import workflow</h3>
                <p>After the run, you will be able to import the simulation consensus either as the active prediction or directly as an accepted result.</p>
              </article>
              <article className="simulation-card">
                <h3>Rules safety</h3>
                <p>Group matches keep draw outcomes. Knockout matches only branch into extra time and penalties after a 90-minute draw.</p>
              </article>
            </div>
          )}
        </section>
      ) : (
        <section className="panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Teams</p>
              <h2>National teams, squads and staff</h2>
              <p>Team tabs use flag graphics, group order and the latest public roster snapshot stored in your browser.</p>
            </div>
            <div className="teams-header-badges">
              <span className="badge">
                {Object.keys(teamDirectory).length}/{allTeams.length} rosters loaded
              </span>
              <span className="badge">
                {teamRefreshTargets.length} teams need refresh
              </span>
            </div>
          </div>

          <div className="teams-toolbar">
            <div className="teams-sort-switcher" aria-label="Sort teams">
              <button
                type="button"
                className={`tab-button ${teamSortMode === 'group' ? 'tab-button-active' : ''}`}
                onClick={() => setTeamSortMode('group')}
              >
                By group
              </button>
              <button
                type="button"
                className={`tab-button ${teamSortMode === 'alphabetical' ? 'tab-button-active' : ''}`}
                onClick={() => setTeamSortMode('alphabetical')}
              >
                Alphabetical
              </button>
              <button
                type="button"
                className={`tab-button ${teamSortMode === 'ranking' ? 'tab-button-active' : ''}`}
                onClick={() => setTeamSortMode('ranking')}
              >
                By ranking
              </button>
            </div>
            <p className="teams-toolbar-note">
              Ranking order currently uses the app strength seed until a dedicated FIFA ranking feed is connected.
              {' '}Use <strong>Refresh Live Data</strong> whenever a squad is empty or its snapshot is older than 12 hours.
            </p>
          </div>

          <div className="team-tab-strip" role="tablist" aria-label="Choose team">
            {sortedTeams.map((team) => (
              <button
                key={team.id}
                type="button"
                role="tab"
                aria-selected={activeTeam?.id === team.id}
                className={`team-tab-button ${activeTeam?.id === team.id ? 'team-tab-button-active' : ''}`}
                onClick={() => setActiveTeamId(team.id)}
              >
                <img className="team-flag" src={getFlagUrl(team)} alt={`Flag of ${team.name}`} />
                <span>{team.name}</span>
              </button>
            ))}
          </div>

          {activeTeam ? (
            <div className="team-directory-layout">
              <article className="team-profile-card">
                <div className="team-profile-header">
                  <div className="team-profile-title">
                    <img className="team-profile-flag" src={getFlagUrl(activeTeam)} alt={`Flag of ${activeTeam.name}`} />
                    <div>
                      <p className="eyebrow">Group {activeTeam.group}</p>
                      <h3>{activeTeam.name}</h3>
                    </div>
                  </div>
                  <div className="team-profile-actions">
                    <span className="badge">Seed rating {activeTeam.rating}</span>
                    <button
                      type="button"
                      className="secondary-button compact-button"
                      onClick={() => void handleRefreshSingleTeam(activeTeam)}
                      disabled={refreshingTeamId === activeTeam.id || isRefreshingLiveData}
                    >
                      {refreshingTeamId === activeTeam.id ? 'Refreshing team...' : 'Refresh this team'}
                    </button>
                  </div>
                </div>

                <div className="team-profile-grid">
                  <div>
                    <span>Source</span>
                    <strong>{activeTeamDirectory?.source ?? 'Not loaded yet'}</strong>
                  </div>
                  <div>
                    <span>Roster refresh</span>
                    <strong>{activeTeamDirectory?.refreshedAt ? formatOptionalDate(activeTeamDirectory.refreshedAt) : 'Not loaded yet'}</strong>
                  </div>
                  <div>
                    <span>Snapshot status</span>
                    <strong>
                      {!activeTeamDirectory
                        ? 'Missing, refresh needed'
                        : shouldRetryPartialRoster(activeTeamDirectory, liveDataState)
                          ? 'Partial roster, refresh recommended'
                          : isSnapshotStale(activeTeamDirectory.refreshedAt)
                            ? 'Stale, refresh recommended'
                            : 'Fresh'}
                    </strong>
                  </div>
                  <div>
                    <span>Roster coverage</span>
                    <strong>
                      {!activeTeamDirectory
                        ? 'No roster loaded'
                        : activeTeamDirectory.players.length >= 23
                          ? `Full-looking squad (${activeTeamDirectory.players.length})`
                          : `Partial provider roster (${activeTeamDirectory.players.length})`}
                    </strong>
                  </div>
                  <div>
                    <span>Stadium</span>
                    <strong>{formatNullableStat(activeTeamDirectory?.stadium)}</strong>
                  </div>
                  <div>
                    <span>Location</span>
                    <strong>{formatNullableStat(activeTeamDirectory?.location)}</strong>
                  </div>
                  <div>
                    <span>Founded</span>
                    <strong>{formatNullableStat(activeTeamDirectory?.foundedYear)}</strong>
                  </div>
                  <div>
                    <span>Website</span>
                    <strong>{activeTeamDirectory?.website ? activeTeamDirectory.website.replace(/^https?:\/\//, '') : 'No data yet'}</strong>
                  </div>
                </div>

                <div className="team-description-box">
                  <strong>Team note</strong>
                  <p>{activeTeamDirectory?.description ? activeTeamDirectory.description.slice(0, 340) : 'Roster and federation metadata will appear here after the live data refresh completes.'}</p>
                </div>
              </article>

              <article className="team-staff-card">
                <div className="team-card-heading">
                  <div>
                    <p className="eyebrow">Staff</p>
                    <h3>Coaches and squad staff</h3>
                  </div>
                  <span className="badge">{activeTeamDirectory?.staff.length ?? 0}</span>
                </div>
                {activeTeamDirectory?.staff.length ? (
                  <div className="team-staff-list">
                    {activeTeamDirectory.staff.map((member) => (
                      <div key={`${member.role}-${member.name}`} className="team-staff-item">
                        <strong>{member.name}</strong>
                        <span>{member.role}</span>
                        <small>{member.nationality ?? 'Nationality not published'}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="team-empty-state">Public staff data has not been matched yet for this team.</p>
                )}
              </article>
            </div>
          ) : null}

          <article className="team-roster-card">
            <div className="team-card-heading">
              <div>
                <p className="eyebrow">Roster</p>
                <h3>{activeTeam?.name ?? 'Selected team'} players</h3>
              </div>
              <span className="badge">{activeTeamDirectory?.players.length ?? 0} players</span>
            </div>

            {activeTeamDirectory?.players.length ? (
              <>
                {activeTeamDirectory.players.length < 23 ? (
                  <p className="team-empty-state">
                    The current public provider returned only {activeTeamDirectory.players.length} players for this team.
                    This is provider-side incomplete coverage, not a UI cap. To show full 23+ squads we need to switch
                    the roster source or add a stronger fallback dataset.
                  </p>
                ) : null}
                <div className="team-roster-table-wrap">
                <table className="team-roster-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Player</th>
                      <th>Position</th>
                      <th>Age</th>
                      <th>Club</th>
                      <th>Born</th>
                      <th>Height</th>
                      <th>Weight</th>
                      <th>National apps</th>
                      <th>National goals</th>
                      <th>National assists</th>
                      <th>National YC</th>
                      <th>National RC</th>
                      <th>Tourn MP</th>
                      <th>Tourn Min</th>
                      <th>Tourn G</th>
                      <th>Tourn A</th>
                      <th>Tourn Fouls</th>
                      <th>Tourn YC</th>
                      <th>Tourn RC</th>
                      <th>Rating</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTeamDirectory.players.map((player) => (
                      <tr key={player.id}>
                        <td>{formatNullableStat(player.number)}</td>
                        <td>
                          <div className="player-name-cell">
                            <div>
                              <strong>{player.name}</strong>
                              <span>{player.nationality ?? activeTeam?.name}</span>
                            </div>
                            <div className="player-availability-icons">
                              {player.tournamentStats.injured ? <span className="availability-badge availability-badge-injured" title="Injured" aria-label="Injured" /> : null}
                              {player.tournamentStats.unavailableNextMatch ? <span className="availability-badge availability-badge-suspended" title="Unavailable for the next match" aria-label="Unavailable for the next match" /> : null}
                            </div>
                          </div>
                        </td>
                        <td>{formatNullableStat(player.position)}</td>
                        <td>{formatNullableStat(player.age)}</td>
                        <td>{formatNullableStat(player.club)}</td>
                        <td>{formatOptionalDate(player.dateOfBirth)}</td>
                        <td>{formatNullableStat(player.height)}</td>
                        <td>{formatNullableStat(player.weight)}</td>
                        <td>{formatNullableStat(player.nationalTeamMatches)}</td>
                        <td>{formatNullableStat(player.nationalTeamGoals)}</td>
                        <td>{formatNullableStat(player.nationalTeamAssists)}</td>
                        <td>{formatNullableStat(player.nationalTeamYellowCards)}</td>
                        <td>{formatNullableStat(player.nationalTeamRedCards)}</td>
                        <td>{formatNullableStat(player.tournamentStats.matchesPlayed)}</td>
                        <td>{formatNullableStat(player.tournamentStats.minutesPlayed)}</td>
                        <td>{formatNullableStat(player.tournamentStats.goals)}</td>
                        <td>{formatNullableStat(player.tournamentStats.assists)}</td>
                        <td>{formatNullableStat(player.tournamentStats.fouls)}</td>
                        <td>{formatNullableStat(player.tournamentStats.yellowCards)}</td>
                        <td>{formatNullableStat(player.tournamentStats.redCards)}</td>
                        <td>{formatNullableStat(player.playerRating)}</td>
                        <td>{formatNullableStat(player.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            ) : (
              <p className="team-empty-state">
                No roster is loaded for this team yet. Use <strong>Refresh Live Data</strong> to fetch the latest public squad snapshot.
              </p>
            )}
          </article>
        </section>
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
