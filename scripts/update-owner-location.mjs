import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const LOCATION_FILE = path.resolve(process.cwd(), 'public/location.json');
const ART_FILE = path.resolve(process.cwd(), 'public/location-art.png');
const shouldCommit = process.argv.includes('--commit');
const shouldPush = process.argv.includes('--push');
const openAiApiKey = process.env.OPENAI_API_KEY;

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

const createLocationPrompt = (location) =>
  [
    `Create a minimalist, elegant, modern artwork that represents ${location.city}, ${location.country}.`,
    'Use geometric forms, subtle texture, soft contrast, and a clean composition.',
    'No text, no labels, no logos, no people, no flags.',
    'Style: refined editorial poster, calm and tasteful, highly minimal.',
  ].join(' ');

const generateCityArtwork = async (location) => {
  if (!openAiApiKey) {
    console.log('OPENAI_API_KEY missing, skipping artwork generation.');
    return false;
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: createLocationPrompt(location),
      size: '1024x1024',
    }),
  });

  if (!response.ok) {
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const result = await response.json();
  const b64 = result?.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('Image generation returned no image data');
  }

  const buffer = Buffer.from(b64, 'base64');
  writeFileSync(ART_FILE, buffer);
  console.log(`Generated artwork for ${location.city}, ${location.country}`);
  return true;
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
  const hasArt = existsSync(ART_FILE);

  if (hasChange) {
    writeFileSync(LOCATION_FILE, `${JSON.stringify(nextLocation, null, 2)}\n`, 'utf8');
    console.log(`Updated location: ${nextLocation.city}, ${nextLocation.country}`);
  } else {
    console.log('No location change.');
  }
  let artChanged = false;

  if (hasChange || !hasArt) {
    try {
      artChanged = await generateCityArtwork(nextLocation);
    } catch (error) {
      console.error(error.message);
    }
  }

  if (!shouldCommit) return;

  if (!hasChange && !artChanged) {
    console.log('No files changed, skipping commit.');
    return;
  }

  const filesToAdd = ['public/location.json'];
  if (artChanged || existsSync(ART_FILE)) {
    filesToAdd.push('public/location-art.png');
  }

  run(['git', 'add', ...filesToAdd]);
  run(['git', 'commit', '-m', `Update location: ${nextLocation.city}, ${nextLocation.country}`]);

  if (shouldPush) {
    run(['git', 'push']);
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
