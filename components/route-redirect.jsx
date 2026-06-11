import Link from "next/link";

export function RouteRedirect({ to, label }) {
  return (
    <section className="studio-page route-redirect">
      <script
        dangerouslySetInnerHTML={{ __html: `window.location.replace(${JSON.stringify(to)});` }}
      />
      <noscript>
        <meta httpEquiv="refresh" content={`0;url=${to}`} />
      </noscript>
      <div className="page-grid">
        <p>
          This page has moved to <Link href={to}>{label}</Link>.
        </p>
      </div>
    </section>
  );
}
