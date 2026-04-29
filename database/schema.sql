-- RapidScan Azure SQL Schema
-- Version: 0.2

-- Projects
CREATE TABLE projects (
  project_id        UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name              NVARCHAR(255) NOT NULL,
  repo_url          NVARCHAR(500) NULL,
  input_type        NVARCHAR(20) NOT NULL CHECK (input_type IN ('zip', 'local', 'github')),
  created_at        DATETIME2 DEFAULT GETUTCDATE(),
  last_scanned_at   DATETIME2 NULL,
  CONSTRAINT uq_project_name UNIQUE (name)
);

-- Dependencies
CREATE TABLE dependencies (
  dependency_id     UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  project_id        UNIQUEIDENTIFIER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  category          NVARCHAR(30) NOT NULL CHECK (category IN ('npm', 'azure-sdk', 'ai-model', 'third-party-api', 'azure-service', 'orphaned', 'other')),
  name              NVARCHAR(500) NOT NULL,
  current_version   NVARCHAR(100) NULL,
  latest_version    NVARCHAR(100) NULL,
  status            NVARCHAR(20) NOT NULL DEFAULT 'unknown' CHECK (status IN ('healthy', 'warning', 'critical', 'deprecated', 'unknown')),
  first_detected_at DATETIME2 DEFAULT GETUTCDATE(),
  last_updated_at   DATETIME2 DEFAULT GETUTCDATE(),
  CONSTRAINT uq_dependency UNIQUE (project_id, category, name)
);

-- Dependency References (where in the code)
CREATE TABLE dependency_references (
  reference_id      UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  dependency_id     UNIQUEIDENTIFIER NOT NULL REFERENCES dependencies(dependency_id) ON DELETE CASCADE,
  file_path         NVARCHAR(1000) NOT NULL,
  line_number       INT NULL,
  parent_function   NVARCHAR(500) NULL,
  parent_class      NVARCHAR(500) NULL
);

-- Call Chains
CREATE TABLE call_chains (
  chain_id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  reference_id      UNIQUEIDENTIFIER NOT NULL REFERENCES dependency_references(reference_id) ON DELETE CASCADE,
  caller_function   NVARCHAR(500) NULL,
  caller_file       NVARCHAR(1000) NULL,
  caller_line       INT NULL,
  chain_depth       INT NOT NULL DEFAULT 1,
  confidence        NVARCHAR(10) NOT NULL DEFAULT 'low' CHECK (confidence IN ('high', 'medium', 'low'))
);

-- Scan History
CREATE TABLE scan_history (
  scan_id           UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  project_id        UNIQUEIDENTIFIER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  scan_type         NVARCHAR(20) NOT NULL CHECK (scan_type IN ('heavy', 'light', 'task-generation', 'orphan-detection')),
  triggered_by      NVARCHAR(20) NOT NULL CHECK (triggered_by IN ('manual', 'scheduled', 'auto-followup')),
  started_at        DATETIME2 DEFAULT GETUTCDATE(),
  completed_at      DATETIME2 NULL,
  findings_count    INT NULL,
  current_file      NVARCHAR(1000) NULL,
  files_total       INT NULL,
  files_processed   INT NULL,
  error_message     NVARCHAR(MAX) NULL
);

-- Tasks
CREATE TABLE tasks (
  task_id           UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  project_id        UNIQUEIDENTIFIER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  dependency_id     UNIQUEIDENTIFIER NULL REFERENCES dependencies(dependency_id) ON DELETE NO ACTION,
  title             NVARCHAR(500) NOT NULL,
  description       NVARCHAR(MAX) NULL,
  severity          NVARCHAR(10) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  type              NVARCHAR(20) NOT NULL CHECK (type IN ('security', 'deprecation', 'version-update', 'orphaned-code', 'other')),
  complexity        NVARCHAR(10) NOT NULL CHECK (complexity IN ('negligible', 'low', 'medium', 'high')),
  score             INT NOT NULL DEFAULT 0,
  status            NVARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'dismissed')),
  github_issue_url  NVARCHAR(500) NULL,
  location_map      NVARCHAR(MAX) NULL, -- JSON snapshot at task creation time
  recommended_fix   NVARCHAR(MAX) NULL,
  suggested_tests   NVARCHAR(MAX) NULL,
  created_at        DATETIME2 DEFAULT GETUTCDATE(),
  updated_at        DATETIME2 DEFAULT GETUTCDATE()
);

-- Project Settings
CREATE TABLE project_settings (
  setting_id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  project_id              UNIQUEIDENTIFIER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  github_pat              NVARCHAR(500) NULL, -- encrypted at rest by Azure SQL TDE
  github_issue_threshold  INT NULL, -- null = GitHub issue creation disabled
  detect_orphaned_code    BIT NOT NULL DEFAULT 1,
  light_scan_interval     INT NULL, -- null = manual only; otherwise interval in days
  severity_critical       INT NOT NULL DEFAULT 4,
  severity_high           INT NOT NULL DEFAULT 3,
  severity_medium         INT NOT NULL DEFAULT 2,
  severity_low            INT NOT NULL DEFAULT 1,
  type_security           INT NOT NULL DEFAULT 4,
  type_deprecation        INT NOT NULL DEFAULT 3,
  type_version_update     INT NOT NULL DEFAULT 2,
  type_orphaned_code      INT NOT NULL DEFAULT 1,
  complexity_negligible   INT NOT NULL DEFAULT 4,
  complexity_low          INT NOT NULL DEFAULT 3,
  complexity_medium       INT NOT NULL DEFAULT 2,
  complexity_high         INT NOT NULL DEFAULT 1,
  CONSTRAINT uq_project_settings UNIQUE (project_id)
);

-- Useful indexes
CREATE INDEX ix_dependencies_project ON dependencies(project_id);
CREATE INDEX ix_dependencies_status ON dependencies(project_id, status);
CREATE INDEX ix_references_dependency ON dependency_references(dependency_id);
CREATE INDEX ix_chains_reference ON call_chains(reference_id);
CREATE INDEX ix_tasks_project_status ON tasks(project_id, status);
CREATE INDEX ix_tasks_score ON tasks(project_id, score DESC);
CREATE INDEX ix_scan_history_project ON scan_history(project_id, started_at DESC);
