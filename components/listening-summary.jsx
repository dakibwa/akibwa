import listening from "@/data/listening-summary.json";

export function ListeningSummary() {
  return (
    <div className="listening-summary">
      <p className="listening-provenance">
        Spotify · 2012–August 2026 · partial history
      </p>
      <div>
        <strong>
          {Math.round(
            listening.musicAudio.millisecondsPlayed / 3600000,
          ).toLocaleString("en-GB")}
        </strong>
        <span>music hours logged on Spotify</span>
      </div>
      <div>
        <strong>
          {listening.musicAudio.playbackEvents.toLocaleString("en-GB")}
        </strong>
        <span>music playback events</span>
      </div>
      <details>
        <summary>About these numbers</summary>
        <p>
          Spotify music audio, 2012–August 2026. Short and skipped events are
          included;{" "}
          {listening.musicAudio.eventsAtLeast30Seconds.toLocaleString("en-GB")}{" "}
          lasted at least 30 seconds. Recorded duration is not proof of
          attention or complete listens. There are gaps, including 2013 and
          2015, so this is not a lifetime total. Podcasts and video are
          excluded. Verified 5 September 2026. The album counts below combine
          the available Spotify, YouTube and Last.fm records; this duration
          remains Spotify-only because the other sources supply no listening time.
        </p>
      </details>
    </div>
  );
}
