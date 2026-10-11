import { useEffect, useId, useRef, useState } from "react";
import { formatDuration, weekTimeBreakdown } from "./weekTime";

function PieIcon() {
  return (
    <svg className="week-pie" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 8V1.75" />
      <path d="M8 8l4.9 3.4" />
    </svg>
  );
}

export default function WeekBalance({ blocks, swimlanes }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const titleId = useId();
  const { items } = weekTimeBreakdown(blocks, swimlanes);
  const visible = items.filter((item) => item.id === "free" || item.minutes > 0);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="week-balance" ref={rootRef}>
      <button
        type="button"
        className="week-balance-button"
        aria-expanded={open}
        aria-label="Week balance"
        onClick={() => setOpen((value) => !value)}
      >
        <PieIcon />
      </button>
      {open && (
        <div className="week-balance-popover" role="dialog" aria-labelledby={titleId}>
          <p className="week-balance-title" id={titleId}>
            This week
          </p>
          <ul className="week-balance-list">
            {visible.map((item) => (
              <li key={item.id} className="week-balance-row">
                <span className="week-balance-swatch" style={{ background: item.color }} />
                <span className="week-balance-label">{item.label}</span>
                <span className="week-balance-hours">{formatDuration(item.minutes)}</span>
                <span className="week-balance-percent">{item.percent}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
