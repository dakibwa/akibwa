import type { ListeningSnapshot } from '../types';

export const FALLBACK_USERNAME = 'akibwa';

export const demoSnapshot: ListeningSnapshot = {
  source: 'fallback',
  username: FALLBACK_USERNAME,
  fetchedAt: new Date('2026-03-16T12:00:00Z').toISOString(),
  artists: [
    {
      name: 'Jon Hopkins',
      playcount: 1320,
      topAlbum: 'Music for Psychedelic Therapy',
      topTrack: 'Singularity',
      tags: ['ambient', 'electronic', 'immersive'],
      similar: ['Nala Sinephro', 'DJ Koze', 'Panda Bear'],
      cluster: 'pulse',
      clusterLabel: 'Pulse',
      color: '#8ad8ff',
      summary: 'Meditative propulsion, luminous electronics, and a sense of inner weather.'
    },
    {
      name: 'DJ Koze',
      playcount: 980,
      topAlbum: 'KNOCK KNOCK',
      topTrack: 'Pick Up',
      tags: ['leftfield', 'house', 'playful'],
      similar: ['Jon Hopkins', 'Panda Bear', 'Tyler, The Creator'],
      cluster: 'pulse',
      clusterLabel: 'Pulse',
      color: '#8ad8ff',
      summary: 'Warm weirdness with dancefloor instincts, melodic but slightly sideways.'
    },
    {
      name: 'Nala Sinephro',
      playcount: 860,
      topAlbum: 'Endlessness',
      topTrack: 'Continuum 4',
      tags: ['spiritual jazz', 'ambient', 'cosmic'],
      similar: ['Jon Hopkins', 'Cameron Winter', 'Panda Bear'],
      cluster: 'drift',
      clusterLabel: 'Drift',
      color: '#cda8ff',
      summary: 'Suspended, devotional, and porous; the quietest stars tend to glow the longest.'
    },
    {
      name: 'Panda Bear',
      playcount: 910,
      topAlbum: 'Person Pitch',
      topTrack: 'Comfy in Nautica',
      tags: ['psych pop', 'sampledelia', 'oceanic'],
      similar: ['Geese', 'Jon Hopkins', 'DJ Koze'],
      cluster: 'drift',
      clusterLabel: 'Drift',
      color: '#cda8ff',
      summary: 'Salt-air psychedelia and melodic loops that feel both homemade and celestial.'
    },
    {
      name: 'Cameron Winter',
      playcount: 1040,
      topAlbum: 'Heavy Metal',
      topTrack: 'Love Takes Miles',
      tags: ['songwriter', 'off-kilter', 'intimate'],
      similar: ['Geese', 'King Krule', 'Nala Sinephro'],
      cluster: 'hearth',
      clusterLabel: 'Hearth',
      color: '#f8d58b',
      summary: 'Tenderness with rough edges: diaristic writing, strange phrasing, human scale.'
    },
    {
      name: 'Geese',
      playcount: 1125,
      topAlbum: '3D Country',
      topTrack: 'Cowboy Nudes',
      tags: ['art rock', 'feral', 'American'],
      similar: ['Cameron Winter', 'King Krule', 'Panda Bear'],
      cluster: 'hearth',
      clusterLabel: 'Hearth',
      color: '#f8d58b',
      summary: 'Restless guitars and shapeshifting songs that feel alive while they are being made.'
    },
    {
      name: 'King Krule',
      playcount: 930,
      topAlbum: 'Space Heavy',
      topTrack: 'Seaforth',
      tags: ['noir', 'post-punk', 'foggy'],
      similar: ['Cameron Winter', 'Geese', 'Skepta'],
      cluster: 'veil',
      clusterLabel: 'Veil',
      color: '#f3a6ff',
      summary: 'Low-lit urban romanticism: bruised voice, wet pavements, and strange warmth.'
    },
    {
      name: 'Skepta',
      playcount: 760,
      topAlbum: 'Konnichiwa',
      topTrack: 'That’s Not Me',
      tags: ['grime', 'ice-cold', 'direct'],
      similar: ['Tyler, The Creator', 'King Krule', 'Jim Legxacy'],
      cluster: 'veil',
      clusterLabel: 'Veil',
      color: '#f3a6ff',
      summary: 'Precision, force, and a cool-headed sense of negative space.'
    },
    {
      name: 'Tyler, The Creator',
      playcount: 1090,
      topAlbum: 'IGOR',
      topTrack: 'GONE, GONE / THANK YOU',
      tags: ['hip-hop', 'maximal', 'romantic'],
      similar: ['Skepta', 'DJ Koze', 'Jim Legxacy'],
      cluster: 'veil',
      clusterLabel: 'Veil',
      color: '#f3a6ff',
      summary: 'Big emotions rendered with lush palettes, sharp instincts, and a taste for transformation.'
    },
    {
      name: 'Jim Legxacy',
      playcount: 690,
      topAlbum: 'homeless n*gga pop music',
      topTrack: 'old place',
      tags: ['uk rap', 'internet-age', 'blurred'],
      similar: ['Skepta', 'Tyler, The Creator', 'Cameron Winter'],
      cluster: 'veil',
      clusterLabel: 'Veil',
      color: '#f3a6ff',
      summary: 'Fragmented, diaristic, and internet-native — emotionally raw without losing shape.'
    }
  ],
  albums: [
    { name: 'Music for Psychedelic Therapy', artist: 'Jon Hopkins', playcount: 410 },
    { name: 'Heavy Metal', artist: 'Cameron Winter', playcount: 288 },
    { name: '3D Country', artist: 'Geese', playcount: 301 },
    { name: 'Endlessness', artist: 'Nala Sinephro', playcount: 264 },
    { name: 'KNOCK KNOCK', artist: 'DJ Koze', playcount: 212 },
    { name: 'Space Heavy', artist: 'King Krule', playcount: 196 }
  ]
};
