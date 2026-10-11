import { parseTimeToMinutes } from "./blockTimeUtils";
import { ACTIVITY_TYPES, presentBlock } from "./activityTypes";

const SLOT_MINUTES = 30;
const DAY_COUNT = 5;
/** Early window that only counts when a block is placed there. */
const OVERFLOW_START = 5 * 60;
const OVERFLOW_END = 7 * 60;

function swimlaneEndMinutes(swimlane) {
  const start = parseTimeToMinutes(swimlane.start);
  let end = parseTimeToMinutes(swimlane.end);
  if (end <= start) end += 24 * 60;
  return end;
}

function buildSwimlaneRows(swimlanes) {
  const swimlaneRows = [];
  let startRow = 0;
  for (const swimlane of swimlanes) {
    const duration = swimlaneEndMinutes(swimlane) - parseTimeToMinutes(swimlane.start);
    const rowSpan = Math.max(1, Math.round(duration / SLOT_MINUTES));
    swimlaneRows.push({ swimlane, startRow, rowSpan });
    startRow += rowSpan;
  }
  return swimlaneRows;
}

/** Minutes at a 1-based grid row. An end edge uses the previous swimlane's end, not the next start. */
function minutesAtRow(rowIndex1Based, swimlaneRows, edge) {
  if (!rowIndex1Based || !swimlaneRows.length) return null;
  const index = rowIndex1Based - 1;

  if (edge === "end") {
    for (const lane of swimlaneRows) {
      if (index === lane.startRow + lane.rowSpan) return swimlaneEndMinutes(lane.swimlane);
    }
  }

  for (const lane of swimlaneRows) {
    if (index >= lane.startRow && index < lane.startRow + lane.rowSpan) {
      return parseTimeToMinutes(lane.swimlane.start) + (index - lane.startRow) * SLOT_MINUTES;
    }
  }

  if (edge === "end") {
    const last = swimlaneRows[swimlaneRows.length - 1];
    if (index >= last.startRow + last.rowSpan) return swimlaneEndMinutes(last.swimlane);
  }

  return null;
}

export function formatDuration(minutes) {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function isOverflowMinute(minute) {
  return minute >= OVERFLOW_START && minute < OVERFLOW_END;
}

/** One entry per swimlane slot. Gaps between swimlanes are not slots. */
function slotsForLanes(lanes) {
  const byMinute = new Map();
  for (const lane of lanes) {
    const start = parseTimeToMinutes(lane.start);
    const end = swimlaneEndMinutes(lane);
    for (let minute = start; minute < end; minute += SLOT_MINUTES) {
      if (byMinute.has(minute)) continue;
      byMinute.set(minute, isOverflowMinute(minute) ? "overflow" : "free");
    }
  }
  return [...byMinute.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([minute, kind]) => ({ minute, kind }));
}

/**
 * Monday–Friday only. Each swimlane slot with no block is free time,
 * including an empty 19:00–22:00 lane. 05:00–07:00 is overflow and counts
 * only when a block is placed there. Time between swimlanes is not counted.
 */
export function weekTimeBreakdown(blocks, swimlanes) {
  const lanes = Array.isArray(swimlanes) ? swimlanes : [];
  const rows = buildSwimlaneRows(lanes);
  const laneSlots = slotsForLanes(lanes);
  const totals = Object.fromEntries(ACTIVITY_TYPES.map((type) => [type.id, 0]));
  totals.free = 0;

  if (!rows.length || !laneSlots.length) {
    return { totalMinutes: 0, items: [] };
  }

  let totalMinutes = 0;

  for (let day = 0; day < DAY_COUNT; day += 1) {
    const slots = laneSlots.map((slot) => slot.kind);

    for (const block of blocks || []) {
      const colStart = Math.max(0, (block.columns?.[0] ?? 1) - 1);
      const colEnd = Math.min(DAY_COUNT, (block.columns?.[1] ?? colStart + 2) - 1);
      if (day < colStart || day >= colEnd) continue;

      const startMin = minutesAtRow(block.rows?.[0], rows, "start");
      const endMin = minutesAtRow(block.rows?.[1], rows, "end");
      if (startMin == null || endMin == null || endMin <= startMin) continue;

      const activityId = presentBlock(block).activityId;
      if (!Object.hasOwn(totals, activityId) || activityId === "free") continue;

      for (let slot = 0; slot < laneSlots.length; slot += 1) {
        const minute = laneSlots[slot].minute;
        if (minute < startMin || minute >= endMin) continue;
        if (slots[slot] === "free" || slots[slot] === "overflow") slots[slot] = activityId;
      }
    }

    for (const activityId of slots) {
      if (activityId === "overflow") continue;
      totals[activityId] += SLOT_MINUTES;
      totalMinutes += SLOT_MINUTES;
    }
  }
  const items = [
    ...ACTIVITY_TYPES.map((type) => ({
      id: type.id,
      label: type.label,
      color: type.chartColor || `var(--${type.color.match(/--([a-z]+)-/)?.[1] || "gray"}-9)`,
      minutes: totals[type.id],
    })),
    {
      id: "free",
      label: "Free time",
      color: "var(--gray-7)",
      minutes: totals.free,
    },
  ].map((item) => ({
    ...item,
    percent: totalMinutes ? Math.round((item.minutes / totalMinutes) * 100) : 0,
  }));

  return { totalMinutes, items };
}
