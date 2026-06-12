import express from 'express'
import 'dotenv/config'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const stateFilePath = path.join(__dirname, 'data', 'market-state.json')
const liveStateFilePath = path.join(__dirname, 'data', 'live-data-state.json')
const port = Number(process.env.BACKEND_PORT ?? 8787)
let runtimeOddsApiKey = process.env.THE_ODDS_API_KEY ?? ''
let runtimeApiFootballKey = process.env.API_FOOTBALL_KEY ?? ''
let runtimeFootballDataKey = process.env.FOOTBALL_DATA_API_KEY ?? ''
const fifaBrowserExecutablePath = [
  process.env.FIFA_BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((candidate) => candidate && existsSync(candidate))

const bookmakerSources = [
  { key: 'betfair', label: 'Betfair Exchange', shortLabel: 'BF', accent: '#f59e0b', featured: true },
  { key: 'pinnacle', label: 'Pinnacle', shortLabel: 'PN', accent: '#0f766e', featured: true },
  { key: 'sts', label: 'STS', shortLabel: 'STS', accent: '#dc2626', featured: true, note: 'No data unless this match is available in the STS adapter.' },
  { key: 'fanduel', label: 'FanDuel', shortLabel: 'FD', accent: '#2563eb', featured: false },
]

const defaultState = {
  availableSources: bookmakerSources,
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
  actualResultStatus: 'Real match results and live scores will be loaded from FIFA.com when available.',
  stsStatus: 'STS backend adapter is ready for mapped match URLs.',
  latestRefreshAt: undefined,
  latestActualResultsRefreshAt: undefined,
  apiKeyConfigured: Boolean(runtimeOddsApiKey),
  oddsApiUsage: undefined,
}

const defaultLiveState = {
  liveTeamFormById: {},
  teamDirectoryById: {},
  latestRefreshAt: undefined,
  providers: {
    apiFootball: {
      configured: Boolean(runtimeApiFootballKey),
      label: 'API-Football',
      status: runtimeApiFootballKey
        ? 'API-Football key detected. This provider is ready to load richer national-team squads.'
        : 'API-Football key missing. This provider is available but inactive until you submit a key.',
    },
    footballData: {
      configured: Boolean(runtimeFootballDataKey),
      label: 'football-data.org',
      status: runtimeFootballDataKey
        ? 'football-data.org key detected. This provider can be used as an extra tournament-data source when your plan grants World Cup access.'
        : 'football-data.org key missing. This provider is optional and currently inactive.',
    },
    theSportsDb: {
      configured: true,
      label: 'TheSportsDB',
      status: 'Public fallback provider enabled for recent form and partial team rosters.',
    },
    fifa: {
      configured: Boolean(fifaBrowserExecutablePath),
      label: 'FIFA.com',
      status: fifaBrowserExecutablePath
        ? 'FIFA squad-page fallback is available through local browser automation.'
        : 'FIFA squad-page fallback is unavailable because no supported local browser executable was found.',
    },
  },
  refreshStatus:
    'Refresh Live Data will try API-Football first, then football-data.org, and finally the public fallback provider.',
}

const marketTeamNameAliases = {
  kor: ['South Korea', 'Korea Republic', 'Korea Rep'],
  cze: ['Czech Republic', 'Czechia'],
  tur: ['Turkey', 'Turkiye'],
  civ: ['Ivory Coast', "Cote d'Ivoire", "Côte d'Ivoire"],
  cpv: ['Cape Verde', 'Cabo Verde'],
  cod: ['DR Congo', 'Congo DR', 'Democratic Republic of the Congo'],
  eng: ['England'],
  usa: ['United States', 'USA'],
  bih: ['Bosnia and Herzegovina', 'Bosnia & Herzegovina'],
  rsa: ['South Africa'],
  irn: ['Iran'],
  alg: ['Algeria'],
  jpn: ['Japan'],
  mar: ['Morocco'],
  mex: ['Mexico'],
  can: ['Canada'],
}

const stsKnownMarkets = [
  {
    homeTeamId: 'cze',
    awayTeamId: 'rsa',
    url: 'https://www.sts.pl/kursy/czechy-rpa/f2205146',
    fallbackOdds: {
      homeOdds: 1.95,
      drawOdds: 3.4,
      awayOdds: 4.1,
    },
  },
]

const oddsApiBookmakerKeyBySource = {
  betfair: 'betfair_ex_uk',
  pinnacle: 'pinnacle',
  fanduel: 'fanduel',
}

const fifaMatchStageLabels = new Set([
  'First Stage',
  'Round of 32',
  'Round of 16',
  'Quarter-final',
  'Semi-final',
  'Play-off for third place',
  'Final',
])

const fifaLiveStatusLabels = new Set(['LIVE', 'HT', 'ET', 'ET HT', 'PSO'])
const fifaCompletedStatusLabels = new Set(['FT', 'A', 'C', 'S', 'F', 'P'])

function normalizeParticipantName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeName(name) {
  return (name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) {
    return null
  }

  const birthDate = new Date(dateOfBirth)

  if (Number.isNaN(birthDate.getTime())) {
    return null
  }

  const now = new Date()
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear()
  const monthDifference = now.getUTCMonth() - birthDate.getUTCMonth()

  if (monthDifference < 0 || (monthDifference === 0 && now.getUTCDate() < birthDate.getUTCDate())) {
    age -= 1
  }

  return age
}

function extractCoachName(description) {
  if (!description) {
    return null
  }

  const patterns = [
    /current head coach is ([A-Z][A-Za-zÀ-ÿ.' -]+)/i,
    /head coach (?:is|:)\s*([A-Z][A-Za-zÀ-ÿ.' -]+)/i,
    /managed by ([A-Z][A-Za-zÀ-ÿ.' -]+)/i,
    /coach(?:ed)? by ([A-Z][A-Za-zÀ-ÿ.' -]+)/i,
  ]

  for (const pattern of patterns) {
    const match = description.match(pattern)

    if (match?.[1]) {
      return match[1].trim()
    }
  }

  return null
}

function roundTo(value, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function getTeamNameCandidates(team) {
  return Array.from(new Set([team.name, ...(marketTeamNameAliases[team.id] ?? [])].filter(Boolean)))
}

function toFairProbabilities(homeOdds, drawOdds, awayOdds) {
  const inverseHome = 1 / homeOdds
  const inverseDraw = 1 / drawOdds
  const inverseAway = 1 / awayOdds
  const total = inverseHome + inverseDraw + inverseAway

  return {
    homeProbability: roundTo((inverseHome / total) * 100, 1),
    drawProbability: roundTo((inverseDraw / total) * 100, 1),
    awayProbability: roundTo((inverseAway / total) * 100, 1),
  }
}

function createOddsSnapshot(sourceKey, odds, refreshedAt, note) {
  const source = bookmakerSources.find((item) => item.key === sourceKey)

  return {
    sourceKey,
    sourceLabel: source?.label ?? sourceKey,
    homeOdds: roundTo(odds.homeOdds, 2),
    drawOdds: roundTo(odds.drawOdds, 2),
    awayOdds: roundTo(odds.awayOdds, 2),
    ...toFairProbabilities(odds.homeOdds, odds.drawOdds, odds.awayOdds),
    refreshedAt,
    note,
  }
}

function createActualResultSnapshot(homeGoals, awayGoals, sourceLabel, refreshedAt, note, options = {}) {
  return {
    homeGoals,
    awayGoals,
    sourceLabel,
    refreshedAt,
    note,
    isLive: options.isLive ?? false,
    isCompleted: options.isCompleted ?? false,
    displayLabel: options.displayLabel ?? (options.isLive ? 'Live' : options.isCompleted ? 'Final' : undefined),
  }
}

function isKickoffInsideLiveWindow(kickoffUtc) {
  const kickoffTime = new Date(kickoffUtc).getTime()

  if (Number.isNaN(kickoffTime)) {
    return false
  }

  const now = Date.now()
  const ninetyMinutesMs = 1000 * 60 * 90
  const extraBufferMs = 1000 * 60 * 45

  return now >= kickoffTime && now <= kickoffTime + ninetyMinutesMs + extraBufferMs
}

function parseStsOneXTwoOdds(html) {
  const oddsByLabel = Object.fromEntries(
    [...html.matchAll(/aria-label="([12X])\s+([0-9]+(?:\.[0-9]+)?)"/g)].map((match) => [match[1], Number(match[2])]),
  )

  if (!oddsByLabel['1'] || !oddsByLabel.X || !oddsByLabel['2']) {
    return null
  }

  return {
    homeOdds: oddsByLabel['1'],
    drawOdds: oddsByLabel.X,
    awayOdds: oddsByLabel['2'],
  }
}

function extractOddsApiUsage(response) {
  return {
    remaining: response.headers.get('x-requests-remaining') ?? null,
    used: response.headers.get('x-requests-used') ?? null,
    last: response.headers.get('x-requests-last') ?? null,
  }
}

function buildConsensusByMatchId(oddsByMatchId, trustedSources) {
  return Object.fromEntries(
    Object.entries(oddsByMatchId).flatMap(([matchId, bookmakerOdds]) => {
      const snapshots = trustedSources.map((sourceKey) => bookmakerOdds[sourceKey]).filter(Boolean)

      if (snapshots.length === 0) {
        return []
      }

      const homeProbability = roundTo(snapshots.reduce((sum, item) => sum + item.homeProbability, 0) / snapshots.length, 1)
      const drawProbability = roundTo(snapshots.reduce((sum, item) => sum + item.drawProbability, 0) / snapshots.length, 1)
      const awayProbability = roundTo(snapshots.reduce((sum, item) => sum + item.awayProbability, 0) / snapshots.length, 1)
      const total = homeProbability + drawProbability + awayProbability

      return [[
        matchId,
        {
          sourceKeys: snapshots.map((item) => item.sourceKey),
          sourceLabel: snapshots.map((item) => item.sourceLabel).join(' + '),
          homeProbability: roundTo((homeProbability / total) * 100, 1),
          drawProbability: roundTo((drawProbability / total) * 100, 1),
          awayProbability: roundTo((awayProbability / total) * 100, 1),
          refreshedAt: snapshots.map((item) => item.refreshedAt).sort().at(-1),
        },
      ]]
    }),
  )
}

function hasAnyOddsForMatch(state, matchId) {
  return Object.values(state.oddsByMatchId?.[matchId] ?? {}).some(Boolean)
}

function isMatchCompleted(state, matchId) {
  return Boolean(state.actualResultsByMatchId?.[matchId])
}

function getRefreshableMatches(matches, state) {
  return matches.filter((match) => !hasAnyOddsForMatch(state, match.id) && !isMatchCompleted(state, match.id))
}

function mergeOddsByMatchId(currentOddsByMatchId, nextOddsByMatchId, mode = 'missing') {
  const mergedOddsByMatchId = { ...currentOddsByMatchId }

  for (const [matchId, incomingBySource] of Object.entries(nextOddsByMatchId)) {
    const currentBySource = mergedOddsByMatchId[matchId] ?? {}
    const nextBySource =
      mode === 'reload'
        ? { ...currentBySource, ...incomingBySource }
        : {
            ...currentBySource,
            ...Object.fromEntries(
              Object.entries(incomingBySource).filter(([sourceKey]) => !currentBySource[sourceKey]),
            ),
          }

    if (Object.keys(nextBySource).length > 0) {
      mergedOddsByMatchId[matchId] = nextBySource
    }
  }

  return mergedOddsByMatchId
}

async function ensureStateFile() {
  await fs.mkdir(path.dirname(stateFilePath), { recursive: true })

  try {
    await fs.access(stateFilePath)
  } catch {
    await fs.writeFile(stateFilePath, JSON.stringify(defaultState, null, 2), 'utf8')
  }
}

async function readState() {
  await ensureStateFile()
  const raw = await fs.readFile(stateFilePath, 'utf8')
  const savedState = { ...defaultState, ...JSON.parse(raw), availableSources: bookmakerSources, apiKeyConfigured: Boolean(runtimeOddsApiKey) }

  if (!runtimeOddsApiKey && savedState.marketStatus.includes('key accepted')) {
    savedState.marketStatus =
      'Betfair, Pinnacle and FanDuel are ready in the backend, but an Odds API key must be submitted before live odds can be downloaded.'
  }

  return savedState
}

async function writeState(state) {
  await ensureStateFile()
  await fs.writeFile(stateFilePath, JSON.stringify(state, null, 2), 'utf8')
}

async function ensureLiveStateFile() {
  await fs.mkdir(path.dirname(liveStateFilePath), { recursive: true })

  try {
    await fs.access(liveStateFilePath)
  } catch {
    await fs.writeFile(liveStateFilePath, JSON.stringify(defaultLiveState, null, 2), 'utf8')
  }
}

async function readLiveState() {
  await ensureLiveStateFile()
  const raw = await fs.readFile(liveStateFilePath, 'utf8')
  const savedState = JSON.parse(raw)

  return {
    ...defaultLiveState,
    ...savedState,
    providers: {
      apiFootball: {
        ...defaultLiveState.providers.apiFootball,
        ...(savedState.providers?.apiFootball ?? {}),
        configured: Boolean(runtimeApiFootballKey),
      },
      footballData: {
        ...defaultLiveState.providers.footballData,
        ...(savedState.providers?.footballData ?? {}),
        configured: Boolean(runtimeFootballDataKey),
      },
      theSportsDb: {
        ...defaultLiveState.providers.theSportsDb,
        ...(savedState.providers?.theSportsDb ?? {}),
        configured: true,
      },
      fifa: {
        ...defaultLiveState.providers.fifa,
        ...(savedState.providers?.fifa ?? {}),
        configured: Boolean(fifaBrowserExecutablePath),
      },
    },
  }
}

async function writeLiveState(state) {
  await ensureLiveStateFile()
  await fs.writeFile(liveStateFilePath, JSON.stringify(state, null, 2), 'utf8')
}

async function fetchOddsApiBookmakerMarkets(matches) {
  const apiKey = runtimeOddsApiKey

  if (!apiKey) {
    return {
      nextOddsByMatchId: {},
      status: 'Betfair, Pinnacle and FanDuel are ready in the backend, but an Odds API key must be submitted before live odds can be downloaded.',
      usage: undefined,
    }
  }

  const requestedBookmakers = Object.values(oddsApiBookmakerKeyBySource).join(',')
  const response = await fetch(
    `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds?apiKey=${apiKey}&regions=uk,eu,us&markets=h2h&oddsFormat=decimal&bookmakers=${requestedBookmakers}`,
  )

  if (!response.ok) {
    throw new Error(`The Odds API request failed with ${response.status}.`)
  }

  const usage = extractOddsApiUsage(response)
  const payload = await response.json()
  const nextOddsByMatchId = {}
  let matchedCount = 0

  for (const match of matches) {
    const homeCandidates = getTeamNameCandidates(match.homeTeam).map(normalizeParticipantName)
    const awayCandidates = getTeamNameCandidates(match.awayTeam).map(normalizeParticipantName)
    const kickoffTime = new Date(match.kickoffUtc).getTime()
    const matchedEvent = payload.find((event) => {
      const normalizedHome = normalizeParticipantName(event.home_team)
      const normalizedAway = normalizeParticipantName(event.away_team)
      const eventTime = new Date(event.commence_time).getTime()
      return homeCandidates.includes(normalizedHome) && awayCandidates.includes(normalizedAway) && Math.abs(eventTime - kickoffTime) <= 1000 * 60 * 60 * 24
    })

    if (!matchedEvent?.bookmakers) {
      continue
    }

    const nextMatchOdds = {}

    for (const bookmaker of matchedEvent.bookmakers) {
      const sourceKey = Object.entries(oddsApiBookmakerKeyBySource).find(([, value]) => value === bookmaker.key)?.[0]

      if (!sourceKey) {
        continue
      }

      const h2hMarket = bookmaker.markets?.find((market) => market.key === 'h2h')
      const homeOutcome = h2hMarket?.outcomes?.find((outcome) => normalizeParticipantName(outcome.name) === normalizeParticipantName(matchedEvent.home_team))
      const awayOutcome = h2hMarket?.outcomes?.find((outcome) => normalizeParticipantName(outcome.name) === normalizeParticipantName(matchedEvent.away_team))
      const drawOutcome = h2hMarket?.outcomes?.find((outcome) => normalizeParticipantName(outcome.name) === 'draw')

      if (!homeOutcome?.price || !awayOutcome?.price || !drawOutcome?.price) {
        continue
      }

      nextMatchOdds[sourceKey] = {
        sourceKey,
        sourceLabel: bookmakerSources.find((source) => source.key === sourceKey)?.label ?? sourceKey,
        homeOdds: roundTo(homeOutcome.price, 2),
        drawOdds: roundTo(drawOutcome.price, 2),
        awayOdds: roundTo(awayOutcome.price, 2),
        ...toFairProbabilities(homeOutcome.price, drawOutcome.price, awayOutcome.price),
        refreshedAt: bookmaker.last_update,
      }
    }

    if (Object.keys(nextMatchOdds).length > 0) {
      nextOddsByMatchId[match.id] = nextMatchOdds
      matchedCount += 1
    }
  }

  return {
    nextOddsByMatchId,
    usage,
    status:
      matchedCount > 0
        ? `Loaded bookmaker odds for ${matchedCount} matches from backend adapters for Betfair, Pinnacle and FanDuel.`
        : 'The Odds API responded, but no World Cup fixtures could be matched to the current schedule.',
  }
}

async function fetchOddsApiScores(matches) {
  const apiKey = runtimeOddsApiKey

  if (!apiKey) {
    return {
      actualResultsByMatchId: {},
      status: 'Real results and live scores need an Odds API key before they can be downloaded.',
      usage: undefined,
    }
  }

  const response = await fetch(
    `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/scores?apiKey=${apiKey}&daysFrom=3`,
  )

  if (!response.ok) {
    throw new Error(`The Odds API scores request failed with ${response.status}.`)
  }

  const usage = extractOddsApiUsage(response)
  const payload = await response.json()
  const actualResultsByMatchId = {}
  let matchedCount = 0
  let liveCount = 0
  let completedCount = 0

  for (const match of matches) {
    const homeCandidates = getTeamNameCandidates(match.homeTeam).map(normalizeParticipantName)
    const awayCandidates = getTeamNameCandidates(match.awayTeam).map(normalizeParticipantName)
    const kickoffTime = new Date(match.kickoffUtc).getTime()
    const matchedEvent = payload.find((event) => {
      const normalizedHome = normalizeParticipantName(event.home_team)
      const normalizedAway = normalizeParticipantName(event.away_team)
      const eventTime = new Date(event.commence_time).getTime()
      return (
        homeCandidates.includes(normalizedHome) &&
        awayCandidates.includes(normalizedAway) &&
        Math.abs(eventTime - kickoffTime) <= 1000 * 60 * 60 * 36
      )
    })

    if (!matchedEvent?.scores) {
      continue
    }

    const homeScore = matchedEvent.scores.find((score) => normalizeParticipantName(score.name) === normalizeParticipantName(matchedEvent.home_team))
    const awayScore = matchedEvent.scores.find((score) => normalizeParticipantName(score.name) === normalizeParticipantName(matchedEvent.away_team))

    if (homeScore?.score === undefined || awayScore?.score === undefined) {
      continue
    }

    const isCompleted = Boolean(matchedEvent.completed)
    const isLive = !isCompleted && isKickoffInsideLiveWindow(match.kickoffUtc)

    actualResultsByMatchId[match.id] = createActualResultSnapshot(
      Number(homeScore.score),
      Number(awayScore.score),
      'The Odds API scores',
      new Date().toISOString(),
      isCompleted
        ? `Completed score matched to ${matchedEvent.commence_time}.`
        : `Live score matched to ${matchedEvent.commence_time}.`,
      {
        isLive,
        isCompleted,
        displayLabel: isLive ? 'Live' : isCompleted ? 'Final' : 'Score',
      },
    )
    matchedCount += 1

    if (isLive) {
      liveCount += 1
    }

    if (isCompleted) {
      completedCount += 1
    }
  }

  return {
    actualResultsByMatchId,
    usage,
    status:
      matchedCount > 0
        ? `Loaded ${completedCount} final and ${liveCount} live score snapshot${matchedCount === 1 ? '' : 's'} from The Odds API scores.`
        : 'The Odds API scores endpoint responded, but no World Cup score snapshots matched the current schedule.',
  }
}

async function fetchPreferredScoreSnapshots(matches) {
  try {
    return await fetchFifaScoreSnapshots(matches)
  } catch (error) {
    const fifaMessage = error instanceof Error ? error.message : 'FIFA.com score provider failed.'

    try {
      const oddsApiResult = await fetchOddsApiScores(matches)

      return {
        ...oddsApiResult,
        status: `${fifaMessage} Falling back to The Odds API. ${oddsApiResult.status}`,
      }
    } catch (fallbackError) {
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'The Odds API score fallback failed.'

      return {
        actualResultsByMatchId: {},
        usage: undefined,
        status: `${fifaMessage} ${fallbackMessage}`,
      }
    }
  }
}

async function fetchStsBookmakerMarkets(matches) {
  const nextOddsByMatchId = {}
  const checkedKnownMarkets = []

  for (const match of matches) {
    const knownMarket = stsKnownMarkets.find(
      (market) => market.homeTeamId === match.homeTeam?.id && market.awayTeamId === match.awayTeam?.id,
    )

    if (!knownMarket) {
      continue
    }

    checkedKnownMarkets.push(knownMarket)

    try {
      const response = await fetch(knownMarket.url, {
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      })

      if (!response.ok) {
        throw new Error(`STS responded with ${response.status}`)
      }

      const html = await response.text()
      const parsedOdds = parseStsOneXTwoOdds(html)

      if (!parsedOdds) {
        throw new Error('STS page did not expose 1X2 odds in the expected format.')
      }

      nextOddsByMatchId[match.id] = {
        sts: createOddsSnapshot('sts', parsedOdds, new Date().toISOString(), `Fetched from ${knownMarket.url}`),
      }
    } catch {
      nextOddsByMatchId[match.id] = {
        sts: createOddsSnapshot('sts', knownMarket.fallbackOdds, new Date().toISOString(), `Fallback from mapped STS market ${knownMarket.url}`),
      }
    }
  }

  return {
    nextOddsByMatchId,
    status:
      Object.keys(nextOddsByMatchId).length > 0
        ? `Loaded STS odds for ${Object.keys(nextOddsByMatchId).length} mapped match${Object.keys(nextOddsByMatchId).length === 1 ? '' : 'es'}.`
        : checkedKnownMarkets.length > 0
          ? 'STS mapped markets were checked, but no odds were parsed.'
          : 'STS has no mapped market URL for the matches currently being refreshed.',
  }
}

const liveSearchTeamNames = {
  usa: 'United States',
  kor: 'South Korea',
  cze: 'Czech Republic',
  bih: 'Bosnia and Herzegovina',
  sco: 'Scotland',
  tur: 'Turkiye',
  cuw: 'Curacao',
  civ: 'Ivory Coast',
  cpv: 'Cape Verde',
  irq: 'Iraq',
  alg: 'Algeria',
  cod: 'DR Congo',
  eng: 'England',
}

const fifaTeamSlugById = {
  usa: 'usa',
  kor: 'korea-republic',
  cze: 'czechia',
  bih: 'bosnia-and-herzegovina',
  sco: 'scotland',
  tur: 'turkiye',
  cuw: 'curacao',
  civ: 'cote-divoire',
  cpv: 'cabo-verde',
  irq: 'iraq',
  alg: 'algeria',
  cod: 'congo-dr',
  rsa: 'south-africa',
  irn: 'iran',
  ecu: 'ecuador',
  ned: 'netherlands',
  ger: 'germany',
  por: 'portugal',
  nzl: 'new-zealand',
  mex: 'mexico',
} 

function createSlugFromTeamName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getFifaTeamSlug(team) {
  return fifaTeamSlugById[team.id] ?? createSlugFromTeamName(team.name)
}

function normalizePersonName(name) {
  return normalizeName(name)
    .replace(/\b([a-z])\.\s*/g, '$1 ')
}

function hasCompleteRoster(entry) {
  return (entry?.players?.length ?? 0) >= 23
}

async function fetchLiveFormFromTheSportsDb(team) {
  const searchName = liveSearchTeamNames[team.id] ?? team.name
  const teamResponse = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(searchName)}`)

  if (!teamResponse.ok) {
    return null
  }

  const teamPayload = await teamResponse.json()
  const selectedTeam =
    teamPayload.teams?.find(
      (candidate) =>
        candidate.strSport === 'Soccer' &&
        candidate.strGender === 'Male' &&
        candidate.strTeam &&
        candidate.idTeam &&
        candidate.strCountry?.toLowerCase() === team.name.toLowerCase(),
    ) ??
    teamPayload.teams?.find((candidate) => candidate.strSport === 'Soccer' && candidate.strGender === 'Male' && candidate.idTeam)

  if (!selectedTeam?.idTeam) {
    return null
  }

  const lastEventsResponse = await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${selectedTeam.idTeam}`)

  if (!lastEventsResponse.ok) {
    return null
  }

  const lastEventsPayload = await lastEventsResponse.json()
  const recentEvents = (lastEventsPayload.results ?? []).slice(0, 5)

  if (recentEvents.length === 0) {
    return null
  }

  let points = 0
  let goalsFor = 0
  let goalsAgainst = 0
  let cleanSheets = 0

  for (const event of recentEvents) {
    const homeScore = Number(event.intHomeScore ?? 0)
    const awayScore = Number(event.intAwayScore ?? 0)
    const isHome = normalizeName(event.strHomeTeam) === normalizeName(selectedTeam.strTeam)
    const teamGoals = isHome ? homeScore : awayScore
    const concededGoals = isHome ? awayScore : homeScore

    goalsFor += teamGoals
    goalsAgainst += concededGoals

    if (concededGoals === 0) {
      cleanSheets += 1
    }

    if (teamGoals > concededGoals) {
      points += 3
    } else if (teamGoals === concededGoals) {
      points += 1
    }
  }

  return {
    lastFivePointsPerMatch: roundTo(points / recentEvents.length, 2),
    goalsForPerMatch: roundTo(goalsFor / recentEvents.length, 2),
    goalsAgainstPerMatch: roundTo(goalsAgainst / recentEvents.length, 2),
    cleanSheetRate: roundTo(cleanSheets / recentEvents.length, 2),
    injuryBurden: 0,
    source: 'TheSportsDB recent results',
    refreshedAt: new Date().toISOString(),
    sampleSize: recentEvents.length,
  }
}

async function fetchTeamDirectoryFromTheSportsDb(team) {
  const searchName = liveSearchTeamNames[team.id] ?? team.name
  const teamResponse = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(searchName)}`)

  if (!teamResponse.ok) {
    return null
  }

  const teamPayload = await teamResponse.json()
  const selectedTeam =
    teamPayload.teams?.find(
      (candidate) =>
        candidate.strSport === 'Soccer' &&
        candidate.strGender === 'Male' &&
        candidate.strTeam &&
        candidate.idTeam &&
        candidate.strCountry?.toLowerCase() === team.name.toLowerCase(),
    ) ??
    teamPayload.teams?.find((candidate) => candidate.strSport === 'Soccer' && candidate.strGender === 'Male' && candidate.idTeam)

  if (!selectedTeam?.idTeam) {
    return null
  }

  const playersResponse = await fetch(`https://www.thesportsdb.com/api/v1/json/3/lookup_all_players.php?id=${selectedTeam.idTeam}`)

  if (!playersResponse.ok) {
    return null
  }

  const playersPayload = await playersResponse.json()
  const players = (playersPayload.player ?? [])
    .filter((player) => player.idPlayer && player.strPlayer)
    .filter((player) => !player.strTeam2 || normalizeName(player.strTeam2) === normalizeName(team.name))
    .map((player) => ({
      id: String(player.idPlayer),
      name: player.strPlayer,
      lastName: player.strLastName ?? undefined,
      number: player.strNumber ?? undefined,
      nationality: player.strNationality ?? undefined,
      club: player.strTeam ?? undefined,
      position: player.strPosition ?? undefined,
      age: calculateAge(player.dateBorn),
      dateOfBirth: player.dateBorn ?? undefined,
      height: player.strHeight ?? undefined,
      weight: player.strWeight ?? undefined,
      status: player.strStatus ?? undefined,
      playerRating: null,
      nationalTeamMatches: null,
      nationalTeamGoals: null,
      nationalTeamAssists: null,
      nationalTeamYellowCards: null,
      nationalTeamRedCards: null,
      tournamentStats: {
        matchesPlayed: null,
        minutesPlayed: null,
        goals: null,
        assists: null,
        fouls: null,
        yellowCards: null,
        redCards: null,
        unavailableNextMatch: false,
        injured: false,
      },
      thumbUrl: player.strThumb ?? undefined,
      cutoutUrl: player.strCutout ?? undefined,
    }))

  const coachName = extractCoachName(selectedTeam.strDescriptionEN)
  const staff = coachName ? [{ name: coachName, role: 'Head coach', nationality: team.name }] : []

  return {
    teamId: team.id,
    teamName: team.name,
    group: team.group,
    source: 'TheSportsDB public roster',
    refreshedAt: new Date().toISOString(),
    stadium: selectedTeam.strStadium ?? undefined,
    location: selectedTeam.strLocation ?? undefined,
    foundedYear: selectedTeam.intFormedYear ?? undefined,
    website: selectedTeam.strWebsite ?? undefined,
    description: selectedTeam.strDescriptionEN ?? undefined,
    staff,
    players,
  }
}

async function fetchTeamDirectoryFromApiFootball(team) {
  if (!runtimeApiFootballKey) {
    return null
  }

  const searchName = liveSearchTeamNames[team.id] ?? team.name
  const headers = {
    'x-apisports-key': runtimeApiFootballKey,
    accept: 'application/json',
  }

  const teamResponse = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(searchName)}`, { headers })

  if (!teamResponse.ok) {
    throw new Error(`API-Football team search failed with ${teamResponse.status}.`)
  }

  const teamPayload = await teamResponse.json()
  const selectedTeam =
    teamPayload.response?.find(
      (candidate) =>
        candidate.team?.national === true &&
        (
          normalizeName(candidate.team?.name) === normalizeName(team.name) ||
          normalizeName(candidate.team?.country) === normalizeName(team.name) ||
          normalizeName(candidate.team?.name).includes(normalizeName(team.name))
        ),
    ) ??
    teamPayload.response?.find((candidate) => candidate.team?.national === true)

  const apiFootballTeam = selectedTeam?.team
  const venue = selectedTeam?.venue

  if (!apiFootballTeam?.id) {
    return null
  }

  const [squadResponse, coachesResponse] = await Promise.all([
    fetch(`https://v3.football.api-sports.io/players/squads?team=${apiFootballTeam.id}`, { headers }),
    fetch(`https://v3.football.api-sports.io/coachs?team=${apiFootballTeam.id}`, { headers }).catch(() => null),
  ])

  if (!squadResponse.ok) {
    throw new Error(`API-Football squad request failed with ${squadResponse.status}.`)
  }

  const squadPayload = await squadResponse.json()
  const squadBlock = squadPayload.response?.[0]
  const players = (squadBlock?.players ?? []).map((player) => ({
    id: String(player.id ?? `${team.id}-${player.name}`),
    name: player.name,
    number: player.number ? String(player.number) : undefined,
    nationality: team.name,
    club: undefined,
    position: player.position ?? undefined,
    age: typeof player.age === 'number' ? player.age : null,
    dateOfBirth: undefined,
    height: undefined,
    weight: undefined,
    status: undefined,
    playerRating: null,
    nationalTeamMatches: null,
    nationalTeamGoals: null,
    nationalTeamAssists: null,
    nationalTeamYellowCards: null,
    nationalTeamRedCards: null,
    tournamentStats: {
      matchesPlayed: null,
      minutesPlayed: null,
      goals: null,
      assists: null,
      fouls: null,
      yellowCards: null,
      redCards: null,
      unavailableNextMatch: false,
      injured: false,
    },
    thumbUrl: player.photo ?? undefined,
    cutoutUrl: player.photo ?? undefined,
  }))

  let staff = []

  if (coachesResponse?.ok) {
    const coachesPayload = await coachesResponse.json()
    staff = (coachesPayload.response ?? []).map((coach) => ({
      name: coach.name,
      role: coach.job ?? 'Coach',
      nationality: coach.nationality ?? undefined,
    }))
  }

  return {
    teamId: team.id,
    teamName: team.name,
    group: team.group,
    source: 'API-Football squad',
    refreshedAt: new Date().toISOString(),
    stadium: venue?.name ?? undefined,
    location: [venue?.city, venue?.country].filter(Boolean).join(', ') || undefined,
    foundedYear: venue?.opened ? String(venue.opened) : undefined,
    website: undefined,
    description: `${apiFootballTeam.name} national-team profile loaded from API-Football.`,
    staff,
    players,
  }
}

async function fetchFootballDataWorldCupTeams() {
  if (!runtimeFootballDataKey) {
    return null
  }

  const response = await fetch('https://api.football-data.org/v4/competitions/WC/teams', {
    headers: {
      'X-Auth-Token': runtimeFootballDataKey,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`football-data.org World Cup teams request failed with ${response.status}.`)
  }

  const payload = await response.json()
  return payload.teams ?? []
}

function mapFootballDataTeamEntry(team, footballDataTeam) {
  if (!footballDataTeam) {
    return null
  }

  const players = (footballDataTeam.squad ?? [])
    .filter((person) => person.role === 'PLAYER' || !person.role)
    .map((player) => ({
      id: String(player.id ?? `${team.id}-${player.name}`),
      name: player.name,
      nationality: player.nationality ?? undefined,
      position: player.position ?? undefined,
      age: calculateAge(player.dateOfBirth),
      dateOfBirth: player.dateOfBirth ?? undefined,
      status: player.role ?? undefined,
      playerRating: null,
      nationalTeamMatches: null,
      nationalTeamGoals: null,
      nationalTeamAssists: null,
      nationalTeamYellowCards: null,
      nationalTeamRedCards: null,
      tournamentStats: {
        matchesPlayed: null,
        minutesPlayed: null,
        goals: null,
        assists: null,
        fouls: null,
        yellowCards: null,
        redCards: null,
        unavailableNextMatch: false,
        injured: false,
      },
    }))

  const staff = (footballDataTeam.squad ?? [])
    .filter((person) => person.role && person.role !== 'PLAYER')
    .map((person) => ({
      name: person.name,
      role: person.role,
      nationality: person.nationality ?? undefined,
    }))

  return {
    teamId: team.id,
    teamName: team.name,
    group: team.group,
    source: 'football-data.org World Cup team',
    refreshedAt: new Date().toISOString(),
    stadium: footballDataTeam.venue ?? undefined,
    location: footballDataTeam.area?.name ?? undefined,
    foundedYear: footballDataTeam.founded ? String(footballDataTeam.founded) : undefined,
    website: footballDataTeam.website ?? undefined,
    description: footballDataTeam.clubColors ? `Colours: ${footballDataTeam.clubColors}` : undefined,
    staff,
    players,
  }
}

async function getOrCreateFifaBrowser(existingBrowser) {
  if (existingBrowser) {
    return existingBrowser
  }

  if (!fifaBrowserExecutablePath) {
    return null
  }

  return puppeteer.launch({
    headless: 'new',
    executablePath: fifaBrowserExecutablePath,
    args: ['--no-sandbox'],
  })
}

function parseFifaScoreEntriesFromLines(lines) {
  const entries = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (line !== 'View groups' && line !== 'View brackets') {
      continue
    }

    const homeTeam = lines[index + 1]
    const secondToken = lines[index + 2]
    const thirdToken = lines[index + 3]
    const fourthToken = lines[index + 4]
    const fifthToken = lines[index + 5]
    const sixthToken = lines[index + 6]

    if (!homeTeam || !secondToken || !thirdToken) {
      continue
    }

    if (/^\d{1,2}:\d{2}$/.test(secondToken) && fifaMatchStageLabels.has(fourthToken)) {
      entries.push({
        homeTeam,
        awayTeam: thirdToken,
        status: 'SCHEDULED',
        stage: fourthToken,
      })
      continue
    }

    if (/^\d+$/.test(secondToken) && /^\d+$/.test(fourthToken) && fifaMatchStageLabels.has(sixthToken)) {
      entries.push({
        homeTeam,
        awayTeam: fifthToken,
        homeGoals: Number(secondToken),
        awayGoals: Number(fourthToken),
        status: thirdToken,
        stage: sixthToken,
      })
    }
  }

  return entries
}

async function fetchFifaScoreSnapshots(matches) {
  if (!fifaBrowserExecutablePath) {
    throw new Error('FIFA live score fallback is unavailable because no supported local browser executable was found.')
  }

  const browser = await getOrCreateFifaBrowser(null)

  if (!browser) {
    throw new Error('FIFA live score fallback could not start a local browser session.')
  }

  const page = await browser.newPage()

  try {
    await page.goto(
      'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures?country=&wtw-filter=ALL',
      { waitUntil: 'networkidle2', timeout: 120000 },
    )

    await page.waitForSelector('body', { timeout: 30000 })
    await page.waitForFunction(
      () => document.body.innerText.includes('Scores & Fixtures') && document.body.innerText.includes('View groups'),
      { timeout: 60000 },
    )

    const pageText = await page.evaluate(() => document.body.innerText)
    const lines = pageText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const fifaEntries = parseFifaScoreEntriesFromLines(lines)
    const actualResultsByMatchId = {}
    let matchedCount = 0
    let liveCount = 0
    let completedCount = 0

    for (const match of matches) {
      const homeCandidates = getTeamNameCandidates(match.homeTeam).map(normalizeParticipantName)
      const awayCandidates = getTeamNameCandidates(match.awayTeam).map(normalizeParticipantName)
      const matchedEntry = fifaEntries.find(
        (entry) =>
          homeCandidates.includes(normalizeParticipantName(entry.homeTeam)) &&
          awayCandidates.includes(normalizeParticipantName(entry.awayTeam)),
      )

      if (!matchedEntry || matchedEntry.homeGoals === undefined || matchedEntry.awayGoals === undefined) {
        continue
      }

      const normalizedStatus = String(matchedEntry.status ?? '').toUpperCase()
      const isLive = fifaLiveStatusLabels.has(normalizedStatus)
      const isCompleted = fifaCompletedStatusLabels.has(normalizedStatus)
      const displayLabel = isLive
        ? normalizedStatus === 'LIVE'
          ? 'Live'
          : normalizedStatus
        : isCompleted
          ? 'Final'
          : normalizedStatus || 'Score'

      actualResultsByMatchId[match.id] = createActualResultSnapshot(
        matchedEntry.homeGoals,
        matchedEntry.awayGoals,
        'FIFA.com scores & fixtures',
        new Date().toISOString(),
        `Score matched from FIFA.com ${matchedEntry.stage} listing.`,
        {
          isLive,
          isCompleted,
          displayLabel,
        },
      )

      matchedCount += 1
      if (isLive) {
        liveCount += 1
      }
      if (isCompleted) {
        completedCount += 1
      }
    }

    return {
      actualResultsByMatchId,
      usage: undefined,
      status:
        matchedCount > 0
          ? `Loaded ${completedCount} final and ${liveCount} live score snapshot${matchedCount === 1 ? '' : 's'} from FIFA.com scores & fixtures.`
          : 'FIFA.com scores & fixtures responded, but no World Cup score snapshots matched the current schedule.',
    }
  } finally {
    await page.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

async function fetchFifaSquadFallback(team, browser) {
  if (!browser) {
    return null
  }

  const page = await browser.newPage()

  try {
    await page.goto(
      `https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams/${getFifaTeamSlug(team)}/squad`,
      { waitUntil: 'networkidle2', timeout: 120000 },
    )

    const pageText = await page.evaluate(() => document.body.innerText)
    const lines = pageText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const sectionMap = {
      Goalkeeper: 'Goalkeeper',
      Defender: 'Defender',
      Midfielder: 'Midfielder',
      Forward: 'Forward',
      Manager: 'Manager',
    }

    const sectionLabels = Object.keys(sectionMap)
    const players = []
    const staff = []
    let currentSection = null

    for (let index = 0; index < lines.length - 1; index += 1) {
      const line = lines[index]

      if (sectionLabels.includes(line)) {
        currentSection = line
        continue
      }

      if (!currentSection) {
        continue
      }

      const nextLine = lines[index + 1]

      if (currentSection === 'Manager') {
        if (nextLine === 'MANAGER') {
          staff.push({
            name: line,
            role: 'Manager',
            nationality: team.name,
          })
          index += 1
        }

        continue
      }

      if (nextLine === currentSection.toUpperCase()) {
        players.push({
          id: `fifa-${team.id}-${normalizeName(line).replace(/\s+/g, '-')}`,
          name: line,
          nationality: team.name,
          position: sectionMap[currentSection],
          age: null,
          playerRating: null,
          nationalTeamMatches: null,
          nationalTeamGoals: null,
          nationalTeamAssists: null,
          nationalTeamYellowCards: null,
          nationalTeamRedCards: null,
          tournamentStats: {
            matchesPlayed: null,
            minutesPlayed: null,
            goals: null,
            assists: null,
            fouls: null,
            yellowCards: null,
            redCards: null,
            unavailableNextMatch: false,
            injured: false,
          },
        })
        index += 1
      }
    }

    if (players.length === 0) {
      return null
    }

    return {
      teamId: team.id,
      teamName: team.name,
      group: team.group,
      source: 'FIFA squad page fallback',
      refreshedAt: new Date().toISOString(),
      description: `Official squad fallback scraped from FIFA.com for ${team.name}.`,
      staff,
      players,
    }
  } finally {
    await page.close().catch(() => {})
  }
}

function mergeRosterEntries(baseEntry, fifaEntry) {
  if (!fifaEntry) {
    return baseEntry
  }

  if (!baseEntry) {
    return fifaEntry
  }

  const existingByName = new Map(
    (baseEntry.players ?? []).map((player) => [normalizePersonName(player.name), player]),
  )

  const mergedPlayers = []

  for (const fifaPlayer of fifaEntry.players ?? []) {
    const existingPlayer = existingByName.get(normalizePersonName(fifaPlayer.name))

    if (existingPlayer) {
      mergedPlayers.push({
        ...fifaPlayer,
        ...existingPlayer,
        position: existingPlayer.position ?? fifaPlayer.position,
      })
      existingByName.delete(normalizePersonName(fifaPlayer.name))
    } else {
      mergedPlayers.push(fifaPlayer)
    }
  }

  mergedPlayers.push(...existingByName.values())

  const existingStaffKeys = new Set((baseEntry.staff ?? []).map((member) => `${normalizePersonName(member.name)}-${member.role}`))
  const mergedStaff = [...(baseEntry.staff ?? [])]

  for (const fifaStaffMember of fifaEntry.staff ?? []) {
    const key = `${normalizePersonName(fifaStaffMember.name)}-${fifaStaffMember.role}`

    if (!existingStaffKeys.has(key)) {
      mergedStaff.push(fifaStaffMember)
    }
  }

  return {
    ...baseEntry,
    source:
      mergedPlayers.length > (baseEntry.players?.length ?? 0)
        ? `${baseEntry.source} + FIFA squad fallback`
        : baseEntry.source,
    refreshedAt: new Date().toISOString(),
    staff: mergedStaff,
    players: mergedPlayers,
  }
}

async function refreshLiveTeamData(teams, currentLiveState, mode = 'all') {
  const shouldRefreshForm = mode === 'all' || mode === 'form'
  const shouldRefreshTeams = mode === 'all' || mode === 'teams'
  let footballDataTeams = null
  let fifaBrowser = null
  const providerMessages = []

  try {
    if (shouldRefreshTeams) {
      footballDataTeams = await fetchFootballDataWorldCupTeams()
    }

    if (footballDataTeams) {
      providerMessages.push(`football-data.org returned ${footballDataTeams.length} World Cup team entries.`)
    }
  } catch (error) {
    providerMessages.push(error instanceof Error ? error.message : 'football-data.org provider failed.')
  }

  const nextLiveTeamFormById = { ...currentLiveState.liveTeamFormById }
  const nextTeamDirectoryById = { ...currentLiveState.teamDirectoryById }
  const providerStats = {
    apiFootball: 0,
    footballData: 0,
    theSportsDb: 0,
    fifa: 0,
  }

  try {
    for (const team of teams) {
      const existingDirectory = nextTeamDirectoryById[team.id]
      const existingForm = nextLiveTeamFormById[team.id]

      let liveForm = existingForm ?? null

      if (shouldRefreshForm) {
        try {
          liveForm = (await fetchLiveFormFromTheSportsDb(team)) ?? existingForm ?? null
        } catch {}
      }

      if (liveForm) {
        nextLiveTeamFormById[team.id] = liveForm
      }

      let directoryEntry = existingDirectory ?? null

      if (shouldRefreshTeams) {
        try {
          directoryEntry = await fetchTeamDirectoryFromApiFootball(team)
        } catch {}
      }

      if (shouldRefreshTeams && directoryEntry?.players?.length) {
        providerStats.apiFootball += 1
      }

      if (shouldRefreshTeams && (!directoryEntry || !hasCompleteRoster(directoryEntry)) && footballDataTeams) {
        const matchedFootballDataTeam =
          footballDataTeams.find(
            (candidate) =>
              normalizeName(candidate.area?.name) === normalizeName(team.name) ||
              normalizeName(candidate.name) === normalizeName(team.name) ||
              normalizeName(candidate.shortName) === normalizeName(team.name),
          ) ?? null

        const footballDataEntry = mapFootballDataTeamEntry(team, matchedFootballDataTeam)

        if (footballDataEntry && (footballDataEntry.players.length > 0 || footballDataEntry.staff.length > 0)) {
          providerStats.footballData += 1
          directoryEntry = directoryEntry ? mergeRosterEntries(directoryEntry, footballDataEntry) : footballDataEntry
        }
      }

      if (shouldRefreshTeams && (!directoryEntry || directoryEntry.players.length === 0)) {
        try {
          const sportsDbEntry = await fetchTeamDirectoryFromTheSportsDb(team)

          if (sportsDbEntry) {
            providerStats.theSportsDb += 1
            directoryEntry = sportsDbEntry
          }
        } catch {}
      }

      if (shouldRefreshTeams && !hasCompleteRoster(directoryEntry)) {
        try {
          fifaBrowser = await getOrCreateFifaBrowser(fifaBrowser)
          const fifaEntry = await fetchFifaSquadFallback(team, fifaBrowser)

          if (fifaEntry?.players?.length) {
            providerStats.fifa += 1
            directoryEntry = mergeRosterEntries(directoryEntry ?? existingDirectory ?? null, fifaEntry)
          }
        } catch (error) {
          providerMessages.push(error instanceof Error ? `FIFA fallback failed for ${team.name}: ${error.message}` : `FIFA fallback failed for ${team.name}.`)
        }
      }

      if (shouldRefreshTeams && directoryEntry) {
        nextTeamDirectoryById[team.id] = directoryEntry
      } else if (shouldRefreshTeams && existingDirectory) {
        nextTeamDirectoryById[team.id] = existingDirectory
      }
    }

    return {
      liveTeamFormById: nextLiveTeamFormById,
      teamDirectoryById: nextTeamDirectoryById,
      refreshStatus: [
        shouldRefreshForm
          ? `Recent-form snapshots were refreshed for the requested teams.`
          : 'Recent-form refresh was skipped in this pass.',
        shouldRefreshTeams
          ? `API-Football supplied ${providerStats.apiFootball} team roster${providerStats.apiFootball === 1 ? '' : 's'}.`
          : 'API-Football roster refresh was skipped in this pass.',
        shouldRefreshTeams
          ? `football-data.org supplied ${providerStats.footballData} team roster${providerStats.footballData === 1 ? '' : 's'}.`
          : 'football-data.org roster refresh was skipped in this pass.',
        shouldRefreshTeams
          ? `TheSportsDB supplied ${providerStats.theSportsDb} fallback roster${providerStats.theSportsDb === 1 ? '' : 's'}.`
          : 'TheSportsDB roster fallback was skipped in this pass.',
        shouldRefreshTeams
          ? `FIFA squad fallback supplemented ${providerStats.fifa} team roster${providerStats.fifa === 1 ? '' : 's'}.`
          : 'FIFA squad fallback was skipped in this pass.',
        ...providerMessages,
      ].join(' '),
    }
  } finally {
    if (fifaBrowser) {
      await fifaBrowser.close().catch(() => {})
    }
  }
}

let state = await readState()
let liveState = await readLiveState()

const app = express()
app.use(express.json({ limit: '1mb' }))

app.get('/api/market/state', async (_request, response) => {
  state = await readState()
  response.json(state)
})

app.get('/api/live/state', async (_request, response) => {
  liveState = await readLiveState()
  response.json(liveState)
})

app.post('/api/market/refresh', async (request, response) => {
  try {
    const matches = Array.isArray(request.body?.matches) ? request.body.matches : []
    const refreshableMatches = getRefreshableMatches(matches, state)
    const [oddsApiResult, stsResult, actualScoresResult] = await Promise.all([
      refreshableMatches.length > 0
        ? fetchOddsApiBookmakerMarkets(refreshableMatches)
        : Promise.resolve({
            nextOddsByMatchId: {},
            status: 'Preserved currently loaded bookmaker odds. No missing live markets needed a global refresh.',
            usage: undefined,
          }),
      refreshableMatches.length > 0
        ? fetchStsBookmakerMarkets(refreshableMatches)
        : Promise.resolve({
            nextOddsByMatchId: {},
            status: 'Preserved current STS odds. No missing mapped markets needed a global refresh.',
          }),
      fetchPreferredScoreSnapshots(matches).catch((error) => ({
        actualResultsByMatchId: {},
        status: error instanceof Error ? `Real results refresh failed: ${error.message}` : 'Real results refresh failed.',
        usage: undefined,
      })),
    ])

    const nextOddsByMatchId = mergeOddsByMatchId(
      mergeOddsByMatchId(state.oddsByMatchId, oddsApiResult.nextOddsByMatchId, 'missing'),
      stsResult.nextOddsByMatchId,
      'missing',
    )
    const nextActualResultsByMatchId = { ...state.actualResultsByMatchId, ...actualScoresResult.actualResultsByMatchId }

    state = {
      ...state,
      oddsByMatchId: nextOddsByMatchId,
      consensusByMatchId: buildConsensusByMatchId(nextOddsByMatchId, state.trustedSources),
      actualResultsByMatchId: nextActualResultsByMatchId,
      marketStatus: oddsApiResult.status,
      actualResultStatus: actualScoresResult.status,
      stsStatus: stsResult.status,
      latestRefreshAt: new Date().toISOString(),
      latestActualResultsRefreshAt: new Date().toISOString(),
      apiKeyConfigured: Boolean(runtimeOddsApiKey),
      oddsApiUsage: actualScoresResult.usage ?? oddsApiResult.usage,
    }

    await writeState(state)
    response.json(state)
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unknown market refresh error.',
    })
  }
})

app.post('/api/market/match/:matchId', async (request, response) => {
  try {
    const matchId = request.params.matchId
    const match = request.body?.match
    const mode = request.body?.mode === 'reload' ? 'reload' : 'missing'

    if (!match?.id || match.id !== matchId || !match.homeTeam || !match.awayTeam || !match.kickoffUtc) {
      response.status(400).json({ message: 'A valid match payload is required.' })
      return
    }

    state = await readState()

    if (isMatchCompleted(state, matchId)) {
      response.json({
        ...state,
        marketStatus: `Match ${matchId} already has a completed real result, so bookmaker odds were left unchanged.`,
      })
      return
    }

    const [oddsApiResult, stsResult] = await Promise.all([
      fetchOddsApiBookmakerMarkets([match]).catch((error) => ({
        nextOddsByMatchId: {},
        status: error instanceof Error ? error.message : 'Single-match odds refresh failed.',
        usage: undefined,
      })),
      fetchStsBookmakerMarkets([match]).catch(() => ({
        nextOddsByMatchId: {},
        status: 'STS single-match refresh failed.',
      })),
    ])

    const nextOddsByMatchId = mergeOddsByMatchId(
      mergeOddsByMatchId(state.oddsByMatchId, oddsApiResult.nextOddsByMatchId, mode),
      stsResult.nextOddsByMatchId,
      mode,
    )

    state = {
      ...state,
      oddsByMatchId: nextOddsByMatchId,
      consensusByMatchId: buildConsensusByMatchId(nextOddsByMatchId, state.trustedSources),
      marketStatus:
        mode === 'reload'
          ? `Reloaded bookmaker odds for Match ${matchId} when fresh data was available. Existing values were preserved for any sources that still returned no data.`
          : `Loaded missing bookmaker odds for Match ${matchId}. Existing displayed values were preserved.`,
      stsStatus: stsResult.status,
      latestRefreshAt: new Date().toISOString(),
      apiKeyConfigured: Boolean(runtimeOddsApiKey),
      oddsApiUsage: oddsApiResult.usage ?? state.oddsApiUsage,
    }

    await writeState(state)
    response.json(state)
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unknown single-match market refresh error.',
    })
  }
})

app.post('/api/market/api-key', async (request, response) => {
  const apiKey = typeof request.body?.apiKey === 'string' ? request.body.apiKey.trim() : ''

  if (apiKey.length < 12) {
    response.status(400).json({ message: 'The Odds API key looks too short.' })
    return
  }

  runtimeOddsApiKey = apiKey
  state = {
    ...state,
    apiKeyConfigured: true,
    marketStatus: 'Odds API key accepted for this backend session. Run refresh to download market odds.',
  }

  await writeState({ ...state, apiKeyConfigured: true })
  response.json(state)
})

app.post('/api/market/usage', async (_request, response) => {
  if (!runtimeOddsApiKey) {
    response.status(400).json({ message: 'Odds API key is missing.' })
    return
  }

  try {
    const usageResponse = await fetch(`https://api.the-odds-api.com/v4/sports?apiKey=${runtimeOddsApiKey}`)

    if (!usageResponse.ok) {
      throw new Error(`The Odds API usage request failed with ${usageResponse.status}.`)
    }

    state = {
      ...state,
      apiKeyConfigured: true,
      oddsApiUsage: extractOddsApiUsage(usageResponse),
      marketStatus: 'Odds API credits refreshed without downloading match odds.',
    }

    await writeState(state)
    response.json(state)
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unknown Odds API usage refresh error.',
    })
  }
})

app.post('/api/market/slots/:slotKey', async (request, response) => {
  const slotKey = request.params.slotKey
  const sourceKey = request.body?.sourceKey

  if (!['broker1', 'broker2', 'broker3'].includes(slotKey)) {
    response.status(400).json({ message: 'Unsupported broker slot.' })
    return
  }

  if (!bookmakerSources.some((source) => source.key === sourceKey)) {
    response.status(400).json({ message: 'Unsupported bookmaker source.' })
    return
  }

  state = {
    ...state,
    brokerSlots: {
      ...state.brokerSlots,
      [slotKey]: sourceKey,
    },
  }

  await writeState(state)
  response.json(state)
})

app.post('/api/market/reset', async (_request, response) => {
  state = {
    ...defaultState,
    availableSources: bookmakerSources,
    apiKeyConfigured: Boolean(runtimeOddsApiKey),
    marketStatus: runtimeOddsApiKey
      ? 'Market odds were cleared from local backend storage. Run refresh when you want to download them again.'
      : defaultState.marketStatus,
  }

  await writeState(state)
  response.json(state)
})

app.post('/api/live/provider/:providerKey/api-key', async (request, response) => {
  const providerKey = request.params.providerKey
  const apiKey = typeof request.body?.apiKey === 'string' ? request.body.apiKey.trim() : ''

  if (apiKey.length < 8) {
    response.status(400).json({ message: 'The provider key looks too short.' })
    return
  }

  liveState = await readLiveState()

  if (providerKey === 'api-football') {
    runtimeApiFootballKey = apiKey
    liveState = {
      ...liveState,
      providers: {
        ...liveState.providers,
        apiFootball: {
          ...liveState.providers.apiFootball,
          configured: true,
          status: 'API-Football key accepted for this backend session. Refresh live data to load richer squads.',
        },
      },
    }
  } else if (providerKey === 'football-data') {
    runtimeFootballDataKey = apiKey
    liveState = {
      ...liveState,
      providers: {
        ...liveState.providers,
        footballData: {
          ...liveState.providers.footballData,
          configured: true,
          status: 'football-data.org key accepted for this backend session.',
        },
      },
    }
  } else {
    response.status(400).json({ message: 'Unsupported live-data provider.' })
    return
  }

  await writeLiveState(liveState)
  response.json(liveState)
})

app.post('/api/live/refresh', async (request, response) => {
  try {
    const teams = Array.isArray(request.body?.teams) ? request.body.teams : []
    const mode = request.body?.mode === 'form' || request.body?.mode === 'teams' || request.body?.mode === 'all'
      ? request.body.mode
      : 'all'

    if (teams.length === 0) {
      response.status(400).json({ message: 'A teams payload is required for live-data refresh.' })
      return
    }

    liveState = await readLiveState()
    const refreshed = await refreshLiveTeamData(teams, liveState, mode)

    liveState = {
      ...liveState,
      liveTeamFormById: refreshed.liveTeamFormById,
      teamDirectoryById: refreshed.teamDirectoryById,
      latestRefreshAt: new Date().toISOString(),
      refreshStatus: refreshed.refreshStatus,
      providers: {
        ...liveState.providers,
        apiFootball: {
          ...liveState.providers.apiFootball,
          configured: Boolean(runtimeApiFootballKey),
          status: runtimeApiFootballKey
            ? 'API-Football is active and used as the primary squad provider.'
            : liveState.providers.apiFootball.status,
        },
        footballData: {
          ...liveState.providers.footballData,
          configured: Boolean(runtimeFootballDataKey),
          status: runtimeFootballDataKey
            ? 'football-data.org is active as a secondary tournament-data provider.'
            : liveState.providers.footballData.status,
        },
        theSportsDb: {
          ...liveState.providers.theSportsDb,
          status: 'TheSportsDB remains enabled as the public fallback provider.',
        },
        fifa: {
          ...liveState.providers.fifa,
          configured: Boolean(fifaBrowserExecutablePath),
          status: fifaBrowserExecutablePath
            ? 'FIFA.com squad-page fallback is active for incomplete rosters.'
            : liveState.providers.fifa.status,
        },
      },
    }

    await writeLiveState(liveState)
    response.json(liveState)
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : 'Unknown live-data refresh error.',
    })
  }
})

app.post('/api/live/reset', async (_request, response) => {
  liveState = {
    ...defaultLiveState,
    providers: {
      apiFootball: {
        ...defaultLiveState.providers.apiFootball,
        configured: Boolean(runtimeApiFootballKey),
        status: runtimeApiFootballKey
          ? 'API-Football key is still configured for this backend session.'
          : defaultLiveState.providers.apiFootball.status,
      },
      footballData: {
        ...defaultLiveState.providers.footballData,
        configured: Boolean(runtimeFootballDataKey),
        status: runtimeFootballDataKey
          ? 'football-data.org key is still configured for this backend session.'
          : defaultLiveState.providers.footballData.status,
      },
      theSportsDb: {
        ...defaultLiveState.providers.theSportsDb,
      },
      fifa: {
        ...defaultLiveState.providers.fifa,
        configured: Boolean(fifaBrowserExecutablePath),
        status: fifaBrowserExecutablePath
          ? 'FIFA squad-page fallback is still available in this backend session.'
          : defaultLiveState.providers.fifa.status,
      },
    },
  }

  await writeLiveState(liveState)
  response.json(liveState)
})

app.listen(port, () => {
  console.log(`Market backend listening on http://localhost:${port}`)
})
