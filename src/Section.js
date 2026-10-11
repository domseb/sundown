import "./styles.css";
import './theme-config.css';
import { useState, useMemo, useEffect } from "react";
import Grid from "./Grid";
import Flex from "./Flex";
import AutoGrid from "./AutoGrid";
import { loadBlocksFromStorage } from "./Api";
import { activityDefaults } from "./activityTypes";

const DEFAULT_SWIMLANES = [
  { id: 'sl-1', start: '05:00', end: '07:00' },
  { id: 'sl-2', start: '09:00', end: '12:00' },
  { id: 'sl-3', start: '12:00', end: '13:00' },
  { id: 'sl-4', start: '13:00', end: '17:00' },
  { id: 'sl-5', start: '19:00', end: '22:00' },
];

/** Parse "HH:mm" to minutes since midnight */
function parseTimeToMinutes(t) {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

const MINUTES_PER_ROW = 30;
const HOUR_HEIGHT_PX = 45;
const ROW_HEIGHT_PX = HOUR_HEIGHT_PX * (MINUTES_PER_ROW / 60);

/** Duration in grid rows for a swimlane (each row = 30 minutes). Minimum 1 row. */
function swimlaneRowSpan(swimlane) {
  let startMin = parseTimeToMinutes(swimlane.start);
  let endMin = parseTimeToMinutes(swimlane.end);
  if (endMin <= startMin) endMin += 24 * 60;
  const durationMinutes = endMin - startMin;
  return Math.max(1, Math.round(durationMinutes / MINUTES_PER_ROW));
}

/** Build { swimlaneRows, rowCount } from swimlanes. Each grid row is 30 minutes. */
function buildSwimlaneRows(swimlanes) {
  const swimlaneRows = [];
  let startRow = 0;
  for (const swimlane of swimlanes) {
    const rowSpan = swimlaneRowSpan(swimlane);
    swimlaneRows.push({ swimlane, startRow, rowSpan });
    startRow += rowSpan;
  }
  return { swimlaneRows, rowCount: startRow };
}

const DEFAULT_BLOCK_COLOR = "var(--crimson-4)";

export default function Section({
  swimlanes = DEFAULT_SWIMLANES,
  onSwimlaneChange,
  clearBoardSignal = 0,
  sunsetSignal = 0,
  weekMonday,
  forecastRefresh = 0,
  onBlocksChange,
}) {
  const [gap] = useState(9);
  const [height] = useState(ROW_HEIGHT_PX);
  const [blocks, setBlocks] = useState(() => loadBlocksFromStorage() || []);
  const [lastBlockColor, setLastBlockColor] = useState(DEFAULT_BLOCK_COLOR);
  const [autoGrid] = useState(false);
  const [snapGrid] = useState(true);
  const [minWidth] = useState(200);
  const columnCount = 5;
  const { swimlaneRows, rowCount } = useMemo(
    () => buildSwimlaneRows(swimlanes),
    [swimlanes]
  );

  useEffect(() => {
    onBlocksChange?.(blocks);
  }, [blocks, onBlocksChange]);

  const addNewBlock = () => {
    setBlocks((blocks) => [
      ...blocks,
      {
        columns: [1, 2],
        rows: [1, 2],
        id: Date.now(),
        widthType: "fill",
        ...activityDefaults(lastBlockColor),
      },
    ]);
  };

  const showGrid = snapGrid && !autoGrid;
  const showFlex = !snapGrid;
  const showAuto = snapGrid && autoGrid;

  return (
    <div className="section">
      {/* <div className="toolbar ToggleGroup">
        <Toggle.Root
          pressed={snapGrid}
          onPressedChange={setSnapGrid}
          className="ToggleGroupItem"
          aria-label="Toggle snap grid"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM11.2 19.5H5C4.7 19.5 4.5 19.3 4.5 19V12.8H11.3V19.5H11.2ZM11.2 11.2H4.5V5C4.5 4.7 4.7 4.5 5 4.5H11.2V11.2ZM19.5 19C19.5 19.3 19.3 19.5 19 19.5H12.8V12.7H19.6V19H19.5ZM19.5 11.2H12.7V4.5H19C19.3 4.5 19.5 4.7 19.5 5V11.2Z"
              fill="currentColor"
            />
          </svg>
        </Toggle.Root>
        {snapGrid && (
          <Toggle.Root
            pressed={autoGrid}
            onPressedChange={setAutoGrid}
            className="ToggleGroupItem"
            aria-label="Toggle snap grid"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19.75 8.99999C19.75 7.74299 19.185 6.80299 18.36 6.14199C17.563 5.50199 16.533 5.12499 15.545 4.89499C13.743 4.47499 11.842 4.49199 11.162 4.49899L11 4.49999V5.99999L11.177 5.99899C11.873 5.99299 13.593 5.97899 15.205 6.35499C16.092 6.56199 16.875 6.87299 17.421 7.31199C17.941 7.72799 18.25 8.25699 18.25 8.99999C18.25 9.59199 18.083 9.96599 17.843 10.23C17.588 10.511 17.187 10.738 16.607 10.904C15.417 11.244 13.787 11.25 12 11.25H11.923C10.231 11.25 8.396 11.25 6.981 11.654C6.249 11.863 5.557 12.199 5.046 12.762C4.52 13.341 4.25 14.092 4.25 15C4.25 16.257 4.815 17.197 5.64 17.858C6.437 18.498 7.467 18.875 8.455 19.105C10.257 19.525 12.158 19.508 12.838 19.501L13 19.5H13.714V22L18 18.5L13.714 15V18H13L12.823 18.001C12.127 18.007 10.407 18.021 8.795 17.645C7.908 17.438 7.125 17.127 6.579 16.688C6.059 16.272 5.75 15.743 5.75 15C5.75 14.408 5.917 14.034 6.157 13.77C6.412 13.489 6.813 13.262 7.394 13.096C8.583 12.756 10.213 12.75 12 12.75H12.077C13.769 12.75 15.604 12.75 17.018 12.346C17.75 12.137 18.443 11.801 18.954 11.238C19.48 10.659 19.75 9.90799 19.75 8.99999V8.99999Z"
                fill="currentColor"
              />
            </svg>
          </Toggle.Root>
        )}
        {!snapGrid || autoGrid ? (
          <>
            <div className="text-input">
              <label>Min Width</label>
              <input
                type="number"
                value={minWidth}
                onChange={(e) => setMinWidth(e.target.value)}
              />
            </div>
            <button className="add-block" onClick={addNewBlock}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16 11.2H12.8V8H11.2V11.2H8V12.8H11.2V16H12.8V12.8H16V11.2Z"
                  fill="black"
                />
              </svg>
            </button>
          </>
        ) : (
          <>
            <div className="text-input">
              <label>Columns</label>
              <input
                type="number"
                value={columnCount}
                onChange={(e) => setColumnCount(parseInt(e.target.value || 0))}
              />
            </div>
            <div className="text-input">
              <label>Rows</label>
              <input
                type="number"
                value={rowCount}
                onChange={(e) => setRowCount(parseInt(e.target.value || 0))}
              />
            </div>
          </>
        )}
      </div> */}
      {showGrid && (
        <Grid
          blocks={blocks}
          onBlocksSave={setBlocks}
          gap={gap}
          height={height}
          minWidth={minWidth}
          columnCount={columnCount}
          rowCount={rowCount}
          swimlaneRows={swimlaneRows}
          onSwimlaneChange={onSwimlaneChange}
          lastBlockColor={lastBlockColor}
          onBlockColorUsed={setLastBlockColor}
          clearBoardSignal={clearBoardSignal}
          sunsetSignal={sunsetSignal}
          weekMonday={weekMonday}
          forecastRefresh={forecastRefresh}
        />
      )}
      {showFlex && (
        <Flex
          blocks={blocks}
          onBlocksSave={setBlocks}
          onAddBlock={addNewBlock}
          gap={gap}
          height={height}
          minWidth={minWidth}
        />
      )}
      {showAuto && (
        <AutoGrid
          blocks={blocks}
          onBlocksSave={setBlocks}
          onAddBlock={addNewBlock}
          gap={gap}
          height={height}
          minWidth={minWidth}
        />
      )}
    </div>
  );
}
