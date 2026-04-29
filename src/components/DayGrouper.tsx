import { useState } from 'react'
import type { Stop, StopGroup } from '../types'
import { GROUP_COLORS } from '../types'
import { clusterStops } from '../services/clustering'
import StopList from './StopList'
import MapView from './MapView'

interface Props { apiKey: string }

export default function DayGrouper({ apiKey }: Props) {
  const [stops, setStops] = useState<Stop[]>([])
  const [groupSize, setGroupSize] = useState(5)
  const [groups, setGroups] = useState<StopGroup[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const readyStops = stops.filter(s => s.geocoding === 'done' && s.coordinate)

  const handleGroup = () => {
    if (readyStops.length < 2) { setError('Add at least 2 geocoded addresses.'); return }
    setError(null)
    const points = readyStops.map(s => s.coordinate!)
    const clusters = clusterStops(points, groupSize)
    const newGroups: StopGroup[] = clusters.map((indices, i) => ({
      stops: indices.map(idx => readyStops[idx]),
      color: GROUP_COLORS[i % GROUP_COLORS.length],
    }))
    setGroups(newGroups)
  }

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-96 flex-none flex flex-col h-full border-r border-slate-200 bg-white overflow-y-auto">
        <div className="p-4 space-y-5">

          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Stops</h2>
            <p className="text-xs text-slate-400 mb-2">
              Add up to ~20 stops. They'll be sorted into geographically grouped same-day routes.
            </p>
            <StopList stops={stops} onChange={setStops} apiKey={apiKey} />
          </section>

          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Stops per group (target)
            </h2>
            <div className="flex gap-1.5">
              {[3, 4, 5, 6, 7].map(n => (
                <button
                  key={n}
                  onClick={() => setGroupSize(n)}
                  className={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    groupSize === n
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-500'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </section>

          <button
            onClick={handleGroup}
            disabled={readyStops.length < 2}
            className="w-full py-2.5 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {`Group ${readyStops.length > 0 ? `${readyStops.length} Stops` : 'Stops'}`}
          </button>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        {groups && (
          <div className="border-t border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">
              {groups.length} Day{groups.length !== 1 ? 's' : ''}
              <span className="font-normal text-slate-400 ml-1">({readyStops.length} stops total)</span>
            </h2>

            {groups.map((group, gi) => (
              <div key={gi} className="rounded-lg overflow-hidden border border-slate-200">
                <div
                  className="px-3 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: group.color }}
                >
                  Day {gi + 1} — {group.stops.length} stop{group.stops.length !== 1 ? 's' : ''}
                </div>
                <ol className="divide-y divide-slate-100 bg-white">
                  {group.stops.map((stop, si) => (
                    <li key={stop.id} className="px-3 py-1.5 flex gap-2 text-xs text-slate-700">
                      <span className="text-slate-400 flex-shrink-0">{si + 1}.</span>
                      <span>{stop.address}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 h-full">
        <MapView
          stops={stops}
          groups={groups ?? undefined}
        />
      </div>
    </div>
  )
}
