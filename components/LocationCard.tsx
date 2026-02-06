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

        const countryRes = await fetch(
          `https://raw.githubusercontent.com/johan/world.geo.json/master/countries/${data.countryCode}.geo.json`,
          { cache: 'force-cache' }
        );

        if (!countryRes.ok) return;

        const countryGeoJson = await countryRes.json();
        const parsedShape = toCountryShape(countryGeoJson);
        setShape(parsedShape);
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
            <p className="text-sm text-[#696257] dark:text-[#a89d88]">Country outline unavailable for this location source.</p>
          )}

          {location.data.updatedAt ? (
            <p className="text-xs text-[#8a8378] dark:text-[#8f8575]">Updated: {location.data.updatedAt}</p>
          ) : null}
          <p className="text-xs text-[#8a8378] dark:text-[#8f8575]">Owner-updated city-level location (not visitor location).</p>
        </div>
      )}
    </div>
  );
};

export default LocationCard;
