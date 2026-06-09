import type { ContentBlock, BlockMeta, CreateTextDTO } from '../types/content';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3001';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function fetchWithRefresh(url: string, options: RequestInit = {}): Promise<Response> {
  let res = await fetch(url, options);

  if (res.status === 401) {
    const refreshRes = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      localStorage.setItem('accessToken', data.accessToken);

      const newHeaders = new Headers(options.headers);
      newHeaders.set('Authorization', `Bearer ${data.accessToken}`);
      res = await fetch(url, { ...options, headers: newHeaders });
    }
  }

  return res;
}

export const api = {
  async health(): Promise<{ status: string; db: string }> {
    const res = await fetch(`${BASE}/api/health`);
    return handleResponse(res);
  },

  async listBlocks(): Promise<ContentBlock[]> {
    const res = await fetch(`${BASE}/api/blocks`);
    return handleResponse(res);
  },

  async getBlockMeta(hash: string): Promise<BlockMeta> {
    const res = await fetch(`${BASE}/api/blocks/${hash}/meta`);
    return handleResponse(res);
  },

  async getBlockContent(hash: string, password?: string): Promise<{ hash: string; contentType: string; content?: string; expiresAt: string; createdAt: string }> {
    const headers: Record<string, string> = {};
    if (password) headers['x-password'] = password;
    const res = await fetch(`${BASE}/api/blocks/${hash}`, { headers });
    return handleResponse(res);
  },

  async createTextBlock(dto: CreateTextDTO, accessToken?: string): Promise<ContentBlock & { shortUrl: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetchWithRefresh(`${BASE}/api/blocks/text`, {
    method: 'POST',
    headers,
    body: JSON.stringify(dto),
  });
  return handleResponse(res);
},

async createFileBlock(formData: FormData, accessToken?: string): Promise<ContentBlock & { shortUrl: string }> {
  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetchWithRefresh(`${BASE}/api/blocks/file`, {
    method: 'POST',
    headers,
    body: formData,
  });
  return handleResponse(res);
},

  async deleteBlock(hash: string, adminSecret: string): Promise<void> {
    const res = await fetch(`${BASE}/api/blocks/${hash}`, {
      method: 'DELETE',
      headers: { 'x-admin-secret': adminSecret },
    });
    return handleResponse(res);
  },

  async verifyPassword(hash: string, password: string): Promise<{ verified: boolean; passwordRequired?: boolean }> {
    const res = await fetch(`${BASE}/api/blocks/${hash}/verify-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return handleResponse(res);
  },
};

