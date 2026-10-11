export const ACTIVITY_TYPES = [
  {
    id: "meetings",
    label: "Meetings",
    color: "var(--orange-4)",
    emojis: ["📞"],
  },
  {
    id: "wellbeing",
    label: "Wellbeing",
    color: "var(--teal-4)",
    emojis: ["🏊", "🏃", "🏌️", "🧖"],
  },
  {
    id: "break",
    label: "Break",
    color: "var(--break-4)",
    chartColor: "var(--break-9)",
    emojis: ["🍱"],
  },
  {
    id: "social",
    label: "Social",
    color: "var(--blue-4)",
    emojis: ["🥂", "👭"],
  },
  {
    id: "work",
    label: "Work",
    color: "var(--violet-4)",
    emojis: ["🧠", "✍️", "🎨", "👨‍💻", "🐸"],
  },
];

const DEFAULT_ACTIVITY = ACTIVITY_TYPES.find((type) => type.id === "work");

export function getActivity(id) {
  return ACTIVITY_TYPES.find((type) => type.id === id) || null;
}

function pictographs(value) {
  return [...(value || "")].filter((char) => /\p{Extended_Pictographic}/u.test(char)).join("");
}

function sameEmoji(a, b) {
  const left = pictographs(a);
  const right = pictographs(b);
  return left !== "" && left === right;
}

export function splitLeadingEmoji(title) {
  const text = title || "";
  if (!text || typeof Intl === "undefined" || !Intl.Segmenter) {
    return { emoji: "", text };
  }
  const first = new Intl.Segmenter(undefined, { granularity: "grapheme" })
    .segment(text)[Symbol.iterator]()
    .next().value;
  const grapheme = first?.segment || "";
  if (!grapheme || !/\p{Extended_Pictographic}/u.test(grapheme)) {
    return { emoji: "", text };
  }
  return {
    emoji: grapheme,
    text: text.slice(grapheme.length).replace(/^\s+/, ""),
  };
}

function activityIdForEmoji(emoji) {
  return ACTIVITY_TYPES.find((type) => type.emojis.some((item) => sameEmoji(item, emoji)))?.id || "";
}

function activityIdForColor(color) {
  return ACTIVITY_TYPES.find((type) => type.color === color)?.id || "";
}

function isLunchTitle(title) {
  return (title || "").trim().toLowerCase() === "lunch";
}

/** Blocks that survive sunset: a “weekly” title, or the Lunch break. */
export function keepsAfterSunset(block) {
  const { title } = presentBlock(block);
  const text = (title || "").trim().toLowerCase();
  return text.includes("weekly") || isLunchTitle(text);
}

/** How a block should read: type, emoji, and title without a hand-typed emoji prefix. */
export function presentBlock(block) {
  const parsed = splitLeadingEmoji(block?.title || "");
  const title =
    !block?.emoji || sameEmoji(block.emoji, parsed.emoji) ? parsed.text : block.title || "";
  let activityId =
    (block?.activity && getActivity(block.activity) ? block.activity : "") ||
    activityIdForEmoji(block?.emoji || parsed.emoji) ||
    activityIdForColor(block?.color) ||
    "";
  if (!block?.activity && isLunchTitle(title)) activityId = "break";
  const emoji =
    block?.emoji || parsed.emoji || (activityId === "break" ? "🍱" : "");
  return { activityId, emoji, title };
}

export function activityDefaults(color) {
  const type = getActivity(activityIdForColor(color)) || DEFAULT_ACTIVITY;
  return {
    activity: type.id,
    emoji: type.emojis[0],
    color: type.color,
  };
}

export function emojiForActivity(activityId, currentEmoji) {
  const type = getActivity(activityId) || DEFAULT_ACTIVITY;
  const match = type.emojis.find((item) => sameEmoji(item, currentEmoji));
  return match || type.emojis[0];
}
