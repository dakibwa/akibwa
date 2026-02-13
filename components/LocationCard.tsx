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

          {updatedLabel ? <p className="text-xs text-[#8a8378] dark:text-[#8f8575]">Last updated: {updatedLabel}</p> : null}
        </div>
      )}
    </div>
  );
};

export default LocationCard;
