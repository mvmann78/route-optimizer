import { useState } from 'react'
import type { Stop, OptimizationMode, RouteResult } from '../types'
import { optimizeRoute } from '../services/ors'
import StopList from './StopList'
import MapView from './MapView'
import RouteResults from './RouteResults'

interface Props { apiKey: string }

export default function RouteOptimizer({ apiKey }: Props) {
  const [stops, setStops] = useState<Stop[]>([])
  const [mode, setMode] = useState<OptimizationMode>('time')
  const [avoidHighways, setAvoidHighways] = useState(false)
  const [avoidTolls, setAvoidTolls] = useState(false)
  const [returnToStart, setReturnToStart] = useState(false)
  const [fixedEnd, setFixedEnd] = useState(false)
  const [result, setResult] = useState<RouteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const readyStops = stops.filter(s => s.geocoding === 'done' && s.coordinate)

  const handleOptimize = async () => {
    if (readyStops.length < 2) { setError('Add at least 2 geocoded addresses.'); return }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await optimizeRoute(readyStops, { mode, avoidHighways, avoidTolls, returnToStart, fixedEnd }, apiKey)
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const hasTimeWindows = stops.some(s => s.timeWindow)

  const openInGoogleMaps = () => {
    if (!result) return
    const { orderedStops } = result
    const fmt = (s: Stop) => `${s.coordinate!.lat},${s.coordinate!.lng}`
    const origin = fmt(orderedStops[0])
    const destination = fmt(orderedStops[orderedStops.length - 1])
    const waypoints = orderedStops.slice(1, -1).map(fmt).join('|')
    const params = new URLSearchParams({ api: '1', origin, destination, travelmode: 'driving' })
    if (waypoints) params.set('waypoints', waypoints)
    window.open(`https://www.google.com/maps/dir/?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-96 flex-none flex flex-col h-full border-r border-slate-200 bg-white overflow-y-auto">
        <div className="p-4 space-y-5">

          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Stops</h2>
            <StopList stops={stops} onChange={setStops} apiKey={apiKey} showTimeWindows fixedEnd={fixedEnd} />
            {readyStops.length > 0 && stops.length > readyStops.length && (
              <p className="text-xs text-amber-600 mt-2">
                {stops.length - readyStops.length} stop(s) not yet geocoded and will be skipped.
              </p>
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Optimize for</h2>
            <div className="space-y-1.5">
              {([
                ['time', 'Minimize travel time'],
                ['distance', 'Minimize distance'],
                ['left-turns', 'Minimize left turns'],
              ] as [OptimizationMode, string][]).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value={value}
                    checked={mode === value}
                    onChange={() => setMode(value)}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
            {mode === 'left-turns' && (
              <p className="text-xs text-slate-400 bg-slate-50 rounded p-2 mt-2">
                Fetches up to 3 alternative routes and picks the one with fewest left turns.
              </p>
            )}
            {mode === 'left-turns' && hasTimeWindows && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded p-2 mt-1">
                ⚠ Time windows are ignored in left-turns mode.
              </p>
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Avoid</h2>
            <div className="space-y-1.5">
              {([
                [avoidHighways, setAvoidHighways, 'Highways'] as const,
                [avoidTolls, setAvoidTolls, 'Toll roads'] as const,
              ]).map(([val, setter, label]) => (
                <label key={label} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={e => setter(e.target.checked)}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Endpoints</h2>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={returnToStart}
                  onChange={e => { setReturnToStart(e.target.checked); if (e.target.checked) setFixedEnd(false) }}
                  className="accent-blue-500"
                />
                <span className="text-sm text-slate-700">Return to start</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fixedEnd}
                  onChange={e => { setFixedEnd(e.target.checked); if (e.target.checked) setReturnToStart(false) }}
                  className="accent-blue-500"
                />
                <span className="text-sm text-slate-700">Fix last stop as endpoint</span>
              </label>
            </div>
          </section>

          <button
            onClick={() => void handleOptimize()}
            disabled={loading || readyStops.length < 2}
            className="w-full py-2.5 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Optimizing…' : `Optimize ${readyStops.length > 0 ? `${readyStops.length} Stops` : 'Route'}`}
          </button>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        {result && (
          <div className="border-t border-slate-200 p-4 space-y-3">
            <button
              onClick={openInGoogleMaps}
              className="w-full py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
              Open in Google Maps
            </button>
            <RouteResults result={result} />
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 h-full">
        <MapView
          stops={stops}
          routeGeometry={result?.geometry}
          orderedStops={result?.orderedStops}
        />
      </div>
    </div>
  )
}
