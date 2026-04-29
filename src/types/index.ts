// Core domain types for RapidScan

export type InputType = 'zip' | 'local' | 'github'
export type ScanType = 'heavy' | 'light' | 'task-generation' | 'orphan-detection'
export type ScanTrigger = 'manual' | 'scheduled' | 'auto-followup'
export type DependencyCategory = 'npm' | 'azure-sdk' | 'ai-model' | 'third-party-api' | 'azure-service' | 'orphaned' | 'other'
export type DependencyStatus = 'healthy' | 'warning' | 'critical' | 'deprecated' | 'unknown'
export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type TaskType = 'security' | 'deprecation' | 'version-update' | 'orphaned-code' | 'other'
export type Complexity = 'negligible' | 'low' | 'medium' | 'high'
export type TaskStatus = 'open' | 'in-progress' | 'resolved' | 'dismissed'
export type Confidence = 'high' | 'medium' | 'low'

export interface Project {
  project_id: string
  name: string
  repo_url: string | null
  input_type: InputType
  created_at: string
  last_scanned_at: string | null
}

export interface Dependency {
  dependency_id: string
  project_id: string
  category: DependencyCategory
  name: string
  current_version: string | null
  latest_version: string | null
  status: DependencyStatus
  first_detected_at: string
  last_updated_at: string
}

export interface DependencyReference {
  reference_id: string
  dependency_id: string
  file_path: string
  line_number: number | null
  parent_function: string | null
  parent_class: string | null
}

export interface CallChain {
  chain_id: string
  reference_id: string
  caller_function: string | null
  caller_file: string | null
  caller_line: number | null
  chain_depth: number
  confidence: Confidence
}

export interface ScanHistoryEntry {
  scan_id: string
  project_id: string
  scan_type: ScanType
  triggered_by: ScanTrigger
  started_at: string
  completed_at: string | null
  findings_count: number | null
  current_file: string | null
  files_total: number | null
  files_processed: number | null
  error_message: string | null
}

export interface Task {
  task_id: string
  project_id: string
  dependency_id: string | null
  title: string
  description: string | null
  severity: Severity
  type: TaskType
  complexity: Complexity
  score: number
  status: TaskStatus
  github_issue_url: string | null
  location_map: LocationMap | null
  recommended_fix: string | null
  suggested_tests: string | null
  created_at: string
  updated_at: string
}

export interface LocationMap {
  files: string[]
  references: Array<{
    file: string
    line: number | null
    function: string | null
    callChain: Array<{
      file: string
      function: string | null
      depth: number
      confidence: Confidence
    }>
  }>
}

export interface ProjectSettings {
  setting_id: string
  project_id: string
  github_pat: string | null
  github_issue_threshold: number | null
  detect_orphaned_code: boolean
  light_scan_interval: number | null
  severity_critical: number
  severity_high: number
  severity_medium: number
  severity_low: number
  type_security: number
  type_deprecation: number
  type_version_update: number
  type_orphaned_code: number
  complexity_negligible: number
  complexity_low: number
  complexity_medium: number
  complexity_high: number
}

export interface FileManifestEntry {
  path: string
  extension: string
  sizeBytes: number
}

export interface HeavyScanFinding {
  category: DependencyCategory
  name: string
  version: string | null
  lineNumber: number | null
  parentFunction: string | null
  parentClass: string | null
  outboundCalls: Array<{
    callerFunction: string | null
    callerFile: string | null
    callerLine: number | null
    confidence: Confidence
  }>
}
