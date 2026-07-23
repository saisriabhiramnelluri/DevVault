const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('devvault_token') : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    // Handle session expiry globally
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('devvault_token');
        window.location.href = '/login';
      }
    }
    throw new ApiError(res.status, data.error || 'UNKNOWN', data.message || 'Request failed');
  }

  return data as T;
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (email: string, password: string) =>
    request<{ userId: string; message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ userId: string; message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  verifyOTP: (userId: string, code: string) =>
    request<{ token: string; expiresAt: string; message: string }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ userId, code }),
    }),

  logout: () =>
    request<{ message: string }>('/api/auth/logout', { method: 'POST' }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    }),

  me: () =>
    request<{ user: { id: string; email: string; pbkdf2Salt: string } }>('/api/auth/me'),

  getPbkdf2Salt: () =>
    request<{ pbkdf2Salt: string }>('/api/auth/pbkdf2-salt'),

  getSessions: () =>
    request<{ sessions: Session[] }>('/api/auth/sessions'),

  revokeSession: (id: string) =>
    request<{ message: string }>(`/api/auth/sessions/${id}`, { method: 'DELETE' }),
};

// ── Projects ───────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: () =>
    request<{ projects: Project[] }>('/api/projects'),

  create: (data: { name: string; description?: string; stack?: string[] }) =>
    request<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (id: string) =>
    request<{ project: Project }>(`/api/projects/${id}`),

  update: (id: string, data: Partial<{ name: string; description: string; stack: string[] }>) =>
    request<{ project: Project }>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/projects/${id}`, { method: 'DELETE' }),
};

// ── Env Variables ──────────────────────────────────────────────────────────────

export const envVarsApi = {
  list: (projectId: string, search?: string) =>
    request<{ variables: EnvVariable[] }>(
      `/api/projects/${projectId}/envvars${search ? `?search=${encodeURIComponent(search)}` : ''}`
    ),

  create: (projectId: string, data: CreateEnvVarDto) =>
    request<{ variable: EnvVariable }>(`/api/projects/${projectId}/envvars`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  bulk: (projectId: string, variables: CreateEnvVarDto[]) =>
    request<{ count: number }>(`/api/projects/${projectId}/envvars/bulk`, {
      method: 'POST',
      body: JSON.stringify({ variables }),
    }),

  parse: (projectId: string, content: string) =>
    request<{ variables: ParsedEnvVar[] }>(`/api/projects/${projectId}/envvars/parse`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  update: (projectId: string, varId: string, data: Partial<CreateEnvVarDto>) =>
    request<{ variable: EnvVariable }>(`/api/projects/${projectId}/envvars/${varId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (projectId: string, varId: string) =>
    request<{ message: string }>(`/api/projects/${projectId}/envvars/${varId}`, {
      method: 'DELETE',
    }),
};

// ── Accounts ───────────────────────────────────────────────────────────────────

export const accountsApi = {
  list: (projectId: string, search?: string) =>
    request<{ accounts: Account[] }>(
      `/api/projects/${projectId}/accounts${search ? `?search=${encodeURIComponent(search)}` : ''}`
    ),

  create: (projectId: string, data: CreateAccountDto) =>
    request<{ account: Account }>(`/api/projects/${projectId}/accounts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (projectId: string, accId: string, data: Partial<CreateAccountDto>) =>
    request<{ account: Account }>(`/api/projects/${projectId}/accounts/${accId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (projectId: string, accId: string) =>
    request<{ message: string }>(`/api/projects/${projectId}/accounts/${accId}`, {
      method: 'DELETE',
    }),

  searchByEmail: (email: string) =>
    request<{ accounts: AccountWithProject[] }>(
      `/api/accounts/search?email=${encodeURIComponent(email)}`
    ),
};

// ── Commands ───────────────────────────────────────────────────────────────────

export const commandsApi = {
  list: (projectId: string, search?: string) =>
    request<{ commands: Command[] }>(
      `/api/projects/${projectId}/commands${search ? `?search=${encodeURIComponent(search)}` : ''}`
    ),

  create: (projectId: string, data: CreateCommandDto) =>
    request<{ command: Command }>(`/api/projects/${projectId}/commands`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (projectId: string, cmdId: string, data: Partial<CreateCommandDto>) =>
    request<{ command: Command }>(`/api/projects/${projectId}/commands/${cmdId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (projectId: string, cmdId: string) =>
    request<{ message: string }>(`/api/projects/${projectId}/commands/${cmdId}`, {
      method: 'DELETE',
    }),
};

// ── Audit Logs ─────────────────────────────────────────────────────────────────

export const auditApi = {
  list: (page = 1, limit = 20) =>
    request<AuditLogResponse>(`/api/audit-logs?page=${page}&limit=${limit}`),
};

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description?: string;
  stack: string[];
  createdAt: string;
  updatedAt: string;
  _count?: { envVars: number; accounts: number; commands: number };
}

export interface EnvVariable {
  id: string;
  projectId: string;
  key: string;
  ciphertext: string;
  iv: string;
  category: EnvCategory;
  environment: EnvEnvironment;
  createdAt: string;
  updatedAt: string;
}

export type EnvCategory = 'DATABASE' | 'AUTHENTICATION' | 'CLOUD' | 'PAYMENTS' | 'EMAIL' | 'STORAGE' | 'API' | 'OTHER';
export type EnvEnvironment = 'PRODUCTION' | 'DEVELOPMENT' | 'STAGING' | 'TESTING';

export interface ParsedEnvVar {
  key: string;
  value: string;
  category: EnvCategory;
}

export interface CreateEnvVarDto {
  key: string;
  ciphertext: string;
  iv: string;
  environment?: EnvEnvironment;
  category?: EnvCategory;
}

export interface Account {
  id: string;
  projectId: string;
  serviceName: string;
  email: string;
  username?: string;
  notesCiphertext?: string;
  notesIv?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountWithProject extends Account {
  project: { id: string; name: string };
}

export interface CreateAccountDto {
  serviceName: string;
  email: string;
  username?: string;
  notesCiphertext?: string;
  notesIv?: string;
}

export interface Command {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  command: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommandDto {
  title: string;
  command: string;
  description?: string;
  order?: number;
}

export interface Session {
  id: string;
  deviceInfo?: string;
  ipAddress?: string;
  expiresAt: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export { ApiError };
