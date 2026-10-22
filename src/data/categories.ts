export type OfficialCategorySlug =
  | 'blok-mesin'
  | 'shockbreaker'
  | 'pengereman'
  | 'velg'
  | 'accesories'
  | 'part-cvt'
  | 'noken-as'
  | 'lain-lain'
  | (string & {});

export interface CategoryItem {
  id: string;
  title: string;
  subtitle: string;
  bikeFilter?: string | null;
  categoryFilter: string;
  badgeText: string;
  count: number;
  icon: string;
  tagline: string;
}

export const OFFICIAL_CATEGORIES: {
  slug: string;
  label: string;
  icon: string;
  tagline: string;
  badge: string;
}[] = [
  {
    slug: 'blok-mesin',
    label: 'Blok Mesin',
    icon: 'Flame',
    tagline: 'Blok silinder ceramic, piston forged, dan bore up kit racing',
    badge: 'Power Max',
  },
  {
    slug: 'shockbreaker',
    label: 'Shockbreaker',
    icon: 'ShieldCheck',
    tagline: 'Suspensi tabung klik rebound & kompresi harian maupun balap',
    badge: 'Suspensi',
  },
  {
    slug: 'pengereman',
    label: 'Pengereman',
    icon: 'ShieldCheck',
    tagline: 'Master rem radial, kaliper monoblock, disc floating, selang braided',
    badge: 'Safety First',
  },
  {
    slug: 'velg',
    label: 'Velg',
    icon: 'Disc',
    tagline: 'Velg racing aluminium casting & forged ringan presisi tinggi',
    badge: 'Ringan & Kuat',
  },
  {
    slug: 'accesories',
    label: 'Accesories',
    icon: 'Sparkles',
    tagline: 'Aksesoris CNC, spion carbon, handgrip, dan baut probolt titanium',
    badge: 'Ganteng Max',
  },
  {
    slug: 'part-cvt',
    label: 'Part CVT',
    icon: 'Zap',
    tagline: 'Pulley bubut CNC, mangkok ganda bolong anti gredek, roller BRT, per CVT',
    badge: 'PnP Anti Gredek',
  },
  {
    slug: 'noken-as',
    label: 'Noken As',
    icon: 'PackageCheck',
    tagline: 'Camshaft racing profil tinggi pelatuk roller nafas panjang',
    badge: 'Top Speed',
  },
  {
    slug: 'lain-lain',
    label: 'Lain Lain',
    icon: 'PackageCheck',
    tagline: 'Suku cadang pelengkap, oli racing, gasket tembaga, dan part pendukung',
    badge: 'Pelengkap',
  },
];

export const CATEGORY_ITEMS: CategoryItem[] = OFFICIAL_CATEGORIES.map((c) => ({
  id: `cat-${c.slug}`,
  title: c.label,
  subtitle: c.tagline,
  categoryFilter: c.slug,
  badgeText: c.badge,
  count: 0,
  icon: c.icon,
  tagline: c.tagline,
}));

export function normalizeCategory(cat?: string): string {
  if (!cat) return 'part-cvt';
  const c = cat.toLowerCase().trim().replace(/_/g, '-');
  if (c === 'blok-mesin' || c === 'blok mesin' || c === 'blok') return 'blok-mesin';
  if (c === 'shockbreaker' || c === 'shock') return 'shockbreaker';
  if (c === 'pengereman' || c === 'rem') return 'pengereman';
  if (c === 'velg' || c === 'rim') return 'velg';
  if (c === 'accesories' || c === 'accessories' || c === 'aksesoris') return 'accesories';
  if (c === 'part-cvt' || c === 'part cvt' || c === 'cvt' || c === 'paket-upgrade') return 'part-cvt';
  if (c === 'noken-as' || c === 'noken as' || c === 'camshaft' || c === 'noken') return 'noken-as';
  if (c === 'lain-lain' || c === 'lain lain' || c === 'lain') return 'lain-lain';
  // Preserve custom category slug
  return c;
}

export function getCategoryLabel(cat?: string): string {
  if (!cat) return 'Semua Kategori';
  const norm = normalizeCategory(cat);
  const found = OFFICIAL_CATEGORIES.find((c) => c.slug === norm);
  if (found) return found.label;
  return cat
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
