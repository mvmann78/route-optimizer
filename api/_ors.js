const ORS_BASE = 'https://api.openrouteservice.org'

export async function proxyGet(orsPath, req, res) {
  const apiKey = process.env.ORS_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ORS_API_KEY not set' })

  const params = new URLSearchParams()
  for (const [key, val] of Object.entries(req.query)) {
    if (Array.isArray(val)) val.forEach(v => params.append(key, v))
    else if (val) params.set(key, val)
  }
  params.set('api_key', apiKey)

  const orsRes = await fetch(`${ORS_BASE}/${orsPath}?${params}`)
  const data = await orsRes.json()
  res.status(orsRes.status).json(data)
}

export async function proxyPost(orsPath, req, res) {
  const apiKey = process.env.ORS_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ORS_API_KEY not set' })

  const orsRes = await fetch(`${ORS_BASE}/${orsPath}`, {
    method: 'POST',
    headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  })
  const data = await orsRes.json()
  res.status(orsRes.status).json(data)
}
