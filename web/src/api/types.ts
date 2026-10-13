export type Health = {
  status: "ok";
  version: string;
  environment: string;
};

export type Info = {
  name: string;
  version: string;
  api_version: string;
  capabilities: string[];
};

export type PublicSettings = {
  site_name: string;
  theme: "dark" | "light";
  language: "ru";
  autostart_windows: boolean;
  launch_minimized: boolean;
  minimize_to_tray: boolean;
  check_updates_on_start: boolean;
  preferred_api_port: number;
  preferred_data_dir: string;
};

export type Diagnostics = {
  python_version: string;
  python_executable: string;
  node_version: string | null;
  platform: string;
  project_root: string;
  data_dir: string;
  database_path: string;
  database_size_bytes: number;
  database_schema_version: number;
  database_journal_mode: string;
  database_integrity: string;
  data_dir_writable: boolean;
  disk_free_bytes: number;
  disk_total_bytes: number;
  environment: string;
  host: string;
  port: number;
};

export type BackupInfo = {
  id: string;
  filename: string;
  created_at: string;
  size_bytes: number;
};

export type LogEntry = {
  raw: string;
  level: string;
};

export type StorageUsage = {
  database_bytes: number;
  backups_bytes: number;
  logs_bytes: number;
  total_bytes: number;
  backup_count: number;
  log_file_count: number;
};

export type CleanupResult = {
  removed_backups: number;
  removed_log_files: number;
  freed_bytes: number;
};


export type UpdateStatus = {
  current_version: string;
  installed_sha: string | null;
  remote_sha: string;
  update_available: boolean;
  prepared: boolean;
  git_checkout: boolean;
  repository_url: string;
  branch: string;
  commit_message: string;
  changelog: string[];
  checked_at: string;
  channel: "fresh" | "stable";
};

export type UpdateApplyResponse = {
  accepted: boolean;
  target_sha: string;
  message: string;
};

export type UpdateBackup = {
  filename: string;
  created_at: string;
  size_bytes: number;
};

export type UpdateRollbackResponse = {
  accepted: boolean;
  backup: string;
  message: string;
};


export type UpdatePreferences = {
  channel: "fresh" | "stable";
  auto_check: "hourly" | "daily" | "off";
  token_saved: boolean;
};

export type ProjectLifeMetric = {
  icon: string;
  title: string;
  value: string;
  detail: string;
  progress: number | null;
};

export type ProjectLifeSection = {
  title: string;
  metrics: ProjectLifeMetric[];
};

export type ProjectLife = {
  generated_at: string;
  source: string;
  last_commit_at: string | null;
  commits: number;
  age_days: number;
  files: number;
  code_lines: number;
  test_files: number;
  tests: number;
  languages: Array<{ name: string; lines: number; percent: number }>;
  sections: ProjectLifeSection[];
};
