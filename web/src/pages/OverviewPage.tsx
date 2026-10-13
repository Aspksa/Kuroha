import type { BackupInfo, Diagnostics, Info } from "../api/types";
import { bytes, Card } from "../components/ui";

export default function OverviewPage({
  info,
  diagnostics,
  backups,
}: {
  info: Info;
  diagnostics: Diagnostics;
  backups: BackupInfo[];
}) {
  return (
    <>
      <header className="topbar">
        <div>
          <span className="eyebrow">KUROHA / LOCAL PLATFORM</span>
          <h1>Command center</h1>
        </div>
      </header>

      <section className="grid">
        <Card className="hero">
          <div className="hero-copy">
            <span className="eyebrow">KUROHA FOUNDATION · {info.version}</span>
            <h2>Quiet power.<br />Stable foundation.</h2>
            <p>A local-first platform engineered for persistence, portability, observability and controlled growth.</p>
            <div className="hero-meta">
              <span><i className="meta-dot" />Local runtime</span>
              <span>SQLite WAL</span>
              <span>Installable PWA</span>
              <span>Desktop-ready</span>
            </div>
          </div>
          <div className="hero-sigil" aria-hidden="true">
            <div className="sigil-ring ring-one" />
            <div className="sigil-ring ring-two" />
            <div className="sigil-core">K</div>
          </div>
        </Card>

        <Card className="metric">
          <span className="metric-label">Platform version</span>
          <strong>{info.version}</strong>
          <small>Current local release</small>
        </Card>
        <Card className="metric">
          <span className="metric-label">Database schema</span>
          <strong>v{diagnostics.database_schema_version}</strong>
          <small>Migration level</small>
        </Card>
        <Card className="metric">
          <span className="metric-label">Restore points</span>
          <strong>{backups.length}</strong>
          <small>Local backups available</small>
        </Card>

        <Card className="system-glance">
          <div>
            <span className="eyebrow">SYSTEM GLANCE</span>
            <h2>Everything important, at a glance.</h2>
          </div>
          <div className="glance-grid">
            <div><span>Runtime</span><strong>Python {diagnostics.python_version}</strong></div>
            <div><span>Database</span><strong>{diagnostics.database_integrity === "ok" ? "Healthy" : diagnostics.database_integrity}</strong></div>
            <div><span>Disk free</span><strong>{bytes(diagnostics.disk_free_bytes)}</strong></div>
            <div><span>Environment</span><strong>{diagnostics.environment}</strong></div>
          </div>
        </Card>
      </section>
    </>
  );
}
