// In Docker, frontend is served by nginx which proxies /api to backend
// For development outside Docker, use VITE_API_BASE_URL or default to localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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
      detail = errorData.detail || JSON.stringify(errorData);
    } catch {
      // ignore
    }
    throw new ApiError(response.status, detail);
  }
  try {
    const text = await response.text();
    console.log('handleResponse raw text (first 500 chars):', text.substring(0, 500));
    const data = JSON.parse(text);
    console.log('handleResponse parsed data:', data);
    return data;
  } catch (error) {
    console.error('handleResponse JSON parse error:', error);
    throw new ApiError(response.status, `Invalid JSON response: ${error}`);
  }
}

export async function apiGet<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
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
  console.log('apiGet fetching:', fullUrl);
  const response = await fetch(fullUrl, {
    headers: {
      'Accept': 'application/json',
    },
  });
  console.log('apiGet response status:', response.status, response.statusText);
  console.log('apiGet response headers:', Object.fromEntries(response.headers.entries()));
  return handleResponse<T>(response);
}

export async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
  const fullUrl = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}