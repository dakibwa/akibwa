// The album covers, shrunk to the few pixels a kite has, for stills made here.
import sharp from "sharp";

export async function loadSleeves(wanted, root = "public/album-art") {
  const made = new Map();
  await Promise.all(
    wanted.map(async ({ id, s }) => {
      const key = `${id}:${s}`;
      if (made.has(key)) return;
      made.set(key, null);
      try {
        const raw = await sharp(`${root}/${id}-wall.webp`).resize(s, s, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer();
        made.set(key, new Uint8Array(raw));
      } catch {
        made.set(key, null);
      }
    })
  );
  return (id, s) => made.get(`${id}:${s}`) ?? null;
}
