import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const LOCATION_FILE = path.resolve(process.cwd(), 'public/location.json');
const shouldCommit = process.argv.includes('--commit');
const shouldPush = process.argv.includes('--push');

const roundToCityLevel = (value) => Math.round(value * 10) / 10;

const fetchCurrentCity = async () => {
  const res = await fetch('https://ipapi.co/json/');
  if (!res.ok) {
    throw new Error(`ipapi request failed: ${res.status}`);
  }

  const data = await res.json();

  if (!data.city || !data.country_name || !data.country_code || !data.latitude || !data.longitude) {
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
