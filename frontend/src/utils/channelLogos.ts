const BRAND_COLORS: [RegExp, string, string][] = [
  [/espn/i, '#CC0000', 'ESPN'],
  [/fox\s*sport|f2usa|fs1usa|foxdeportes/i, '#003366', 'FOX'],
  [/disney/i, '#113CCF', 'D+'],
  [/tyc/i, '#00AEEF', 'TYC'],
  [/dsport/i, '#E31837', 'DS'],
  [/tnt\s*sport/i, '#FF6600', 'TNT'],
  [/paramount/i, '#0064FF', 'P+'],
  [/vix/i, '#FF0050', 'VIX'],
  [/telefe|telemundo|univision|unimas/i, '#6B2D8B', 'TV'],
  [/movistar/i, '#019DF4', 'M'],
  [/win\s*sport/i, '#F5C400', 'WIN'],
  [/gol\s*tv|golperu/i, '#FFD700', 'GOL'],
  [/liga\s*1|laliga/i, '#FF4500', 'LG'],
  [/nba/i, '#1D428A', 'NBA'],
  [/mlb/i, '#002D72', 'MLB'],
  [/nhl/i, '#000000', 'NHL'],
  [/amazon|prime/i, '#00A8E1', 'AMZ'],
  [/bein/i, '#6C2DC7', 'BEIN'],
  [/sportv|sporttv/i, '#00A651', 'SP'],
  [/dazn/i, '#F8F8F5', 'DAZN'],
  [/peacock/i, '#000000', 'PC'],
  [/azteca/i, '#00A651', 'AZ'],
  [/tudn/i, '#006341', 'TUDN'],
  [/caracol|rcn/i, '#FFD100', 'CO'],
];

const LOGO_URLS: [RegExp, string][] = [
  [/espn/i, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png'],
  [/fox\s*sport/i, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Fox_Sports_wordmark.svg/320px-Fox_Sports_wordmark.svg.png'],
  [/disney/i, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Disney%2B_logo.svg/320px-Disney%2B_logo.svg.png'],
  [/tyc/i, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/TyC_Sports_logo.svg/320px-TyC_Sports_logo.svg.png'],
  [/nba/i, 'https://upload.wikimedia.org/wikipedia/en/thumb/0/03/National_Basketball_Association_logo.svg/200px-National_Basketball_Association_logo.svg.png'],
  [/mlb/i, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Major_League_Baseball_logo.svg/200px-Major_League_Baseball_logo.svg.png'],
  [/nhl/i, 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3a/05_NHL_Shield.svg/200px-05_NHL_Shield.svg.png'],
];

export interface ChannelVisual {
  logoUrl: string | null;
  initials: string;
  accent: string;
}

function initialsFromName(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9\s+]/g, '').trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function resolveChannelVisual(name: string, apiLogo?: string): ChannelVisual {
  if (apiLogo?.startsWith('http')) {
    return { logoUrl: apiLogo, initials: initialsFromName(name), accent: '#0066ff' };
  }

  for (const [pattern, url] of LOGO_URLS) {
    if (pattern.test(name)) {
      return { logoUrl: url, initials: initialsFromName(name), accent: '#0066ff' };
    }
  }

  for (const [pattern, color, label] of BRAND_COLORS) {
    if (pattern.test(name)) {
      return { logoUrl: null, initials: label, accent: color };
    }
  }

  return { logoUrl: null, initials: initialsFromName(name), accent: '#0066ff' };
}
