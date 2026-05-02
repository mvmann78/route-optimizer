export interface Coordinate {
  lat: number
  lng: number
}

export interface Stop {
  id: string
  address: string
  coordinate?: Coordinate
  geocoding: 'idle' | 'loading' | 'done' | 'error'
  pinnedPosition?: number // 1-indexed position in optimized route (1 = start); set by user
}

export type OptimizationMode = 'time' | 'distance' | 'left-turns'

export interface RouteOptions {
  mode: OptimizationMode
  avoidHighways: boolean
  avoidTolls: boolean
  returnToStart: boolean
  fixedEnd: boolean
}

export interface RouteStep {
  type: number        // ORS maneuver type integer
  instruction: string
  distance: number    // meters
  duration: number    // seconds
}

export interface RouteResult {
  orderedStops: Stop[]
  steps: RouteStep[]
  totalDistance: number // meters
  totalDuration: number // seconds
  leftTurnCount: number
  geometry: [number, number][] // [lat, lng] pairs for Leaflet
}

export interface StopGroup {
  stops: Stop[]
  color: string
}

export const GROUP_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
]
