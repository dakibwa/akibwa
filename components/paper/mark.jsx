import { MARK_BODY, MARK_TAIL } from "./mark-paths";

/*
 * The Akibwa a as a small piece of papercraft: the orange body and pale tail
 * over a folded edge.
 */
export function Mark({ size = 40, className = "" }) {
  return (
    <svg className={`mark ${className}`} viewBox="-3 -2 108 108" width={size} height={size} aria-hidden="true" focusable="false">
      <g className="mark-edge" transform="translate(1.7 2.1)">
        <path d={MARK_BODY} fillRule="evenodd" />
        <path d={MARK_TAIL} />
      </g>
      <path className="mark-body" d={MARK_BODY} fillRule="evenodd" />
      <path className="mark-tail" d={MARK_TAIL} />
    </svg>
  );
}
