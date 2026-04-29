function nearestNeighbor(matrix: number[][], start: number): number[] {
  const n = matrix.length
  const visited = new Array(n).fill(false) as boolean[]
  const route = [start]
  visited[start] = true
  for (let i = 1; i < n; i++) {
    const cur = route[route.length - 1]
    let nearest = -1, minVal = Infinity
    for (let j = 0; j < n; j++) {
      if (!visited[j] && matrix[cur][j] < minVal) { nearest = j; minVal = matrix[cur][j] }
    }
    visited[nearest] = true
    route.push(nearest)
  }
  return route
}

function routeCost(matrix: number[][], route: number[]): number {
  let cost = 0
  for (let i = 0; i < route.length - 1; i++) cost += matrix[route[i]][route[i + 1]]
  return cost
}

// closed=true includes the return edge (last→first) in cost calculations
function twoOpt(matrix: number[][], route: number[], closed: boolean): number[] {
  const n = route.length
  let best = [...route]
  let improved = true
  while (improved) {
    improved = false
    // For open path: j < n-1 (no wrap-around return edge)
    // For closed path: j < n (includes return edge via modulo)
    const jLimit = closed ? n : n - 1
    for (let i = 0; i < n - 2; i++) {
      for (let j = i + 2; j < jLimit; j++) {
        const a = best[i], b = best[i + 1], c = best[j]
        const d = closed ? best[(j + 1) % n] : best[j + 1]
        const before = matrix[a][b] + matrix[c][d]
        const after = matrix[a][c] + matrix[b][d]
        if (after < before - 1e-10) {
          const next = [...best]
          let l = i + 1, r = j
          while (l < r) { [next[l], next[r]] = [next[r], next[l]]; l++; r-- }
          best = next
          improved = true
        }
      }
    }
  }
  return best
}

// Like nearestNeighbor but reserves endIdx for the very last position
function nearestNeighborFixedEnd(matrix: number[][], start: number, endIdx: number): number[] {
  const n = matrix.length
  const visited = new Array(n).fill(false) as boolean[]
  const route = [start]
  visited[start] = true
  visited[endIdx] = true // reserved — will be appended last
  for (let i = 1; i < n - 1; i++) {
    const cur = route[route.length - 1]
    let nearest = -1, minVal = Infinity
    for (let j = 0; j < n; j++) {
      if (!visited[j] && matrix[cur][j] < minVal) { nearest = j; minVal = matrix[cur][j] }
    }
    if (nearest === -1) break
    visited[nearest] = true
    route.push(nearest)
  }
  route.push(endIdx)
  return route
}

export function solveTSP(matrix: number[][], returnToStart = false, fixedEnd = false): number[] {
  const n = matrix.length
  if (n <= 1) return [0]
  if (n === 2) return [0, 1]
  // open-path 2-opt never reverses the last position, so fixedEnd is automatically preserved
  const initial = fixedEnd
    ? nearestNeighborFixedEnd(matrix, 0, n - 1)
    : nearestNeighbor(matrix, 0)
  return twoOpt(matrix, initial, returnToStart)
}

export { routeCost }
