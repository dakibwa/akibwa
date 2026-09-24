// A pencil arrow, drawn rather than typed: neither typeface carries one.
export function Arrow({ back = false, size = 18 }) {
  return (
    <svg
      className="arrow"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      style={back ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M3.5 12.4c5.6-.5 11.2-.3 16.6.1M14.2 6.6c2.1 2.2 3.9 3.9 5.9 5.9-2.1 1.8-3.9 3.6-5.8 5.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
