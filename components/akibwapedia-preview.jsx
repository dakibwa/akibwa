import {
  BookOpen,
  Database,
  FileText,
  GitBranch,
  LockKeyhole,
  Route,
  ShieldCheck,
} from "lucide-react";
import akibwapediaData from "@/data/akibwapedia-data.json";

const layerIcons = [Database, FileText, GitBranch, Route, BookOpen, ShieldCheck, LockKeyhole];

function routeLabel(name) {
  return name
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatUpdated(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "latest build";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function AkibwapediaPreview({ compact = false }) {
  const keyMetrics = akibwapediaData.metrics.slice(0, 4);
  const routes = akibwapediaData.retrieval_routes.slice(0, compact ? 4 : 6);
  const layers = akibwapediaData.layers.slice(0, compact ? 4 : akibwapediaData.layers.length);

  return (
    <section className={`akibwapedia-preview ${compact ? "is-compact" : ""}`} aria-label="Akibwapedia preview">
      <header className="akibwapedia-preview-top">
        <div>
          <h2>{akibwapediaData.title}</h2>
          <p>{akibwapediaData.subtitle}</p>
        </div>
        <span>{akibwapediaData.public_status}</span>
      </header>

      <div className="akibwapedia-preview-grid">
        <article className="akibwapedia-preview-article">
          <header>
            <span>Personal Knowledge System</span>
            <strong>{akibwapediaData.local_truth_layer}</strong>
          </header>
          <p>
            Raw sources stay private. Codex works from a compact source-backed layer, and the public site receives only
            architecture, counts, routes, and privacy rules.
          </p>
          <dl>
            {keyMetrics.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{metric.value}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="akibwapedia-infobox">
          <header>
            <BookOpen size={18} strokeWidth={1.8} />
            <div>
              <strong>Akibwapedia</strong>
              <span>Updated {formatUpdated(akibwapediaData.updated)}</span>
            </div>
          </header>
          <div className="akibwapedia-info-rows">
            <div>
              <span>Truth layer</span>
              <strong>Local KB</strong>
            </div>
            <div>
              <span>Public layer</span>
              <strong>Projection</strong>
            </div>
            <div>
              <span>Next build</span>
              <strong>{akibwapediaData.next_build_step}</strong>
            </div>
          </div>
        </article>
      </div>

      <div className="akibwapedia-layer-list">
        {layers.map((layer, index) => {
          const Icon = layerIcons[index % layerIcons.length];
          return (
            <article key={layer.name}>
              <Icon size={18} strokeWidth={1.7} />
              <div>
                <h3>{layer.name}</h3>
                <p>{layer.summary}</p>
              </div>
              <span>{layer.status}</span>
            </article>
          );
        })}
      </div>

      {!compact && (
        <div className="akibwapedia-route-strip" aria-label="Retrieval routes">
          {routes.map((route) => (
            <article key={route.name}>
              <strong>{routeLabel(route.name)}</strong>
              <p>{route.description}</p>
              <span>{route.reads} reads</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
