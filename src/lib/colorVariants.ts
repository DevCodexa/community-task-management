export type ThemeColorName =
  | 'blue'
  | 'green'
  | 'orange'
  | 'yellow'
  | 'red'
  | 'pink'
  | 'purple';

export type ThemeColorVariant = {
  name: ThemeColorName;
  hex: string;

  // UI parçalarında kullanılacak hazır değerler
  text: string;
  border: string;
  ring: string;

  // Glow/gradient üretimi için
  glowRGBA: string; // e.g. "rgba(116,192,252,0.30)"
  glowRGBA2: string; // daha düşük yoğunluk

  // Kart arka plan/parlama için hafif gradient
  gradientFrom: string;
};

export const COLOR_VARIANTS: Record<ThemeColorName, ThemeColorVariant> = {
  blue: {
    name: 'blue',
    hex: '#74c0fc',
    text: '#7dd3fc',
    border: 'rgba(116, 192, 252, 0.35)',
    ring: 'rgba(116, 192, 252, 0.35)',
    glowRGBA: 'rgba(116, 192, 252, 0.38)',
    glowRGBA2: 'rgba(116, 192, 252, 0.18)',
    gradientFrom: 'rgba(116, 192, 252, 0.22)',
  },
  green: {
    name: 'green',
    hex: '#34d399',
    text: '#6ee7b7',
    border: 'rgba(52, 211, 153, 0.35)',
    ring: 'rgba(52, 211, 153, 0.35)',
    glowRGBA: 'rgba(52, 211, 153, 0.38)',
    glowRGBA2: 'rgba(52, 211, 153, 0.18)',
    gradientFrom: 'rgba(52, 211, 153, 0.22)',
  },
  orange: {
    name: 'orange',
    hex: '#fb923c',
    text: '#fdba74',
    border: 'rgba(251, 146, 60, 0.35)',
    ring: 'rgba(251, 146, 60, 0.35)',
    glowRGBA: 'rgba(251, 146, 60, 0.38)',
    glowRGBA2: 'rgba(251, 146, 60, 0.18)',
    gradientFrom: 'rgba(251, 146, 60, 0.22)',
  },
  yellow: {
    name: 'yellow',
    hex: '#fbbf24',
    text: '#fde68a',
    border: 'rgba(251, 191, 36, 0.35)',
    ring: 'rgba(251, 191, 36, 0.35)',
    glowRGBA: 'rgba(251, 191, 36, 0.38)',
    glowRGBA2: 'rgba(251, 191, 36, 0.18)',
    gradientFrom: 'rgba(251, 191, 36, 0.22)',
  },
  red: {
    name: 'red',
    hex: '#f87171',
    text: '#fca5a5',
    border: 'rgba(248, 113, 113, 0.35)',
    ring: 'rgba(248, 113, 113, 0.35)',
    glowRGBA: 'rgba(248, 113, 113, 0.38)',
    glowRGBA2: 'rgba(248, 113, 113, 0.18)',
    gradientFrom: 'rgba(248, 113, 113, 0.22)',
  },
  pink: {
    name: 'pink',
    hex: '#f472b6',
    text: '#f9a8d4',
    border: 'rgba(244, 114, 182, 0.35)',
    ring: 'rgba(244, 114, 182, 0.35)',
    glowRGBA: 'rgba(244, 114, 182, 0.38)',
    glowRGBA2: 'rgba(244, 114, 182, 0.18)',
    gradientFrom: 'rgba(244, 114, 182, 0.22)',
  },
  purple: {
    name: 'purple',
    hex: '#a78bfa',
    text: '#c4b5fd',
    border: 'rgba(167, 139, 250, 0.35)',
    ring: 'rgba(167, 139, 250, 0.35)',
    glowRGBA: 'rgba(167, 139, 250, 0.38)',
    glowRGBA2: 'rgba(167, 139, 250, 0.18)',
    gradientFrom: 'rgba(167, 139, 250, 0.22)',
  },
};

const ORDER: ThemeColorName[] = ['blue', 'green', 'orange', 'yellow', 'red', 'pink', 'purple'];

const hashStringToInt = (input: string) => {
  // deterministic, lightweight hash
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // convert to 32bit integer
  }
  return Math.abs(hash);
};

export const getColorVariantById = (id: string | undefined | null): ThemeColorVariant => {
  const safe = (id ?? '').trim();
  const seed = safe.length ? safe : 'fallback';
  const idx = hashStringToInt(seed) % ORDER.length;
  const key = ORDER[idx];
  return COLOR_VARIANTS[key];
};

