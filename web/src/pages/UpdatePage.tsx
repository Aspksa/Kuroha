import { useEffect, useState } from "react";

import {
  applyUpdate,
  deleteUpdateToken,
  getProjectLife,
  getUpdateBackups,
  getUpdatePreferences,
  getUpdateStatus,
  prepareUpdate,
  rollbackUpdate,
  saveUpdatePreferences,
} from "../api/client";
import type {
  ProjectLife,
  ProjectLifeMetric,
  UpdateBackup,
  UpdatePreferences,
  UpdateStatus,
} from "../api/types";
import { Badge, Button, bytes, Card, LoadingPanel } from "../components/ui";

type Phase =
  | "idle"
  | "checking"
  | "downloading"
  | "applying"
  | "restarting"
  | "rollback"
  | "saving";

function shortSha(value: string | null): string {
  return value ? value.slice(0, 12) : "не зафиксирован";
}

function number(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function MetricCard({ metric }: { metric: ProjectLifeMetric }) {
  return (
    <article className="life-metric">
      <span className="life-metric-icon" aria-hidden="true">{metric.icon}</span>
      <div className="life-metric-copy">
        <span>{metric.title}</span>
        <strong>{metric.value}</strong>
        {metric.detail && <small>{metric.detail}</small>}
        {metric.progress !== null && (
          <span className="life-progress" aria-label={Math.round(metric.progress) + "%"}>
            <i style={{ width: Math.min(100, Math.max(0, metric.progress)) + "%" }} />
          </span>
        )}
      </div>
    </article>
  );
}

export default function UpdatePage() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [backups, setBackups] = useState<UpdateBackup[]>([]);
  const [life, setLife] = useState<ProjectLife | null>(null);
  const [preferences, setPreferences] = useState<UpdatePreferences | null>(null);
  const [channel, setChannel] = useState<"fresh" | "stable">("fresh");
  const [autoCheck, setAutoCheck] = useState<"hourly" | "daily" | "off">("daily");
  const [token, setToken] = useState("");
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string>();

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      setPhase("checking");
      setError(undefined);
      const [nextPreferences, history, projectLife] = await Promise.all([
        getUpdatePreferences(),
        getUpdateBackups(),
        getProjectLife(),
      ]);
      setPreferences(nextPreferences);
      setChannel(nextPreferences.channel);
      setAutoCheck(nextPreferences.auto_check);
      setBackups(history);
      setLife(projectLife);
      setStatus(await getUpdateStatus());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить центр обновлений.");
    } finally {
      setPhase("idle");
    }
  }

  async function check() {
    try {
      setPhase("checking");
      setError(undefined);
      setStatus(await getUpdateStatus());
      setLife(await getProjectLife());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось проверить обновления.");
    } finally {
      setPhase("idle");
    }
  }

  async function savePreferences() {
    try {
      setPhase("saving");
      setError(undefined);
      const saved = await saveUpdatePreferences({
        channel,
        auto_check: autoCheck,
        ...(token.trim() ? { token: token.trim() } : {}),
      });
      setPreferences(saved);
      setToken("");
      setStatus(await getUpdateStatus());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить настройки обновления.");
    } finally {
      setPhase("idle");
    }
  }

  async function removeToken() {
    try {
      setPhase("saving");
      const saved = await deleteUpdateToken();
      setPreferences(saved);
      setToken("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось удалить GitHub-токен.");
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

  if (!status && !life && phase === "checking") {
    return <LoadingPanel label="Загрузка центра обновлений…" />;
  }

  return (
    <>
      <header className="topbar">
        <div>
          <span className="eyebrow">KUROHA / ОБНОВЛЕНИЕ</span>
          <h1>Обновление и жизнь проекта</h1>
        </div>
        <Button onClick={() => void check()} disabled={phase !== "idle"}>Проверить сейчас</Button>
      </header>

      <section className="stack">
        {status && (
          <Card className="update-overview-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">СОСТОЯНИЕ ВЕРСИИ</span>
                <h2>{status.channel === "stable" ? "Стабильный канал" : "Свежий канал"} · {status.branch}</h2>
              </div>
              <Badge tone={status.update_available ? "accent" : "ok"}>
                {status.update_available ? "Доступно обновление" : "Актуальная версия"}
              </Badge>
            </div>

            <div className="update-status-grid">
              <div><span>Версия Kuroha</span><strong>{status.current_version}</strong></div>
              <div><span>Локальная ревизия</span><strong>{shortSha(status.installed_sha)}</strong></div>
              <div><span>Целевая ревизия</span><strong>{shortSha(status.remote_sha)}</strong></div>
              <div><span>Последняя проверка</span><strong>{new Date(status.checked_at).toLocaleString("ru-RU")}</strong></div>
            </div>

            <div className="path-block">
              <span>Последнее изменение</span>
              <code>{status.commit_message || "Нет описания изменения"}</code>
            </div>

            {status.changelog.length > 0 && (
              <div className="update-changelog">
                <span className="eyebrow">ЧТО ИЗМЕНИЛОСЬ</span>
                <ul>{status.changelog.map((item, index) => <li key={index}>{item}</li>)}</ul>
              </div>
            )}

            <div className="update-actions">
              {status.update_available && !status.prepared && !status.git_checkout && (
                <Button kind="primary" disabled={phase !== "idle"} onClick={() => void prepare()}>
                  Скачать обновление
                </Button>
              )}
              {status.prepared && !status.git_checkout && (
                <Button kind="primary" disabled={phase !== "idle"} onClick={() => void install()}>
                  Установить и перезапустить
                </Button>
              )}
              <a className="ghost link-button update-repository" href={status.repository_url} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </div>

            {status.git_checkout && (
              <p className="update-note">Обнаружен Git-клон. Установка и откат из интерфейса отключены — используйте <code>git pull</code>.</p>
            )}
          </Card>
        )}

        {life && (
          <Card className="project-life-card">
            <div className="section-heading life-heading">
              <div>
                <span className="eyebrow">ЖИЗНЬ ПРОЕКТА</span>
                <h2>{number(life.commits)} коммитов · {life.age_days ? life.age_days + " дней" : "локальная копия"}</h2>
              </div>
              <span className="life-source">{life.source === "git+files" ? "Git + локальные файлы" : "Локальные файлы"}</span>
            </div>

            <div className="life-pulse">
              <div><span>🦊</span><strong>{life.age_days || "—"}</strong><small>дней проекту</small></div>
              <div><span>📜</span><strong>{number(life.commits)}</strong><small>коммитов</small></div>
              <div><span>🔍</span><strong>{number(life.tests)}</strong><small>проверок в коде</small></div>
              <div><span>🧬</span><strong>{number(life.code_lines)}</strong><small>строк проекта</small></div>
            </div>

            {life.languages.length > 0 && (
              <div className="life-languages">
                <div className="life-language-head">
                  <strong>Языки проекта</strong>
                  <small>{number(life.code_lines)} строк</small>
                </div>
                <div className="language-strip">
                  {life.languages.slice(0, 6).map((language) => (
                    <i key={language.name} style={{ width: language.percent + "%" }} title={language.name + " " + language.percent + "%"} />
                  ))}
                </div>
                <div className="language-legend">
                  {life.languages.slice(0, 6).map((language) => (
                    <span key={language.name}><b>{language.name}</b> {language.percent}%</span>
                  ))}
                </div>
              </div>
            )}

            <div className="life-sections">
              {life.sections.map((section, index) => (
                <details className="life-section" key={section.title} open={index === 0}>
                  <summary>
                    <strong>{section.title}</strong>
                    <span>{section.metrics.length}</span>
                  </summary>
                  <div className="life-metric-grid">
                    {section.metrics.map((metric) => (
                      <MetricCard key={metric.title} metric={metric} />
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </Card>
        )}

        <Card className="update-preferences-card">
          <div>
            <span className="eyebrow">НАСТРОЙКИ ОБНОВЛЕНИЯ</span>
            <h2>Как Kuroha получает новые версии</h2>
          </div>

          <div className="update-preference-block">
            <div>
              <strong>Канал</strong>
              <p>Свежий — каждое изменение в <code>main</code>; стабильный — только помеченные GitHub Releases.</p>
            </div>
            <div className="choice-grid">
              <button className={channel === "fresh" ? "selected" : ""} onClick={() => setChannel("fresh")}>
                <strong>Свежий</strong><small>последние изменения</small>
              </button>
              <button className={channel === "stable" ? "selected" : ""} onClick={() => setChannel("stable")}>
                <strong>Стабильный</strong><small>только выпуски</small>
              </button>
            </div>
          </div>

          <div className="update-preference-block">
            <div>
              <strong>Автопроверка</strong>
              <p>Kuroha проверяет наличие новой версии через системный трей. Ничего не скачивается без вашего согласия.</p>
            </div>
            <div className="choice-grid three">
              {([
                ["hourly", "Каждый час"],
                ["daily", "Раз в сутки"],
                ["off", "Выключена"],
              ] as const).map(([value, label]) => (
                <button key={value} className={autoCheck === value ? "selected" : ""} onClick={() => setAutoCheck(value)}>
                  <strong>{label}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="update-preference-block token-block">
            <div>
              <strong>Токен GitHub</strong>
              <p>Токен хранится только на этом компьютере и используется только для запросов к GitHub. API не возвращает его обратно в интерфейс.</p>
            </div>
            <div className="token-controls">
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={preferences?.token_saved ? "Токен сохранён" : "github_pat_…"}
                autoComplete="off"
              />
              <span className={"token-state " + (preferences?.token_saved ? "saved" : "")}>
                {preferences?.token_saved ? "Сохранён" : "Не задан"}
              </span>
            </div>
          </div>

          <div className="update-preference-actions">
            <Button kind="primary" disabled={phase !== "idle"} onClick={() => void savePreferences()}>Сохранить</Button>
            {preferences?.token_saved && (
              <Button kind="danger" disabled={phase !== "idle"} onClick={() => void removeToken()}>Удалить токен</Button>
            )}
          </div>
        </Card>

        <Card>
          <span className="eyebrow">ОТКАТ</span>
          <h2>Предыдущие версии исходного кода</h2>
          {backups.length === 0 ? (
            <p className="muted">Точки отката появятся после первого установленного обновления.</p>
          ) : (
            <div className="backup-list">
              {backups.map((backup) => (
                <div className="backup-row" key={backup.filename}>
                  <div>
                    <strong>{backup.filename}</strong>
                    <small>{bytes(backup.size_bytes)} · {new Date(backup.created_at).toLocaleString("ru-RU")}</small>
                  </div>
                  <Button disabled={phase !== "idle" || Boolean(status?.git_checkout)} onClick={() => void rollback(backup.filename)}>Откатить</Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {phase !== "idle" && phase !== "checking" && (
          <Card>
            <div className="update-progress">
              <span className="spinner" />
              <strong>
                {phase === "downloading" && "Скачивание и проверка обновления…"}
                {phase === "applying" && "Запуск установки…"}
                {phase === "rollback" && "Подготовка отката…"}
                {phase === "restarting" && "Kuroha перезапускается…"}
                {phase === "saving" && "Сохранение настроек…"}
              </strong>
            </div>
          </Card>
        )}

        {error && (
          <Card>
            <span className="eyebrow">ОШИБКА</span>
            <h2>Операция не выполнена</h2>
            <p className="muted">{error}</p>
          </Card>
        )}
      </section>
    </>
  );
}
