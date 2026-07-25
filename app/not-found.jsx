import Link from "next/link";

export default function NotFound() {
  return (
    <section className="page-grid not-found">
      <div className="not-found-inner">
        <h1>Nothing here</h1>
        <p>There&apos;s no page at this address.</p>
        <Link className="text-action" href="/">
          Back to Akibwa
        </Link>
      </div>
    </section>
  );
}
