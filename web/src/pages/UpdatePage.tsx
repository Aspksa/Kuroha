import { useEffect, useState } from "react";

import {
  applyUpdate,
  getUpdateStatus,
  prepareUpdate,
} from "../api/client";
import type { UpdateStatus } from "../api/types";
import { Badge, Button, Card, LoadingPanel } from "../components/ui";

type Phase = "idle" | "checking" | "downloading" | "applying" | "restarting";

function shortSha(value: string | null): string {
  return value ? value.slice(0, 12) : "не зафиксирован";
}

export default function UpdatePage() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string>();

  useEffect(() => {
    void check();
  }, []);

  async function check() {
    try {
      setPhase("checking");
      setError(undefined);
      setStatus(await getUpdateStatus());
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
      setPhase("idle");
      return;
    }
    setPhase("idle");
  }

  async function install() {
    if (!window.confirm(
      "Kuroha закроется, заменит файлы проекта и автоматически запустится снова. Продолжить?"
    )) return;

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

  return (
    <>
      <header className="topbar">
        <div>
          <span className="eyebrow">KUROHA / ОБНОВЛЕНИЕ</span>
          <h1>Обновление</h1>
        </div>
        <Button onClick={() => void check()} disabled={phase !== "idle"}>
          Проверить обновления
        </Button>
      </header>

      {!status && phase === "checking" ? (
        <LoadingPanel label="Проверка GitHub…" />
      ) : (
        <section className="stack">
          <Card>
            <div className="section-heading">
              <div>
                <span className="eyebrow">КАНАЛ ОБНОВЛЕНИЙ</span>
                <h2>GitHub · main</h2>
              </div>
              {status && (
                <Badge tone={status.update_available ? "accent" : "ok"}>
                  {status.update_available ? "Доступно обновление" : "Актуальная версия"}
                </Badge>
              )}
            </div>

            {status && (
              <>
                <div className="update-status-grid">
                  <div><span>Версия Kuroha</span><strong>{status.current_version}</strong></div>
                  <div><span>Ветка</span><strong>{status.branch}</strong></div>
                  <div><span>Локальная ревизия</span><strong>{shortSha(status.installed_sha)}</strong></div>
                  <div><span>GitHub main</span><strong>{shortSha(status.remote_sha)}</strong></div>
                </div>

                <div className="path-block">
                  <span>Последнее изменение в GitHub</span>
                  <code>{status.commit_message || "Нет описания коммита"}</code>
                </div>

                <p className="update-note">
                  При обновлении сохраняются пользовательские данные, база данных, резервные
                  копии, файл <code>.env</code> и виртуальное окружение Python. Исходный код
                  перед заменой сохраняется в <code>data/updates/backups</code>.
                </p>

                {status.git_checkout && (
                  <p className="update-note">
                    Обнаружен Git-клон. Автоустановка из интерфейса отключена, чтобы не
                    изменять рабочее дерево. Для такого проекта используйте <code>git pull</code>.
                  </p>
                )}

                {!status.installed_sha && !status.git_checkout && (
                  <p className="update-note">
                    Эта установка ещё не имеет зафиксированной GitHub-ревизии. Первая
                    синхронизация скачает текущий <code>main</code> и запомнит его SHA.
                  </p>
                )}

                <div className="update-actions">
                  {status.update_available && !status.prepared && !status.git_checkout && (
                    <Button
                      kind="primary"
                      disabled={phase !== "idle"}
                      onClick={() => void prepare()}
                    >
                      Скачать обновление
                    </Button>
                  )}
                  {status.prepared && !status.git_checkout && (
                    <Button
                      kind="primary"
                      disabled={phase !== "idle"}
                      onClick={() => void install()}
                    >
                      Установить и перезапустить Kuroha
                    </Button>
                  )}
                  <a
                    className="ghost link-button update-repository"
                    href={status.repository_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Открыть репозиторий
                  </a>
                </div>
              </>
            )}
          </Card>

          {(phase === "downloading" || phase === "applying" || phase === "restarting") && (
            <Card>
              <div className="update-progress">
                <span className="spinner" />
                <strong>
                  {phase === "downloading" && "Скачивание и проверка обновления…"}
                  {phase === "applying" && "Запуск установки…"}
                  {phase === "restarting" && "Kuroha обновляется и будет перезапущена…"}
                </strong>
              </div>
            </Card>
          )}

          {error && (
            <Card>
              <span className="eyebrow">ОШИБКА ОБНОВЛЕНИЯ</span>
              <h2>Обновление не выполнено</h2>
              <p className="muted">{error}</p>
            </Card>
          )}
        </section>
      )}
    </>
  );
}
