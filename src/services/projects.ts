import type { Project, InputType } from '@/types'

export interface CreateProjectPayload {
  name: string
  input_type: InputType
  repo_url?: string
  github_pat?: string
}

export interface UpdateProjectPayload {
  name?: string
  repo_url?: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(body || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const projectsService = {
  list(): Promise<Project[]> {
    return request<Project[]>('/api/projects')
  },

  get(id: string): Promise<Project> {
    return request<Project>(`/api/projects/${id}`)
  },

  create(payload: CreateProjectPayload): Promise<Project> {
    return request<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  update(id: string, payload: UpdateProjectPayload): Promise<Project> {
    return request<Project>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  delete(id: string): Promise<void> {
    return request<void>(`/api/projects/${id}`, { method: 'DELETE' })
  },
}
