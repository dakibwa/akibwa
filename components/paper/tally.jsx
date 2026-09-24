/*
 * Tally marks, as in the film: four strokes and a gate, a little uneven.
 * `count` strokes are drawn in groups of five.
 */
const jitter = [0, 0.6, -0.4, 0.5, -0.3];

export function Tally({ count, className = "" }) {
  const groups = [];
  for (let left = count; left > 0; left -= 5) groups.push(Math.min(5, left));
  return (
    <span className={`tally ${className}`} aria-hidden="true">
      {groups.map((size, group) => (
        <svg key={group} viewBox="0 0 26 24" width="26" height="24" focusable="false">
          <path
            d={Array.from({ length: Math.min(size, 4) }, (_, index) => {
              const x = 3 + index * 5.4 + jitter[(index + group) % 5];
              return `M${x.toFixed(1)} 3.5l${(jitter[(index + group + 2) % 5] * 0.6).toFixed(1)} 17`;
            }).join("") + (size === 5 ? "M0.5 16.5L23.5 7" : "")}
          />
        </svg>
      ))}
    </span>
  );
}
