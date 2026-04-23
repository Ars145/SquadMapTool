export interface Point {
  x: number;
  y: number;
}

// Uniform Catmull-Rom through all control points, closed loop.
export function tessellateClosedSpline(
  points: Point[],
  segmentsPerEdge: number = 24
): Point[] {
  if (points.length < 3) return points.slice();
  const n = points.length;
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    for (let j = 0; j < segmentsPerEdge; j++) {
      const t = j / segmentsPerEdge;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  return out;
}

// Open Catmull-Rom with endpoint reflection for natural tangents.
export function tessellateOpenSpline(
  points: Point[],
  segmentsPerEdge: number = 24
): Point[] {
  if (points.length < 2) return points.slice();
  if (points.length === 2) return points.slice();
  const n = points.length;
  const out: Point[] = [];
  const reflect = (a: Point, b: Point): Point => ({
    x: 2 * a.x - b.x,
    y: 2 * a.y - b.y,
  });
  for (let i = 0; i < n - 1; i++) {
    const p0 = i === 0 ? reflect(points[0], points[1]) : points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 =
      i === n - 2 ? reflect(points[n - 1], points[n - 2]) : points[i + 2];
    for (let j = 0; j < segmentsPerEdge; j++) {
      const t = j / segmentsPerEdge;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(points[n - 1]);
  return out;
}

export type PathMode = "polygon" | "spline";

export function computePathPoints(
  controlPoints: Point[],
  closed: boolean,
  mode: PathMode
): Point[] {
  if (mode === "polygon") return controlPoints;
  if (closed) return tessellateClosedSpline(controlPoints);
  return tessellateOpenSpline(controlPoints);
}
