/*
 * One press, one paper, 366 plates.
 *
 * The wall is a page: warm paper at #faf8f3, and every tile an image printed
 * onto it. The sources are not printed, though — they are screen artwork from
 * 366 different origins, and measured across them the black point spreads from
 * 0 to 168. Thirty per cent of them bottom out under 6, which against a warm
 * ground reads as a hole punched through the page rather than ink laid on it;
 * thirteen per cent carry a white at or above 250, brighter than the paper
 * itself, which is the one thing that cannot happen in print. Paper is always
 * the lightest thing on the page and ink is never a void. Break both and the
 * wall reads as a grid of screenshots, which is exactly what it was.
 *
 * So the artwork goes through a press before it is committed. Three things
 * happen, in the order a real one does them:
 *
 *   1. Shape. A gentle S about the midpoint, because compressing the range
 *      flattens what is inside it. Without this the plates come out correct
 *      and lifeless — the look of a faded photocopy rather than a printed
 *      page. The S is what buys the compression back.
 *
 *   2. Range. The shaped tone is mapped into [ink, paper] rather than
 *      [0, 255]. `INK` is warm near-black, `PAPER_TONE` sits under the page's
 *      own #faf8f3 so no plate ever out-shines the sheet it is printed on.
 *      Both are warm, and warmer in red than blue, because the light the
 *      ground bounces is warm and a neutral ink read cold against it.
 *
 *   3. Gamut. A small saturation pull. Process inks cannot reach the corners
 *      of sRGB, and the wall mixes sources that assume they can — game covers
 *      measure 0.61 mean saturation against album sleeves at 0.36. Pulling
 *      the top end in costs almost nothing on the sleeves and stops a modern
 *      poster shouting over its neighbours.
 *
 * Applied to the wall tiles and the album ladder only. Not to the brand marks:
 * a logo at 28px on a flooded brand colour is a mark, not a plate, and its
 * colour is the company's rather than ours to press.
 *
 * PRESS_VERSION is stamped into both manifests. The variant checks hash their
 * SOURCES, so without it a change here would leave every committed file stale
 * while `--check` reported everything current — the failure mode where the
 * build is green and the site is a generation behind.
 */

export const PRESS_VERSION = "press-1";

/* Darkest ink the press lays down. Warm, and never zero. */
const INK = [15, 13, 11];

/* Lightest tone a plate reaches. Under the page's own #faf8f3 (250,248,243),
   so paper stays the brightest thing on the wall. */
const PAPER_TONE = [240, 238, 233];

/* How much S to put back. 0 is a straight line — correct endpoints, dead
   midtones. Past about 0.25 the shadows block up and faces go waxy. */
const SHAPE = 0.16;

/* 1 keeps sRGB saturation as-is; this pulls the loudest sources toward the
   quiet ones without draining the colour out of anything. */
const GAMUT = 0.96;

/* Rec. 709 luma, the same weighting the tone measurements used. */
const LUMA = [0.2126, 0.7152, 0.0722];

function shaped(t) {
  /* A raised cosine is a full S and far too strong on its own; blending it
     against the identity gives a gentle one that still pins 0, 0.5 and 1. */
  return (1 - SHAPE) * t + SHAPE * (0.5 - 0.5 * Math.cos(Math.PI * t));
}

/* Three 256-entry ramps, built once. A LUT is exact, monotonic and free at
   this size, which a chain of sharp operations would be none of. */
function buildRamps() {
  return [0, 1, 2].map((c) => {
    const ramp = new Uint8Array(256);
    for (let i = 0; i < 256; i += 1) {
      const value = INK[c] + (PAPER_TONE[c] - INK[c]) * shaped(i / 255);
      ramp[i] = Math.max(0, Math.min(255, Math.round(value)));
    }
    return ramp;
  });
}

const RAMPS = buildRamps();

/*
 * Press a decoded RGB(A) buffer in place and hand it back.
 *
 * Saturation is pulled first, against the source luma, so the ramp lands on
 * the colour that will actually be printed. Alpha is carried through
 * untouched — several tool marks have it, and pressing an alpha channel would
 * quietly turn transparency into a grey veil.
 */
export function pressRaw(data, channels) {
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    let pr = r;
    let pg = g;
    let pb = b;

    if (GAMUT !== 1) {
      const y = LUMA[0] * r + LUMA[1] * g + LUMA[2] * b;
      pr = y + (r - y) * GAMUT;
      pg = y + (g - y) * GAMUT;
      pb = y + (b - y) * GAMUT;
    }

    data[i] = RAMPS[0][Math.max(0, Math.min(255, Math.round(pr)))];
    data[i + 1] = RAMPS[1][Math.max(0, Math.min(255, Math.round(pg)))];
    data[i + 2] = RAMPS[2][Math.max(0, Math.min(255, Math.round(pb)))];
  }

  return data;
}

/*
 * Run a sharp pipeline through the press.
 *
 * Deliberately after the resize rather than before: the ramp is monotonic, so
 * either order stays inside the range, but pressing the small output means the
 * endpoints are exact on the pixels that actually ship, and it is a hundredth
 * of the work.
 */
export async function press(sharp, pipeline) {
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  return sharp(pressRaw(data, info.channels), {
    raw: { width: info.width, height: info.height, channels: info.channels }
  });
}
