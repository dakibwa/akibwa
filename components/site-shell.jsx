/* The shared shell provides the one main landmark. The paper homepage owns
   everything inside it, including its contact links. */
export function SiteShell({ children }) {
  return (
    <div className="site-shell">
      <main className="page-transition" id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
