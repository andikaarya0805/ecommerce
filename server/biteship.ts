import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BITESHIP_API_KEY = process.env.BITESHIP_API_KEY || '';
const BITESHIP_ORIGIN_AREA_ID = process.env.BITESHIP_ORIGIN_AREA_ID || 'IDNP6IDNC419IDND2093'; // Jakarta Timur, Cakung
const BITESHIP_BASE_URL = 'https://api.biteship.com/v1';

export function isBiteshipConfigured(): boolean {
  return Boolean(
    BITESHIP_API_KEY &&
    BITESHIP_API_KEY.trim() !== '' &&
    !BITESHIP_API_KEY.includes('your-biteship')
  );
}

export interface BiteshipArea {
  id: string;
  name: string;
  countryName: string;
  province: string;
  city: string;
  district: string;
  postalCode: number;
}

export interface BiteshipRateItem {
  name: string;
  value: number;
  weight: number;
  quantity: number;
}

export interface BiteshipRateResult {
  courierName: string;
  courierCode: string;
  courierService: string;
  courierServiceCode: string;
  etd: string;
  cost: number;
  description: string;
}

// 1. Search Areas by location input
export async function searchBiteshipAreas(input: string): Promise<BiteshipArea[]> {
  if (!isBiteshipConfigured() || !input || input.trim().length < 2) {
    return [];
  }

  try {
    const res = await fetch(
      `${BITESHIP_BASE_URL}/maps/areas?countries=ID&input=${encodeURIComponent(input.trim())}&type=single`,
      {
        headers: {
          Authorization: BITESHIP_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await res.json();
    if (!res.ok || !data.areas) {
      console.warn('[Biteship] Search areas error:', data);
      return [];
    }

    return (data.areas || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      countryName: a.country_name,
      province: a.administrative_division_level_1_name,
      city: a.administrative_division_level_2_name,
      district: a.administrative_division_level_3_name,
      postalCode: a.postal_code,
    }));
  } catch (err: any) {
    console.error('[Biteship] Search areas network error:', err.message);
    return [];
  }
}

// 2. Calculate Courier Rates
export async function calculateBiteshipRates(params: {
  destinationAreaId?: string;
  destinationPostalCode?: number;
  items: BiteshipRateItem[];
  couriers?: string;
}): Promise<BiteshipRateResult[] | null> {
  if (!isBiteshipConfigured()) {
    return null;
  }

  const couriersToQuery = params.couriers || 'jne,jnt,sicepat,anteraja';

  const body: any = {
    origin_area_id: BITESHIP_ORIGIN_AREA_ID,
    couriers: couriersToQuery,
    items: params.items.map((i) => ({
      name: i.name || 'Part Motor Racing',
      value: Math.round(i.value || 100000),
      weight: Math.round(i.weight || 500),
      quantity: Math.max(1, i.quantity || 1),
    })),
  };

  if (params.destinationAreaId) {
    body.destination_area_id = params.destinationAreaId;
  } else if (params.destinationPostalCode) {
    body.destination_postal_code = params.destinationPostalCode;
  } else {
    return null;
  }

  try {
    const res = await fetch(`${BITESHIP_BASE_URL}/rates/couriers`, {
      method: 'POST',
      headers: {
        Authorization: BITESHIP_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok || !data.pricing) {
      console.warn('[Biteship] Calculate rates error:', data);
      return null;
    }

    return (data.pricing || []).map((p: any) => ({
      courierName: (p.courier_name || p.courier_company || 'Ekspedisi').toUpperCase(),
      courierCode: (p.courier_company || '').toLowerCase(),
      courierService: p.courier_service_name || p.service_type || 'Reguler',
      courierServiceCode: p.courier_service_code || 'reg',
      etd: p.duration ? `${p.duration} (Estimasi)` : '2 - 3 Hari',
      cost: Math.round(p.price || 15000),
      description: p.description || `${p.courier_name} ${p.courier_service_name}`,
    }));
  } catch (err: any) {
    console.error('[Biteship] Calculate rates network error:', err.message);
    return null;
  }
}

// 3. Create Shipping Order (Booking Courier Resi)
export async function createBiteshipShippingOrder(params: {
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity?: string;
  destinationAreaId?: string;
  destinationPostalCode?: number;
  courierCompany: string; // e.g. "jne", "sicepat", "jnt"
  courierType: string;    // e.g. "reg", "oke", "ez"
  items: Array<{ name: string; price: number; quantity: number; weightGrams?: number }>;
}): Promise<{
  biteshipOrderId: string;
  trackingId?: string;
  waybillId?: string;
  status: string;
} | null> {
  if (!isBiteshipConfigured()) {
    return null;
  }

  const cleanCourierCompany = (params.courierCompany || 'jne')
    .toLowerCase()
    .replace(/\s*(express|cargo)\s*/g, '')
    .trim();

  const body: any = {
    shipper_contact_name: 'Jawir Garage Racing Store',
    shipper_contact_phone: '081298765432',
    shipper_contact_email: 'store@jawirgarage.com',
    origin_contact_name: 'Gudang Logistik Jawir Garage',
    origin_contact_phone: '081298765432',
    origin_address: 'Jl. Raya Bekasi KM 21, Ruko Otomotif No. 8, Cakung Barat',
    origin_note: 'Dekat Halte Busway Cakung Barat',
    origin_postal_code: 13910,
    origin_area_id: BITESHIP_ORIGIN_AREA_ID,

    destination_contact_name: params.customerName,
    destination_contact_phone: params.customerPhone,
    destination_address: params.shippingAddress,
    destination_note: `Invoice: ${params.invoiceNumber}`,
    destination_postal_code: params.destinationPostalCode || 13910,

    courier_company: cleanCourierCompany,
    courier_type: (params.courierType || 'reg').toLowerCase(),
    delivery_type: 'now',
    order_note: `Pesanan Jawir Garage: ${params.invoiceNumber}`,

    items: params.items.map((i) => ({
      name: i.name,
      value: Math.round(i.price),
      weight: Math.round(i.weightGrams || 500),
      quantity: Math.max(1, i.quantity),
    })),
  };

  if (params.destinationAreaId) {
    body.destination_area_id = params.destinationAreaId;
  }

  try {
    const res = await fetch(`${BITESHIP_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        Authorization: BITESHIP_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn('[Biteship] Create order error:', data);
      throw new Error(data.error || data.message || 'Gagal membuat booking kurir Biteship');
    }

    return {
      biteshipOrderId: data.id,
      trackingId: data.courier?.tracking_id,
      waybillId: data.courier?.waybill_id, // Nomor Resi
      status: data.status || 'allocated',
    };
  } catch (err: any) {
    console.error('[Biteship] Create order network error:', err.message);
    return null;
  }
}

// 4. Track Shipment Status
export async function trackBiteshipShipment(
  trackingIdOrWaybill: string,
  courierCode?: string
): Promise<any | null> {
  if (!isBiteshipConfigured() || !trackingIdOrWaybill) {
    return null;
  }

  try {
    let url = `${BITESHIP_BASE_URL}/trackings/${encodeURIComponent(trackingIdOrWaybill)}`;
    if (courierCode && !trackingIdOrWaybill.match(/^[a-zA-Z0-9]{20,30}$/)) {
      url = `${BITESHIP_BASE_URL}/trackings/${encodeURIComponent(trackingIdOrWaybill)}/couriers/${courierCode.toLowerCase()}`;
    }

    const res = await fetch(url, {
      headers: {
        Authorization: BITESHIP_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn('[Biteship] Track order error:', data);
      return null;
    }

    return {
      waybillId: data.waybill_id || trackingIdOrWaybill,
      courier: data.courier,
      status: data.status,
      link: data.link,
      history: (data.history || []).map((h: any) => ({
        note: h.note,
        status: h.status,
        updatedAt: h.updated_at,
      })),
    };
  } catch (err: any) {
    console.error('[Biteship] Track order network error:', err.message);
    return null;
  }
}
