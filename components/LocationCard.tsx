import React, { useEffect, useMemo, useState } from 'react';

interface OwnerLocation {
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  updatedAt?: string;
}

type LocationState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: OwnerLocation };

const LocationCard: React.FC = () => {
  const [location, setLocation] = useState<LocationState>({ status: 'loading' });

  useEffect(() => {
    const loadLocation = async () => {
      try {
        const response = await fetch('/location.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('Missing location file');

        const data = (await response.json()) as OwnerLocation;
        if (!data.city || !data.country) throw new Error('Invalid owner location data');

        setLocation({ status: 'ready', data });
      } catch {
        setLocation({ status: 'error' });
      }
    };

    loadLocation();
  }, []);

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

  const mapHref =
    location.status === 'ready'
      ? `https://www.google.com/maps?q=${location.data.latitude},${location.data.longitude}`
      : null;

  return (
    <div className="surface-panel rounded-[1.75rem] p-5 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#8a8378] dark:text-[#8f8575]">Current location</p>
          <h3 className="font-display text-2xl md:text-3xl tracking-tight mt-1">Where I am now</h3>
        </div>
        <span className="rounded-full border border-[#d8cfbe] px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-[#696257] dark:border-[#342f25] dark:text-[#a89d88]">
          Live
        </span>
      </div>

      {location.status === 'loading' && (
        <div className="space-y-3 animate-pulse">
          <div className="h-7 w-2/3 rounded-full bg-[#e5dccb] dark:bg-[#2d281f]" />
          <div className="h-4 w-1/2 rounded-full bg-[#ebe3d4] dark:bg-[#262118]" />
          <div className="h-10 rounded-2xl bg-[#f0eadf] dark:bg-[#201c15]" />
        </div>
      )}

      {location.status === 'error' && (
        <div className="rounded-2xl border border-dashed border-[#d8cfbe] p-4 dark:border-[#342f25]">
          <p className="text-[#696257] dark:text-[#a89d88]">Location is not available right now.</p>
        </div>
      )}

      {location.status === 'ready' && (
        <div className="space-y-4">
          <div className="rounded-[1.4rem] border border-[#d8cfbe] bg-[#faf7ef]/76 p-4 md:p-5 dark:border-[#342f25] dark:bg-[#1d1a15]/72">
            <p className="text-sm uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575]">
              Currently in
            </p>
            <p className="mt-2 font-display text-3xl md:text-4xl tracking-tight text-[#1c1a16] dark:text-[#ece3d0]">
              {location.data.city}
            </p>
            <p className="mt-1 text-base text-[#696257] dark:text-[#a89d88]">
              {location.data.country}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 text-sm text-[#696257] dark:text-[#a89d88]">
            <span className="rounded-full border border-[#d8cfbe] px-3 py-1.5 dark:border-[#342f25]">
              {location.data.countryCode}
            </span>
            {updatedLabel ? (
              <span className="rounded-full border border-[#d8cfbe] px-3 py-1.5 dark:border-[#342f25]">
                Updated {updatedLabel}
              </span>
            ) : null}
          </div>

          {mapHref ? (
            <a
              href={mapHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#205c5a]/25 bg-[#205c5a]/8 px-4 py-2 text-sm font-medium text-[#205c5a] transition-colors hover:bg-[#205c5a]/12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205c5a] dark:border-[#79b7ab]/30 dark:bg-[#79b7ab]/10 dark:text-[#79b7ab] dark:hover:bg-[#79b7ab]/16"
            >
              Open map
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default LocationCard;
