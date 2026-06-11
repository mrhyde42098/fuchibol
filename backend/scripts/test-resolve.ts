import { fetchText } from '../src/scrapers/base.scraper.js';
import { profileByKey } from '../src/config/upstream-profiles.js';
import { decodeStreamXhdPlaybackUrl } from '../src/scrapers/stream-xhd.decoder.js';
import { resolveStreamXhdManifest } from '../src/scrapers/pelota-libre.scraper.js';

const profile = profileByKey('streamXhd');
const html = await fetchText('https://stream-xhd.com/live1.php?stream=espn', { profile });
console.log('len', html.length);
console.log('has tC', html.includes('tC='));
console.log('idx tC', html.indexOf('tC'));
const start = html.indexOf('playbackURL');
console.log('snippet', html.slice(start, start + 800));
const fnMatches = html.matchAll(/function\s+(\w+)\(\)\s*\{\s*return\s+(\d+)/g);
console.log('funcs', [...fnMatches].map((m) => [m[1], m[2]]));
console.log('decoded', decodeStreamXhdPlaybackUrl(html));
console.log('resolver', await resolveStreamXhdManifest('espn'));
