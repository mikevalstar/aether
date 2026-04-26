import type * as React from "react";

export interface FieldRowProps {
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Form field wrapper used across the redesign — uppercase mono label
 * with a dashed rule fading into an optional hint on the right.
 */
export function FieldRow({ label, required, hint, htmlFor, children, className }: FieldRowProps) {
  return (
    <div className={`flex flex-col gap-1.5${className ? ` ${className}` : ""}`}>
      <div className="flex items-baseline gap-2">
        <label htmlFor={htmlFor} className="font-mono text-[10px] font-semibold tracking-[0.15em] text-[var(--ink-soft)]">
          {label}
        </label>
        {required && <span className="font-mono text-[11px] leading-none text-[var(--destructive)]">*</span>}
        <span
          aria-hidden
          className="h-px flex-1 self-center border-t border-dashed border-[var(--line-strong)] opacity-70"
        />
        {hint && <span className="font-mono text-[10px] tracking-wider text-[var(--ink-faint)]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
