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
        <div><span className="eyebrow">KUROHA / СИСТЕМА</span><h1>Диагностика системы</h1></div>
        <Badge tone="ok">Работает</Badge>
      </header>

      <section className="stack">
        <Card>
          <span className="eyebrow">СРЕДА ВЫПОЛНЕНИЯ</span>
          <dl className="details">
            <div><dt>Kuroha</dt><dd>{health.version}</dd></div>
            <div><dt>Python</dt><dd>{diagnostics.python_version}</dd></div>
            <div><dt>Node</dt><dd>{diagnostics.node_version ?? "не обнаружен"}</dd></div>
            <div><dt>Платформа</dt><dd>{diagnostics.platform}</dd></div>
            <div><dt>Окружение</dt><dd>{diagnostics.environment}</dd></div>
            <div><dt>Порт</dt><dd>{diagnostics.port}</dd></div>
            <div><dt>Среда интерфейса</dt><dd>{runtime.kind()}</dd></div>
          </dl>
        </Card>

        <div className="two-column">
          <Card>
            <span className="eyebrow">ХРАНИЛИЩЕ</span>
            <dl className="details compact">
              <div><dt>База данных</dt><dd>{bytes(diagnostics.database_size_bytes)}</dd></div>
              <div><dt>Схема</dt><dd>v{diagnostics.database_schema_version}</dd></div>
              <div><dt>Журнал</dt><dd>{diagnostics.database_journal_mode}</dd></div>
              <div><dt>Целостность</dt><dd>{diagnostics.database_integrity}</dd></div>
              <div><dt>Запись</dt><dd>{diagnostics.data_dir_writable ? "разрешена" : "недоступна"}</dd></div>
              <div><dt>Свободно на диске</dt><dd>{bytes(diagnostics.disk_free_bytes)}</dd></div>
            </dl>
          </Card>
          <Card>
            <span className="eyebrow">ВОЗМОЖНОСТИ</span>
            <div className="chips">{info.capabilities.map((capability) => <span key={capability}>{capability}</span>)}</div>
            <div className="path-block"><span>Папка данных</span><code>{diagnostics.data_dir}</code></div>
          </Card>
        </div>
      </section>
    </>
  );
}
