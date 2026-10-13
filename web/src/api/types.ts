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
