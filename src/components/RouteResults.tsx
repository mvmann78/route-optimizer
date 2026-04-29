import type { RouteResult } from '../types'

const LEFT_TURN_TYPES = new Set([0, 2, 4])

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m} min`
}

function fmtDistance(meters: number): string {
  const miles = meters / 1609.344
  return `${miles.toFixed(1)} mi`
}

interface Props { result: RouteResult }

export default function RouteResults({ result }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-700">Route Summary</h2>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { value: fmtDistance(result.totalDistance), label: 'Distance' },
          { value: fmtDuration(result.totalDuration), label: 'Est. time' },
          { value: String(result.leftTurnCount), label: 'Left turns' },
        ].map(({ value, label }) => (
          <div key={label} className="bg-slate-50 rounded-lg p-3">
            <div className="text-base font-bold text-slate-800">{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Stop Order
        </h3>
        <ol className="space-y-1">
          {result.orderedStops.map((stop, i) => (
            <li key={stop.id} className="flex items-start gap-2 text-sm">
              <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                {i + 1}
              </span>
              <span className="text-slate-700">{stop.address}</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Turn-by-Turn
        </h3>
        <ol className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
          {result.steps.map((step, i) => {
            const isLeft = LEFT_TURN_TYPES.has(step.type)
            return (
              <li
                key={i}
                className={`flex items-start gap-1.5 text-xs py-1 border-b border-slate-100 last:border-0 ${
                  isLeft ? 'text-amber-700' : 'text-slate-600'
                }`}
              >
                <span className="w-3 flex-shrink-0 font-bold">{isLeft ? '←' : ''}</span>
                <span className="flex-1">{step.instruction}</span>
                <span className="text-slate-400 flex-shrink-0 ml-1">
                  {fmtDistance(step.distance)}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
