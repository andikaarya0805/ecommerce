/**
 * Centralized API configuration & robust request helpers.
 *
 * In production:
 * - If VITE_API_BASE_URL is defined (e.g. https://jawir-api.onrender.com),
 *   all requests will target that domain.
 * - If empty, relative paths (/api/...) are used, compatible with Vite proxy (dev)
 *   or same-domain fullstack deployment / Vercel rewrites (prod).
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

/**
 * Returns the fully qualified or relative URL for an API endpoint.
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) return cleanPath;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Safe fetch wrapper that handles HTML error pages (e.g., 404/500 from Vercel / Netlify)
 * without throwing cryptic "SyntaxError: Unexpected token 'T'" errors.
 */
export async function safeFetchJson<T = any>(
  pathOrUrl: string,
  options?: RequestInit
): Promise<T> {
  const url = pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')
    ? pathOrUrl
    : getApiUrl(pathOrUrl);

  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (netErr: any) {
    throw new Error(
      `Gagal terhubung ke server API (${netErr.message || 'Network Error'}). Pastikan server backend sedang berjalan dan URL API valid.`
    );
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    // Read raw body to inspect or ignore
    await res.text().catch(() => '');

    if (res.status === 404) {
      throw new Error(
        `Endpoint API tidak ditemukan (404 Not Found). Backend belum aktif di URL tujuan atau routing API belum diarahkan.`
      );
    }

    if (!res.ok) {
      throw new Error(
        `Server backend mengembalikan error status ${res.status} (bukan format JSON).`
      );
    }

    throw new Error(
      'Format respons server tidak valid (diterima format non-JSON).'
    );
  }

  let data: any;
  try {
    data = await res.json();
  } catch (parseErr: any) {
    throw new Error(
      `Gagal memproses data JSON dari server: ${parseErr.message}`
    );
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `Request gagal dengan status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}
