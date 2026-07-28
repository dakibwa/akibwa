import {
  Backpack,
  Check,
  Clock3,
  Compass,
  Headphones,
  Home,
  Library,
  MapPinned,
  Music2,
  RotateCcw,
  UserRound,
  Volume2,
} from "lucide-react";
import styles from "./personal-app-previews.module.css";

const PREVIEW_BY_TREATMENT = {
  "chorus-vignette": ChorusPreview,
  "one-bag-vignette": OneBagPreview,
  "meditator-vignette": MeditatorPreview,
};

const TONE_BY_TREATMENT = {
  "chorus-vignette": styles.chorus,
  "one-bag-vignette": styles.oneBag,
  "meditator-vignette": styles.meditator,
};

export function PersonalAppPreview({ project }) {
  const Preview = PREVIEW_BY_TREATMENT[project.previewTreatment];
  if (!Preview) return null;

  return (
    <div
      className={`${styles.preview} ${TONE_BY_TREATMENT[project.previewTreatment]}`}
      role="img"
      aria-label={`${project.title} interface preview`}
    >
      <div className={styles.viewport} aria-hidden="true">
        <Preview />
      </div>
    </div>
  );
}

function ChorusPreview() {
  return (
    <div className={styles.chorusShell}>
      <header className={styles.chorusMasthead}>
        <span>
          <b>Chorus</b>
          <small>Listening archive</small>
        </span>
        <em>Interface preview</em>
      </header>
      <div className={styles.chorusDashboard}>
        <section className={styles.chorusNow}>
          <span className={styles.chorusCover} />
          <div>
            <small>Current view</small>
            <strong>Listening archive</strong>
            <span className={styles.chorusWave}>
              {Array.from({ length: 16 }, (_, index) => (
                <i key={index} style={{ "--wave-height": `${8 + ((index * 7) % 20)}px` }} />
              ))}
            </span>
          </div>
        </section>
        <section className={styles.chorusFeed}>
          <header>
            <b>Recent feed</b>
            <small>Newest plays</small>
          </header>
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index}>
              <i className={`${styles.chorusMiniCover} ${styles[`cover${index + 1}`]}`} />
              <b />
              <em />
            </span>
          ))}
        </section>
        <section className={styles.chorusArtists}>
          <header>
            <b>Top artists</b>
            <small>All time</small>
          </header>
          {Array.from({ length: 3 }, (_, index) => (
            <span key={index}>
              <i>{index + 1}</i>
              <b />
              <em style={{ "--rank-width": `${82 - index * 17}%` }} />
            </span>
          ))}
        </section>
        <section className={styles.chorusAlbums}>
          <header>
            <b>Albums wall</b>
            <small>Top records</small>
          </header>
          <div>
            {Array.from({ length: 6 }, (_, index) => (
              <i className={styles[`album${index + 1}`]} key={index} />
            ))}
          </div>
        </section>
        <section className={styles.chorusTracks}>
          <header>
            <b>Top tracks</b>
            <small>All time</small>
          </header>
          {Array.from({ length: 3 }, (_, index) => (
            <span key={index}>
              <i>{index + 1}</i>
              <b />
              <em />
            </span>
          ))}
        </section>
      </div>
    </div>
  );
}

const oneBagStages = ["Brief", "Plan", "Shakedown", "Pack", "Review"];

function OneBagPreview() {
  return (
    <div className={styles.oneBagShell}>
      <header className={styles.oneBagMasthead}>
        <span className={styles.oneBagBrand}><Backpack size={15} /><b>One Baggers</b></span>
        <nav><span>Loadout</span><span>Shop</span><span>Gear Locker</span><span>Profile</span></nav>
        <em>Example loadout</em>
      </header>
      <div className={styles.oneBagStudio}>
        <section className={styles.oneBagCanvas}>
          <small>Trip Studio</small>
          <h3>Plan smarter. Pack lighter.</h3>
          <div className={styles.oneBagStages}>
            {oneBagStages.map((stage, index) => (
              <span className={index === 1 ? styles.isCurrent : ""} key={stage}>{stage}</span>
            ))}
          </div>
          <div className={styles.oneBagMap}>
            <span><MapPinned size={14} /><b>Lisbon</b><small>5 days · mild</small></span>
            <i /><i /><i />
          </div>
          <div className={styles.oneBagActions}>
            <span><Compass size={13} /><b>Refine journey</b></span>
            <span><Backpack size={13} /><b>Build pack list</b></span>
          </div>
        </section>
        <aside className={styles.oneBagReadiness}>
          <small>Overall readiness</small>
          <div className={styles.oneBagRing}><strong>Almost</strong><span>there</span></div>
          <section>
            <span><Check size={11} /><b>Cabin target</b><em>Set</em></span>
            <span><Check size={11} /><b>Weather</b><em>Ready</em></span>
            <span><Clock3 size={11} /><b>Pack list</b><em>Next</em></span>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MeditatorPreview() {
  return (
    <div className={styles.meditatorShell}>
      <header className={styles.meditatorTop}>
        <span>Private room</span>
        <em><i /> Room ready</em>
      </header>
      <div className={styles.meditatorBrand}>Meditator</div>
      <section className={styles.meditatorPresence}>
        <article>
          <span className={styles.meditatorAvatar}><i /><i /></span>
          <div><b>You</b><small>Present</small></div>
          <em><i /> Here</em>
        </article>
        <article>
          <span className={`${styles.meditatorAvatar} ${styles.isWaiting}`}><i /><i /></span>
          <div><b>Solo for now</b><small>Share the room when ready.</small></div>
          <em>Invite</em>
        </article>
      </section>
      <section className={styles.meditatorControls}>
        <div><small>Length</small><span><b>5</b><b className={styles.isSelected}>10</b><b>20</b><b>30</b></span></div>
        <div><small>Sound</small><span><b>Silent</b><b className={styles.isSelected}><Volume2 size={10} /> Bell</b></span></div>
        <div><small>Guidance</small><span><b className={styles.isSelected}>Unguided</b><b>Guided</b></span></div>
      </section>
      <button className={styles.meditatorStart} type="button" tabIndex={-1}>Start solo sit</button>
    </div>
  );
}
