const sum = values => values.reduce((total, value) => total + value, 0);

function orderedColumns(heights, count) {
  return Array.from({ length: count }, (_, column) => {
    const indices = [];
    for (let index = column; index < heights.length; index += count) indices.push(index);
    return { indices, height: sum(indices.map(index => heights[index])) };
  });
}

function mixedColumns(heights, count) {
  // Keep the opening edit across the top, then pair tall posters with shorter
  // sleeves. The first cover remains the first cover at every screen size.
  const columns = heights.slice(0, count).map((height, index) => ({ indices: [index], height }));
  const rest = heights.map((height, index) => ({ height, index })).slice(count)
    .sort((a, b) => b.height - a.height || a.index - b.index);
  for (const item of rest) {
    const shortest = columns.reduce((a, b) => a.height <= b.height ? a : b);
    shortest.indices.push(item.index);
    shortest.height += item.height;
  }
  // A few exchanges between the shortest and tallest stacks remove the
  // leftover imbalance without moving their opening covers.
  for (let pass = 0; pass < 6; pass++) {
    const byHeight = [...columns].sort((a, b) => a.height - b.height);
    let changed = false;
    for (let column = 0; column < Math.floor(count / 2); column++) {
      const a = byHeight[column], b = byHeight[count - column - 1];
      let best;
      for (let i = 1; i < a.indices.length; i++) for (let j = 1; j < b.indices.length; j++) {
        const delta = heights[a.indices[i]] - heights[b.indices[j]];
        const gain = (a.height - b.height) ** 2 - (a.height - b.height - 2 * delta) ** 2;
        if (gain > .1 && (!best || gain > best.gain)) best = { i, j, delta, gain };
      }
      if (best) {
        const { i, j, delta } = best;
        [a.indices[i], b.indices[j]] = [b.indices[j], a.indices[i]];
        a.height -= delta;
        b.height += delta;
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (const column of columns) column.indices.sort((a, b) => a - b);
  return columns;
}

function balanceBatch(heights, { gap, target, maxHeight, mixed, visibleColumns }) {
  if (heights.length <= visibleColumns) return heights.map((height, index) => ({ indices: [index], height, gap }));
  const weights = heights.map(height => height + gap);
  const ideal = Math.round(sum(weights) / (target + gap));
  const counts = new Set([visibleColumns, heights.length, ideal - 2, ideal - 1, ideal, ideal + 1, ideal + 2]);
  for (let rows = 2; rows <= 6; rows++) counts.add(Math.ceil(heights.length / rows));
  let best;
  for (const count of counts) {
    if (count < visibleColumns || count > heights.length) continue;
    const columns = (mixed ? mixedColumns : orderedColumns)(weights, count);
    const bottom = Math.max(...columns.map(column => column.height - gap));
    for (const column of columns) {
      const spaces = column.indices.length - 1;
      const extra = spaces ? Math.min(gap * .75, (bottom - column.height + gap) / spaces) : 0;
      column.gap = gap + extra;
      column.height += extra * spaces - gap;
    }
    const shortest = Math.min(...columns.map(column => column.height));
    const average = sum(columns.map(column => column.height)) / count;
    const score = (bottom - shortest) * 3 + Math.abs(average - target) * .35 +
      Math.max(0, bottom - maxHeight) * 4 + Math.max(0, target * .7 - average) * 3;
    if (!best || score < best.score) best = { columns, score };
  }
  return best.columns;
}

export function stackArtwork(heights, { gap = 12, viewportHeight = 900, availableHeight, visibleColumns = 8, mixed = false } = {}) {
  if (!heights.length) return [];
  const target = Math.max(300, Math.min(640, viewportHeight - 170));
  if (!mixed) {
    // Fill the visible width before stacking. Longer shelves must extend to
    // the side, and tall artwork/captions must fit the available screen height.
    const widthRows = heights.length > visibleColumns ? Math.max(1, Math.floor((heights.length - 1) / visibleColumns)) : 1;
    for (let rows = Math.min(4, widthRows); rows >= 1; rows--) {
      const fullColumns = Math.floor(heights.length / rows), remainder = heights.length % rows;
      const columns = Array.from({ length: Math.ceil(heights.length / rows) }, (_, column) => {
        const count = column < fullColumns ? rows : remainder;
        const indices = Array.from({ length: count }, (_, row) => row * fullColumns + Math.min(row, remainder) + column);
        return { indices, height: sum(indices.map(index => heights[index])) + gap * (indices.length - 1), gap };
      });
      if (rows === 1 || columns.every(column => column.height <= (availableHeight ?? target))) return columns;
    }
  }
  const maxHeight = Math.max(target, Math.min(viewportHeight - 110, target * 1.15));
  const columns = [];
  let firstHeight = target;
  // The mixed edit can append independent balanced groups.
  for (let offset = 0; offset < heights.length;) {
    const size = mixed ? offset === 0 ? 48 : 36 : heights.length;
    const batch = balanceBatch(heights.slice(offset, offset + size), {
      gap, target: firstHeight, maxHeight, mixed, visibleColumns: offset === 0 ? visibleColumns : 1,
    });
    if (offset === 0) firstHeight = Math.max(...batch.map(column => column.height));
    columns.push(...batch.map(column => ({ ...column, indices: column.indices.map(index => index + offset) })));
    offset += size;
  }
  return columns;
}
