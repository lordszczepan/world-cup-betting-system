import express from 'express'
import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const stateFilePath = path.join(__dirname, 'data', 'market-state.json')
const port = Number(process.env.BACKEND_PORT ?? 8787)
let runtimeOddsApiKey = process.env.THE_ODDS_API_KEY ?? ''

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
  actualResultStatus: 'Real match results will appear here after completed fixtures are available.',
  stsStatus: 'STS backend adapter is ready for mapped match URLs.',
  latestRefreshAt: undefined,
  latestActualResultsRefreshAt: undefined,
  apiKeyConfigured: Boolean(runtimeOddsApiKey),
  oddsApiUsage: undefined,
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

function normalizeParticipantName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
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

function createActualResultSnapshot(homeGoals, awayGoals, sourceLabel, refreshedAt, note) {
  return {
    homeGoals,
    awayGoals,
    sourceLabel,
    refreshedAt,
    note,
  }
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

async function fetchOddsApiCompletedScores(matches) {
  const apiKey = runtimeOddsApiKey

  if (!apiKey) {
    return {
      actualResultsByMatchId: {},
      status: 'Real results need an Odds API key before completed scores can be downloaded.',
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

  for (const match of matches) {
    const homeCandidates = getTeamNameCandidates(match.homeTeam).map(normalizeParticipantName)
    const awayCandidates = getTeamNameCandidates(match.awayTeam).map(normalizeParticipantName)
    const kickoffTime = new Date(match.kickoffUtc).getTime()
    const matchedEvent = payload.find((event) => {
      const normalizedHome = normalizeParticipantName(event.home_team)
      const normalizedAway = normalizeParticipantName(event.away_team)
      const eventTime = new Date(event.commence_time).getTime()
      return (
        event.completed &&
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

    actualResultsByMatchId[match.id] = createActualResultSnapshot(
      Number(homeScore.score),
      Number(awayScore.score),
      'The Odds API scores',
      new Date().toISOString(),
      `Completed score matched to ${matchedEvent.commence_time}.`,
    )
    matchedCount += 1
  }

  return {
    actualResultsByMatchId,
    usage,
    status:
      matchedCount > 0
        ? `Loaded real completed results for ${matchedCount} match${matchedCount === 1 ? '' : 'es'} from The Odds API scores.`
        : 'The Odds API scores endpoint responded, but no completed World Cup fixtures matched the current schedule.',
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

let state = await readState()

const app = express()
app.use(express.json({ limit: '1mb' }))

app.get('/api/market/state', async (_request, response) => {
  state = await readState()
  response.json(state)
})

app.post('/api/market/refresh', async (request, response) => {
  try {
    const matches = Array.isArray(request.body?.matches) ? request.body.matches : []
    const [oddsApiResult, stsResult, actualScoresResult] = await Promise.all([
      fetchOddsApiBookmakerMarkets(matches),
      fetchStsBookmakerMarkets(matches),
      fetchOddsApiCompletedScores(matches).catch((error) => ({
        actualResultsByMatchId: {},
        status: error instanceof Error ? `Real results refresh failed: ${error.message}` : 'Real results refresh failed.',
        usage: undefined,
      })),
    ])

    const nextOddsByMatchId = { ...state.oddsByMatchId }
    const nextActualResultsByMatchId = { ...state.actualResultsByMatchId, ...actualScoresResult.actualResultsByMatchId }

    for (const [matchId, value] of Object.entries(oddsApiResult.nextOddsByMatchId)) {
      nextOddsByMatchId[matchId] = { ...(nextOddsByMatchId[matchId] ?? {}), ...value }
    }

    for (const [matchId, value] of Object.entries(stsResult.nextOddsByMatchId)) {
      nextOddsByMatchId[matchId] = { ...(nextOddsByMatchId[matchId] ?? {}), ...value }
    }

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

app.listen(port, () => {
  console.log(`Market backend listening on http://localhost:${port}`)
})
