import type { Diagnostics, Health, Info } from "../api/types";
import { Badge, bytes, Card } from "../components/ui";
import { runtime } from "../platform/runtime";

export default function SystemPage({
  health,
  diagnostics,
  info,
}: {
  health: Health;
  diagnostics: Diagnostics;
  info: Info;
}) {
  return (
    <>
      <header className="topbar">
        <div><span className="eyebrow">KUROHA / SYSTEM</span><h1>System diagnostics</h1></div>
        <Badge tone="ok">Operational</Badge>
      </header>

      <section className="stack">
        <Card>
          <span className="eyebrow">RUNTIME</span>
          <dl className="details">
            <div><dt>Kuroha</dt><dd>{health.version}</dd></div>
            <div><dt>Python</dt><dd>{diagnostics.python_version}</dd></div>
            <div><dt>Node</dt><dd>{diagnostics.node_version ?? "not detected"}</dd></div>
            <div><dt>Platform</dt><dd>{diagnostics.platform}</dd></div>
            <div><dt>Environment</dt><dd>{diagnostics.environment}</dd></div>
            <div><dt>Port</dt><dd>{diagnostics.port}</dd></div>
            <div><dt>UI runtime</dt><dd>{runtime.kind()}</dd></div>
          </dl>
        </Card>

        <div className="two-column">
          <Card>
            <span className="eyebrow">STORAGE</span>
            <dl className="details compact">
              <div><dt>Database</dt><dd>{bytes(diagnostics.database_size_bytes)}</dd></div>
              <div><dt>Schema</dt><dd>v{diagnostics.database_schema_version}</dd></div>
              <div><dt>Journal</dt><dd>{diagnostics.database_journal_mode}</dd></div>
              <div><dt>Integrity</dt><dd>{diagnostics.database_integrity}</dd></div>
              <div><dt>Writable</dt><dd>{diagnostics.data_dir_writable ? "yes" : "no"}</dd></div>
              <div><dt>Disk free</dt><dd>{bytes(diagnostics.disk_free_bytes)}</dd></div>
            </dl>
          </Card>
          <Card>
            <span className="eyebrow">CAPABILITIES</span>
            <div className="chips">{info.capabilities.map((capability) => <span key={capability}>{capability}</span>)}</div>
            <div className="path-block"><span>Data directory</span><code>{diagnostics.data_dir}</code></div>
          </Card>
        </div>
      </section>
    </>
  );
}
