"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import akibwapediaData from "@/data/akibwapedia-data.json";

function formatUpdated(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "latest build";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function routeLabel(name) {
  return name
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function metricValue(label) {
  return akibwapediaData.metrics.find((metric) => metric.label === label)?.value ?? "";
}

function buildSearchResults(query) {
  if (!query) return [];

  const records = [
    ...akibwapediaData.retrieval_routes.map((route) => ({
      body: route.description,
      href: "#routes",
      meta: `${route.reads} source reads`,
      title: routeLabel(route.name),
      type: "Codex route",
    })),
    ...akibwapediaData.layers.map((layer) => ({
      body: layer.summary,
      href: "#layers",
      meta: layer.status,
      title: layer.name,
      type: "System layer",
    })),
    ...akibwapediaData.source_families.map((source) => ({
      body: source.public_note,
      href: "#sources",
      meta: source.status,
      title: source.name,
      type: "Source family",
    })),
    ...akibwapediaData.metrics.map((metric) => ({
      body: metric.note,
      href: "#metrics",
      meta: metric.value,
      title: metric.label,
      type: "Build metric",
    })),
    ...akibwapediaData.privacy_rules.map((rule) => ({
      body: rule,
      href: "#boundaries",
      meta: "public rule",
      title: "Public boundary",
      type: "Boundary rule",
    })),
  ];

  return records
    .filter((record) => `${record.title} ${record.type} ${record.body} ${record.meta}`.toLowerCase().includes(query))
    .slice(0, 8);
}

export function AkibwapediaPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const featuredMetrics = akibwapediaData.metrics.slice(0, 4);
  const secondaryMetrics = akibwapediaData.metrics.slice(4);
  const recentRoutes = akibwapediaData.retrieval_routes.slice(0, 5);
  const sourceGroups = akibwapediaData.source_families.slice(0, 5);
  const layerGroups = akibwapediaData.layers.slice(0, 5);
  const cleanQuery = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(() => buildSearchResults(cleanQuery), [cleanQuery]);

  function handleSearch(event) {
    event.preventDefault();
    document.getElementById("akibwapedia-search-results")?.scrollIntoView({
      block: "start",
      behavior: "smooth",
    });
  }

  return (
    <section className="akibwapedia-page" aria-label="Akibwapedia">
      <header className="akibwapedia-topbar">
        <Link href="/personal" className="akibwapedia-wordmark" aria-label="Back to Personal projects">
          <strong>AKIBWAPEDIA</strong>
          <span>The Personal Knowledge System</span>
        </Link>
        <form className="akibwapedia-search" role="search" onSubmit={handleSearch}>
          <input
            type="search"
            name="q"
            placeholder="Search Akibwapedia"
            aria-label="Search Akibwapedia"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </header>

      <div className="akibwapedia-tabs" aria-label="Akibwapedia views">
        <a href="#main" className="is-active">Article</a>
        <a href="#sources">Sources</a>
        <a href="#routes">Routes</a>
        <a href="#boundaries">View boundary</a>
      </div>

      <div className="akibwapedia-shell">
        <aside className="akibwapedia-nav" aria-label="Akibwapedia navigation">
          <div className="akibwapedia-seal" aria-hidden="true">A</div>
          <strong>Akibwapedia</strong>
          <span>The Personal Knowledge System</span>
          <nav>
            <h2>Navigation</h2>
            <a href="#main">Main page</a>
            <a href="#featured">Featured article</a>
            <a href="#recent">Recently updated</a>
            <a href="#categories">Browse by category</a>
            <a href="#boundaries">Public boundary</a>
          </nav>
          <nav>
            <h2>Codex routes</h2>
            {recentRoutes.slice(0, 4).map((route) => (
              <a key={route.name} href="#routes">{routeLabel(route.name)}</a>
            ))}
          </nav>
          <nav>
            <h2>Sources</h2>
            {sourceGroups.slice(0, 4).map((source) => (
              <a key={source.name} href="#sources">{source.name}</a>
            ))}
          </nav>
        </aside>

        <main className="akibwapedia-main" id="main">
          <section className="akibwapedia-welcome" aria-labelledby="akibwapedia-title">
            <h1 id="akibwapedia-title">
              Welcome to Akibwapedia <span>v3,</span>
            </h1>
            <p>the public encyclopedia layer for a private, source-backed personal knowledge system.</p>
            <div>
              <strong>{metricValue("Structured facts")} structured facts</strong>
              <span>across {sourceGroups.length} source families</span>
              <span>updated {formatUpdated(akibwapediaData.updated)}</span>
            </div>
          </section>

          <div className="akibwapedia-board">
            <section className="akibwapedia-panel is-featured" id="featured">
              <h2>Featured article</h2>
              <article className="akibwapedia-featured">
                <div className="akibwapedia-thumb" aria-hidden="true">
                  <span>A</span>
                </div>
                <div>
                  <h3>Personal Knowledge System</h3>
                  <p>
                    Akibwapedia is a public-safe window onto the private local knowledge base. Raw sources stay local;
                    this surface shows architecture, aggregate counts, source-family labels, retrieval routes, and
                    explicit privacy boundaries.
                  </p>
                  <a href="#about">Read more</a>
                </div>
              </article>
            </section>

            <section className="akibwapedia-panel is-recent" id="recent">
              <h2>Recently updated</h2>
              <ul>
                {recentRoutes.map((route) => (
                  <li key={route.name}>
                    <a href="#routes">{routeLabel(route.name)}</a>
                    <span>{route.reads} source reads</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="akibwapedia-panel is-category" id="categories">
              <h2>Browse by category</h2>
              <div className="akibwapedia-category-block">
                <h3>Source families</h3>
                <ul>
                  {sourceGroups.map((source) => (
                    <li key={source.name}>
                      <a href="#sources">{source.name}</a>
                      <span>{source.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="akibwapedia-category-block">
                <h3>System layers</h3>
                <ul>
                  {layerGroups.map((layer) => (
                    <li key={layer.name}>
                      <a href="#layers">{layer.name}</a>
                      <span>{layer.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <aside className="akibwapedia-panel is-about" id="about">
              <h2>About</h2>
              <p>
                Akibwapedia is compiled from local source maps, ledgers, structured facts, and Codex routes. Articles
                represent safe system knowledge and coverage patterns, not private events.
              </p>
            </aside>
          </div>

          {cleanQuery ? (
            <section
              className="akibwapedia-wide-panel is-search"
              id="akibwapedia-search-results"
              aria-live="polite"
            >
              <h2>Search results</h2>
              {searchResults.length ? (
                <div className="akibwapedia-search-results">
                  {searchResults.map((result) => (
                    <article key={`${result.type}-${result.title}`}>
                      <a href={result.href}>{result.title}</a>
                      <p>{result.body}</p>
                      <span>{result.type} - {result.meta}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="akibwapedia-empty-search">
                  No public Akibwapedia entries match "{searchQuery.trim()}".
                </p>
              )}
            </section>
          ) : null}

          <section className="akibwapedia-wide-panel" id="layers">
            <h2>System layers</h2>
            <div className="akibwapedia-layer-list">
              {akibwapediaData.layers.map((layer) => (
                <article key={layer.name}>
                  <h3>{layer.name}</h3>
                  <p>{layer.summary}</p>
                  <span>{layer.status}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="akibwapedia-wide-panel" id="routes">
            <h2>Codex routes</h2>
            <div className="akibwapedia-route-table">
              {akibwapediaData.retrieval_routes.map((route) => (
                <article key={route.name}>
                  <h3>{routeLabel(route.name)}</h3>
                  <p>{route.description}</p>
                  <span>{route.reads} source reads</span>
                </article>
              ))}
            </div>
          </section>

          <section className="akibwapedia-wide-panel" id="sources">
            <h2>Source families</h2>
            <div className="akibwapedia-source-grid">
              {akibwapediaData.source_families.map((source) => (
                <article key={source.name}>
                  <h3>{source.name}</h3>
                  <p>{source.public_note}</p>
                  <span>{source.status}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="akibwapedia-wide-panel is-boundary" id="boundaries">
            <h2>Public boundary</h2>
            <ul>
              {akibwapediaData.privacy_rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </section>
        </main>

        <aside className="akibwapedia-infobox-column" aria-label="Akibwapedia build information">
          <section className="akibwapedia-infobox-card" id="metrics">
            <h2>Build metrics</h2>
            <dl>
              {featuredMetrics.concat(secondaryMetrics).map((metric) => (
                <div key={metric.label}>
                  <dt>{metric.label}</dt>
                  <dd>{metric.value}</dd>
                  <span>{metric.note}</span>
                </div>
              ))}
            </dl>
          </section>
          <section className="akibwapedia-infobox-card">
            <h2>Source pointers</h2>
            <ul>
              {akibwapediaData.citations.map((citation) => (
                <li key={citation}>{citation}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}
