import type { BackupInfo, Diagnostics, Health, Info } from "../api/types";
import { Badge, bytes, Card } from "../components/ui";
import { runtime } from "../platform/runtime";

export default function DashboardPage({
  health,
  info,
  diagnostics,
  backups,
}: {
  health: Health;
  info: Info;
  diagnostics: Diagnostics;
  backups: BackupInfo[];
}) {
  return (
    <>
      <header className="topbar dashboard-topbar">
        <div>
          <span className="eyebrow">KUROHA / ГЛАВНАЯ</span>
          <h1>Центр управления</h1>
        </div>
        <Badge tone="ok">Система работает</Badge>
      </header>

      <section className="grid dashboard-grid">
        <Card className="hero dashboard-hero">
          <div className="hero-copy">
            <span className="eyebrow">KUROHA · {info.version}</span>
            <h2>Спокойный интерфейс.<br />Вся система рядом.</h2>
            <p>Состояние платформы, среды выполнения, хранилища и резервных точек теперь собрано на одной странице.</p>
            <div className="hero-meta">
              <span><i className="meta-dot" />Ядро в сети</span>
              <span>Python {diagnostics.python_version}</span>
              <span>SQLite {diagnostics.database_journal_mode.toUpperCase()}</span>
              <span>{runtime.kind()}</span>
            </div>
          </div>
          <div className="hero-sigil" aria-hidden="true">
            <div className="sigil-ring ring-one" />
            <div className="sigil-ring ring-two" />
            <div className="sigil-core">K</div>
          </div>
        </Card>

        <Card className="metric">
          <span className="metric-label">Версия</span>
          <strong>{health.version}</strong>
          <small>Текущая локальная сборка</small>
        </Card>
        <Card className="metric">
          <span className="metric-label">Резервные копии</span>
          <strong>{backups.length}</strong>
          <small>Точки восстановления</small>
        </Card>
        <Card className="metric">
          <span className="metric-label">Свободно</span>
          <strong>{bytes(diagnostics.disk_free_bytes)}</strong>
          <small>На диске данных</small>
        </Card>

        <Card className="dashboard-status-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">СОСТОЯНИЕ</span>
              <h2>Система и хранилище</h2>
            </div>
            <Badge tone={diagnostics.database_integrity === "ok" ? "ok" : "bad"}>
              {diagnostics.database_integrity === "ok" ? "Исправно" : diagnostics.database_integrity}
            </Badge>
          </div>
          <div className="dashboard-kpis">
            <div><span>Python</span><strong>{diagnostics.python_version}</strong></div>
            <div><span>Node</span><strong>{diagnostics.node_version ?? "не найден"}</strong></div>
            <div><span>Схема БД</span><strong>v{diagnostics.database_schema_version}</strong></div>
            <div><span>Размер БД</span><strong>{bytes(diagnostics.database_size_bytes)}</strong></div>
            <div><span>Порт</span><strong>{diagnostics.port}</strong></div>
            <div><span>Режим</span><strong>{diagnostics.environment}</strong></div>
          </div>
        </Card>

        <Card className="dashboard-details-card">
          <span className="eyebrow">ПЛАТФОРМА</span>
          <h2>Технические сведения</h2>
          <dl className="details compact">
            <div><dt>Платформа</dt><dd>{diagnostics.platform}</dd></div>
            <div><dt>Среда интерфейса</dt><dd>{runtime.kind()}</dd></div>
            <div><dt>Запись в data</dt><dd>{diagnostics.data_dir_writable ? "разрешена" : "недоступна"}</dd></div>
            <div><dt>Папка данных</dt><dd>{diagnostics.data_dir}</dd></div>
          </dl>
          <div className="chips dashboard-capabilities">
            {info.capabilities.slice(0, 8).map((capability) => <span key={capability}>{capability}</span>)}
          </div>
        </Card>
      </section>
    </>
  );
}
