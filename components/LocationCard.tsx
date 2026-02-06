import React, { useEffect, useMemo, useState } from 'react';

interface OwnerLocation {
  city: string;
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
        if (!data.city || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
          throw new Error('Invalid location data');
        }

        setLocation({ status: 'ready', data });
      } catch {
        setLocation({ status: 'error' });
      }
    };

    loadLocation();
  }, []);

  const mapUrl = useMemo(() => {
    if (location.status !== 'ready') return '';

    const { latitude, longitude } = location.data;
    if (latitude === 0 && longitude === 0) return '';
    const west = longitude - 0.5;
    const east = longitude + 0.5;
    const south = latitude - 0.35;
    const north = latitude + 0.35;

    return `https://www.openstreetmap.org/export/embed.html?bbox=${west}%2C${south}%2C${east}%2C${north}&layer=mapnik&marker=${latitude}%2C${longitude}`;
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
            <span className="font-semibold text-[#1c1a16] dark:text-[#ece3d0]">{location.data.city}</span>.
          </p>
          {mapUrl ? (
            <div className="overflow-hidden rounded-xl border border-[#d8cfbe] dark:border-[#342f25]">
              <iframe
                title="Current city map"
                src={mapUrl}
                className="w-full h-48"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            <p className="text-sm text-[#696257] dark:text-[#a89d88]">Set coordinates in `/public/location.json` to show the map.</p>
          )}
          {location.data.updatedAt ? (
            <p className="text-xs text-[#8a8378] dark:text-[#8f8575]">Updated: {location.data.updatedAt}</p>
          ) : null}
          <p className="text-xs text-[#8a8378] dark:text-[#8f8575]">
            Owner-updated city-level location (not visitor location).
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationCard;
