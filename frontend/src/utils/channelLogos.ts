const W = 'https://upload.wikimedia.org/wikipedia/commons/thumb';
const E = 'https://upload.wikimedia.org/wikipedia/en/thumb';

/** Logos por slug de canal (id normalizado del backend) */
const LOGO_BY_SLUG: Record<string, string> = {
  espn: `${W}/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png`,
  espn2: `${W}/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png`,
  espn2ar: `${W}/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png`,
  espn3: `${W}/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png`,
  espn4: `${W}/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png`,
  espn5: `${W}/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png`,
  espnar: `${W}/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png`,
  espndeportes: `${W}/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png`,
  disney1: `${W}/3/3e/Disney%2B_logo.svg/320px-Disney%2B_logo.svg.png`,
  disney2: `${W}/3/3e/Disney%2B_logo.svg/320px-Disney%2B_logo.svg.png`,
  vix1: `${W}/6/69/ViX_logo.svg/320px-ViX_logo.svg.png`,
  vix2: `${W}/6/69/ViX_logo.svg/320px-ViX_logo.svg.png`,
  amazon1: `${W}/1/11/Amazon_Prime_Video_logo.svg/320px-Amazon_Prime_Video_logo.svg.png`,
  nba1: `${E}/0/03/National_Basketball_Association_logo.svg/200px-National_Basketball_Association_logo.svg.png`,
  dsportsar: `${W}/4/4c/DirecTV_Sports_Latin_America_logo.svg/320px-DirecTV_Sports_Latin_America_logo.svg.png`,
  telefe: `${W}/9/9c/Telefe_logo.svg/320px-Telefe_logo.svg.png`,
  paramount1: `${W}/4/4e/Paramount%2B_logo.svg/320px-Paramount%2B_logo.svg.png`,
  tudnmx: `${W}/d/d3/TUDN_Logo.svg/320px-TUDN_Logo.svg.png`,
  azteca7: `${W}/5/5a/TV_Azteca_logo_%282017%29.svg/320px-TV_Azteca_logo_%282017%29.svg.png`,
  americatv: `${W}/4/4e/America_Television_logo.svg/320px-America_Television_logo.svg.png`,
  evento3: '/logos/eventos.svg',
  evento5: `${W}/7/7a/RCN_Televisi%C3%B3n_logo.svg/320px-RCN_Televisi%C3%B3n_logo.svg.png`,
  evento6: `${W}/e/e4/Caracol_Televisi%C3%B3n_logo.svg/320px-Caracol_Televisi%C3%B3n_logo.svg.png`,
  evento10: '/logos/cazetv.svg',
  peacock1: `${W}/d/d3/NBCUniversal_Peacock_Logo.svg/320px-NBCUniversal_Peacock_Logo.svg.png`,
  telemundo: `${W}/6/68/Telemundo_logo_2018.svg/320px-Telemundo_logo_2018.svg.png`,
  tycsports: `${W}/5/54/TyC_Sports_logo.svg/320px-TyC_Sports_logo.svg.png`,
  sporttvbr1: `${W}/8/8e/Sport_TV_logo.svg/320px-Sport_TV_logo.svg.png`,
  f2usa: `${W}/e/e9/Fox_Sports_wordmark.svg/320px-Fox_Sports_wordmark.svg.png`,
  fs1usa: `${W}/e/e9/Fox_Sports_wordmark.svg/320px-Fox_Sports_wordmark.svg.png`,
  canal5mx: `${W}/5/5a/TV_Azteca_logo_%282017%29.svg/320px-TV_Azteca_logo_%282017%29.svg.png`,
  genpy: '/logos/gen.svg',
  trecepy: '/logos/trece.svg',
  la1es: '/logos/rtve.svg',
  laligahypermotion: `${W}/9/9d/LaLiga.svg/320px-LaLiga.svg.png`,
  dsports: `${W}/4/4c/DirecTV_Sports_Latin_America_logo.svg/320px-DirecTV_Sports_Latin_America_logo.svg.png`,
  dsports2: `${W}/4/4c/DirecTV_Sports_Latin_America_logo.svg/320px-DirecTV_Sports_Latin_America_logo.svg.png`,
  dsportsplus: `${W}/4/4c/DirecTV_Sports_Latin_America_logo.svg/320px-DirecTV_Sports_Latin_America_logo.svg.png`,
  foxsports: `${W}/e/e9/Fox_Sports_wordmark.svg/320px-Fox_Sports_wordmark.svg.png`,
  foxsports2: `${W}/e/e9/Fox_Sports_wordmark.svg/320px-Fox_Sports_wordmark.svg.png`,
  foxsports3: `${W}/e/e9/Fox_Sports_wordmark.svg/320px-Fox_Sports_wordmark.svg.png`,
  foxsports1_usa: `${W}/e/e9/Fox_Sports_wordmark.svg/320px-Fox_Sports_wordmark.svg.png`,
  foxsports2_usa: `${W}/e/e9/Fox_Sports_wordmark.svg/320px-Fox_Sports_wordmark.svg.png`,
  foxsportsmx: `${W}/e/e9/Fox_Sports_wordmark.svg/320px-Fox_Sports_wordmark.svg.png`,
  foxsports2mx: `${W}/e/e9/Fox_Sports_wordmark.svg/320px-Fox_Sports_wordmark.svg.png`,
  foxsports3mx: `${W}/e/e9/Fox_Sports_wordmark.svg/320px-Fox_Sports_wordmark.svg.png`,
  foxsportspremium: `${W}/e/e9/Fox_Sports_wordmark.svg/320px-Fox_Sports_wordmark.svg.png`,
  foxdeportes: `${W}/e/e9/Fox_Sports_wordmark.svg/320px-Fox_Sports_wordmark.svg.png`,
  tntsports: `${W}/0/04/TNT_Sports_2021_logo.svg/320px-TNT_Sports_2021_logo.svg.png`,
  espnpremium: `${W}/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png`,
  tycinternacional: `${W}/5/54/TyC_Sports_logo.svg/320px-TyC_Sports_logo.svg.png`,
  liga1max: '/logos/liga1.svg',
  movistar: `${W}/4/4e/Movistar_logo_2022.svg/320px-Movistar_logo_2022.svg.png`,
  winsports: `${W}/8/8a/Win_Sports_logo.svg/320px-Win_Sports_logo.svg.png`,
  winsports2: `${W}/8/8a/Win_Sports_logo.svg/320px-Win_Sports_logo.svg.png`,
  tudn: `${W}/d/d3/TUDN_Logo.svg/320px-TUDN_Logo.svg.png`,
  tudn_mx: `${W}/d/d3/TUDN_Logo.svg/320px-TUDN_Logo.svg.png`,
  canal5: `${W}/5/5a/TV_Azteca_logo_%282017%29.svg/320px-TV_Azteca_logo_%282017%29.svg.png`,
  azteca_deportes: `${W}/5/5a/TV_Azteca_logo_%282017%29.svg/320px-TV_Azteca_logo_%282017%29.svg.png`,
  beinsportes: `${W}/3/3b/BeIN_Sports_logo.svg/320px-BeIN_Sports_logo.svg.png`,
  beinsport_xtra_espanol: `${W}/3/3b/BeIN_Sports_logo.svg/320px-BeIN_Sports_logo.svg.png`,
  unimas: `${W}/8/84/Univision_logo_2019.svg/320px-Univision_logo_2019.svg.png`,
  univision: `${W}/8/84/Univision_logo_2019.svg/320px-Univision_logo_2019.svg.png`,
  dazn1: `${W}/0/0d/DAZN_Logo.svg/320px-DAZN_Logo.svg.png`,
  goltv: `${W}/9/9a/GolTV_logo.svg/320px-GolTV_logo.svg.png`,
  golperu: `${W}/9/9a/GolTV_logo.svg/320px-GolTV_logo.svg.png`,
  vtvplus: '/logos/vtv.svg',
  sportv: `${W}/8/8e/Sport_TV_logo.svg/320px-Sport_TV_logo.svg.png`,
  sportv2: `${W}/8/8e/Sport_TV_logo.svg/320px-Sport_TV_logo.svg.png`,
  sportv3: `${W}/8/8e/Sport_TV_logo.svg/320px-Sport_TV_logo.svg.png`,
  premiere1: '/logos/premiere.svg',
  premiere2: '/logos/premiere.svg',
  premiere3: '/logos/premiere.svg',
  premiere5: '/logos/premiere.svg',
  espnmx: `${W}/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png`,
  espn2mx: `${W}/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png`,
  espn3mx: `${W}/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png`,
  espn4mx: `${W}/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png`,
  espn1_nl: `${W}/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png`,
  espn2_nl: `${W}/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png`,
  espn3_nl: `${W}/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png`,
  sky_sports_laliga: `${W}/3/3e/Sky_Sports_logo_2020.svg/320px-Sky_Sports_logo_2020.svg.png`,
  laligatvbar: `${W}/9/9d/LaLiga.svg/320px-LaLiga.svg.png`,
  ligadecampeones2: `${W}/9/9d/LaLiga.svg/320px-LaLiga.svg.png`,
  ecdf_ligapro: '/logos/ligapro.svg',
  tvc_deportes: '/logos/ligapro.svg',
  usanetwork: `${W}/8/8a/USA_Network_logo_%282016%29.svg/320px-USA_Network_logo_%282016%29.svg.png`,
};

/** Logos por patrón en nombre o slug parcial */
const LOGO_PATTERNS: [RegExp, string][] = [
  [/disney/i, `${W}/3/3e/Disney%2B_logo.svg/320px-Disney%2B_logo.svg.png`],
  [/\bvix\b|vix\s*\+|vix\s*\d/i, `${W}/6/69/ViX_logo.svg/320px-ViX_logo.svg.png`],
  [/amazon|prime\s*video/i, `${W}/1/11/Amazon_Prime_Video_logo.svg/320px-Amazon_Prime_Video_logo.svg.png`],
  [/nba/i, `${E}/0/03/National_Basketball_Association_logo.svg/200px-National_Basketball_Association_logo.svg.png`],
  [/dsport|directv\s*sport/i, `${W}/4/4c/DirecTV_Sports_Latin_America_logo.svg/320px-DirecTV_Sports_Latin_America_logo.svg.png`],
  [/telefe/i, `${W}/9/9c/Telefe_logo.svg/320px-Telefe_logo.svg.png`],
  [/paramount/i, `${W}/4/4e/Paramount%2B_logo.svg/320px-Paramount%2B_logo.svg.png`],
  [/tudn/i, `${W}/d/d3/TUDN_Logo.svg/320px-TUDN_Logo.svg.png`],
  [/azteca/i, `${W}/5/5a/TV_Azteca_logo_%282017%29.svg/320px-TV_Azteca_logo_%282017%29.svg.png`],
  [/america\s*tv|americatv/i, `${W}/4/4e/America_Television_logo.svg/320px-America_Television_logo.svg.png`],
  [/caracol/i, `${W}/e/e4/Caracol_Televisi%C3%B3n_logo.svg/320px-Caracol_Televisi%C3%B3n_logo.svg.png`],
  [/rcn|deportes\s*rcn/i, `${W}/7/7a/RCN_Televisi%C3%B3n_logo.svg/320px-RCN_Televisi%C3%B3n_logo.svg.png`],
  [/peacock/i, `${W}/d/d3/NBCUniversal_Peacock_Logo.svg/320px-NBCUniversal_Peacock_Logo.svg.png`],
  [/telemundo/i, `${W}/6/68/Telemundo_logo_2018.svg/320px-Telemundo_logo_2018.svg.png`],
  [/tyc/i, `${W}/5/54/TyC_Sports_logo.svg/320px-TyC_Sports_logo.svg.png`],
  [/espn/i, `${W}/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png`],
  [/fox\s*sport|foxdeportes|f2usa|fs1usa/i, `${W}/e/e9/Fox_Sports_wordmark.svg/320px-Fox_Sports_wordmark.svg.png`],
  [/tnt\s*sport/i, `${W}/0/04/TNT_Sports_2021_logo.svg/320px-TNT_Sports_2021_logo.svg.png`],
  [/movistar/i, `${W}/4/4e/Movistar_logo_2022.svg/320px-Movistar_logo_2022.svg.png`],
  [/win\s*sport/i, `${W}/8/8a/Win_Sports_logo.svg/320px-Win_Sports_logo.svg.png`],
  [/gol\s*tv|golperu/i, `${W}/9/9a/GolTV_logo.svg/320px-GolTV_logo.svg.png`],
  [/liga\s*1|liga1/i, '/logos/liga1.svg'],
  [/laliga/i, `${W}/9/9d/LaLiga.svg/320px-LaLiga.svg.png`],
  [/mlb/i, `${W}/a/a6/Major_League_Baseball_logo.svg/200px-Major_League_Baseball_logo.svg.png`],
  [/nhl/i, `${E}/3/3a/05_NHL_Shield.svg/200px-05_NHL_Shield.svg.png`],
  [/bein/i, `${W}/3/3b/BeIN_Sports_logo.svg/320px-BeIN_Sports_logo.svg.png`],
  [/sportv|sporttv/i, `${W}/8/8e/Sport_TV_logo.svg/320px-Sport_TV_logo.svg.png`],
  [/dazn/i, `${W}/0/0d/DAZN_Logo.svg/320px-DAZN_Logo.svg.png`],
  [/univision/i, `${W}/8/84/Univision_logo_2019.svg/320px-Univision_logo_2019.svg.png`],
  [/unimas/i, `${W}/8/84/Univision_logo_2019.svg/320px-Univision_logo_2019.svg.png`],
  [/premiere/i, '/logos/premiere.svg'],
  [/caz[eé]tv|cazetv/i, '/logos/cazetv.svg'],
  [/canal\s*5/i, `${W}/5/5a/TV_Azteca_logo_%282017%29.svg/320px-TV_Azteca_logo_%282017%29.svg.png`],
  [/evento/i, '/logos/eventos.svg'],
  [/vtv/i, '/logos/vtv.svg'],
  [/sky\s*sport/i, `${W}/3/3e/Sky_Sports_logo_2020.svg/320px-Sky_Sports_logo_2020.svg.png`],
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
