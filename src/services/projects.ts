import type { Project, InputType, FileManifestEntry, ScanHistoryEntry, ManifestResponse, DependencyDetail, Task, TaskStatus } from '@/types'

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

  async ingestZip(id: string, file: File): Promise<{ files: FileManifestEntry[]; count: number }> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/projects/${id}/ingest/zip`, { method: 'POST', body: formData })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(body || `HTTP ${res.status}`)
    }
    return res.json() as Promise<{ files: FileManifestEntry[]; count: number }>
  },

  ingestLocal(id: string, directoryPath: string): Promise<{ files: FileManifestEntry[]; count: number }> {
    return request<{ files: FileManifestEntry[]; count: number }>(`/api/projects/${id}/ingest/local`, {
      method: 'POST',
      body: JSON.stringify({ directoryPath }),
    })
  },

  ingestGithub(id: string): Promise<{ files: FileManifestEntry[]; count: number }> {
    return request<{ files: FileManifestEntry[]; count: number }>(`/api/projects/${id}/ingest/github`, {
      method: 'POST',
    })
  },

  startHeavyScan(id: string): Promise<{ scan_id: string; files_total: number }> {
    return request<{ scan_id: string; files_total: number }>(`/api/projects/${id}/scan/heavy`, {
      method: 'POST',
    })
  },

  startLightScan(id: string): Promise<{ scan_id: string }> {
    return request<{ scan_id: string }>(`/api/projects/${id}/scan/light`, {
      method: 'POST',
    })
  },

  getScanHistory(id: string): Promise<ScanHistoryEntry[]> {
    return request<ScanHistoryEntry[]>(`/api/projects/${id}/scan-history`)
  },

  getManifest(id: string): Promise<ManifestResponse> {
    return request<ManifestResponse>(`/api/projects/${id}/manifest`)
  },

  getDependencyDetail(id: string, depId: string): Promise<DependencyDetail> {
    return request<DependencyDetail>(`/api/projects/${id}/manifest/${depId}`)
  },

  getTasks(id: string, status?: string, dependencyId?: string): Promise<Task[]> {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (dependencyId) params.set('dependency_id', dependencyId)
    const qs = params.size > 0 ? `?${params.toString()}` : ''
    return request<Task[]>(`/api/projects/${id}/tasks${qs}`)
  },

  getTask(id: string, taskId: string): Promise<Task> {
    return request<Task>(`/api/projects/${id}/tasks/${taskId}`)
  },

  updateTaskStatus(id: string, taskId: string, status: TaskStatus): Promise<Task> {
    return request<Task>(`/api/projects/${id}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },
}
