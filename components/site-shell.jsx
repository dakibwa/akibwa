"use client";

/* The shell used to carry the whole apparatus of a multi-page site — wordmark,
   four-item navigation, a projects dropdown, a mobile menu. The wall retired
   all of it: the name lives in the headline, the menu became the hero index of
   set names, and the footer is the fixed route to contact. What remains is
   just the page. */
export function SiteShell({ children }) {
  return (
    <div className="site-shell">
      <main className="page-transition" id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
