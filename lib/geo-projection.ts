/**
 * Pure geographic projection utilities for 360° aerial image overlay.
 * No React, no DOM — fully testable standalone.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SvgViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── SVG viewBox ──────────────────────────────────────────────────────────────

/**
 * Compute the bounding box of all unit SVG paths.
 * Mirrors the useMemo in masterplan-map.tsx so the same viewBox is
 * available outside the Leaflet map context.
 */
export function computeSvgViewBox(
  units: Array<{ path?: string; coordenadasMasterplan?: string | null; [k: string]: any }>
): SvgViewBox | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const u of units) {
    let path = u.path as string | undefined;
    if (!path && u.coordenadasMasterplan) {
      try { const c = JSON.parse(u.coordenadasMasterplan); path = c.path; } catch {}
    }
    if (!path) continue;
    const nums = path.match(/-?[\d.]+(?:e[+-]?\d+)?/gi);
    if (!nums) continue;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = parseFloat(nums[i]), y = parseFloat(nums[i + 1]);
      if (!isNaN(x) && !isNaN(y)) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }

  if (minX === Infinity) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// ─── SVG → Lat/Lng ────────────────────────────────────────────────────────────

/**
 * Convert an SVG polygon path string to geographic [lat, lng] vertices.
 * Mirrors the drawPolygons transform in masterplan-map.tsx exactly.
 *
 * bounds = [[swLat, swLng], [neLat, neLng]]  (axis-aligned, pre-rotation)
 * rotation = overlay rotation in degrees
 */
export function svgPathToLatLng(
  svgPath: string,
  viewBox: SvgViewBox,
  bounds: [[number, number], [number, number]],
  rotation: number
): [number, number][] {
  const nums = svgPath.match(/-?[\d.]+(?:e[+-]?\d+)?/gi);
  if (!nums || nums.length < 4) return [];

  const [[swLat, swLng], [neLat, neLng]] = bounds;
  const cLat = (swLat + neLat) / 2;
  const cLng = (swLng + neLng) / 2;
  const rotRad = (rotation * Math.PI) / 180;
  const pts: [number, number][] = [];

  for (let i = 0; i + 1 < nums.length; i += 2) {
    const sx = parseFloat(nums[i]);
    const sy = parseFloat(nums[i + 1]);
    if (isNaN(sx) || isNaN(sy)) continue;

    // Normalise to [0, 1] within viewBox
    const nx = viewBox.w > 0 ? (sx - viewBox.x) / viewBox.w : 0;
    const ny = viewBox.h > 0 ? (sy - viewBox.y) / viewBox.h : 0;

    // Bilinear interpolation inside the geographic bounds
    // SVG Y increases downward, lat increases upward → invert ny
    const rawLat = neLat - ny * (neLat - swLat);
    const rawLng = swLng + nx * (neLng - swLng);

    if (rotation !== 0) {
      const dLat = rawLat - cLat;
      const dLng = rawLng - cLng;
      pts.push([
        cLat + dLat * Math.cos(rotRad) - dLng * Math.sin(rotRad),
        cLng + dLat * Math.sin(rotRad) + dLng * Math.cos(rotRad),
      ]);
    } else {
      pts.push([rawLat, rawLng]);
    }
  }

  return pts;
}

// ─── Geo → Pitch / Yaw ────────────────────────────────────────────────────────

/**
 * Convert a geographic target vertex to Pannellum pitch/yaw coordinates
 * relative to a drone camera.
 *
 * @param targetLat     Latitude of the lot vertex
 * @param targetLng     Longitude of the lot vertex
 * @param camLat        Drone camera latitude
 * @param camLng        Drone camera longitude
 * @param camAlt        Drone altitude above ground, metres (e.g. 500)
 * @param imageHeading  Compass direction the image centre (yaw=0) faces, degrees.
 *                      0 = North, 90 = East. Typically from EXIF GPSImgDirection or user input.
 */
export function geoToPitchYaw(
  targetLat: number,
  targetLng: number,
  camLat: number,
  camLng: number,
  camAlt: number,
  imageHeading: number
): { pitch: number; yaw: number } {
  const R = 6_371_000; // Earth radius in metres

  // East-North-Up displacement (metres)
  const dNorth = (targetLat - camLat) * (Math.PI / 180) * R;
  const dEast  = (targetLng - camLng) * (Math.PI / 180) * R
                 * Math.cos(camLat * Math.PI / 180);
  // Ground = 0 m, camera = camAlt → vertex is camAlt metres below
  const dUp    = -camAlt;

  const horizDist = Math.sqrt(dNorth * dNorth + dEast * dEast);

  // Compass bearing to this vertex (0 = N, 90 = E, clockwise)
  const compassBearing = Math.atan2(dEast, dNorth) * (180 / Math.PI);

  // Pannellum yaw = bearing relative to image centre direction
  const yaw   = compassBearing - imageHeading;

  // Pannellum pitch = elevation angle (negative = looking down)
  const pitch = Math.atan2(dUp, horizDist) * (180 / Math.PI);

  return { pitch, yaw };
}

// ─── Pitch/Yaw → Screen ────────────────────────────────────────────────────────

/**
 * Project a spherical (pitch/yaw) coordinate to screen (x, y) pixels.
 * Returns null when the point is behind the camera.
 *
 * Identical to the projectCoords function in tour-creator.tsx PanoramicOverlay,
 * extracted here as a pure function.
 */
export function projectSphericalToScreen(
  pitch: number,
  yaw: number,
  viewPitch: number,
  viewYaw: number,
  hfov: number,
  width: number,
  height: number
): { x: number; y: number } | null {
  const DEG = Math.PI / 180;

  const p  = pitch     * DEG;
  const y  = yaw       * DEG;
  const vp = viewPitch * DEG;
  const vy = viewYaw   * DEG;

  // Compute direction vector in camera space using relative yaw.
  // Matches Pannellum's internal projection convention exactly.
  const x3 = Math.cos(p) * Math.sin(y - vy);
  const y3 = Math.sin(p) * Math.cos(vp) - Math.cos(p) * Math.sin(vp) * Math.cos(y - vy);
  const z3 = Math.sin(p) * Math.sin(vp) + Math.cos(p) * Math.cos(vp) * Math.cos(y - vy);

  if (z3 <= 0) return null; // point is behind the camera

  const focalLength = width / (2 * Math.tan((hfov * DEG) / 2));
  return {
    x:  (x3 / z3) * focalLength + width  / 2,
    y: -(y3 / z3) * focalLength + height / 2,
  };
}
