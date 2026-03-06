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
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[#8a8378] dark:text-[#8f8575]">Current location</p>
        <h3 className="font-display text-2xl md:text-3xl tracking-tight mt-1">Where I am now</h3>
      </div>

      {location.status === 'loading' && (
        <div className="space-y-2 animate-pulse">
          <div className="h-7 w-2/3 rounded-full bg-[#e5dccb] dark:bg-[#2d281f]" />
          <div className="h-4 w-1/2 rounded-full bg-[#ebe3d4] dark:bg-[#262118]" />
        </div>
      )}

      {location.status === 'error' && (
        <p className="text-[#696257] dark:text-[#a89d88]">Location is not available right now.</p>
      )}

      {location.status === 'ready' && (
        <div className="space-y-3">
          <p className="font-display text-3xl md:text-4xl tracking-tight text-[#1c1a16] dark:text-[#ece3d0]">
            {location.data.city}
          </p>
          <p className="text-base text-[#696257] dark:text-[#a89d88]">
            {location.data.country}
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#696257] dark:text-[#a89d88]">
            <span>{location.data.countryCode}</span>
            {updatedLabel ? <span>Updated {updatedLabel}</span> : null}
            {mapHref ? (
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#205c5a] dark:text-[#79b7ab] hover:opacity-75 transition-opacity"
              >
                Open map
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationCard;
