import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";

export type OverflowMenuItem =
  | {
      label: string;
      onSelect: () => void;
      disabled?: boolean;
      icon?: ReactNode;
      /** Merged onto the menuitem button (e.g. danger text color). */
      className?: string;
    }
  | { divider: true };

function isDividerItem(item: OverflowMenuItem): item is { divider: true } {
  return "divider" in item && item.divider;
}

type Props = {
  label: string;
  items: OverflowMenuItem[];
  /** Replaces default circular glass trigger (e.g. card row icon) */
  triggerClassName?: string;
  icon?: ReactNode;
};

export function OverflowMenu({ label, items, triggerClassName, icon }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(ev: MouseEvent) {
      if (!rootRef.current?.contains(ev.target as Node)) setOpen(false);
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const actionable = items.filter((i) => !isDividerItem(i));
  if (actionable.length === 0) return null;

  const triggerCls = triggerClassName ?? "btn-icon-circle glass";

  return (
    <div className="overflow-menu" ref={rootRef}>
      <button
        type="button"
        className={triggerCls}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        {icon ?? <Menu size={20} aria-hidden strokeWidth={2} />}
      </button>
      {open && (
        <ul className="overflow-menu__panel" role="menu">
          {items.map((item, idx) =>
            isDividerItem(item) ? (
              <li
                key={`d-${idx}`}
                className="overflow-menu__divider"
                role="separator"
                aria-hidden
              />
            ) : (
              <li key={item.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={["overflow-menu__item", item.className].filter(Boolean).join(" ")}
                  disabled={item.disabled}
                  onClick={() => {
                    if (!item.disabled) {
                      item.onSelect();
                      setOpen(false);
                    }
                  }}
                >
                  {item.icon ? (
                    <span className="overflow-menu__item-inner">
                      <span className="overflow-menu__item-icon" aria-hidden>
                        {item.icon}
                      </span>
                      <span className="overflow-menu__item-label">{item.label}</span>
                    </span>
                  ) : (
                    item.label
                  )}
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
