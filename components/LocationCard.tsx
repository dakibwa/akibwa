import React, { useEffect, useMemo, useState } from 'react';

interface OwnerLocation {
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  updatedAt?: string;
}

type Ring = Array<[number, number]>;

interface CountryShape {
  rings: Ring[];
  bbox: {
    minLon: number;
    maxLon: number;
    minLat: number;
    maxLat: number;
  };
}

type LocationState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: OwnerLocation };

const SVG_WIDTH = 420;
const SVG_HEIGHT = 220;
const PADDING = 16;

const toCityLevel = (value: number) => Math.round(value * 10) / 10;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toCountryShape = (geoJson: any): CountryShape | null => {
  const geometry = geoJson?.features?.[0]?.geometry;
  if (!geometry?.type || !geometry?.coordinates) return null;

  const rings: Ring[] = [];

  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach((ring: any) => {
      if (Array.isArray(ring)) rings.push(ring as Ring);
    });
  }

  if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((polygon: any) => {
      if (Array.isArray(polygon)) {
        polygon.forEach((ring: any) => {
          if (Array.isArray(ring)) rings.push(ring as Ring);
        });
      }
    });
  }

  if (rings.length === 0) return null;

  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  rings.forEach((ring) => {
    ring.forEach(([lon, lat]) => {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });
  });

  return { rings, bbox: { minLon, maxLon, minLat, maxLat } };
};

const resolveIso3Code = async (countryCode: string): Promise<string | null> => {
  const code = countryCode.trim().toUpperCase();
  if (code.length === 3) return code;
  if (code.length !== 2) return null;

  try {
    const response = await fetch(`https://restcountries.com/v3.1/alpha/${code}`, { cache: 'force-cache' });
    if (!response.ok) return null;
    const data = await response.json();
    const entry = Array.isArray(data) ? data[0] : data;
    const iso3 = entry?.cca3;
    if (!iso3 || typeof iso3 !== 'string') return null;
    return iso3.toUpperCase();
  } catch {
    return null;
  }
};

const fetchCountryOutline = async (countryCode: string): Promise<CountryShape | null> => {
  const code = countryCode.trim().toUpperCase();
  const iso3 = await resolveIso3Code(code);
  const candidates = Array.from(new Set([iso3, code].filter(Boolean)));

  for (const candidate of candidates) {
    try {
      const countryRes = await fetch(
        `https://raw.githubusercontent.com/johan/world.geo.json/master/countries/${candidate}.geo.json`,
        { cache: 'force-cache' }
      );

      if (!countryRes.ok) continue;
      const countryGeoJson = await countryRes.json();
      const parsedShape = toCountryShape(countryGeoJson);
      if (parsedShape) return parsedShape;
    } catch {
      // Try next candidate
    }
  }

  return null;
};

const LocationCard: React.FC = () => {
  const [location, setLocation] = useState<LocationState>({ status: 'loading' });
  const [shape, setShape] = useState<CountryShape | null>(null);

  useEffect(() => {
    const loadLocation = async () => {
      try {
        const response = await fetch('/location.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('Missing location file');

        const raw = (await response.json()) as OwnerLocation;
        if (!raw.city || !raw.country || !raw.countryCode) throw new Error('Invalid owner location data');

        const data: OwnerLocation = {
          ...raw,
          latitude: toCityLevel(raw.latitude),
          longitude: toCityLevel(raw.longitude),
          countryCode: raw.countryCode.toUpperCase(),
        };

        setLocation({ status: 'ready', data });

        const parsedShape = await fetchCountryOutline(data.countryCode);
        if (parsedShape) {
          setShape(parsedShape);
          return;
        }

        // Fallback: try country boundary by country name
        const fallbackRes = await fetch(
          `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(
            data.country
          )}&format=jsonv2&polygon_geojson=1&limit=1`,
          { cache: 'force-cache' }
        );

        if (!fallbackRes.ok) return;
        const fallbackJson = await fallbackRes.json();
        const fallbackGeometry = fallbackJson?.[0]?.geojson;
        if (!fallbackGeometry) return;
        const fallbackShape = toCountryShape({ features: [{ geometry: fallbackGeometry }] });
        setShape(fallbackShape);
      } catch {
        setLocation({ status: 'error' });
      }
    };

    loadLocation();
  }, []);

  const view = useMemo(() => {
    if (location.status !== 'ready' || !shape) return null;

    const { minLon, maxLon, minLat, maxLat } = shape.bbox;
    const lonRange = Math.max(0.0001, maxLon - minLon);
    const latRange = Math.max(0.0001, maxLat - minLat);

    const xScale = (SVG_WIDTH - PADDING * 2) / lonRange;
    const yScale = (SVG_HEIGHT - PADDING * 2) / latRange;
    const scale = Math.min(xScale, yScale);

    const usedWidth = lonRange * scale;
    const usedHeight = latRange * scale;
    const xOffset = (SVG_WIDTH - usedWidth) / 2;
    const yOffset = (SVG_HEIGHT - usedHeight) / 2;

    const project = (lon: number, lat: number): [number, number] => {
      const x = xOffset + (lon - minLon) * scale;
      const y = SVG_HEIGHT - (yOffset + (lat - minLat) * scale);
      return [clamp(x, 0, SVG_WIDTH), clamp(y, 0, SVG_HEIGHT)];
    };

    const path = shape.rings
      .map((ring) => {
        if (!ring.length) return '';
        const [startLon, startLat] = ring[0];
        const [sx, sy] = project(startLon, startLat);
        const segments = ring
          .slice(1)
          .map(([lon, lat]) => {
            const [x, y] = project(lon, lat);
            return `L ${x.toFixed(2)} ${y.toFixed(2)}`;
          })
          .join(' ');

        return `M ${sx.toFixed(2)} ${sy.toFixed(2)} ${segments} Z`;
      })
      .join(' ');

    const [cityX, cityY] = project(location.data.longitude, location.data.latitude);

    return { path, cityX, cityY };
  }, [location, shape]);

  const mapFallbackUrl = useMemo(() => {
    if (location.status !== 'ready') return '';
    const { latitude, longitude } = location.data;
    const west = longitude - 0.5;
    const east = longitude + 0.5;
    const south = latitude - 0.35;
    const north = latitude + 0.35;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${west}%2C${south}%2C${east}%2C${north}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  }, [location]);

  const updatedLabel = useMemo(() => {
    if (location.status !== 'ready' || !location.data.updatedAt) return null;
    const date = new Date(location.data.updatedAt);
    if (Number.isNaN(date.getTime())) return location.data.updatedAt;
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [location]);

  return (
    <div className="surface-panel rounded-2xl p-5 md:p-6 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">Current Location</p>
        <h3 className="font-display text-2xl md:text-3xl tracking-tight mt-1">Where I am now</h3>
      </div>

      {location.status === 'loading' && <p className="text-[#696257] dark:text-[#a89d88]">Loading location...</p>}

      {location.status === 'error' && (
        <p className="text-[#696257] dark:text-[#a89d88]">Location is not available right now.</p>
      )}

      {location.status === 'ready' && (
        <div className="space-y-3">
          <p className="text-[#696257] dark:text-[#a89d88]">
            Currently in{' '}
            <span className="font-semibold text-[#1c1a16] dark:text-[#ece3d0]">{location.data.city}</span>,{' '}
            {location.data.country}.
          </p>

          {view ? (
            <div className="overflow-hidden rounded-xl border border-[#d8cfbe] dark:border-[#342f25] bg-[#f8f4ea] dark:bg-[#1d1a15]">
              <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-48" role="img" aria-label="Country outline with current city highlighted">
                <defs>
                  <radialGradient id="cityGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(32,92,90,0.48)" />
                    <stop offset="100%" stopColor="rgba(32,92,90,0)" />
                  </radialGradient>
                </defs>
                <path d={view.path} fill="none" stroke="currentColor" strokeWidth="1.35" className="text-[#4f4a41] dark:text-[#a89d88]" />
                <circle cx={view.cityX} cy={view.cityY} r="14" fill="url(#cityGlow)" />
                <circle cx={view.cityX} cy={view.cityY} r="4" fill="currentColor" className="text-[#205c5a] dark:text-[#79b7ab]" />
              </svg>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#d8cfbe] dark:border-[#342f25]">
              <iframe
                title="Current city map"
                src={mapFallbackUrl}
                className="w-full h-48"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}

          {updatedLabel ? <p className="text-xs text-[#8a8378] dark:text-[#8f8575]">Last updated: {updatedLabel}</p> : null}
        </div>
      )}
    </div>
  );
};

export default LocationCard;
