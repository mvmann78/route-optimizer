import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Stop, StopGroup } from '../types'

function createIcon(label: string, color: string, textColor = 'white') {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;
      background:${color};
      border:2.5px solid white;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:700;
      color:${textColor};
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      font-family:system-ui,sans-serif;
    ">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    tooltipAnchor: [16, 0],
  })
}

function FitBounds({ stops }: { stops: Stop[] }) {
  const map = useMap()
  const key = stops
    .filter(s => s.coordinate)
    .map(s => `${s.coordinate!.lat},${s.coordinate!.lng}`)
    .join('|')

  useEffect(() => {
    const valid = stops.filter(s => s.coordinate)
    if (!valid.length) return
    if (valid.length === 1) {
      map.setView([valid[0].coordinate!.lat, valid[0].coordinate!.lng], 13)
    } else {
      const bounds = L.latLngBounds(valid.map(s => [s.coordinate!.lat, s.coordinate!.lng]))
      map.fitBounds(bounds, { padding: [48, 48] })
    }
  }, [key, map]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

interface Props {
  stops: Stop[]
  routeGeometry?: [number, number][]
  orderedStops?: Stop[]
  groups?: StopGroup[]
}

export default function MapView({ stops, routeGeometry, orderedStops, groups }: Props) {
  const allStops = groups ? groups.flatMap(g => g.stops) : (orderedStops ?? stops)

  return (
    <MapContainer
      center={[39.5, -98.35]}
      zoom={4}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <FitBounds stops={allStops.filter(s => s.coordinate)} />

      {/* Route optimized — numbered blue markers */}
      {!groups && orderedStops && orderedStops.filter(s => s.coordinate).map((stop, i) => (
        <Marker
          key={stop.id}
          position={[stop.coordinate!.lat, stop.coordinate!.lng]}
          icon={createIcon(String(i + 1), '#3b82f6')}
        >
          <Tooltip>{stop.address}</Tooltip>
        </Marker>
      ))}

      {/* Pre-optimization — grey markers in input order */}
      {!groups && !orderedStops && stops.filter(s => s.coordinate).map((stop, i) => (
        <Marker
          key={stop.id}
          position={[stop.coordinate!.lat, stop.coordinate!.lng]}
          icon={createIcon(String(i + 1), '#64748b')}
        >
          <Tooltip>{stop.address}</Tooltip>
        </Marker>
      ))}

      {/* Route line */}
      {routeGeometry && routeGeometry.length > 1 && (
        <Polyline
          positions={routeGeometry}
          pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8 }}
        />
      )}

      {/* Day grouper — colored markers by group */}
      {groups && groups.map((group, gi) =>
        group.stops.filter(s => s.coordinate).map((stop, si) => (
          <Marker
            key={stop.id}
            position={[stop.coordinate!.lat, stop.coordinate!.lng]}
            icon={createIcon(String(si + 1), group.color)}
          >
            <Tooltip>
              <span className="font-semibold">Day {gi + 1} · Stop {si + 1}</span>
              <br />
              {stop.address}
            </Tooltip>
          </Marker>
        ))
      )}
    </MapContainer>
  )
}
