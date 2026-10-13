import { useEffect, useState } from "react";

import {
  applyUpdate,
  getUpdateBackups,
  getUpdateStatus,
  prepareUpdate,
  rollbackUpdate,
} from "../api/client";
import type { UpdateBackup, UpdateStatus } from "../api/types";
import { Badge, Button, bytes, Card, LoadingPanel } from "../components/ui";

type Phase = "idle" | "checking" | "downloading" | "applying" | "restarting" | "rollback";

function shortSha(value: string | null): string {
  return value ? value.slice(0, 12) : "не зафиксирован";
}

export default function UpdatePage() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [backups, setBackups] = useState<UpdateBackup[]>([]);
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string>();

  useEffect(() => { void check(); }, []);

  async function check() {
    try {
      setPhase("checking");
      setError(undefined);
      const [nextStatus, history] = await Promise.all([getUpdateStatus(), getUpdateBackups()]);
      setStatus(nextStatus);
      setBackups(history);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось проверить обновления.");
    } finally {
      setPhase("idle");
    }
  }

  async function prepare() {
    try {
      setPhase("downloading");
      setError(undefined);
      setStatus(await prepareUpdate());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось подготовить обновление.");
    } finally {
      setPhase("idle");
    }
  }

  async function install() {
    if (!window.confirm("Kuroha закроется, установит обновление и автоматически запустится снова. Продолжить?")) return;
    try {
      setPhase("applying");
      setError(undefined);
      await applyUpdate();
      setPhase("restarting");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось запустить обновление.");
      setPhase("idle");
    }
  }

  async function rollback(filename: string) {
    if (!window.confirm("Откатить исходный код к этой резервной копии и перезапустить Kuroha? Пользовательские данные останутся без изменений.")) return;
    try {
      setPhase("rollback");
      setError(undefined);
      await rollbackUpdate(filename);
      setPhase("restarting");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось запустить откат.");
      setPhase("idle");
    }
  }

  return (
    <>
      <header className="topbar">
        <div><span className="eyebrow">KUROHA / ОБНОВЛЕНИЕ</span><h1>Обновление</h1></div>
        <Button onClick={() => void check()} disabled={phase !== "idle"}>Проверить обновления</Button>
      </header>

      {!status && phase === "checking" ? <LoadingPanel label="Проверка GitHub…" /> : (
        <section className="stack">
          <Card>
            <div className="section-heading">
              <div><span className="eyebrow">КАНАЛ ОБНОВЛЕНИЙ</span><h2>GitHub · main</h2></div>
              {status && <Badge tone={status.update_available ? "accent" : "ok"}>{status.update_available ? "Доступно обновление" : "Актуальная версия"}</Badge>}
            </div>

            {status && <>
              <div className="update-status-grid">
                <div><span>Версия Kuroha</span><strong>{status.current_version}</strong></div>
                <div><span>Ветка</span><strong>{status.branch}</strong></div>
                <div><span>Локальная ревизия</span><strong>{shortSha(status.installed_sha)}</strong></div>
                <div><span>GitHub main</span><strong>{shortSha(status.remote_sha)}</strong></div>
              </div>

              <div className="path-block"><span>Последнее изменение</span><code>{status.commit_message || "Нет описания коммита"}</code></div>

              {status.changelog.length > 0 && <div className="update-changelog">
                <span className="eyebrow">ЧТО ИЗМЕНИЛОСЬ</span>
                <ul>{status.changelog.map((item, index) => <li key={index}>{item}</li>)}</ul>
              </div>}

              <p className="update-note">Перед заменой исходного кода создаётся точка отката. Папка <code>data</code>, SQLite, резервные копии, журналы, <code>.env</code> и <code>.venv</code> сохраняются.</p>

              {status.git_checkout && <p className="update-note">Обнаружен Git-клон. Автоустановка и откат из интерфейса отключены. Используйте <code>git pull</code>.</p>}

              <div className="update-actions">
                {status.update_available && !status.prepared && !status.git_checkout && <Button kind="primary" disabled={phase !== "idle"} onClick={() => void prepare()}>Скачать обновление</Button>}
                {status.prepared && !status.git_checkout && <Button kind="primary" disabled={phase !== "idle"} onClick={() => void install()}>Установить и перезапустить Kuroha</Button>}
                <a className="ghost link-button update-repository" href={status.repository_url} target="_blank" rel="noreferrer">Открыть репозиторий</a>
              </div>
            </>}
          </Card>

          <Card>
            <span className="eyebrow">ОТКАТ</span>
            <h2>Предыдущие версии исходного кода</h2>
            {backups.length === 0 ? <p className="muted">Точки отката появятся после первого установленного обновления.</p> : (
              <div className="backup-list">
                {backups.map((backup) => <div className="backup-row" key={backup.filename}>
                  <div><strong>{backup.filename}</strong><small>{bytes(backup.size_bytes)} · {new Date(backup.created_at).toLocaleString("ru-RU")}</small></div>
                  <Button disabled={phase !== "idle" || Boolean(status?.git_checkout)} onClick={() => void rollback(backup.filename)}>Откатить</Button>
                </div>)}
              </div>
            )}
          </Card>

          {phase !== "idle" && phase !== "checking" && <Card><div className="update-progress"><span className="spinner" /><strong>
            {phase === "downloading" && "Скачивание и проверка обновления…"}
            {phase === "applying" && "Запуск установки…"}
            {phase === "rollback" && "Подготовка отката…"}
            {phase === "restarting" && "Kuroha перезапускается…"}
          </strong></div></Card>}

          {error && <Card><span className="eyebrow">ОШИБКА ОБНОВЛЕНИЯ</span><h2>Операция не выполнена</h2><p className="muted">{error}</p></Card>}
        </section>
      )}
    </>
  );
}
