import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const LOCATION_FILE = path.resolve(process.cwd(), 'public/location.json');
const shouldCommit = process.argv.includes('--commit');
const shouldPush = process.argv.includes('--push');

const roundToCityLevel = (value) => Math.round(value * 10) / 10;

const tryIpApi = async () => {
  const res = await fetch('https://ipapi.co/json/', {
    headers: { 'User-Agent': 'dakibwa-location-updater/1.0' },
  });
  if (!res.ok) {
    throw new Error(`ipapi request failed: ${res.status}`);
  }

  const data = await res.json();

  if (!data.city || !data.country_name || !data.country_code || data.latitude == null || data.longitude == null) {
    throw new Error('Location response missing required fields');
  }

  return {
    city: String(data.city),
    country: String(data.country_name),
    countryCode: String(data.country_code).toUpperCase(),
    latitude: roundToCityLevel(Number(data.latitude)),
    longitude: roundToCityLevel(Number(data.longitude)),
    updatedAt: new Date().toISOString(),
  };
};

const tryIpWhoIs = async () => {
  const res = await fetch('https://ipwho.is/', {
    headers: { 'User-Agent': 'dakibwa-location-updater/1.0' },
  });
  if (!res.ok) {
    throw new Error(`ipwho.is request failed: ${res.status}`);
  }

  const data = await res.json();

  if (!data.success) {
    throw new Error(`ipwho.is request failed: ${data.message || 'unknown error'}`);
  }

  if (!data.city || !data.country || !data.country_code || data.latitude == null || data.longitude == null) {
    throw new Error('ipwho.is response missing required fields');
  }

  return {
    city: String(data.city),
    country: String(data.country),
    countryCode: String(data.country_code).toUpperCase(),
    latitude: roundToCityLevel(Number(data.latitude)),
    longitude: roundToCityLevel(Number(data.longitude)),
    updatedAt: new Date().toISOString(),
  };
};

const tryIpInfo = async () => {
  const res = await fetch('https://ipinfo.io/json', {
    headers: { 'User-Agent': 'dakibwa-location-updater/1.0' },
  });
  if (!res.ok) {
    throw new Error(`ipinfo request failed: ${res.status}`);
  }

  const data = await res.json();
  if (!data.city || !data.country || !data.loc) {
    throw new Error('ipinfo response missing required fields');
  }

  const [latRaw, lonRaw] = String(data.loc).split(',');
  const latitude = Number(latRaw);
  const longitude = Number(lonRaw);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('ipinfo response has invalid coordinates');
  }

  return {
    city: String(data.city),
    country: String(data.country),
    countryCode: String(data.country).toUpperCase(),
    latitude: roundToCityLevel(latitude),
    longitude: roundToCityLevel(longitude),
    updatedAt: new Date().toISOString(),
  };
};

const fetchCurrentCity = async () => {
  const providers = [
    { name: 'ipapi', fn: tryIpApi },
    { name: 'ipwho.is', fn: tryIpWhoIs },
    { name: 'ipinfo', fn: tryIpInfo },
  ];
  const errors = [];

  for (const provider of providers) {
    try {
      const location = await provider.fn();
      if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
        throw new Error('Provider returned non-finite coordinates');
      }

      console.log(`Location provider used: ${provider.name}`);
      return location;
    } catch (error) {
      errors.push(`${provider.name}: ${error.message}`);
    }
  }

  throw new Error(`All location providers failed. ${errors.join(' | ')}`);
};

const run = (args) => {
  const result = spawnSync(args[0], args.slice(1), { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${args.join(' ')}`);
  }
};

const main = async () => {
  const nextLocation = await fetchCurrentCity();

  let current = null;
  try {
    current = JSON.parse(readFileSync(LOCATION_FILE, 'utf8'));
  } catch {
    current = null;
  }

  const hasChange =
    !current ||
    current.city !== nextLocation.city ||
    current.country !== nextLocation.country ||
    current.countryCode !== nextLocation.countryCode ||
    current.latitude !== nextLocation.latitude ||
    current.longitude !== nextLocation.longitude;

  if (!hasChange) {
    console.log('No location change.');
    return;
  }

  writeFileSync(LOCATION_FILE, `${JSON.stringify(nextLocation, null, 2)}\n`, 'utf8');
  console.log(`Updated location: ${nextLocation.city}, ${nextLocation.country}`);

  if (!shouldCommit) return;

  run(['git', 'add', 'public/location.json']);
  run(['git', 'commit', '-m', `Update location: ${nextLocation.city}, ${nextLocation.country}`]);

  if (shouldPush) {
    run(['git', 'push']);
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
