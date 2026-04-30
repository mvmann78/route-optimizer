import { useState } from 'react'
import type { RouteResult, Stop } from '../types'

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

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
      <circle cx="5" cy="4" r="1.3" /><circle cx="11" cy="4" r="1.3" />
      <circle cx="5" cy="8" r="1.3" /><circle cx="11" cy="8" r="1.3" />
      <circle cx="5" cy="12" r="1.3" /><circle cx="11" cy="12" r="1.3" />
    </svg>
  )
}

interface Props {
  result: RouteResult
  fixedEnd?: boolean
  isManuallyOrdered?: boolean
  onReorder?: (newOrderedStops: Stop[]) => void
}

export default function RouteResults({ result, fixedEnd = false, isManuallyOrdered = false, onReorder }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const { orderedStops } = result
  const n = orderedStops.length

  // Start is always locked. End is locked when fixedEnd.
  const isLocked = (i: number) => i === 0 || (fixedEnd && i === n - 1)

  const handleDragStart = (i: number) => { setDragIdx(i) }

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (!isLocked(i)) setDragOverIdx(i)
  }

  const handleDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i || isLocked(i)) {
      setDragIdx(null); setDragOverIdx(null); return
    }
    const newStops = [...orderedStops]
    const [moved] = newStops.splice(dragIdx, 1)
    newStops.splice(i, 0, moved)
    onReorder?.(newStops)
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Route Summary</h2>
        {isManuallyOrdered && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
            Manually ordered
          </span>
        )}
      </div>

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
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Stop Order
          </h3>
          {onReorder && (
            <span className="text-xs text-slate-400">drag to reorder</span>
          )}
        </div>
        <ol className="space-y-1">
          {orderedStops.map((stop, i) => {
            const locked = isLocked(i)
            const isDragging = dragIdx === i
            const isOver = dragOverIdx === i && dragIdx !== null && dragIdx !== i
            return (
              <li
                key={stop.id}
                draggable={!locked && !!onReorder}
                onDragStart={() => handleDragStart(i)}
                onDragOver={e => handleDragOver(e, i)}
                onDrop={e => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 text-sm rounded px-1 py-0.5 transition-colors ${
                  isDragging ? 'opacity-40' : ''
                } ${isOver ? 'bg-blue-50 ring-1 ring-blue-300' : ''} ${
                  !locked && onReorder ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
              >
                {!locked && onReorder ? (
                  <span className="flex-shrink-0 text-slate-300"><GripIcon /></span>
                ) : (
                  <span className="flex-shrink-0 w-4" />
                )}
                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  locked && i === 0
                    ? 'bg-blue-500 text-white'
                    : locked
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-500 text-white'
                }`}>
                  {i + 1}
                </span>
                <span className="text-slate-700 flex-1 min-w-0 truncate">{stop.address}</span>
              </li>
            )
          })}
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
