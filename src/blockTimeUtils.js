/**
 * Convert between block time (startTime/endTime) and grid row indices.
 * Blocks stored with startTime/endTime adapt when swimlane rows change.
 */

/** "HH:mm" -> minutes since midnight */
export function parseTimeToMinutes(t) {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** minutes -> "HH:mm" */
function minutesToTime(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Which 1-based grid row contains this time?
 * swimlaneRows: [{ swimlane: { start, end }, startRow, rowSpan }, ...]
 */
export function timeToRowIndex(timeStr, swimlaneRows) {
  const min = parseTimeToMinutes(timeStr);
  for (const { swimlane, startRow, rowSpan } of swimlaneRows) {
    const startMin = parseTimeToMinutes(swimlane.start);
    let endMin = parseTimeToMinutes(swimlane.end);
    if (endMin <= startMin) endMin += 24 * 60;
    if (min >= startMin && min < endMin) {
      const offsetHours = Math.floor((min - startMin) / 60);
      const offset = Math.min(offsetHours, rowSpan - 1);
      return startRow + 1 + offset; // 1-based
    }
  }
  return 1;
}

/**
 * Start time of a 1-based grid row (e.g. row 3 -> "09:00")
 */
export function rowIndexToStartTime(rowIndex1Based, swimlaneRows) {
  const r = rowIndex1Based - 1; // 0-based
  for (const { swimlane, startRow, rowSpan } of swimlaneRows) {
    if (r >= startRow && r < startRow + rowSpan) {
      const offsetHours = r - startRow;
      const startMin = parseTimeToMinutes(swimlane.start);
      return minutesToTime(startMin + offsetHours * 60);
    }
  }
  return "00:00";
}

/**
 * End time of a 1-based grid row = start of next row
 */
export function rowIndexToEndTime(rowIndex1Based, swimlaneRows) {
  return rowIndexToStartTime(rowIndex1Based + 1, swimlaneRows);
}

/**
 * Convert block's grid rows [startRow, endRowExclusive] to startTime, endTime
 */
export function blockRowsToTime(rows, swimlaneRows) {
  if (!rows || rows.length < 2) return { startTime: "09:00", endTime: "10:00" };
  const startTime = rowIndexToStartTime(rows[0], swimlaneRows);
  const endTime = rowIndexToStartTime(rows[1], swimlaneRows); // end row line = start of that row
  return { startTime, endTime };
}

/**
 * Convert block's startTime/endTime to grid [startRow, endRow] for layout.
 * CSS grid "startRow / endRow" uses end exclusive, so endRow = startRow + rowSpan.
 */
export function blockTimeToRows(startTime, endTime, swimlaneRows) {
  const startRow = timeToRowIndex(startTime, swimlaneRows);
  const startMin = parseTimeToMinutes(startTime);
  let endMin = parseTimeToMinutes(endTime);
  if (endMin <= startMin) endMin += 24 * 60;
  const durationHours = Math.max(1, Math.round((endMin - startMin) / 60));
  const endRow = startRow + durationHours;
  return [startRow, endRow];
}

/**
 * Normalize block to time-based shape. Migrates legacy { rows } to { startTime, endTime }.
 */
export function blockToTimeFormat(block, swimlaneRows) {
  if (block.startTime != null && block.endTime != null) {
    return block;
  }
  if (block.rows && block.rows.length >= 2 && swimlaneRows.length > 0) {
    const { startTime, endTime } = blockRowsToTime(block.rows, swimlaneRows);
    const { rows, ...rest } = block;
    return { ...rest, startTime, endTime };
  }
  return { ...block, startTime: "09:00", endTime: "10:00" };
}

/**
 * Block with derived .rows for grid layout (from startTime/endTime)
 */
export function blockWithRowsForGrid(block, swimlaneRows) {
  const normalized = blockToTimeFormat(block, swimlaneRows);
  const [startRow, endRow] = blockTimeToRows(
    normalized.startTime,
    normalized.endTime,
    swimlaneRows
  );
  return { ...normalized, rows: [startRow, endRow] };
}
