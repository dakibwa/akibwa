// The painter's side of the conversation with the page: paint a view, lay
// out what flies over it, and hand back the picture and the places.
self.onmessage = (event) => {
  const { id, W, H, seed, view, things } = event.data;
  const aim = view.aim ? { x: view.aim[0], z: view.aim[1], at: view.at } : null;
  const painted = paintValley({ W, H, seed, time: view.time, fov: view.fov ?? 60, horizon: view.horizon ?? 0.4, eye: view.eye ?? 54, yaw: view.yaw ?? 0, clear: view.clear ?? 1, aim });
  const { rgba } = ditherTo(painted.img, W, H, buildPalette(painted.img, W, H, 32), 0.06);
  let layout = null;
  if (things) {
    const opts = { ...things.opts };
    if (opts.tagSizes) opts.tagSize = (A) => opts.tagSizes[A.kind];
    layout = layoutThings(painted, things.albums, opts);
  }
  // How light the picture is where the words go, so they can be read.
  const light = (x0, y0, x1, y1) => {
    let sum = 0;
    let count = 0;
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, y1); y += 2) {
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, x1); x += 2) {
        const p = (y * W + x) * 3;
        sum += 0.3 * painted.img[p] + 0.59 * painted.img[p + 1] + 0.11 * painted.img[p + 2];
        count += 1;
      }
    }
    return count ? sum / count : 1;
  };
  const words = event.data.words ?? [0, 0, W, H * 0.2];
  self.postMessage({ id, W, H, rgba, layout, light: light(...words), night: painted.A.night }, [rgba.buffer]);
};
