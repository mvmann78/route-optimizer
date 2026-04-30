import type { Coordinate, Stop, RouteOptions, RouteResult, RouteStep } from '../types'
import { solveTSP, solveTSPWithPins } from './tsp'

const ORS_DIRECT = 'https://api.openrouteservice.org'
const ORS_PROXY  = '/api/ors'

// When apiKey is empty the serverless proxy at /api/ors injects the key server-side.
// When apiKey is provided (local dev) we call ORS directly.
function endpoint(path: string, apiKey: string): string {
  return `${apiKey ? ORS_DIRECT : ORS_PROXY}/${path}`
}

function postHeaders(apiKey: string): Record<string, string> {
  return apiKey
    ? { Authorization: apiKey, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

// ORS step type integers for left turns
const LEFT_TURN_TYPES = new Set([0, 2, 4])

function toORS(c: Coordinate): [number, number] {
  return [c.lng, c.lat]
}

// ORS returns [lng, lat]; Leaflet wants [lat, lng]
function orsToLeaflet(coords: [number, number][]): [number, number][] {
  return coords.map(([lng, lat]) => [lat, lng])
}

export async function geocodeAddress(address: string, apiKey = ''): Promise<Coordinate> {
  const params = new URLSearchParams({
    text: address,
    size: '1',
    'focus.point.lat': '38.97',
    'focus.point.lon': '-77.03',
    'boundary.country': 'USA',
  })
  if (apiKey) params.set('api_key', apiKey)
  const url = `${endpoint('geocode/search', apiKey)}?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 403) throw new Error('Invalid API key')
    throw new Error(`Geocoding failed (${res.status})`)
  }
  const data = await res.json() as { features: Array<{ geometry: { coordinates: [number, number] } }> }
  if (!data.features?.length) throw new Error('Address not found')
  const [lng, lat] = data.features[0].geometry.coordinates
  return { lat, lng }
}

async function getMatrix(
  coords: Coordinate[],
  apiKey: string,
  metric: 'distance' | 'duration'
): Promise<number[][]> {
  const res = await fetch(endpoint('v2/matrix/driving-car', apiKey), {
    method: 'POST',
    headers: postHeaders(apiKey),
    body: JSON.stringify({ locations: coords.map(toORS), metrics: [metric] }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `Matrix API failed (${res.status})`)
  }
  const data = await res.json() as { distances: number[][]; durations: number[][] }
  const raw = metric === 'distance' ? data.distances : data.durations
  // Replace null (unreachable routes) with a large penalty so TSP skips them
  return raw.map(row => row.map(v => (v == null || !isFinite(v)) ? 1e9 : v))
}

type DirectionRoute = {
  geometry: [number, number][]
  steps: RouteStep[]
  distance: number
  duration: number
}

async function getDirections(
  coords: Coordinate[],
  options: Pick<RouteOptions, 'avoidHighways' | 'avoidTolls'>,
  apiKey: string,
  wantAlternatives: boolean
): Promise<DirectionRoute[]> {
  const avoidFeatures: string[] = []
  if (options.avoidHighways) avoidFeatures.push('highways')
  if (options.avoidTolls) avoidFeatures.push('tollways')

  const body: Record<string, unknown> = {
    coordinates: coords.map(toORS),
    instructions: true,
  }
  if (avoidFeatures.length) body.options = { avoid_features: avoidFeatures }
  if (wantAlternatives) {
    body.alternative_routes = { target_count: 3, weight_factor: 1.4, share_factor: 0.6 }
  }

  const res = await fetch(endpoint('v2/directions/driving-car/geojson', apiKey), {
    method: 'POST',
    headers: postHeaders(apiKey),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `Directions API failed (${res.status})`)
  }

  type ORSFeature = {
    geometry: { coordinates: [number, number][] }
    properties: {
      summary: { distance: number; duration: number }
      segments: Array<{
        steps: Array<{ type: number; instruction: string; distance: number; duration: number }>
      }>
    }
  }

  const data = await res.json() as { features: ORSFeature[] }

  return data.features.map(f => ({
    geometry: orsToLeaflet(f.geometry.coordinates),
    steps: f.properties.segments.flatMap(seg =>
      seg.steps.map(s => ({
        type: s.type,
        instruction: s.instruction,
        distance: s.distance,
        duration: s.duration,
      }))
    ),
    distance: f.properties.summary.distance,
    duration: f.properties.summary.duration,
  }))
}

// Fetch directions for a manually specified stop order (used after drag-reorder).
export async function getRouteForOrder(
  orderedStops: Stop[],
  options: Pick<RouteOptions, 'avoidHighways' | 'avoidTolls' | 'returnToStart'>,
  apiKey: string
): Promise<Omit<RouteResult, 'orderedStops'>> {
  const coords = orderedStops.map(s => s.coordinate!)
  const allCoords = [
    ...coords,
    ...(options.returnToStart ? [coords[0]] : []),
  ]
  const routes = await getDirections(allCoords, options, apiKey, false)
  const route = routes[0]
  const leftTurnCount = route.steps.filter(s => LEFT_TURN_TYPES.has(s.type)).length
  return {
    steps: route.steps,
    totalDistance: route.distance,
    totalDuration: route.duration,
    leftTurnCount,
    geometry: route.geometry,
  }
}

async function optimizeWithVroom(
  stops: Stop[],
  options: RouteOptions,
  apiKey: string
): Promise<RouteResult> {
  const coords = stops.map(s => s.coordinate!)

  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)
  const midnight = Math.floor(todayMidnight.getTime() / 1000)

  // stop[0] is the vehicle start; stop[n-1] is the vehicle end when fixedEnd is set
  const lastFixed = options.fixedEnd && !options.returnToStart
  const jobStops = lastFixed ? stops.slice(1, -1) : stops.slice(1)

  const jobs = jobStops.map((stop, i) => {
    // id = original index in stops[] (jobStops[i] === stops[i+1] for non-lastFixed,
    // and stops[i+1] for lastFixed as well — slice(1,-1) keeps the same 1-based indexing)
    const job: Record<string, unknown> = { id: i + 1, location: toORS(stop.coordinate!) }
    if (stop.timeWindow) {
      const [eh, em] = stop.timeWindow.earliest.split(':').map(Number)
      const [lh, lm] = stop.timeWindow.latest.split(':').map(Number)
      job.time_windows = [[midnight + eh * 3600 + em * 60, midnight + lh * 3600 + lm * 60]]
    }
    return job
  })

  const vehicle: Record<string, unknown> = {
    id: 1,
    profile: 'driving-car',
    start: toORS(coords[0]),
  }
  if (options.returnToStart) vehicle.end = toORS(coords[0])
  else if (lastFixed) vehicle.end = toORS(coords[coords.length - 1])

  const res = await fetch(endpoint('optimization', apiKey), {
    method: 'POST',
    headers: postHeaders(apiKey),
    body: JSON.stringify({ jobs, vehicles: [vehicle] }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? `Optimization API failed (${res.status})`)
  }

  type VroomRoute = { steps: Array<{ type: string; id?: number }> }
  const data = await res.json() as { routes?: VroomRoute[]; unassigned?: unknown[] }

  if (!data.routes?.length) {
    throw new Error('No route found — check that time windows are feasible')
  }

  const orderedIds = data.routes[0].steps
    .filter(s => s.type === 'job')
    .map(s => s.id!)

  // Job ids are 1-indexed into stops[1..], so stops[id] maps directly
  const orderedStops = [
    stops[0],
    ...orderedIds.map(id => stops[id]),
    ...(lastFixed ? [stops[stops.length - 1]] : []),
  ]
  const orderedCoords = [
    ...orderedStops.map(s => s.coordinate!),
    ...(options.returnToStart ? [coords[0]] : []),
  ]

  const routes = await getDirections(orderedCoords, options, apiKey, false)
  const route = routes[0]
  const leftTurnCount = route.steps.filter(s => LEFT_TURN_TYPES.has(s.type)).length

  return {
    orderedStops,
    steps: route.steps,
    totalDistance: route.distance,
    totalDuration: route.duration,
    leftTurnCount,
    geometry: route.geometry,
  }
}

// Build pinnedSlots from stops for use with the constrained TSP.
// Returns null and an error string if there are conflicting pins.
function buildPinnedSlots(
  stops: Stop[],
  fixedEnd: boolean
): { slots: Map<number, number>; error: string | null } {
  const n = stops.length
  const maxPos = fixedEnd ? n - 1 : n // user positions 2..maxPos are valid
  const slots = new Map<number, number>()

  for (let i = 1; i < n; i++) {
    const p = stops[i].pinnedPosition
    if (p == null) continue
    if (p < 2 || p > maxPos) {
      return { slots, error: `Pin position ${p} is out of range (2–${maxPos}).` }
    }
    const routeIdx = p - 1 // 0-based
    if (slots.has(routeIdx)) {
      return { slots, error: `Two stops are pinned to the same position (${p}).` }
    }
    slots.set(routeIdx, i)
  }
  return { slots, error: null }
}

export async function optimizeRoute(
  stops: Stop[],
  options: RouteOptions,
  apiKey: string
): Promise<RouteResult> {
  const coords = stops.map(s => s.coordinate!)
  const hasTimeWindows = stops.some(s => s.timeWindow)
  const hasPins = stops.some(s => s.pinnedPosition != null)

  // When pins are set, use constrained TSP (ignores Vroom/time-window optimization)
  if (hasPins) {
    const { slots, error } = buildPinnedSlots(stops, options.fixedEnd && !options.returnToStart)
    if (error) throw new Error(error)

    const metric = options.mode === 'distance' ? 'distance' : 'duration'
    const matrix = await getMatrix(coords, apiKey, metric)
    const order = solveTSPWithPins(matrix, options.returnToStart, options.fixedEnd && !options.returnToStart, slots)
    const orderedStops = order.map(i => stops[i])
    const orderedCoords = [
      ...order.map(i => coords[i]),
      ...(options.returnToStart ? [coords[order[0]]] : []),
    ]
    const routes = await getDirections(orderedCoords, options, apiKey, false)
    const route = routes[0]
    const leftTurnCount = route.steps.filter(s => LEFT_TURN_TYPES.has(s.type)).length
    return {
      orderedStops,
      steps: route.steps,
      totalDistance: route.distance,
      totalDuration: route.duration,
      leftTurnCount,
      geometry: route.geometry,
    }
  }

  // Delegate to Vroom when time windows are present (except left-turns mode)
  if (hasTimeWindows && options.mode !== 'left-turns') {
    return optimizeWithVroom(stops, options, apiKey)
  }

  // TSP-based optimization
  const metric = options.mode === 'distance' ? 'distance' : 'duration'
  const matrix = await getMatrix(coords, apiKey, metric)
  const order = solveTSP(matrix, options.returnToStart, options.fixedEnd)
  const orderedStops = order.map(i => stops[i])
  const orderedCoords = [
    ...order.map(i => coords[i]),
    ...(options.returnToStart ? [coords[order[0]]] : []),
  ]

  const wantAlternatives = options.mode === 'left-turns'
  const routes = await getDirections(orderedCoords, options, apiKey, wantAlternatives)

  // For left-turns mode, pick the alternative route with fewest left turns
  let chosen = routes[0]
  if (wantAlternatives && routes.length > 1) {
    let minLeft = Infinity
    for (const r of routes) {
      const cnt = r.steps.filter(s => LEFT_TURN_TYPES.has(s.type)).length
      if (cnt < minLeft) { minLeft = cnt; chosen = r }
    }
  }

  const leftTurnCount = chosen.steps.filter(s => LEFT_TURN_TYPES.has(s.type)).length

  return {
    orderedStops,
    steps: chosen.steps,
    totalDistance: chosen.distance,
    totalDuration: chosen.duration,
    leftTurnCount,
    geometry: chosen.geometry,
  }
}
