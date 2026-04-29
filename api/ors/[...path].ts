import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.ORS_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ORS_API_KEY environment variable is not set on this server.' })
  }

  // Reconstruct the ORS path from Vercel's catch-all segment
  const pathParts = Array.isArray(req.query.path) ? req.query.path : [req.query.path ?? '']
  const orsPath = pathParts.join('/')
  const isGeocode = orsPath.startsWith('geocode')

  // Forward all query params except Vercel's internal 'path' param
  const params = new URLSearchParams()
  for (const [key, val] of Object.entries(req.query)) {
    if (key === 'path') continue
    if (Array.isArray(val)) val.forEach(v => params.append(key, v))
    else if (val) params.set(key, val)
  }
  // Geocode/autocomplete endpoints authenticate via query param; v2/optimization use a header
  if (isGeocode) params.set('api_key', apiKey)

  const qs = params.toString()
  const targetUrl = `https://api.openrouteservice.org/${orsPath}${qs ? `?${qs}` : ''}`

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (!isGeocode) headers['Authorization'] = apiKey

  const init: RequestInit = { method: req.method ?? 'GET', headers }
  if (req.method === 'POST' && req.body) {
    init.body = JSON.stringify(req.body)
  }

  const orsRes = await fetch(targetUrl, init)
  const data = await orsRes.json()
  res.status(orsRes.status).json(data)
}
