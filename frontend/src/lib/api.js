const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const authToken = getAuthToken();
  const isFormData = options.body instanceof FormData;
  const headers = { ...options.headers };

  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (response.status === 204) return null;

  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export const api = {
  get:    (path)         => request(path, { method: 'GET' }),
  post:   (path, body)   => request(path, { method: 'POST',  body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch:  (path, body)   => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path)         => request(path, { method: 'DELETE' }),
};
