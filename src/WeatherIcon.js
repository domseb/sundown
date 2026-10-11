export default function WeatherIcon({ kind }) {
  const props = {
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.25",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    focusable: "false",
  };

  if (kind === "clear") {
    return (
      <svg {...props}>
        <circle cx="8" cy="8" r="2.15" />
        <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.3 3.3l1.15 1.15M11.55 11.55l1.15 1.15M3.3 12.7l1.15-1.15M11.55 4.45l1.15-1.15" />
      </svg>
    );
  }

  if (kind === "partly") {
    return (
      <svg {...props}>
        <path d="M6.2 3.1v1.1M3.7 4.4l.8.8M4.2 7.2H3.1" />
        <circle cx="6.3" cy="5.6" r="1.35" />
        <path d="M5.1 12.4h6.3a2.15 2.15 0 0 0 .35-4.25 2.7 2.7 0 0 0-5.15-.7 2 2 0 0 0-1.5 4.95z" />
      </svg>
    );
  }

  if (kind === "fog") {
    return (
      <svg {...props}>
        <path d="M4.4 7.6h7.2a2.15 2.15 0 0 0 .3-4.25 2.75 2.75 0 0 0-5.25-.55 1.95 1.95 0 0 0-2.25 4.8z" />
        <path d="M3.2 10.3h9.6M4.2 12.4h7.6" />
      </svg>
    );
  }

  if (kind === "rain") {
    return (
      <svg {...props}>
        <path d="M4.2 9.2h7.4a2.2 2.2 0 0 0 .35-4.35 2.85 2.85 0 0 0-5.45-.6 2 2 0 0 0-2.3 4.95z" />
        <path d="M6.1 11.2l-.7 1.7M9.3 11.2l-.7 1.7" />
      </svg>
    );
  }

  if (kind === "snow") {
    return (
      <svg {...props}>
        <path d="M4.2 8.6h7.4a2.2 2.2 0 0 0 .35-4.35 2.85 2.85 0 0 0-5.45-.6 2 2 0 0 0-2.3 4.95z" />
        <path d="M6.2 10.6v2.1M5.2 11.1l2 1.1M7.2 11.1l-2 1.1M10.2 10.6v2.1M9.2 11.1l2 1.1M11.2 11.1l-2 1.1" />
      </svg>
    );
  }

  if (kind === "storm") {
    return (
      <svg {...props}>
        <path d="M4.1 8.8h7.5a2.2 2.2 0 0 0 .35-4.35 2.85 2.85 0 0 0-5.45-.6 2 2 0 0 0-2.4 4.95z" />
        <path d="M8.6 9.1l-1.5 2.3h1.7l-1.3 2.5" />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <path d="M3.6 11.2h8.6a2.45 2.45 0 0 0 .4-4.85 3.15 3.15 0 0 0-6.05-.65 2.25 2.25 0 0 0-2.95 5.5z" />
    </svg>
  );
}
