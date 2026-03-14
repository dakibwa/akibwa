# Dakibwa Constellation Plan

## Vision
Dakibwa becomes a **living constellation of music taste**.

Instead of a vague consumption dashboard, the site should feel like:
- a map of listening history
- an interactive portrait of taste
- a star field of artists, albums, scenes, and bridges

The visual goal is closer to:
- night sky
- constellation map
- nebula clusters
- editorial art object

than:
- admin dashboard
- generic analytics product

## Core user story
A visitor lands on Dakibwa and immediately understands:
- this is a map of Daniel's music world
- artists cluster into scenes / moods / eras / influences
- links represent real listening patterns and inferred relationships
- clicking around reveals the structure of taste

## Product principles
1. **Music first**
   - Prioritize music over general media consumption
   - Films / other media can come later or move to a secondary project

2. **Real data first**
   - Base the graph on Last.fm listening data and deterministic signals
   - Do not make the map feel fabricated from pure LLM imagination

3. **LLM as enrichment layer**
   - Use LLMs to label, explain, and refine
   - Not to invent the whole structure from scratch

4. **Beauty matters**
   - The visual layer is not decoration; it is the product
   - The site should feel calm, cinematic, and intentional

5. **Graceful fallbacks**
   - The site should still look compelling even when data is loading or absent

## Data model
### Inputs
Primary:
- Last.fm top artists
- Last.fm top albums
- Last.fm play counts
- Last.fm tags / genres when available

Optional later:
- Spotify top artists/tracks
- manually pinned favorites
- listening over time

### Graph entities
- Artist nodes
- Album nodes (optional in v1, maybe secondary)
- Cluster/group entities (derived)
- Links between artists/albums

### Link sources
Deterministic / heuristic:
- shared genres/tags
- collaborator relationships
- listening co-occurrence
- similar artists from known APIs / metadata
- same scene / era heuristics

LLM enrichment:
- why two nodes plausibly connect
- naming a cluster
- identifying bridge artists
- editorial summary of a listening region

## Recommended architecture
### Phase 1 (practical v1)
Build a graph from deterministic data only:
- fetch Last.fm data
- normalize artists/albums
- derive similarity graph with heuristics
- cluster the graph
- render it beautifully

### Phase 2 (LLM enrichment)
For clusters and important bridges:
- send compact summaries to an LLM
- receive:
  - cluster name
  - 1-2 sentence explanation
  - bridge explanation

Cache the LLM outputs so they are not regenerated constantly.

### Phase 3 (temporal storytelling)
- compare months / seasons / years
- show taste drift over time
- animate constellation growth

## UI structure
### Landing / hero
- Name + one-line framing
- immediate visual preview of the constellation
- short explanation of what the map represents
- CTA to enter the map

### Main constellation canvas
- dark, atmospheric field
- glowing nodes
- subtle links
- clustering / depth / motion
- click node to inspect

### Side panel / detail drawer
On node click:
- artist name
- listening weight / playcount
- genres / tags
- favorite album/track if known
- why it connects to nearby nodes

### Cluster panel
On cluster click:
- cluster name
- short editorial summary
- representative artists
- bridge artists to other clusters

## Design direction
- background: charcoal / midnight / deep blue
- links: faint star lines
- nodes: weighted glow by importance
- clusters: soft nebula / fog hints
- typography: restrained, literary, elegant
- avoid over-SaaS-ifying

## What to do with the current app
### Keep / likely reusable
- Vite + React + TS base
- pieces of Last.fm fetching logic
- some graph / canvas logic in `SoundMind.tsx`
- some nav scaffolding

### Probably remove or demote
- broad "Consumption" framing
- Letterboxd-first UX on the homepage
- stale AI Studio / Gemini project framing
- mixed provider confusion where not essential to the constellation experience

### Likely refactor heavily
- `SoundMind.tsx` is too large and should be split into:
  - data fetching / normalization
  - graph building
  - graph rendering
  - detail panel / UI state
  - LLM enrichment client/cache

## Immediate work plan
1. Refocus copy and information architecture around the music constellation idea
2. Update README to describe the actual product
3. Audit and simplify env/provider setup
4. Split `SoundMind.tsx` into smaller modules
5. Improve loading / empty / fallback experience
6. Make the constellation the homepage hero or primary experience

## Cost / API philosophy
Given current user preference:
- avoid adding extra paid APIs casually
- build a strong deterministic Last.fm-first version first
- use LLM enrichment sparingly and cache results

## Success criteria for the next milestone
- The site has a clear identity
- A visitor instantly understands the concept
- The default experience is compelling even before authentication/config
- The graph feels beautiful and intentional
- The codebase is cleaner and easier to evolve
