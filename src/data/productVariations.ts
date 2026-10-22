import { Product, ProductVariationGroup, ProductVariationOption } from '../types';
import { normalizeCategory } from './categories';

export const getOptionName = (opt: string | ProductVariationOption): string => {
  return typeof opt === 'string' ? opt : opt.name;
};

export const getOptionPrice = (
  opt: string | ProductVariationOption,
  basePrice: number
): number => {
  if (typeof opt === 'string') return basePrice;
  if (typeof opt.price === 'number' && opt.price > 0) return opt.price;
  if (typeof opt.priceModifier === 'number') return basePrice + opt.priceModifier;
  return basePrice;
};

export const getOptionPriceModifier = (
  opt: string | ProductVariationOption,
  basePrice = 0
): number => {
  if (typeof opt === 'string') return 0;
  if (typeof opt.priceModifier === 'number') return opt.priceModifier;
  if (typeof opt.price === 'number' && basePrice > 0) return opt.price - basePrice;
  return 0;
};

export const getProductVariationGroups = (product: Product): ProductVariationGroup[] => {
  // If the product has explicit variation groups configured by Admin or database,
  // RESPECT THEM DIRECTLY so admin panel is 100% aligned with user dashboard!
  if (Array.isArray(product.variationGroups) && product.variationGroups.length > 0) {
    return product.variationGroups;
  }

  // Fallback: If no explicit variationGroups exist, generate smart defaults based on bikeVariants & category
  let bikeOptions: string[] = [];
  if (Array.isArray(product.bikeVariants) && product.bikeVariants.length > 0) {
    bikeOptions = [...product.bikeVariants];
  } else {
    const compat = product.bikeCompatibility || [];
    if (
      compat.includes('vario-pcx') ||
      product.name.toLowerCase().includes('vario') ||
      product.name.toLowerCase().includes('pcx')
    ) {
      bikeOptions.push('Vario 125 / 150', 'Vario 160 / PCX 160');
    }
    if (
      compat.includes('nmax-aerox') ||
      product.name.toLowerCase().includes('nmax') ||
      product.name.toLowerCase().includes('aerox')
    ) {
      bikeOptions.push('All New NMAX / Aerox 155', 'Old NMAX / Lexi 125');
    }
    if (
      compat.includes('beat-scoopy') ||
      product.name.toLowerCase().includes('beat') ||
      product.name.toLowerCase().includes('scoopy')
    ) {
      bikeOptions.push('Beat ESP / Deluxe / Street', 'Scoopy / Genio');
    }
    if (compat.includes('mio-series') || product.name.toLowerCase().includes('mio')) {
      bikeOptions.push('Mio Sporty / Smile 5TL', 'Mio M3 / Fazzio 125');
    }
    if (
      compat.includes('sport-bebek') ||
      product.name.toLowerCase().includes('sport') ||
      product.name.toLowerCase().includes('ninja')
    ) {
      bikeOptions.push('Ninja 150/250 / CBR / R15', 'Satria F / Sonic / MX King');
    }

    if (bikeOptions.length === 0) {
      bikeOptions.push('Vario 125 / 150', 'Vario 160 / PCX 160', 'NMAX / Aerox 155', 'Beat / Scoopy');
    }
  }

  const finalGroups: ProductVariationGroup[] = [];

  // Group 1: Tipe Motor / Varian
  finalGroups.push({
    name: 'Tipe Motor / Varian',
    options: Array.from(new Set(bikeOptions)),
  });

  // Group 2: Category-based default Group 2
  const nameLower = product.name.toLowerCase();
  const cat = normalizeCategory(product.category);

  if (cat === 'part-cvt') {
    if (nameLower.includes('roller')) {
      finalGroups.push({
        name: 'Ukuran Berat Roller',
        options: [
          '9 Gram (Akselerasi Spontan)',
          '10 Gram (Harian Responsif)',
          '11 Gram (Standar Ngacir)',
          '12 Gram (Nafas Panjang)',
          'Mix Silang (9g + 11g)',
        ],
      });
    } else if (nameLower.includes('mangkok')) {
      finalGroups.push({
        name: 'Finishing & Kartel',
        options: [
          'Kartel Halus + Hexagonal (Anti Gredek)',
          'Kartel Kasar Grip Max (Bebas Slip)',
          'CNC Bubut Custom Super Ringan',
        ],
      });
    } else if (nameLower.includes('paket') || product.isPaketUpgrade) {
      finalGroups.push({
        name: 'Karakter Racikan Per & Roller',
        options: [
          'Harian Stop & Go (Per 1000 RPM + Roller 10g)',
          'Akselerasi Spontan (Per 1500 RPM + Roller 9g)',
          'Touring & Nafas Panjang (Per 2000 RPM + Roller 11g)',
        ],
      });
    } else {
      finalGroups.push({
        name: 'Derajat Kemiringan Pulley',
        options: [
          '13.5 Derajat (Top Speed & Jalur Keruk)',
          '13.8 Derajat (Akselerasi Tanjakan PnP)',
          '14 Derajat (Standar Pabrik OEM)',
        ],
      });
    }
  } else if (cat === 'pengereman') {
    finalGroups.push({
      name: 'Posisi / Sisi Rem',
      options: [
        { name: 'Kanan (Master Rem Depan)', priceModifier: 0 },
        { name: 'Kiri (Belakang Matic / Kopling)', priceModifier: 0 },
        { name: '1 Pasang (Kanan + Kiri Lengkap)', priceModifier: Math.round(product.price * 0.85) },
      ],
    });
  } else if (cat === 'shockbreaker') {
    finalGroups.push({
      name: 'Ukuran & Warna Shock',
      options: [
        'Black Stealth Series (330mm)',
        'Crimson Red Racing (330mm)',
        'Titanium Grey Click (310mm)',
        'Yellow Gold Edition (310mm)',
      ],
    });
  } else if (cat === 'velg') {
    finalGroups.push({
      name: 'Pilihan Ukuran & Warna Velg',
      options: [
        'Ring 14 - Black Glossy CNC',
        'Ring 14 - Gold Matte Racing',
        'Ring 17 - Titanium Silver Billet',
      ],
    });
  } else if (cat === 'accesories') {
    finalGroups.push({
      name: 'Pilihan Warna Anodized',
      options: [
        'Stealth Black Anodized',
        'Crimson Red Edition',
        'Titanium Blue Polish',
        'Gold Billet Edition',
      ],
    });
  } else if (cat === 'noken-as') {
    finalGroups.push({
      name: 'Profile Camshaft / Tipe',
      options: [
        'Type T1 (Harian Responsif & Irit)',
        'Type T2 (Bore Up & Touring Cepat)',
        'Type R (Kompetisi Racing Lift Tinggi)',
      ],
    });
  } else if (cat === 'blok-mesin') {
    if (nameLower.includes('knalpot')) {
      finalGroups.push({
        name: 'Tipe Header & Silincer',
        options: [
          'Header Stainless + Megaphone Silincer',
          'Full Titanium Hexagonal Real Carbon',
          'Silincer Bulat Matte Black Stealth',
        ],
      });
    } else {
      finalGroups.push({
        name: 'Pilihan Diameter Piston',
        options: [
          '54 mm (Standar Porting)',
          '58 mm (150cc Harian Kencang)',
          '62 mm (180cc Touring Cepat)',
        ],
      });
    }
  } else {
    finalGroups.push({
      name: 'Pilihan Spesifikasi',
      options: ['Standar Plug & Play (PnP)', 'Racing Spec Edition', 'Paket Lengkap Pro'],
    });
  }

  return finalGroups;
};

export const getProductPriceRange = (
  product: Product
): { minPrice: number; maxPrice: number; hasRange: boolean } => {
  const groups = getProductVariationGroups(product);
  if (!groups || groups.length === 0) {
    return { minPrice: product.price, maxPrice: product.price, hasRange: false };
  }

  let min = product.price;
  let max = product.price;
  let foundCustomPrice = false;

  groups.forEach((g) => {
    g.options.forEach((opt) => {
      if (typeof opt === 'object') {
        if (typeof opt.price === 'number' && opt.price > 0) {
          if (!foundCustomPrice) {
            min = opt.price;
            max = opt.price;
            foundCustomPrice = true;
          } else {
            if (opt.price < min) min = opt.price;
            if (opt.price > max) max = opt.price;
          }
        } else if (typeof opt.priceModifier === 'number') {
          const calculated = product.price + opt.priceModifier;
          if (calculated < min) min = calculated;
          if (calculated > max) max = calculated;
          if (opt.priceModifier !== 0) foundCustomPrice = true;
        }
      }
    });
  });

  return {
    minPrice: min,
    maxPrice: max,
    hasRange: min !== max,
  };
};

export const calculateSelectedPrice = (
  product: Product,
  selectedOptions: { [groupName: string]: string }
): { dynamicPrice: number; dynamicOriginalPrice: number } => {
  const groups = getProductVariationGroups(product);
  let basePrice = product.price;
  let hasExplicitPrice = false;
  let modifierSum = 0;

  groups.forEach((group) => {
    const selected = selectedOptions[group.name];
    if (selected) {
      const opt = group.options.find((o) => getOptionName(o) === selected);
      if (opt && typeof opt === 'object') {
        if (typeof opt.price === 'number' && opt.price > 0) {
          basePrice = opt.price;
          hasExplicitPrice = true;
        } else if (typeof opt.priceModifier === 'number') {
          modifierSum += opt.priceModifier;
        }
      }
    }
  });

  const dynamicPrice = basePrice + modifierSum;

  let dynamicOriginalPrice = dynamicPrice;
  if (product.originalPrice && product.originalPrice > product.price) {
    // Keep proportional discount
    const markupRatio = product.originalPrice / product.price;
    dynamicOriginalPrice = Math.round(dynamicPrice * markupRatio);
  }

  return {
    dynamicPrice,
    dynamicOriginalPrice,
  };
};
