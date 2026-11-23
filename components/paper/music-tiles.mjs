// The exported rows and later additions use the same markup. Keep catalogue
// strings escaped at this boundary, including titles inside the no-script art.
import { LARGE_ART } from "./music-art.mjs";
import { listened, songLabel } from "./music-shelf.mjs";

const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escape = value => String(value).replace(/[&<>"]/g, char => entities[char]);
const paper = ["#f6efdd", "#f1dcd4", "#dfe8ef", "#e3ead6", "#f4e3b8", "#e8dff0", "#f0d9c2", "#d9e6e0"];
const tintFor = artist => paper[[...artist].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7) % paper.length];

export const recordLabel = item => item.kind === "single" ? songLabel(item.title) : item.title;
export const plays = count => `${count.toLocaleString("en-GB")} ${count === 1 ? "play" : "plays"}`;

function imageBase(item) {
  const directory = process.env.NODE_ENV === "production" && item.version ? `/_next/static/sleeves/${item.version}/` : "/album-art/";
  return directory + encodeURIComponent(item.art);
}

function ladder(path, large, format) {
  return large ? `${path}-wall.${format} 264w, ${path}-large.${format} ${large}w` : `${path}-wall.${format}`;
}

// Until the shelf is measured, the mobile cap and the sample row's share
// give the preload scanner a responsive size for the first covers.
const initialSizes = side => `(max-width: 630px) 25vw, ${Math.ceil(side / 11)}vw`;

export function firstCoverHint(item, side) {
  const path = imageBase(item);
  const large = LARGE_ART[item.art];
  return { as: "image", type: "image/avif", fetchPriority: "high",
    href: `${path}-wall.avif`, imageSrcSet: ladder(path, large, "avif"), imageSizes: large ? initialSizes(side) : undefined };
}

function artwork(item, side, priority, initial = false) {
  if (!item.art) {
    const title = recordLabel(item);
    return `<span class="music-type" aria-hidden="true"><b class="music-initial">${escape(title.charAt(0))}</b><strong${side < 96 ? " hidden" : ""}>${escape(title)}</strong></span>`;
  }
  const path = imageBase(item);
  const large = LARGE_ART[item.art];
  const sizes = large ? ` sizes="${initial ? initialSizes(side) : Math.ceil(side) + "px"}"` : "";
  return `<picture><source type="image/avif" srcset="${ladder(path, large, "avif")}"${sizes}><img src="${path}-wall.webp"${large ? ` srcset="${ladder(path, large, "webp")}"${sizes}` : ""} alt="" loading="${priority ? "eager" : "lazy"}"${priority ? ' fetchpriority="high"' : ""} decoding="async" draggable="false"></picture>`;
}

function buttonLabel(item) {
  return `${recordLabel(item)}, ${item.artist}. ${listened(item.allMinutes ?? item.minutes)} listened, ${plays(item.plays)}. ${item.kind === "single" ? "Show it" : "Show its tracks"}.`;
}

function tileMarkup(item, preview) {
  const styles = [];
  let content = "";
  if (preview) {
    styles.push(`--share:${Math.min(1, Math.sqrt(item.minutes / preview.reference))}`);
    content = artwork(item, preview.side, preview.position === 0, true);
    if (preview.position >= 32) content = `<noscript>${content}</noscript>`;
  }
  if (!item.art) styles.push(`--tint:${tintFor(item.artist)}`);

  const style = styles.length ? ` style="${styles.join(";")}"` : "";
  const record = item.record ? ` data-record="${escape(item.record)}"` : "";
  return `<li class="music-tile" data-key="${escape(item.key)}"${record}${style}>` +
    `<button type="button" class="music-face" aria-expanded="false" aria-label="${escape(buttonLabel(item))}">` +
    content + "</button></li>";
}

export function initialRow(row, reference, start) {
  return row.entries.map(({ item }, i) => tileMarkup(item, { side: row.side, reference, position: start + i })).join("");
}

// React owns the row shells and the track sheet. The shelf owns the buttons
// inside those shells so a record can cross rows without replacing its image.
export class ShelfTiles {
  records = new Map();
  visibleRows = new Set();
  ready = false;

  arrange(list, groups) {
    const rows = list.querySelectorAll(".music-row");
    let index = 0;
    for (const group of groups) {
      for (const row of group.rows) {
        const element = rows[index++];
        if (!this.ready) {
          Array.from(element.children).forEach((tile, position) => {
            this.records.set(tile.dataset.key, { tile, item: row.entries[position].item, side: row.side });
          });
          continue;
        }
        const missing = row.entries.filter(({ item }) => !this.records.has(item.key));
        if (missing.length) {
          const batch = document.createElement("template");
          batch.innerHTML = missing.map(({ item }) => tileMarkup(item)).join("");
          Array.from(batch.content.children).forEach((tile, i) => {
            this.records.set(missing[i].item.key, { tile, item: missing[i].item });
          });
        }
        let next = element.firstElementChild;
        for (const { item } of row.entries) {
          const entry = this.records.get(item.key);
          const { tile } = entry;
          entry.item = item;
          entry.side = row.side;
          if (next === tile) next = next.nextElementSibling;
          else if (element.moveBefore && tile.isConnected) element.moveBefore(tile, next);
          else element.insertBefore(tile, next);
        }
        while (next) {
          const following = next.nextElementSibling;
          next.remove();
          next = following;
        }
      }
    }
    this.ready = true;
    // Keep the reusable catalogue. Year-specific copies live only in Year.
    for (const [key, { item, tile }] of this.records) {
      if (item.record && !tile.isConnected) this.records.delete(key);
    }
  }

  prepare(row) {
    for (const tile of row.children) {
      const entry = this.records.get(tile.dataset.key);
      if (!entry) continue;
      const { item, side } = entry;
      const face = tile.firstElementChild;
      if (!face.firstElementChild?.matches("picture, .music-type")) {
        face.querySelector("noscript")?.remove();
        face.insertAdjacentHTML("afterbegin", artwork(item, side, false));
      } else if (entry.artSide !== side) {
        if (LARGE_ART[item.art]) {
          for (const image of face.querySelectorAll("[sizes]")) image.sizes = Math.ceil(side) + "px";
        } else if (!item.art) {
          face.querySelector("strong").hidden = side < 96;
        }
      }
      entry.artSide = side;
      const image = face.querySelector("img");
      if (image && !image.complete) image.dataset.loading = "true";
    }
  }

  select(key, expanded) {
    const face = this.records.get(key)?.tile.firstElementChild;
    if (!face) return;
    face.setAttribute("aria-expanded", String(expanded));
    if (expanded) face.setAttribute("aria-controls", "record-tracks");
    else face.removeAttribute("aria-controls");
  }
}
