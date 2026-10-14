import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || '';
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';

const SNAP_API_URL = MIDTRANS_IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/v1/transactions'
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

export function isMidtransConfigured(): boolean {
  return Boolean(
    MIDTRANS_SERVER_KEY &&
    MIDTRANS_SERVER_KEY.trim() !== '' &&
    !MIDTRANS_SERVER_KEY.includes('your-midtrans')
  );
}

export function getMidtransClientKey(): string {
  return MIDTRANS_CLIENT_KEY;
}

export interface MidtransItemDetail {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

export interface CreateSnapPayload {
  invoiceNumber: string;
  grandTotal: number;
  customer: {
    name: string;
    email?: string;
    phone: string;
    address?: string;
    city?: string;
  };
  items: MidtransItemDetail[];
  shippingCost?: number;
  courierInfo?: string;
  discountAmount?: number;
}

export interface SnapResponse {
  token: string;
  redirect_url: string;
}

export async function createSnapTransaction(
  payload: CreateSnapPayload
): Promise<SnapResponse | null> {
  if (!isMidtransConfigured()) {
    console.log('[Midtrans] Server key not configured. Skipping Snap token generation.');
    return null;
  }

  const authHeader = `Basic ${Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64')}`;

  const itemDetails: any[] = payload.items.map((it) => ({
    id: it.id ? String(it.id).slice(0, 50) : 'item',
    price: Math.round(it.price),
    quantity: Math.max(1, it.quantity),
    name: (it.name || 'Produk Jawir Garage').slice(0, 50),
  }));

  if (payload.shippingCost && payload.shippingCost > 0) {
    itemDetails.push({
      id: 'SHIPPING',
      price: Math.round(payload.shippingCost),
      quantity: 1,
      name: `Ongkir (${payload.courierInfo || 'Ekspedisi'})`.slice(0, 50),
    });
  }

  if (payload.discountAmount && payload.discountAmount > 0) {
    itemDetails.push({
      id: 'DISCOUNT',
      price: -Math.round(payload.discountAmount),
      quantity: 1,
      name: 'Diskon Voucher'.slice(0, 50),
    });
  }

  // Calculate sum of item details to ensure it matches grandTotal
  const sumItems = itemDetails.reduce((s, it) => s + it.price * it.quantity, 0);
  const adjustedGrandTotal = sumItems > 0 ? sumItems : Math.round(payload.grandTotal);

  const requestBody = {
    transaction_details: {
      order_id: payload.invoiceNumber,
      gross_amount: adjustedGrandTotal,
    },
    customer_details: {
      first_name: payload.customer.name,
      email: payload.customer.email || `${payload.customer.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@customer.jawirgarage.com`,
      phone: payload.customer.phone,
      billing_address: {
        first_name: payload.customer.name,
        phone: payload.customer.phone,
        address: payload.customer.address || '',
        city: payload.customer.city || 'Jakarta',
      },
      shipping_address: {
        first_name: payload.customer.name,
        phone: payload.customer.phone,
        address: payload.customer.address || '',
        city: payload.customer.city || 'Jakarta',
      },
    },
    item_details: itemDetails,
    ...(payload.enabledPayments && payload.enabledPayments.length > 0
      ? { enabled_payments: payload.enabledPayments }
      : {}),
    callbacks: {
      finish: `http://localhost:3000/orders/${payload.invoiceNumber}`,
    },
  };

  try {
    const response = await fetch(SNAP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Midtrans] Error from Snap API:', data);
      throw new Error(data.error_messages ? data.error_messages.join(', ') : 'Gagal membuat Snap token');
    }

    console.log(`[Midtrans] Snap transaction created for ${payload.invoiceNumber}: token=${data.token}`);
    return {
      token: data.token,
      redirect_url: data.redirect_url,
    };
  } catch (err: any) {
    console.error('[Midtrans] Request failed:', err.message);
    return null;
  }
}

export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  providedSignature: string
): boolean {
  if (!MIDTRANS_SERVER_KEY) return true; // allow in mock if no key
  const cleanGross = grossAmount.includes('.') ? grossAmount : `${grossAmount}.00`;
  const signatureRaw = `${orderId}${statusCode}${cleanGross}${MIDTRANS_SERVER_KEY}`;
  const expectedSignature = crypto.createHash('sha512').update(signatureRaw).digest('hex');

  // Also try without .00 format if direct int string was sent
  const altSignatureRaw = `${orderId}${statusCode}${grossAmount}${MIDTRANS_SERVER_KEY}`;
  const altExpectedSignature = crypto.createHash('sha512').update(altSignatureRaw).digest('hex');

  return (
    providedSignature.toLowerCase() === expectedSignature.toLowerCase() ||
    providedSignature.toLowerCase() === altExpectedSignature.toLowerCase()
  );
}
