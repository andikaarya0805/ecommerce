import { BikeType } from './types';

export const BIKE_FILTERS: { id: BikeType; label: string; shortLabel: string }[] = [
  { id: 'all', label: 'Semua Motor', shortLabel: 'Semua' },
  { id: 'vario-pcx', label: 'Vario / PCX / ADV', shortLabel: 'Vario/PCX' },
  { id: 'nmax-aerox', label: 'NMAX / Aerox / Lexi', shortLabel: 'NMAX/Aerox' },
  { id: 'beat-scoopy', label: 'Beat / Scoopy / Genio', shortLabel: 'Beat/Scoopy' },
  { id: 'mio-series', label: 'Mio Series / Fazzio', shortLabel: 'Mio Series' },
  { id: 'sport-bebek', label: 'Sport & Bebek Racing', shortLabel: 'Sport/Bebek' },
];
