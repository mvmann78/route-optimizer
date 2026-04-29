interface Point { lat: number; lng: number }

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2)
}

function centroid(pts: Point[]): Point {
  if (!pts.length) return { lat: 0, lng: 0 }
  return {
    lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
    lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length,
  }
}

function kmeans(points: Point[], k: number, maxIter = 100): number[] {
  const n = points.length

  // k-means++ initialization
  const centers: Point[] = [points[Math.floor(Math.random() * n)]]
  while (centers.length < k) {
    const dists = points.map(p => Math.min(...centers.map(c => dist(p, c))))
    const total = dists.reduce((a, b) => a + b, 0)
    let r = Math.random() * total
    let chosen = points[n - 1]
    for (let i = 0; i < n; i++) {
      r -= dists[i]
      if (r <= 0) { chosen = points[i]; break }
    }
    centers.push(chosen)
  }

  let assignments = new Array(n).fill(0) as number[]

  for (let iter = 0; iter < maxIter; iter++) {
    const next = points.map(p => {
      let best = 0, bestD = Infinity
      centers.forEach((c, i) => {
        const d = dist(p, c)
        if (d < bestD) { bestD = d; best = i }
      })
      return best
    })

    for (let i = 0; i < k; i++) {
      const pts = points.filter((_, j) => next[j] === i)
      if (pts.length) centers[i] = centroid(pts)
    }

    if (next.every((v, i) => v === assignments[i])) break
    assignments = next
  }

  return assignments
}

export function clusterStops(points: Point[], targetSize: number): number[][] {
  const n = points.length
  if (n === 0) return []
  const k = Math.max(1, Math.ceil(n / targetSize))
  if (k === 1) return [Array.from({ length: n }, (_, i) => i)]

  let best: number[][] = []
  let bestImbalance = Infinity

  for (let attempt = 0; attempt < 15; attempt++) {
    const assignments = kmeans(points, k)
    const groups: number[][] = Array.from({ length: k }, () => [])
    assignments.forEach((c, i) => groups[c].push(i))
    const filtered = groups.filter(g => g.length > 0)
    const sizes = filtered.map(g => g.length)
    const imbalance = Math.max(...sizes) - Math.min(...sizes)
    if (imbalance < bestImbalance) {
      bestImbalance = imbalance
      best = filtered
    }
  }

  return best
}
