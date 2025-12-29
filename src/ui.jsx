import React from "react";

export function Card({ className = "", children }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}
export function CardHeader({ className = "", children }) {
  return <div className={`p-4 pb-2 ${className}`}>{children}</div>;
}
export function CardTitle({ className = "", children }) {
  return <div className={`text-base font-semibold ${className}`}>{children}</div>;
}
export function CardContent({ className = "", children }) {
  return <div className={`p-4 pt-2 ${className}`}>{children}</div>;
}

export function Button({ variant = "primary", className = "", children, ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    outline: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button className={`${base} ${styles[variant] || styles.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-slate-200 ${className}`}
      {...props}
    />
  );
}

export function Label({ className = "", children, ...props }) {
  return (
    <label className={`text-sm font-medium text-slate-700 ${className}`} {...props}>
      {children}
    </label>
  );
}

export function Separator({ className = "" }) {
  return <div className={`h-px w-full bg-slate-200 ${className}`} />;
}

export function Checkbox({ checked, onChange, id, className = "", disabled }) {
  return (
    <input
      id={id}
      type="checkbox"
      className={`h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 ${className}`}
      checked={!!checked}
      onChange={(e) => onChange?.(e.target.checked)}
      disabled={disabled}
    />
  );
}

export function Select({ value, onChange, children, className = "", disabled }) {
  return (
    <select
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-slate-200 ${className}`}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
    >
      {children}
    </select>
  );
}

export function Tabs({ value, onChange, tabs }) {
  return (
    <div className="flex gap-2">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`rounded-xl px-3 py-2 text-sm font-medium border transition ${
            value === t.value
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
