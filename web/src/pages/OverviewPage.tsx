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
          <span className="eyebrow">KUROHA / ЛОКАЛЬНАЯ ПЛАТФОРМА</span>
          <h1>Центр управления</h1>
        </div>
      </header>

      <section className="grid">
        <Card className="hero">
          <div className="hero-copy">
            <span className="eyebrow">ОСНОВА KUROHA · {info.version}</span>
            <h2>Тихая сила.<br />Надёжная основа.</h2>
            <p>Локальная платформа, созданная для надёжного хранения, переносимости, наблюдаемости и контролируемого развития.</p>
            <div className="hero-meta">
              <span><i className="meta-dot" />Локальная среда</span>
              <span>SQLite WAL</span>
              <span>Устанавливаемая PWA</span>
              <span>Готово к desktop</span>
            </div>
          </div>
          <div className="hero-sigil" aria-hidden="true">
            <div className="sigil-ring ring-one" />
            <div className="sigil-ring ring-two" />
            <div className="sigil-core">K</div>
          </div>
        </Card>

        <Card className="metric">
          <span className="metric-label">Версия платформы</span>
          <strong>{info.version}</strong>
          <small>Текущая локальная версия</small>
        </Card>
        <Card className="metric">
          <span className="metric-label">Схема базы данных</span>
          <strong>v{diagnostics.database_schema_version}</strong>
          <small>Уровень миграции</small>
        </Card>
        <Card className="metric">
          <span className="metric-label">Точки восстановления</span>
          <strong>{backups.length}</strong>
          <small>Доступные локальные копии</small>
        </Card>

        <Card className="system-glance">
          <div>
            <span className="eyebrow">СОСТОЯНИЕ СИСТЕМЫ</span>
            <h2>Всё важное — одним взглядом.</h2>
          </div>
          <div className="glance-grid">
            <div><span>Среда</span><strong>Python {diagnostics.python_version}</strong></div>
            <div><span>База данных</span><strong>{diagnostics.database_integrity === "ok" ? "Исправна" : diagnostics.database_integrity}</strong></div>
            <div><span>Свободно на диске</span><strong>{bytes(diagnostics.disk_free_bytes)}</strong></div>
            <div><span>Режим</span><strong>{diagnostics.environment}</strong></div>
          </div>
        </Card>
      </section>
    </>
  );
}
