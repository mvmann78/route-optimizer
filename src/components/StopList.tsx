import { Fragment, useState } from 'react'
import type { Stop, Coordinate } from '../types'
import { geocodeAddress } from '../services/ors'
import AddressInput from './AddressInput'

interface Props {
  stops: Stop[]
  onChange: (stops: Stop[]) => void
  apiKey: string
  fixedEnd?: boolean
}

function PinIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`w-3.5 h-3.5 ${active ? 'text-indigo-500' : 'text-slate-400'}`}
      fill="currentColor"
    >
      <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z"/>
    </svg>
  )
}

export default function StopList({ stops, onChange, apiKey, fixedEnd = false }: Props) {
  const [pinningId, setPinningId] = useState<string | null>(null)
  const [pinInput, setPinInput] = useState('')

  const addStop = () => {
    const newStop: Stop = { id: crypto.randomUUID(), address: '', geocoding: 'idle' }
    if (fixedEnd && stops.length >= 2) {
      const copy = [...stops]
      copy.splice(copy.length - 1, 0, newStop)
      onChange(copy)
    } else {
      onChange([...stops, newStop])
    }
  }

  const removeStop = (id: string) => onChange(stops.filter(s => s.id !== id))

  const update = (id: string, patch: Partial<Stop>) =>
    onChange(stops.map(s => s.id === id ? { ...s, ...patch } : s))

  const geocode = async (stop: Stop) => {
    if (!stop.address.trim() || stop.geocoding === 'done') return
    update(stop.id, { geocoding: 'loading' })
    try {
      const coordinate = await geocodeAddress(stop.address, apiKey)
      update(stop.id, { coordinate, geocoding: 'done' })
    } catch {
      update(stop.id, { geocoding: 'error' })
    }
  }

  const handleSelect = (stop: Stop, label: string, coord: Coordinate) => {
    update(stop.id, { address: label, coordinate: coord, geocoding: 'done' })
  }

  // Compute the valid pin range based on how many stops there are
  const readyCount = stops.filter(s => s.geocoding === 'done' && s.coordinate).length
  const minPin = 2
  const maxPin = fixedEnd ? readyCount - 1 : readyCount

  const startPinInput = (stop: Stop) => {
    setPinningId(stop.id)
    setPinInput(stop.pinnedPosition != null ? String(stop.pinnedPosition) : '')
  }

  const commitPin = (stop: Stop) => {
    const val = parseInt(pinInput, 10)
    if (!isNaN(val) && val >= minPin && val <= maxPin) {
      update(stop.id, { pinnedPosition: val })
    }
    setPinningId(null)
    setPinInput('')
  }

  const removePin = (stop: Stop) => {
    update(stop.id, { pinnedPosition: undefined })
    setPinningId(null)
    setPinInput('')
  }

  const addStopButton = (
    <button
      onClick={addStop}
      className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
    >
      + Add Stop
    </button>
  )

  return (
    <div className="space-y-2">
      {stops.map((stop, i) => {
        const isStart = i === 0
        const isEnd = fixedEnd && i === stops.length - 1 && stops.length > 1
        const isPinnable = !isStart && !isEnd
        const isPinned = isPinnable && stop.pinnedPosition != null
        const isPinning = pinningId === stop.id

        return (
          <Fragment key={stop.id}>
            {isEnd && addStopButton}
            <div className={`bg-white border rounded-lg p-3 shadow-sm ${
              isStart ? 'border-blue-300' : isEnd ? 'border-green-300' : isPinned ? 'border-indigo-200' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                {isStart ? (
                  <span className="text-xs font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded flex-shrink-0">
                    Start
                  </span>
                ) : isEnd ? (
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex-shrink-0">
                    End
                  </span>
                ) : isPinned ? (
                  <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap">
                    #{stop.pinnedPosition}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-400 w-5 text-center flex-shrink-0 select-none">
                    {i + 1}
                  </span>
                )}

                <AddressInput
                  value={stop.address}
                  onChangeText={text => update(stop.id, { address: text, geocoding: 'idle', coordinate: undefined })}
                  onSelect={(label, coord) => handleSelect(stop, label, coord)}
                  onManualSearch={() => void geocode(stop)}
                  apiKey={apiKey}
                  placeholder={isStart ? 'Starting address…' : isEnd ? 'Ending address…' : 'Enter address…'}
                />

                <span className="text-base w-5 text-center flex-shrink-0">
                  {stop.geocoding === 'loading' && <span className="text-blue-400 text-xs animate-pulse">⌛</span>}
                  {stop.geocoding === 'done' && <span className="text-green-500">✓</span>}
                  {stop.geocoding === 'error' && <span className="text-red-400" title="Address not found">✗</span>}
                </span>

                {/* Pin button for middle stops */}
                {isPinnable && !isPinning && (
                  <button
                    onClick={() => isPinned ? removePin(stop) : startPinInput(stop)}
                    title={isPinned ? `Pinned to position ${stop.pinnedPosition} — click to remove` : 'Pin to a fixed position'}
                    className={`flex-shrink-0 p-1 rounded border transition-colors ${
                      isPinned
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-500'
                        : 'border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-400'
                    }`}
                  >
                    <PinIcon active={isPinned} />
                  </button>
                )}

                {!isStart && !isEnd && (
                  <button
                    onClick={() => removeStop(stop.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors text-xl leading-none flex-shrink-0"
                    title="Remove stop"
                  >
                    ×
                  </button>
                )}

                {(isStart || isEnd) && <span className="w-5 flex-shrink-0" />}
              </div>

              {/* Inline pin position input */}
              {isPinning && (
                <div className="mt-2 ml-8 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Pin to stop #</span>
                  <input
                    type="number"
                    min={minPin}
                    max={maxPin}
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitPin(stop)
                      if (e.key === 'Escape') { setPinningId(null); setPinInput('') }
                    }}
                    onBlur={() => commitPin(stop)}
                    autoFocus
                    className="w-16 border border-indigo-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder={`${minPin}–${maxPin}`}
                  />
                  <span className="text-xs text-slate-400">in optimized route</span>
                  <button
                    onMouseDown={e => { e.preventDefault(); setPinningId(null); setPinInput('') }}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    cancel
                  </button>
                </div>
              )}

            </div>
          </Fragment>
        )
      })}

      {!fixedEnd || stops.length < 2 ? addStopButton : null}
    </div>
  )
}
