export default async function handler(req, res) {
  const apiKey = process.env.ORS_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ORS_API_KEY environment variable is not set on this server.' })
  }

  const pathParts = Array.isArray(req.query.path) ? req.query.path : [req.query.path ?? '']
  const orsPath = pathParts.join('/')
  const isGeocode = orsPath.startsWith('geocode')

  const params = new URLSearchParams()
  for (const [key, val] of Object.entries(req.query)) {
    if (key === 'path') continue
    if (Array.isArray(val)) val.forEach(v => params.append(key, v))
    else if (val) params.set(key, val)
  }
  if (isGeocode) params.set('api_key', apiKey)

  const qs = params.toString()
  const targetUrl = `https://api.openrouteservice.org/${orsPath}${qs ? `?${qs}` : ''}`

  const headers = { 'Content-Type': 'application/json' }
  if (!isGeocode) headers['Authorization'] = apiKey

  const init = { method: req.method ?? 'GET', headers }
  if (req.method === 'POST' && req.body) {
    init.body = JSON.stringify(req.body)
  }

  const orsRes = await fetch(targetUrl, init)
  const data = await orsRes.json()
  res.status(orsRes.status).json(data)
}
