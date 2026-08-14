import { chorusAppUrl, publicSurfaces } from "@/components/site-data";

function toOrigins(urls) {
  return [
    ...new Set(
      urls
        .filter(Boolean)
        .map((url) => {
          try {
            return new URL(url).origin;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    )
  ];
}

const imageOrigins = ["https://lastfm.freetls.fastly.net"];
const embedOrigins = toOrigins([chorusAppUrl]);
const dataOrigins = toOrigins(
  publicSurfaces.flatMap((surface) => [surface.refresh?.dataUrl, surface.refresh?.statusUrl])
).filter((origin) => !embedOrigins.includes(origin));

export function ChorusPreconnects() {
  return (
    <>
      {embedOrigins.map((origin) => (
        <link rel="preconnect" href={origin} key={origin} />
      ))}
      {dataOrigins.map((origin) => (
        <link rel="preconnect" href={origin} crossOrigin="anonymous" key={origin} />
      ))}
      {imageOrigins.map((origin) => (
        <link rel="preconnect" href={origin} key={origin} />
      ))}
    </>
  );
}
