import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";

export function Card({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return <section className={"card " + className}>{children}</section>;
}

export function Badge({
  children,
  tone = "neutral",
}: PropsWithChildren<{ tone?: "neutral" | "ok" | "bad" | "accent" }>) {
  return <span className={"pill " + tone}>{children}</span>;
}

export function Button({
  children,
  kind = "ghost",
  ...props
}: PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "ghost" | "primary" | "danger" }
>) {
  return (
    <button className={kind} {...props}>
      {children}
    </button>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: PropsWithChildren<{ title: string; action?: ReactNode }>) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function LoadingPanel({ label = "Загрузка Kuroha…" }: { label?: string }) {
  return (
    <div className="state-panel" role="status">
      <span className="spinner" />
      <strong>{label}</strong>
    </div>
  );
}

export function ErrorPanel({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="state-panel error-state">
      <strong>Что-то пошло не так</strong>
      <p>{message}</p>
      {retry && <Button onClick={retry}>Повторить</Button>}
    </div>
  );
}

export function bytes(value: number): string {
  if (value < 1024) return value + " Б";
  const units = ["КБ", "МБ", "ГБ", "ТБ"];
  let size = value / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && size >= 1024; index += 1) {
    size /= 1024;
    unit = units[index];
  }
  return size.toFixed(size >= 10 ? 1 : 2) + " " + unit;
}
