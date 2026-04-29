import { useState, useRef, useEffect } from 'react'
import type { Coordinate } from '../types'

interface Suggestion {
  label: string
  coordinate: Coordinate
}

interface Props {
  value: string
  onChangeText: (text: string) => void
  onSelect: (label: string, coord: Coordinate) => void
  onManualSearch: () => void
  apiKey: string
  placeholder?: string
  disabled?: boolean
}

export default function AddressInput({
  value, onChangeText, onSelect, onManualSearch, apiKey, placeholder, disabled
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [fetching, setFetching] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const fetchSuggestions = (text: string) => {
    clearTimeout(timerRef.current)
    if (text.length < 3) { setSuggestions([]); setOpen(false); return }
    timerRef.current = setTimeout(async () => {
      setFetching(true)
      try {
        const base = apiKey ? 'https://api.openrouteservice.org' : '/api/ors'
        const params = new URLSearchParams({ text, size: '6' })
        if (apiKey) params.set('api_key', apiKey)
        const url = `${base}/geocode/autocomplete?${params.toString()}`
        const res = await fetch(url)
        if (!res.ok) return
        type Feature = { properties: { label: string }; geometry: { coordinates: [number, number] } }
        const data = await res.json() as { features: Feature[] }
        const s = data.features.map(f => ({
          label: f.properties.label,
          coordinate: { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] },
        }))
        setSuggestions(s)
        setOpen(s.length > 0)
      } finally {
        setFetching(false)
      }
    }, 300)
  }

  const handleChange = (text: string) => {
    onChangeText(text)
    fetchSuggestions(text)
  }

  const handleSelect = (s: Suggestion) => {
    onSelect(s.label, s.coordinate)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { setOpen(false); onManualSearch() }
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'ArrowDown' && open) {
            // Focus first suggestion via keyboard — skip for now, mouse-click works
          }
        }}
        onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
        placeholder={placeholder ?? 'Enter address…'}
        className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
      />

      {fetching && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-400 select-none">
          …
        </span>
      )}

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={i}
              // mousedown fires before blur; preventDefault keeps input focused
              onMouseDown={e => { e.preventDefault(); handleSelect(s) }}
              className="px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer border-b border-slate-100 last:border-0 leading-snug"
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
