import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import type { Health, PublicSettings } from "../api/types";

type NavId = "home" | "data" | "update" | "settings";
type NavItem = { id: NavId; to: string; label: string };

const defaults: NavItem[] = [
  { id: "home", to: "/home", label: "Главная" },
  { id: "data", to: "/data", label: "Данные" },
  { id: "update", to: "/update", label: "Обновление" },
  { id: "settings", to: "/settings", label: "Настройки" },
];

const STORAGE_KEY = "kuroha-nav-items";
const COLLAPSED_KEY = "kuroha-nav-collapsed";

function Icon({ id }: { id: NavId }) {
  const paths: Record<NavId, JSX.Element> = {
    home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M9 20v-6h6v6" /></>,
    data: <><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" /><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></>,
    update: <><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 8" /><path d="M5.5 15A7 7 0 0 0 17.8 17.8L20 16" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.6V21h-4v-.1a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1-2.8-2.8.1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 3 14H3v-4h.1a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.4-2l-.1-.1 2.8-2.8.1.1a1.8 1.8 0 0 0 2 .4 1.8 1.8 0 0 0 1-1.6V3h4v.1a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1 2.8 2.8-.1.1a1.8 1.8 0 0 0-.4 2A1.8 1.8 0 0 0 21 10h.1v4H21a1.8 1.8 0 0 0-1.6 1Z" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[id]}</svg>;
}

function loadItems(): NavItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Array<{ id: NavId; label?: string }>;
    const items = parsed
      .map((saved) => {
        const base = defaults.find((item) => item.id === saved.id);
        return base ? { ...base, label: saved.label?.trim() || base.label } : null;
      })
      .filter((item): item is NavItem => Boolean(item));
    return items.length === defaults.length ? items : defaults;
  } catch {
    return defaults;
  }
}

export default function Shell({ settings, health }: { settings: PublicSettings; health: Health | null }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "1");
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<NavItem[]>(loadItems);

  useEffect(() => { localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0"); }, [collapsed]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map(({ id, label }) => ({ id, label })))); }, [items]);

  const shellClass = useMemo(() => "app-shell" + (collapsed ? " sidebar-collapsed" : ""), [collapsed]);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className={shellClass}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-moon" />
            <span className="brand-tail tail-one" />
            <span className="brand-tail tail-two" />
            <span className="brand-tail tail-three" />
          </span>
          <div className="brand-copy">
            <strong>{settings.site_name}</strong>
            <small>黒羽 · ОСНОВА</small>
          </div>
          <button className="sidebar-collapse" type="button" onClick={() => setCollapsed((value) => !value)} title={collapsed ? "Развернуть меню" : "Свернуть меню"}>
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        <nav aria-label="Основная навигация">
          {items.map((item) => (
            <NavLink key={item.id} to={item.to} className={({ isActive }) => (isActive ? "active" : "")} title={collapsed ? item.label : undefined}>
              <span className="nav-icon"><Icon id={item.id} /></span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {!collapsed && (
          <button className="nav-customize" type="button" onClick={() => setEditing((value) => !value)}>
            {editing ? "Готово" : "Настроить меню"}
          </button>
        )}

        {editing && !collapsed && (
          <div className="nav-editor">
            <div className="nav-editor-head">
              <strong>Меню</strong>
              <button type="button" onClick={() => setItems(defaults)}>Сбросить</button>
            </div>
            {items.map((item, index) => (
              <div className="nav-editor-row" key={item.id}>
                <span className="nav-editor-icon"><Icon id={item.id} /></span>
                <input
                  aria-label={"Название пункта " + item.id}
                  value={item.label}
                  maxLength={24}
                  onChange={(event) => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, label: event.target.value } : entry))}
                />
                <button type="button" disabled={index === 0} onClick={() => move(index, -1)} title="Выше">↑</button>
                <button type="button" disabled={index === items.length - 1} onClick={() => move(index, 1)} title="Ниже">↓</button>
              </div>
            ))}
          </div>
        )}

        <div className="sidebar-status">
          <span className={health ? "status-orb online" : "status-orb offline"} />
          <div>
            <strong>{health ? "Ядро в сети" : "Ядро недоступно"}</strong>
            <small>{health ? "Локальная платформа готова" : "API недоступен"}</small>
          </div>
        </div>
      </aside>

      <main className="content">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <Outlet />
      </main>
    </div>
  );
}
