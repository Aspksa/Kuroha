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
  checked_at: string;
};

export type UpdateApplyResponse = {
  accepted: boolean;
  target_sha: string;
  message: string;
};
