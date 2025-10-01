// utils/locationUtils.js
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isInsideTriangle(lat, lon, A, B, C) {
  // helper: signed area of triangle
  const sign = (p1, p2, p3) =>
    (p1.x - p3.x) * (p2.y - p3.y) -
    (p2.x - p3.x) * (p1.y - p3.y);

  // convert to x=lon, y=lat
  const P = { x: lon, y: lat };
  const pA = { x: A.longitude, y: A.latitude };
  const pB = { x: B.longitude, y: B.latitude };
  const pC = { x: C.longitude, y: C.latitude };

  const d1 = sign(P, pA, pB);
  const d2 = sign(P, pB, pC);
  const d3 = sign(P, pC, pA);

  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

  return !(hasNeg && hasPos);
}

