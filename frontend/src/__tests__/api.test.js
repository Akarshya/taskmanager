import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '@/lib/api';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function respondOk(body, status = 200) {
  mockFetch.mockResolvedValueOnce({ ok: true, status, json: async () => body });
}

function respondError(body, status = 400) {
  mockFetch.mockResolvedValueOnce({ ok: false, status, json: async () => body });
}

describe('api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('attaches Authorization header when token is in localStorage', async () => {
    localStorage.setItem('token', 'my-token');
    respondOk({ data: [] });

    await api.get('/tasks');

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer my-token');
  });

  it('omits Authorization header when no token is stored', async () => {
    respondOk({ data: [] });

    await api.get('/tasks');

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('returns null for 204 No Content', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    const result = await api.delete('/tasks/abc');
    expect(result).toBeNull();
  });

  it('throws with the server error message on non-ok response', async () => {
    respondError({ error: 'unauthorized' }, 401);

    await expect(api.get('/tasks')).rejects.toThrow('unauthorized');
  });

  it('throws a fallback message when server returns no error field', async () => {
    respondError({}, 500);

    await expect(api.get('/tasks')).rejects.toThrow('Request failed');
  });

  it('sends JSON-stringified body on POST', async () => {
    respondOk({ id: '1', title: 'Test' }, 201);

    await api.post('/tasks', { title: 'Test', priority: 'high' });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ title: 'Test', priority: 'high' }));
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('does not set Content-Type for FormData body', async () => {
    respondOk({ id: '1', url: 'https://s3.example.com/file.pdf' }, 201);
    const formData = new FormData();
    formData.append('file', new Blob(['content']), 'file.pdf');

    await api.post('/tasks/1/attachments', formData);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Content-Type']).toBeUndefined();
  });
});
