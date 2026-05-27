// In Docker, frontend is served by nginx which proxies /api to backend
// For development outside Docker, use VITE_API_BASE_URL (backend root, no /api suffix)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function formatErrorDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: string }).msg);
        }
        return JSON.stringify(item);
      })
      .join('; ');
  }
  if (detail && typeof detail === 'object') {
    return JSON.stringify(detail);
  }
  return String(detail);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`API Error ${status}: ${detail}`);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      detail = formatErrorDetail(errorData.detail ?? errorData);
    } catch {
      // ignore
    }
    throw new ApiError(response.status, detail);
  }
  try {
    const text = await response.text();
    if (import.meta.env.DEV) {
      console.debug('API response', response.url, text.substring(0, 200));
    }
    return JSON.parse(text) as T;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('handleResponse JSON parse error:', error);
    }
    throw new ApiError(response.status, `Invalid JSON response: ${error}`);
  }
}

export async function apiGet<T>(
  endpoint: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }
  const fullUrl = API_BASE_URL ? `${API_BASE_URL}${url}` : url;
  if (import.meta.env.DEV) {
    console.debug('apiGet', fullUrl);
  }
  const response = await fetch(fullUrl, {
    headers: {
      Accept: 'application/json',
    },
  });
  return handleResponse<T>(response);
}

export async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
  const fullUrl = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}
