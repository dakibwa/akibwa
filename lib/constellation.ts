import type { ConstellationGraph, ConstellationLink, ConstellationNode, ListeningSnapshot } from '../types';

const clusterAnchors = {
  pulse: { x: 0.32, y: 0.34 },
  drift: { x: 0.68, y: 0.28 },
  hearth: { x: 0.36, y: 0.72 },
  veil: { x: 0.72, y: 0.68 },
};

const hash = (value: string) => {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    total = (total << 5) - total + value.charCodeAt(index);
    total |= 0;
  }
  return Math.abs(total);
};

export const buildConstellationGraph = (snapshot: ListeningSnapshot): ConstellationGraph => {
  const maxPlaycount = Math.max(...snapshot.artists.map((artist) => artist.playcount), 1);

  const nodes: ConstellationNode[] = snapshot.artists.map((artist, index) => {
    const anchor = clusterAnchors[artist.cluster];
    const seed = hash(`${artist.name}-${index}`);
    const angle = (seed % 360) * (Math.PI / 180);
    const orbit = 0.04 + (seed % 100) / 1000 + index * 0.008;
    const x = Math.min(0.92, Math.max(0.08, anchor.x + Math.cos(angle) * orbit));
    const y = Math.min(0.9, Math.max(0.1, anchor.y + Math.sin(angle) * orbit));

    return {
      ...artist,
      id: artist.name,
      x,
      y,
      radius: 6 + (artist.playcount / maxPlaycount) * 12,
    };
  });

  const links: ConstellationLink[] = [];
  const seen = new Set<string>();

  nodes.forEach((node) => {
    const clusterPeers = nodes.filter((candidate) => candidate.cluster === node.cluster && candidate.id !== node.id).slice(0, 2);
    clusterPeers.forEach((peer, index) => {
      const key = [node.id, peer.id].sort().join('::');
      if (seen.has(key)) return;
      seen.add(key);
      links.push({ source: node.id, target: peer.id, strength: 0.4 - index * 0.05, type: 'cluster' });
    });

    node.similar.forEach((similarName) => {
      const target = nodes.find((candidate) => candidate.name.toLowerCase() === similarName.toLowerCase());
      if (!target || target.id === node.id) return;
      const key = [node.id, target.id].sort().join('::');
      if (seen.has(key)) return;
      seen.add(key);
      links.push({ source: node.id, target: target.id, strength: 0.86, type: 'similar' });
    });
  });

  const bridgeTargets = [
    ['Jon Hopkins', 'Cameron Winter'],
    ['DJ Koze', 'Tyler, The Creator'],
    ['Nala Sinephro', 'Geese'],
    ['King Krule', 'Skepta'],
  ];

  bridgeTargets.forEach(([source, target]) => {
    if (!nodes.some((node) => node.id === source) || !nodes.some((node) => node.id === target)) {
      return;
    }
    const key = [source, target].sort().join('::');
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ source, target, strength: 0.72, type: 'bridge' });
  });

  return { nodes, links };
};
