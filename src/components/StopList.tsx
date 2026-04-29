import { Fragment } from 'react'
import type { Stop, Coordinate } from '../types'
import { geocodeAddress } from '../services/ors'
import AddressInput from './AddressInput'

interface Props {
  stops: Stop[]
  onChange: (stops: Stop[]) => void
  apiKey: string
  showTimeWindows?: boolean
  fixedEnd?: boolean
}

export default function StopList({ stops, onChange, apiKey, showTimeWindows = false, fixedEnd = false }: Props) {
  const addStop = () => {
    const newStop: Stop = { id: crypto.randomUUID(), address: '', geocoding: 'idle' }
    if (fixedEnd && stops.length >= 2) {
      // Insert before the fixed End stop, not at the tail
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
    if (!apiKey) { alert('Enter your ORS API key in the header first.'); return }
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

  const toggleTimeWindow = (stop: Stop) => {
    update(stop.id, {
      timeWindow: stop.timeWindow ? undefined : { earliest: '08:00', latest: '17:00' },
    })
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
        return (
          <Fragment key={stop.id}>
            {isEnd && addStopButton}
            <div className={`bg-white border rounded-lg p-3 shadow-sm ${
              isStart ? 'border-blue-300' : isEnd ? 'border-green-300' : 'border-slate-200'
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

                {showTimeWindows && (
                  <button
                    onClick={() => toggleTimeWindow(stop)}
                    title="Toggle arrival time window"
                    className={`text-sm px-1.5 py-0.5 rounded border transition-colors flex-shrink-0 ${
                      stop.timeWindow
                        ? 'border-blue-400 text-blue-500 bg-blue-50'
                        : 'border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    ⏰
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

              {showTimeWindows && stop.timeWindow && (
                <div className="mt-2 ml-14 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Arrive between</span>
                  <input
                    type="time"
                    value={stop.timeWindow.earliest}
                    onChange={e => update(stop.id, { timeWindow: { ...stop.timeWindow!, earliest: e.target.value } })}
                    className="border border-slate-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-blue-400"
                  />
                  <span className="text-xs text-slate-500">and</span>
                  <input
                    type="time"
                    value={stop.timeWindow.latest}
                    onChange={e => update(stop.id, { timeWindow: { ...stop.timeWindow!, latest: e.target.value } })}
                    className="border border-slate-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-blue-400"
                  />
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
