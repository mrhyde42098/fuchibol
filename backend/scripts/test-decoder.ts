import { readFileSync } from 'node:fs';
import { fetchText } from '../src/scrapers/base.scraper.js';
import { profileByKey } from '../src/config/upstream-profiles.js';
import { decodeStreamXhdPlaybackUrl } from '../src/scrapers/stream-xhd.decoder.js';

const profile = profileByKey('streamXhd');
const html = await fetchText('https://stream-xhd.com/live1.php?stream=espn', { profile });

const arrayMatch = html.match(/playbackURL="",\w+=\[\];[\s\S]*?(\w+)=\s*(\[\[[\s\S]*?\]\])\s*;/);
console.log('arrayMatch', !!arrayMatch, arrayMatch?.[1]);
const kLine = html.match(/var\s+k\s*=\s*(\w+)\(\)\s*\+\s*(\w+)\(\)/);
console.log('kLine', kLine);
console.log('decoded', decodeStreamXhdPlaybackUrl(html));
