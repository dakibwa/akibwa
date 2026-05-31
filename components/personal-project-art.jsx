import styles from "./personal-project-art.module.css";

const variantBySlug = {
  chorus: "sonic",
  "sonic-fm": "sonic",
  vitals: "vitals",
  "cover-collision": "cover",
  "personal-knowledge-base": "knowledge"
};

function SonicArt() {
  return (
    <>
      <path className={styles.paperWarm} d="M32 154L188 118L298 139L266 220L73 226Z" />
      <path className={styles.paperCool} d="M302 42L518 68L540 174L336 188Z" />
      <path className={styles.lineInk} d="M82 142C130 90 181 92 224 136C268 181 322 179 372 132C423 85 473 87 520 137" />
      <circle className={styles.ring} cx="402" cy="127" r="47" />
      <circle className={styles.ringFine} cx="402" cy="127" r="25" />
      <rect className={styles.markerOrange} x="395" y="120" width="14" height="14" />
      <g className={styles.bars}>
        {[23, 42, 29, 57, 36, 48, 31].map((height, index) => (
          <rect key={height + index} x={72 + index * 13} y={210 - height} width="5" height={height} rx="2.5" />
        ))}
      </g>
    </>
  );
}

function VitalsArt() {
  return (
    <>
      <path className={styles.paperCool} d="M72 58H292V186H72Z" />
      <path className={styles.paperWarm} d="M252 88H498V212H252Z" />
      <path className={styles.lineInk} d="M91 151H157L180 113L211 166L249 126L292 148H352L379 104L422 170L452 142H519" />
      <rect className={styles.markerGreen} x="168" y="105" width="12" height="12" />
      <rect className={styles.markerOrange} x="371" y="96" width="14" height="14" />
      <path className={styles.thinLine} d="M92 86H214M92 108H178M312 132H448M312 155H424M312 178H470" />
      <circle className={styles.node} cx="519" cy="142" r="5" />
    </>
  );
}

function CoverArt() {
  return (
    <>
      <path className={styles.paperWarm} d="M116 39L280 72L252 219L86 185Z" />
      <path className={styles.paperCool} d="M272 70L446 48L476 202L306 224Z" />
      <path className={styles.paperWhite} d="M194 111L365 92L386 205L214 224Z" />
      <path className={styles.cropLine} d="M105 72V46H131M455 65H481V91M118 207H92V181M485 180V206H459" />
      <path className={styles.lineInk} d="M126 168C172 133 216 133 260 164C308 198 354 196 406 155" />
      <rect className={styles.markerOrange} x="307" y="133" width="18" height="18" />
      <rect className={styles.markerBlue} x="226" y="93" width="34" height="52" />
    </>
  );
}

function KnowledgeArt() {
  return (
    <>
      <path className={styles.paperWhite} d="M80 54H268V208H80Z" />
      <path className={styles.paperCool} d="M289 67H486V200H289Z" />
      <path className={styles.thinLine} d="M112 91H228M112 115H244M112 139H196M112 163H236M322 104H446M322 128H417M322 152H459" />
      <path className={styles.lineInk} d="M190 179L267 132L337 157L436 101" />
      <rect className={styles.markerBlue} x="181" y="170" width="16" height="16" />
      <rect className={styles.markerGreen} x="259" y="124" width="14" height="14" />
      <rect className={styles.markerOrange} x="428" y="93" width="16" height="16" />
      <path className={styles.annotation} d="M470 88H523M501 63L523 88L501 113" />
    </>
  );
}

export function PersonalProjectArt({ project }) {
  const variant = variantBySlug[project.slug] ?? "knowledge";

  return (
    <div className={`${styles.art} ${styles[variant]}`} aria-hidden="true">
      <svg viewBox="0 0 620 270" focusable="false">
        <rect className={styles.ground} width="620" height="270" />
        <path className={styles.grid} d="M46 0V270M92 0V270M138 0V270M184 0V270M230 0V270M276 0V270M322 0V270M368 0V270M414 0V270M460 0V270M506 0V270M552 0V270M598 0V270M0 45H620M0 90H620M0 135H620M0 180H620M0 225H620" />
        {variant === "sonic" ? <SonicArt /> : null}
        {variant === "vitals" ? <VitalsArt /> : null}
        {variant === "cover" ? <CoverArt /> : null}
        {variant === "knowledge" ? <KnowledgeArt /> : null}
      </svg>
    </div>
  );
}
