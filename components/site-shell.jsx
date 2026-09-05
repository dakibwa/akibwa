"use client";

/* The personal index owns its introduction and navigation. The shared shell
   provides one main landmark and a direct keyboard route to contact. */
export function SiteShell({ children }) {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#site-footer">
        Skip to contact
      </a>
      <main className="page-transition" id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
