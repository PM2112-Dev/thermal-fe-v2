export interface PolygonPoint { x: number; y: number }
const EPS = 1e-10
const same = (a: PolygonPoint, b: PolygonPoint) => Math.abs(a.x - b.x) <= EPS && Math.abs(a.y - b.y) <= EPS
const cross = (a: PolygonPoint, b: PolygonPoint, c: PolygonPoint) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
const onSegment = (a: PolygonPoint, b: PolygonPoint, p: PolygonPoint) => Math.abs(cross(a, b, p)) <= EPS &&
  p.x >= Math.min(a.x, b.x) - EPS && p.x <= Math.max(a.x, b.x) + EPS &&
  p.y >= Math.min(a.y, b.y) - EPS && p.y <= Math.max(a.y, b.y) + EPS

function intersects(a: PolygonPoint, b: PolygonPoint, c: PolygonPoint, d: PolygonPoint) {
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b)
  return (((abC > EPS && abD < -EPS) || (abC < -EPS && abD > EPS)) &&
    ((cdA > EPS && cdB < -EPS) || (cdA < -EPS && cdB > EPS))) ||
    onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b)
}

function overlapsAtVertex(previous: PolygonPoint, vertex: PolygonPoint, next: PolygonPoint) {
  return Math.abs(cross(previous, vertex, next)) <= EPS &&
    (previous.x - vertex.x) * (next.x - vertex.x) + (previous.y - vertex.y) * (next.y - vertex.y) > EPS
}

/** Chỉ kiểm tra đường hở; cạnh khép kín được kiểm tra khi vẽ xong. */
export function canAppendPolygonPoint(points: readonly PolygonPoint[], next: PolygonPoint): boolean {
  if (points.some(point => same(point, next))) return false
  const n = points.length
  if (n < 2) return true
  if (overlapsAtVertex(points[n - 2], points[n - 1], next)) return false
  for (let i = 0; i < n - 2; i++) {
    if (intersects(points[i], points[i + 1], points[n - 1], next)) return false
  }
  return true
}

/** Gồm cả cạnh cuối→đầu, các cạnh chạm nhau và đa giác diện tích 0. */
export function isSimplePolygon(points: readonly PolygonPoint[]): boolean {
  const n = points.length
  if (n < 3 || points.some((point, i) => points.slice(0, i).some(other => same(point, other)))) return false
  let twiceArea = 0
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n
    twiceArea += points[i].x * points[next].y - points[next].x * points[i].y
    if (overlapsAtVertex(points[(i + n - 1) % n], points[i], points[next])) return false
    for (let j = i + 1; j < n; j++) {
      if (next === j || (j + 1) % n === i) continue
      if (intersects(points[i], points[next], points[j], points[(j + 1) % n])) return false
    }
  }
  return Math.abs(twiceArea) > EPS
}
