import { Product, ProductVariationGroup, ProductVariationOption } from '../types';

export const getProductVariationGroups = (product: Product): ProductVariationGroup[] => {
  // 1. Determine Tipe Motor / Varian options
  let bikeOptions: string[] = [];

  // A. Check if product has explicit manual bikeVariants
  if (Array.isArray(product.bikeVariants) && product.bikeVariants.length > 0) {
    bikeOptions = [...product.bikeVariants];
  }

  // B. Check if variationGroups has a motor group
  let existingMotorGroup: ProductVariationGroup | undefined;
  let otherVariationGroups: ProductVariationGroup[] = [];

  if (Array.isArray(product.variationGroups) && product.variationGroups.length > 0) {
    existingMotorGroup = product.variationGroups.find(
      (g) =>
        g.name.toLowerCase().includes('motor') ||
        g.name.toLowerCase().includes('varian motor') ||
        g.name.toLowerCase().includes('tipe motor')
    );
    otherVariationGroups = product.variationGroups.filter((g) => g !== existingMotorGroup);

    if (bikeOptions.length === 0 && existingMotorGroup && existingMotorGroup.options.length > 0) {
      bikeOptions = existingMotorGroup.options.map(getOptionName);
    }
  }

  // C. Fallback: Deduce from bikeCompatibility & name ONLY if no manual options were configured
  if (bikeOptions.length === 0) {
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

    // Ultimate fallback if empty
    if (bikeOptions.length === 0) {
      bikeOptions.push('Vario 125 / 150', 'Vario 160 / PCX 160', 'NMAX / Aerox 155', 'Beat / Scoopy');
    }
  }

  const finalGroups: ProductVariationGroup[] = [];

  // Group 1: Tipe Motor / Varian (Guaranteed to use manual options if provided by admin!)
  finalGroups.push({
    name: 'Tipe Motor / Varian',
    options: Array.from(new Set(bikeOptions)),
  });

  // Group 2: Either use the product's custom other groups or the category-based default
  if (otherVariationGroups.length > 0) {
    finalGroups.push(...otherVariationGroups);
  } else {
    // Category-based default Group 2
    const nameLower = product.name.toLowerCase();

    if (product.category === 'cvt') {
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
    } else if (product.category === 'paket-upgrade' || product.isPaketUpgrade) {
      finalGroups.push({
        name: 'Karakter Racikan Per & Roller',
        options: [
          'Harian Stop & Go (Per 1000 RPM + Roller 10g)',
          'Akselerasi Spontan (Per 1500 RPM + Roller 9g)',
          'Touring & Nafas Panjang (Per 2000 RPM + Roller 11g)',
        ],
      });
    } else if (product.category === 'pengereman') {
      finalGroups.push({
        name: 'Posisi / Sisi Rem',
        options: [
          { name: 'Kanan (Master Rem Depan)', priceModifier: 0 },
          { name: 'Kiri (Belakang Matic / Kopling)', priceModifier: 0 },
          { name: '1 Pasang (Kanan + Kiri Lengkap)', priceModifier: Math.round(product.price * 0.85) },
        ],
      });
    } else if (product.category === 'kaki-kaki') {
      finalGroups.push({
        name: 'Ukuran & Warna Shock',
        options: [
          'Black Stealth Series (330mm)',
          'Crimson Red Racing (330mm)',
          'Titanium Grey Click (310mm)',
          'Yellow Gold Edition (310mm)',
        ],
      });
    } else if (product.category === 'mesin') {
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
        name: 'Pilihan Spesifikasi',
        options: ['Standar Plug & Play (PnP)', 'Racing Spec Edition', 'Paket Lengkap Pro'],
      });
    }
  }

  return finalGroups;
};

export const getOptionName = (opt: string | ProductVariationOption): string => {
  return typeof opt === 'string' ? opt : opt.name;
};

export const getOptionPriceModifier = (opt: string | ProductVariationOption): number => {
  return typeof opt === 'string' ? 0 : opt.priceModifier || 0;
};
