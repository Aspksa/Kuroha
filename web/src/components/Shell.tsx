import { NavLink, Outlet } from "react-router-dom";

import type { Health, PublicSettings } from "../api/types";

const nav = [
  ["/overview", "Overview"],
  ["/system", "System"],
  ["/backups", "Backups"],
  ["/logs", "Logs"],
  ["/settings", "Settings"],
];

export default function Shell({
  settings,
  health,
}: {
  settings: PublicSettings;
  health: Health | null;
}) {
  return (
    <div className="app-shell">
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
            <small>黒羽 · FOUNDATION</small>
          </div>
        </div>

        <nav aria-label="Primary">
          {nav.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-status">
          <span className={health ? "status-orb online" : "status-orb offline"} />
          <div>
            <strong>{health ? "Core online" : "Core offline"}</strong>
            <small>{health ? "Local platform ready" : "API unavailable"}</small>
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
