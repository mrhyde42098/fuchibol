const W = 'https://upload.wikimedia.org/wikipedia/commons/thumb';
const E = 'https://upload.wikimedia.org/wikipedia/en/thumb';

const L = {
  espn: '/logos/espn.svg',
  fox: '/logos/fox.svg',
  win: '/logos/winsports.svg',
  tyc: '/logos/tyc.svg',
  dsports: '/logos/dsports.svg',
  tudn: '/logos/tudn.svg',
  tnt: '/logos/tnt.svg',
  golperu: '/logos/golperu.svg',
  disney: '/logos/disney.svg',
  telefe: '/logos/telefe.svg',
  movistar: '/logos/movistar.svg',
  laliga: '/logos/laliga.svg',
  telemundo: '/logos/telemundo.svg',
  bein: '/logos/bein.svg',
  paramount: '/logos/paramount.svg',
  univision: '/logos/univision.svg',
  vix: '/logos/vix.svg',
  azteca: '/logos/azteca.svg',
  sportv: '/logos/sportv.svg',
  premiere: '/logos/premiere.svg',
  goltv: '/logos/golperu.svg',
} as const;

/** Logos por slug de canal (id normalizado del backend) */
const LOGO_BY_SLUG_BASE: Record<string, string> = {
  espn: L.espn,
  espn2: L.espn,
  espn2ar: L.espn,
  espn3: L.espn,
  espn4: L.espn,
  espn5: L.espn,
  espnar: L.espn,
  espndeportes: L.espn,
  'premium-v2-espn': L.espn,
  'premium-v2-espn2': L.espn,
  'premium-v2-espnar': L.espn,
  'premium-v2-espndeportes': L.espn,
  'premium-v2-espnpremium': L.espn,
  'tvtvhd-espn': L.espn,
  'tvtvhd-espn2': L.espn,
  disney1: L.disney,
  disney2: L.disney,
  vix1: L.vix,
  vix2: L.vix,
  amazon1: `${W}/1/11/Amazon_Prime_Video_logo.svg/320px-Amazon_Prime_Video_logo.svg.png`,
  nba1: `${E}/0/03/National_Basketball_Association_logo.svg/200px-National_Basketball_Association_logo.svg.png`,
  dsportsar: L.dsports,
  'premium-v2-dsports': L.dsports,
  'premium-v2-dsports2': L.dsports,
  'tvtvhd-dsports': L.dsports,
  telefe: L.telefe,
  'premium-v2-telefe': L.telefe,
  paramount1: L.paramount,
  tudnmx: L.tudn,
  'premium-v2-tudn_mx': L.tudn,
  azteca7: L.azteca,
  americatv: `${W}/4/4e/America_Television_logo.svg/320px-America_Television_logo.svg.png`,
  evento3: '/logos/eventos.svg',
  evento5: `${W}/7/7a/RCN_Televisi%C3%B3n_logo.svg/320px-RCN_Televisi%C3%B3n_logo.svg.png`,
  evento6: `${W}/e/e4/Caracol_Televisi%C3%B3n_logo.svg/320px-Caracol_Televisi%C3%B3n_logo.svg.png`,
  evento10: '/logos/cazetv.svg',
  peacock1: `${W}/d/d3/NBCUniversal_Peacock_Logo.svg/320px-NBCUniversal_Peacock_Logo.svg.png`,
  telemundo: L.telemundo,
  tycsports: L.tyc,
  'premium-v2-tycsports': L.tyc,
  'tvtvhd-tycsports': L.tyc,
  sporttvbr1: L.sportv,
  f2usa: L.fox,
  fs1usa: L.fox,
  'premium-v2-foxsports': L.fox,
  'premium-v2-foxsports2': L.fox,
  'tvtvhd-foxsports': L.fox,
  canal5mx: L.azteca,
  genpy: '/logos/gen.svg',
  trecepy: '/logos/trece.svg',
  la1es: '/logos/rtve.svg',
  laligahypermotion: L.laliga,
  'premium-v2-laligatvbar': L.laliga,
  'premium-v2-laligahypermotion': L.laliga,
  dsports: L.dsports,
  dsports2: L.dsports,
  dsportsplus: L.dsports,
  foxsports: L.fox,
  foxsports2: L.fox,
  foxsports3: L.fox,
  foxsports1_usa: L.fox,
  foxsports2_usa: L.fox,
  foxsportsmx: L.fox,
  foxsports2mx: L.fox,
  foxsports3mx: L.fox,
  foxsportspremium: L.fox,
  foxdeportes: L.fox,
  tntsports: L.tnt,
  'premium-v2-tntsports': L.tnt,
  espnpremium: L.espn,
  tycinternacional: L.tyc,
  liga1max: '/logos/liga1.svg',
  movistar: L.movistar,
  'tvtvhd-movistar': L.movistar,
  winsports: L.win,
  winsports2: L.win,
  winsportsplus: L.win,
  'premium-v2-winsports': L.win,
  'premium-v2-winsports2': L.win,
  'tvtvhd-winsports2': L.win,
  tudn: L.tudn,
  tudn_mx: L.tudn,
  canal5: L.azteca,
  azteca_deportes: L.azteca,
  beinsportes: L.bein,
  beinsport_xtra_espanol: L.bein,
  unimas: L.univision,
  univision: L.univision,
  dazn1: `${W}/0/0d/DAZN_Logo.svg/320px-DAZN_Logo.svg.png`,
  goltv: L.goltv,
  golperu: L.golperu,
  'tvtvhd-golperu': L.golperu,
  'premium-v2-liga1max': '/logos/liga1.svg',
  'tvtvhd-liga1max': '/logos/liga1.svg',
  vtvplus: '/logos/vtv.svg',
  sportv: L.sportv,
  sportv2: L.sportv,
  sportv3: L.sportv,
  premiere1: L.premiere,
  premiere2: L.premiere,
  premiere3: L.premiere,
  premiere5: L.premiere,
  espnmx: L.espn,
  espn2mx: L.espn,
  espn3mx: L.espn,
  espn4mx: L.espn,
  espn1_nl: L.espn,
  espn2_nl: L.espn,
  espn3_nl: L.espn,
  sky_sports_laliga: L.laliga,
  laligatvbar: L.laliga,
  ligadecampeones2: L.laliga,
  ecdf_ligapro: '/logos/ligapro.svg',
  tvc_deportes: '/logos/ligapro.svg',
  usanetwork: `${W}/8/8a/USA_Network_logo_%282016%29.svg/320px-USA_Network_logo_%282016%29.svg.png`,
};

const LOGO_BY_SLUG: Record<string, string> = { ...LOGO_BY_SLUG_BASE };
for (const [slug, url] of Object.entries(LOGO_BY_SLUG_BASE)) {
  if (slug.startsWith('premium-v2-') || slug.startsWith('tvtvhd-')) continue;
  const p1 = `premium-v2-${slug}`;
  const p2 = `tvtvhd-${slug}`;
  if (!(p1 in LOGO_BY_SLUG)) LOGO_BY_SLUG[p1] = url;
  if (!(p2 in LOGO_BY_SLUG)) LOGO_BY_SLUG[p2] = url;
}

/** Logos por patrón en nombre o slug parcial */
const LOGO_PATTERNS: [RegExp, string][] = [
  [/disney/i, L.disney],
  [/\bvix\b|vix\s*\+|vix\s*\d/i, L.vix],
  [/amazon|prime\s*video/i, `${W}/1/11/Amazon_Prime_Video_logo.svg/320px-Amazon_Prime_Video_logo.svg.png`],
  [/nba/i, `${E}/0/03/National_Basketball_Association_logo.svg/200px-National_Basketball_Association_logo.svg.png`],
  [/dsport|directv\s*sport/i, L.dsports],
  [/telefe/i, L.telefe],
  [/paramount/i, L.paramount],
  [/tudn/i, L.tudn],
  [/azteca/i, L.azteca],
  [/america\s*tv|americatv/i, `${W}/4/4e/America_Television_logo.svg/320px-America_Television_logo.svg.png`],
  [/caracol/i, `${W}/e/e4/Caracol_Televisi%C3%B3n_logo.svg/320px-Caracol_Televisi%C3%B3n_logo.svg.png`],
  [/rcn|deportes\s*rcn/i, `${W}/7/7a/RCN_Televisi%C3%B3n_logo.svg/320px-RCN_Televisi%C3%B3n_logo.svg.png`],
  [/peacock/i, `${W}/d/d3/NBCUniversal_Peacock_Logo.svg/320px-NBCUniversal_Peacock_Logo.svg.png`],
  [/telemundo/i, L.telemundo],
  [/tyc/i, L.tyc],
  [/espn/i, L.espn],
  [/fox\s*sport|foxdeportes|f2usa|fs1usa/i, L.fox],
  [/tnt\s*sport/i, L.tnt],
  [/movistar/i, L.movistar],
  [/win\s*sport/i, L.win],
  [/gol\s*tv|golperu/i, L.golperu],
  [/liga\s*1|liga1/i, '/logos/liga1.svg'],
  [/laliga/i, L.laliga],
  [/mlb/i, `${W}/a/a6/Major_League_Baseball_logo.svg/200px-Major_League_Baseball_logo.svg.png`],
  [/nhl/i, `${E}/3/3a/05_NHL_Shield.svg/200px-05_NHL_Shield.svg.png`],
  [/bein/i, L.bein],
  [/sportv|sporttv/i, L.sportv],
  [/dazn/i, `${W}/0/0d/DAZN_Logo.svg/320px-DAZN_Logo.svg.png`],
  [/univision/i, L.univision],
  [/unimas/i, L.univision],
  [/premiere/i, L.premiere],
  [/caz[eé]tv|cazetv/i, '/logos/cazetv.svg'],
  [/canal\s*5/i, L.azteca],
  [/evento/i, '/logos/eventos.svg'],
  [/vtv/i, '/logos/vtv.svg'],
  [/sky\s*sport/i, L.laliga],
  [/ecdf|ligapro/i, '/logos/ligapro.svg'],
];

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

export interface ChannelVisual {
  logoUrl: string | null;
  initials: string;
  accent: string;
  darkBg: boolean;
}

function initialsFromName(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9\s+]/g, '').trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function normalizeSlug(id?: string): string {
  if (!id) return '';
  return id
    .replace(/^premium-v2-/, '')
    .replace(/^tvtvhd-/, '')
    .toLowerCase();
}

function matchLogo(name: string, channelId?: string): string | null {
  if (channelId && LOGO_BY_SLUG[channelId]) return LOGO_BY_SLUG[channelId];

  const slug = normalizeSlug(channelId);
  if (slug && LOGO_BY_SLUG[slug]) return LOGO_BY_SLUG[slug];

  const haystack = `${name} ${channelId ?? ''} ${slug}`;
  for (const [pattern, url] of LOGO_PATTERNS) {
    if (pattern.test(haystack)) return url;
  }
  return null;
}

function needsDarkBg(url: string): boolean {
  return /disney|peacock|dazn|laliga|nba|nhl/i.test(url);
}

/** URL alternativa si falla la carga (Wikimedia) */
export function fallbackLogoUrl(logoUrl: string): string | null {
  if (logoUrl.startsWith('/logos/')) return null;
  if (/espn/i.test(logoUrl)) return L.espn;
  if (/fox/i.test(logoUrl)) return L.fox;
  if (/win/i.test(logoUrl)) return L.win;
  if (/tyc/i.test(logoUrl)) return L.tyc;
  if (/directv|dsport/i.test(logoUrl)) return L.dsports;
  return null;
}

export function resolveChannelVisual(name: string, apiLogo?: string, channelId?: string): ChannelVisual {
  const initials = initialsFromName(name);

  if (apiLogo?.startsWith('http') || apiLogo?.startsWith('/')) {
    return { logoUrl: apiLogo, initials, accent: '#0066ff', darkBg: needsDarkBg(apiLogo) };
  }

  const logoUrl = matchLogo(name, channelId);
  if (logoUrl) {
    return { logoUrl, initials, accent: '#0066ff', darkBg: needsDarkBg(logoUrl) };
  }

  for (const [pattern, color, label] of BRAND_COLORS) {
    if (pattern.test(name) || (channelId && pattern.test(channelId))) {
      return { logoUrl: null, initials: label, accent: color, darkBg: false };
    }
  }

  return { logoUrl: null, initials, accent: '#0066ff', darkBg: false };
}
