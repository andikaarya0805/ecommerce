export interface CityDestination {
  name: string;
  districts: string[];
  baseRate: number;
}

export interface ProvinceDestination {
  province: string;
  cities: CityDestination[];
}

export const INDONESIA_DESTINATIONS: ProvinceDestination[] = [
  {
    province: 'DKI Jakarta',
    cities: [
      { name: 'Jakarta Timur', districts: ['Cakung', 'Ciracas', 'Duren Sawit', 'Jatinegara', 'Kramat Jati', 'Matraman', 'Pasar Rebo', 'Pulo Gadung'], baseRate: 9000 },
      { name: 'Jakarta Selatan', districts: ['Cilandak', 'Jagakarsa', 'Kebayoran Baru', 'Kebayoran Lama', 'Mampang Prapatan', 'Pancoran', 'Pasar Minggu', 'Pesanggrahan', 'Setiabudi', 'Tebet'], baseRate: 10000 },
      { name: 'Jakarta Barat', districts: ['Cengkareng', 'Grogol Petamburan', 'Kalideres', 'Kebon Jeruk', 'Kembangan', 'Palmerah', 'Taman Sari', 'Tambora'], baseRate: 10000 },
      { name: 'Jakarta Pusat', districts: ['Cempaka Putih', 'Gambir', 'Johar Baru', 'Kemayoran', 'Menteng', 'Senen', 'Tanah Abang'], baseRate: 10000 },
      { name: 'Jakarta Utara', districts: ['Cilincing', 'Kelapa Gading', 'Koja', 'Pademangan', 'Penjaringan', 'Tanjung Priok'], baseRate: 11000 }
    ]
  },
  {
    province: 'Jawa Barat',
    cities: [
      { name: 'Kota Bekasi', districts: ['Bekasi Barat', 'Bekasi Timur', 'Bekasi Selatan', 'Bekasi Utara', 'Jatiasih', 'Pondok Gede'], baseRate: 10000 },
      { name: 'Kab. Bekasi', districts: ['Cikarang Barat', 'Cikarang Pusat', 'Cikarang Selatan', 'Cikarang Utara', 'Tambun Selatan'], baseRate: 12000 },
      { name: 'Kota Depok', districts: ['Beji', 'Cimanggis', 'Cinere', 'Pancoran Mas', 'Sawangan', 'Sukmajaya'], baseRate: 11000 },
      { name: 'Kota Bogor', districts: ['Bogor Barat', 'Bogor Selatan', 'Bogor Tengah', 'Bogor Timur', 'Bogor Utara'], baseRate: 12000 },
      { name: 'Kota Bandung', districts: ['Andir', 'Antapani', 'Arcamanik', 'Coblong', 'Lengkong', 'Sukajadi'], baseRate: 15000 }
    ]
  },
  {
    province: 'Banten',
    cities: [
      { name: 'Kota Tangerang', districts: ['Batuceper', 'Benda', 'Cibodas', 'Cipondoh', 'Karawaci', 'Periuk', 'Pinang'], baseRate: 11000 },
      { name: 'Kota Tangerang Selatan', districts: ['Ciputat', 'Pamulang', 'Pondok Aren', 'Serpong', 'Setu'], baseRate: 11000 }
    ]
  },
  {
    province: 'Jawa Tengah',
    cities: [
      { name: 'Kota Semarang', districts: ['Banyumanik', 'Candisari', 'Gajahmungkur', 'Pedurungan', 'Semarang Barat'], baseRate: 18000 },
      { name: 'Kota Surakarta (Solo)', districts: ['Banjarsari', 'Jebres', 'Laweyan', 'Pasar Kliwon', 'Serengan'], baseRate: 18000 }
    ]
  },
  {
    province: 'Jawa Timur',
    cities: [
      { name: 'Kota Surabaya', districts: ['Gubeng', 'Rungkut', 'Sawahan', 'Tegalsari', 'Wonokromo'], baseRate: 20000 },
      { name: 'Kota Malang', districts: ['Blimbing', 'Kedungkandang', 'Klojen', 'Lowokwaru', 'Sukun'], baseRate: 21000 }
    ]
  }
];
