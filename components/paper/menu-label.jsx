// Six pen-cut letters for the shelf. The A and Z share their block when the
// alphabetical order reverses. The button still contains its full text label.
const cuts = {
  h: "M8.5 11.6 17.7 8l1.8 1.3-.7 12.8 10.8-1.4.4-8.1-2.6-1.6 9.2-3.4 1.6 1.5-1.5 25 2.5 1.8-8.7 3.5-2-1.9.8-13.2-10.8 1.5-.4 8.5 2.6 1.8-8.5 3.3-2-2 1.5-23.6z",
  y: "M6.6 11.8 14.9 8l2.7 1.9 7.1 12.4 7.8-10.6-2.7-1.6 7.4-2.4 2.6 2.5-12.9 15.6-.7 8.4 3.3 1.6-10.8 3.9-2.2-2.2 3.3-2.9.5-8.4-9.7-15.1z",
  g: "M36.7 9.4 35 17.2l-2.3.5c-.6-4.5-3.2-6.8-7-6.6-6.3.3-10.3 6.2-10.3 13.3 0 7.2 3.6 11.3 9.2 11.1 2.3-.1 4.3-.9 5.7-2.2l.1-7.1-5.5-.7.9-2.5 12.6-1 .7 1.9-2.2 1.9-.3 9c-3.1.8-6.3 4.3-13.6 4.6-9.3.5-15.5-5.2-15.5-14.4 0-10 7.7-17.2 17.7-17.6 4.9-.2 7.5 1.5 9.2 2.4z",
  a: "M6.8 38.7c3.4-1.4 4.9-4.4 6.1-7.4l7.4-18.2c-2.8.2-4.7 1.1-6.6 3.1.6-3.5 3.2-5.8 6.4-6.4 3.1-.5 5.4-.8 8.4-2.7l.9 1.3c-.9 2.5-.1 5.2.4 7.5l4.9 17.1c.7 2 2.3 2.7 5.1 2.9l-.1 1.2-7.8 2.1c-1.9-1.4-2.7-3.3-3.2-6l-1.1-4.9c-3.8-1.1-6.7-.7-10.2 1.2l-1.6 4.3c-.8 2.2.1 2.9 2.1 3.3l-1 1.2-9.6 1.6z M18.9 25.3c2.9-1.3 5.8-1.4 8.1-.7l-3.3-11.3z",
  z: "M11.6 8.8c7.6.8 15.1.6 24.4-.5l1.9 2-18.7 24.6 10.6-.5 5.7-5 2 .6-3.1 9.1c-8.1-.9-16.7-.7-25.7.3l-1.5-2 18.9-24.8-9.4.5-5.7 4.6-1.8-.8z",
  s: "M35.6 9.8 33.2 17l-1.9.2c-.8-4.6-3.4-6.6-6.9-6.4-3.4.2-5.8 2.2-5.7 4.9.1 3.1 3.8 4.5 8.4 6.1 5.3 1.9 9 4 8.8 8.7-.4 5.9-6.7 9.6-14.7 9.1-3.8-.3-7.6-1.6-10.9-3.7l2.2-7 2.2-.4c.4 4.6 3.8 7.4 8.5 7.6 3.4.1 6.1-1.6 6.2-4.5.1-3-3.2-4.3-8.7-6.3-4.8-1.8-8.6-4-8.7-9C11.9 10.8 18.2 7 25.4 7c4.5 0 7.4 1.2 10.2 2.8z"
};

// One engraved branch. Its two impressions curl into opposite corners.
function Sprig() {
  return (
    <>
      <path className="menu-initial-stem" pathLength="1" fill="none" strokeWidth=".85" strokeLinecap="round"
        d="M5.5 24.5C3.5 15.1 8.9 6.2 18.4 6.1c5.4-.1 6.3 4.9 2.7 5.4-2.2.3-3.2-2-1.7-2.7" />
      <path className="menu-initial-leaf" stroke="none"
        d="M5.7 20.8c-2.2-1.2-3.1-3.1-2.4-5.5 2.4 1.5 3.1 3.3 2.4 5.5zm1-5.5c.7-3.1 2.8-4.3 5.2-4.4-.6 2.8-2.6 4.4-5.2 4.4zm3-5.8c-1.5-1.9-1.7-4.1-.4-6.2 1.9 2.2 2 4.3.4 6.2zm4.3-2.6c.1-2.7 2-4 4.4-4.2-.5 2.8-2.1 4.1-4.4 4.2z" />
      <g className="menu-initial-fine">
        <path className="menu-initial-stem" pathLength="1" fill="none" strokeWidth=".75"
          d="M42 8.3c-3.5 4.3-2.7 6.2-.5 9.2 2.1 2.6 1.2 6.1-1.5 6.1-2.5 0-2.8-2.9-.8-3.2" />
        <g className="menu-initial-leaf" stroke="none">
          <path d="M40.4 14.5c-.4-2.4 1.1-4.5 3.5-5.5.1 2.5-1.3 4.6-3.5 5.5z" />
          <circle cx="42.9" cy="6.9" r="1.2" />
          <circle cx="40.5" cy="5.1" r=".75" />
        </g>
      </g>
    </>
  );
}

export default function MenuLabel({ label }) {
  const first = label[0];
  if (!cuts[first]) return label;
  const turn = first === "g" || first === "y" || first === "z" ? 90 : 0;
  return (
    <>
      <span className="menu-initial">
        {first}
        <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="m.9 1.3 45.9-.5.5 45.8-46.2.5z" />
          <g className="menu-initial-cuts" transform={`rotate(${turn} 24 24)`}>
            <path fill="none" strokeWidth=".65" d="m2.6 2.9 42.5-.4.3 42.5-42.8.3z" />
            <Sprig />
            <g transform="rotate(180 24 24)"><Sprig /></g>
            <path className="menu-initial-leaf" stroke="none"
              d="m36 4.5.8 2.6 2.5.9-2.5.9-.9 2.5-.7-2.5-2.6-.9 2.5-.9z M8.4 34.8l.8 2.4 2.3.8-2.3.9-.9 2.4-.7-2.5-2.2-.8 2.3-.8z" />
          </g>
          <path className="menu-initial-letter" d={cuts[first]} fillRule="evenodd"
            stroke="currentColor" strokeLinejoin="round" strokeWidth="2.6" paintOrder="stroke fill" />
          {first === "a" && (
            <path className="menu-initial-letter menu-initial-fine" d="m23.5 18 .5 2 1.4.5-1.4.6-.5 1.8-.5-1.8-1.4-.5 1.4-.6z" />
          )}
        </svg>
      </span>{label.slice(1)}
    </>
  );
}
