import Link from "next/link";

export default function NotFound() {
  return (
    <section className="page-grid not-found">
      <div className="not-found-inner">
        <h1>Not found</h1>
        <p>This page is not in the public site map.</p>
        <Link className="text-action" href="/">
          Back to Akibwa
        </Link>
      </div>
    </section>
  );
}
