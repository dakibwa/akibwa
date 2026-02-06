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
  const [imageFailed, setImageFailed] = useState(false);

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

  const artworkUrl = useMemo(() => {
    if (location.status !== 'ready') return '/location-art.png';
    const marker = encodeURIComponent(location.data.updatedAt || location.data.city);
    return `/location-art.png?v=${marker}`;
  }, [location]);

  useEffect(() => {
    setImageFailed(false);
  }, [artworkUrl]);

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

          <div className="overflow-hidden rounded-xl border border-[#d8cfbe] dark:border-[#342f25] bg-[#f8f4ea] dark:bg-[#1d1a15]">
            {imageFailed ? (
              <div className="h-52 flex items-center justify-center bg-[linear-gradient(135deg,rgba(32,92,90,0.2),rgba(216,207,190,0.24))] dark:bg-[linear-gradient(135deg,rgba(121,183,171,0.2),rgba(52,47,37,0.4))]">
                <span className="text-sm text-[#696257] dark:text-[#a89d88]">Generating city artwork...</span>
              </div>
            ) : (
              <img
                src={artworkUrl}
                alt={`Minimalist city artwork of ${location.data.city}`}
                className="w-full h-52 object-cover"
                loading="lazy"
                decoding="async"
                onError={() => setImageFailed(true)}
              />
            )}
          </div>

          {updatedLabel ? <p className="text-xs text-[#8a8378] dark:text-[#8f8575]">Last updated: {updatedLabel}</p> : null}
        </div>
      )}
    </div>
  );
};

export default LocationCard;
