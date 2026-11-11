/*
 * Seeded noise for the valley: the same seed always grows the same land.
 * Everything here is a pure function of position, so the land can be asked
 * for at any point and any scale.
 */

const GX = new Float32Array(16);
const GZ = new Float32Array(16);
for (let i = 0; i < 16; i += 1) {
  GX[i] = Math.cos((i / 16) * Math.PI * 2);
  GZ[i] = Math.sin((i / 16) * Math.PI * 2);
}

export function makeNoise(seed) {
  const s = seed | 0;

  // A number in [0, 1) for a cell, different for each channel k.
  const hash = (ix, iz, k = 0) => {
    let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iz, 0x165667b1) ^ Math.imul(s + Math.imul(k, 0x9e3779b1), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  };

  const corner = (ix, iz, fx, fz, k) => {
    const g = (hash(ix, iz, k) * 16) | 0;
    return GX[g] * fx + GZ[g] * fz;
  };

  // Gradient noise, about -1 to 1.
  const noise = (x, z, k = 0) => {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;
    const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    const v = fz * fz * fz * (fz * (fz * 6 - 15) + 10);
    const a = corner(ix, iz, fx, fz, k);
    const b = corner(ix + 1, iz, fx - 1, fz, k);
    const c = corner(ix, iz + 1, fx, fz - 1, k);
    const d = corner(ix + 1, iz + 1, fx - 1, fz - 1, k);
    return (a + (b - a) * u + (c - a + (a - b - c + d) * u) * v) * 1.5;
  };

  // Layered noise, about -1 to 1.
  const fbm = (x, z, octaves = 4, k = 0, gain = 0.5) => {
    let sum = 0;
    let amp = 1;
    let total = 0;
    let fx = x;
    let fz = z;
    for (let i = 0; i < octaves; i += 1) {
      sum += amp * noise(fx, fz, k + i * 7);
      total += amp;
      amp *= gain;
      fx = fx * 2.03 + 17.1;
      fz = fz * 2.03 - 9.7;
    }
    return sum / total;
  };

  // Layered ridges, 0 to 1, sharp along their crests.
  const ridged = (x, z, octaves = 4, k = 0) => {
    let sum = 0;
    let amp = 1;
    let total = 0;
    let fx = x;
    let fz = z;
    let prev = 1;
    for (let i = 0; i < octaves; i += 1) {
      let n = 1 - Math.abs(noise(fx, fz, k + i * 5));
      n *= n;
      sum += amp * n * prev;
      total += amp;
      prev = n;
      amp *= 0.5;
      fx = fx * 2.07 + 31.3;
      fz = fz * 2.07 + 11.9;
    }
    return sum / total;
  };

  /*
   * The nearest scattered point: one jittered point per cell of the given
   * size. Fills `out` with the distance to the nearest (f1) and next nearest
   * (f2), the nearest point's place (px, pz) and two numbers that belong to
   * it (id, id2).
   */
  const worley = (x, z, size, k, out, jitter = 0.9) => {
    const gx = x / size;
    const gz = z / size;
    const cx = Math.floor(gx);
    const cz = Math.floor(gz);
    let f1 = 1e9;
    let f2 = 1e9;
    let bx = 0;
    let bz = 0;
    let bcx = 0;
    let bcz = 0;
    for (let j = -1; j <= 1; j += 1) {
      for (let i = -1; i <= 1; i += 1) {
        const ix = cx + i;
        const iz = cz + j;
        const px = (ix + 0.5 + (hash(ix, iz, k) - 0.5) * jitter) * size;
        const pz = (iz + 0.5 + (hash(ix, iz, k + 1) - 0.5) * jitter) * size;
        const d = Math.hypot(px - x, pz - z);
        if (d < f1) {
          f2 = f1;
          f1 = d;
          bx = px;
          bz = pz;
          bcx = ix;
          bcz = iz;
        } else if (d < f2) {
          f2 = d;
        }
      }
    }
    out.f1 = f1;
    out.f2 = f2;
    out.px = bx;
    out.pz = bz;
    out.id = hash(bcx, bcz, k + 2);
    out.id2 = hash(bcx, bcz, k + 3);
    return out;
  };

  return { hash, noise, fbm, ridged, worley };
}
