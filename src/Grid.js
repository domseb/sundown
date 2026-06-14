import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { TextField, Button, Dialog, TextArea } from "@radix-ui/themes";
import { fetchBlocks, saveBlocks } from "./Api";
import { rowIndexToStartTime, formatTimeHint } from "./blockTimeUtils";
import { v4 as uuidv4 } from "uuid";
import { TrashIcon } from "@radix-ui/react-icons";

const RADIX_BLOCK_COLORS = [
  "var(--crimson-4)",
  "var(--red-4)",
  "var(--ruby-4)",
  "var(--pink-4)",
  "var(--plum-4)",
  "var(--purple-4)",
  "var(--violet-4)",
  "var(--indigo-4)",
  "var(--blue-4)",
  "var(--cyan-4)",
  "var(--teal-4)",
  "var(--green-4)",
  "var(--grass-4)",
  "var(--orange-4)",
  "var(--tomato-4)",
];

/** Map block accent (e.g. var(--purple-4)) to its a7 ring token (e.g. var(--purple-a7)) */
function blockAccentToA7(accent) {
  if (!accent || typeof accent !== "string") return "var(--crimson-a7)";
  const m = accent.match(/var\(--(\w+)-/);
  return m ? `var(--${m[1]}-a7)` : "var(--crimson-a7)";
}
/** "HH:mm" -> hour number for display (12-hour: 12 for noon/midnight, 1-11 for am/pm) */
function swimlaneHourNumber(t) {
  const h = parseInt((t || "0").split(":")[0], 10) || 0;
  if (h === 0) return 12;
  if (h <= 12) return h;
  return h - 12;
}

export default function Grid({
  onBlocksSave,
  blocks,
  gap,
  height,
  columnCount,
  rowCount,
  swimlaneRows = [],
  onSwimlaneChange,
  lastBlockColor,
  onBlockColorUsed,
  clearBoardSignal = 0,
  rowGroups = [
    { rows: 2, className: "focus-a" },
    { rows: 3, className: "focus-b" },
    { rows: 1, className: "focus-c" },
    { rows: 4, className: "focus-d" },
    { rows: 2, className: "focus-e" },
  ],
  minWidth,
}) {
  const blocksRef = useRef([]);
  const columnsRef = useRef([]);
  const [newBlockSpan, setNewBlockSpan] = useState(null);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [editingSwimlaneId, setEditingSwimlaneId] = useState(null);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [editDraft, setEditDraft] = useState({ title: "", notes: "" });
  const currentBlock = useRef(null);
  const dragOriginRef = useRef(null);
  const isResizingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [, setResizing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [slotHint, setSlotHint] = useState(null);
  const daysOfWeek = ["M", "T", "W", "T", "F"];
  const DEFAULT_BLOCK_COLOR = "var(--crimson-4)";

  const displayBlocks = useMemo(
    () => blocks.map((b) => ({ ...b, rows: b.rows || [1, 2] })),
    [blocks]
  );

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)").matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const handler = () => setIsMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    fetchBlocks()
      .then((blocksData) => {
        onBlocksSave(blocksData || []);
      })
      .catch((error) => console.error("Error loading blocks:", error));
  }, [onBlocksSave]);

  useEffect(() => {
    if (clearBoardSignal === 0) return;

    setSelectedBlockId(null);
    setEditingBlockId(null);
    setNewBlockSpan(null);
    currentBlock.current = null;
    onBlocksSave([]);
    saveBlocks([])
      .then(() => {
        console.log("Board cleared successfully");
      })
      .catch((error) => {
        console.error("Error clearing board:", error);
      });
  }, [clearBoardSignal, onBlocksSave]);

  useEffect(() => {
    const saveNewBlock = () => {
      if (newBlockSpan === null) return;
      const newBlock = {
        ...newBlockSpan,
        title: "",
        notes: "",
      };
      onBlocksSave((blocks) => {
        const newBlocks = [...blocks, newBlock];
        saveBlocks(newBlocks)
          .then(() => {
            console.log("Blocks saved successfully");
          })
          .catch((error) => {
            console.error("Error saving blocks:", error);
          });
        return newBlocks;
      });
      setNewBlockSpan(null);
    };

    const saveBlockPositions = () => {
      if (!currentBlock.current || isResizingRef.current) return;

      onBlocksSave((blocks) => {
        const blockStillExists = blocks.some(
          (block) => block.id === currentBlock.current?.id
        );
        if (!blockStillExists || !currentBlock.current) {
          currentBlock.current = null;
          dragOriginRef.current = null;
          return blocks;
        }

        const updatedBlocks = blocks.map((block) =>
          block.id === currentBlock.current.id
            ? {
                ...block,
                columns: [...currentBlock.current.columns],
                rows: [...currentBlock.current.rows],
              }
            : block
        );
        saveBlocks(updatedBlocks)
          .then(() => {
            console.log("Blocks saved successfully after drag/resize");
          })
          .catch((error) => {
            console.error("Error saving blocks after drag/resize:", error);
          });
        currentBlock.current = null;
        dragOriginRef.current = null;
        return updatedBlocks;
      });
    };

    document.addEventListener("mouseup", saveNewBlock);
    document.addEventListener("mouseup", saveBlockPositions);

    return () => {
      document.removeEventListener("mouseup", saveNewBlock);
      document.removeEventListener("mouseup", saveBlockPositions);
    };
  }, [newBlockSpan, onBlocksSave]);

  const editingBlock = useMemo(
    () => blocks.find((block) => block.id === editingBlockId) || null,
    [blocks, editingBlockId]
  );

  const openBlockEditor = (block) => {
    setEditingBlockId(block.id);
    setEditDraft({
      title: block.title || "",
      notes: block.notes || "",
    });
    setSelectedBlockId(block.id);
  };

  const closeBlockEditor = useCallback(() => {
    setEditingBlockId(null);
  }, []);

  const saveBlockEditor = () => {
    if (!editingBlockId) return;
    onBlocksSave((prevBlocks) => {
      const updatedBlocks = prevBlocks.map((block) =>
        block.id === editingBlockId
          ? { ...block, title: editDraft.title, notes: editDraft.notes }
          : block
      );
      saveBlocks(updatedBlocks).catch((error) => {
        console.error("Error saving block details:", error);
      });
      return updatedBlocks;
    });
    closeBlockEditor();
  };

  const handleEditorColorChange = (color) => {
    if (!editingBlockId) return;
    onBlocksSave((prevBlocks) => {
      const updatedBlocks = prevBlocks.map((block) =>
        block.id === editingBlockId ? { ...block, color } : block
      );
      saveBlocks(updatedBlocks).catch((error) => {
        console.error("Error saving block color:", error);
      });
      return updatedBlocks;
    });
    onBlockColorUsed?.(color);
  };

  const removeBlock = useCallback((blockId) => {
    currentBlock.current = null;
    dragOriginRef.current = null;
    setSelectedBlockId(null);
    setEditingBlockId(null);
    onBlocksSave((prevBlocks) => {
      const updatedBlocks = prevBlocks.filter((block) => block.id !== blockId);
      saveBlocks(updatedBlocks).catch((error) => {
        console.error(`Error deleting block with ID ${blockId}:`, error);
      });
      return updatedBlocks;
    });
  }, [onBlocksSave]);

  const handleEditorDelete = () => {
    if (!editingBlockId) return;
    const blockId = editingBlockId;
    closeBlockEditor();
    removeBlock(blockId);
  };

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        currentBlock.current &&
        !editingBlockId &&
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA"
      ) {
        removeBlock(currentBlock.current.id);
      }

      if (event.key === "Escape") {
        if (editingBlockId) {
          closeBlockEditor();
        }
        setSelectedBlockId(null);
        currentBlock.current = null;
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [removeBlock, closeBlockEditor, editingBlockId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        selectedBlockId &&
        blocksRef.current[selectedBlockId] &&
        !blocksRef.current[selectedBlockId].contains(event.target)
      ) {
        setSelectedBlockId(null);
        currentBlock.current = null;
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedBlockId]);

  const handleGridEnter = (index, event) => {
    const colPlace =
      (index + 1) % columnCount === 0 ? columnCount : (index + 1) % columnCount;
    const rowPlace = Math.ceil((index + 1) / columnCount);
    if (newBlockSpan) {
      const newBlock = { ...newBlockSpan };
      newBlock.columns[1] = colPlace + 1;
      newBlock.rows[1] = rowPlace + 1;
      setNewBlockSpan(newBlock);
    }

    if (event && swimlaneRows.length > 0) {
      const timeStr = rowIndexToStartTime(rowPlace, swimlaneRows);
      const rect = event.currentTarget.getBoundingClientRect();
      setSlotHint({
        text: formatTimeHint(timeStr),
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
  };

  const handleMouseDown = (index) => {
    const col =
      (index + 1) % columnCount === 0
        ? parseInt(columnCount)
        : (index + 1) % columnCount;
    setNewBlockSpan({
      id: uuidv4(),
      columns: [col, col + 1],
      widthType: "fill",
      rows: [
        Math.ceil((index + 1) / columnCount),
        Math.ceil((index + 1) / columnCount) + 1,
      ],
      color: lastBlockColor || DEFAULT_BLOCK_COLOR,
    });
  };

  const handleTouchStart = (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent default touch behavior to avoid scrolling
    const touch = e.touches[0];

    // Check if this is a tap (not a drag)
    const touchStartTime = Date.now();
    const touchStartX = touch.clientX;
    const touchStartY = touch.clientY;
    
    const handleTouchEnd = (e) => {
      const touchEndTime = Date.now();
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      // If it's a short tap (less than 200ms) and small movement (less than 10px)
      if (touchEndTime - touchStartTime < 200 && 
          Math.abs(touchEndX - touchStartX) < 10 && 
          Math.abs(touchEndY - touchStartY) < 10) {
        handleMouseDown(index);
      }
      
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchend', handleTouchEnd, { once: true });
  };

  const setBlockDragOrigin = (block) => {
    dragOriginRef.current = {
      columns: [...block.columns],
      rows: [...block.rows],
    };
    currentBlock.current = {
      id: block.id,
      columns: [...block.columns],
      rows: [...block.rows],
    };
  };

  const handleResize = (e, pointInfo) => {
    e.stopPropagation();
    if (!currentBlock.current || !dragOriginRef.current) return;
    if (Math.abs(pointInfo.offset.x) > 2 || Math.abs(pointInfo.offset.y) > 2) {
      suppressClickRef.current = true;
    }
    const colWidth = columnsRef.current[0].getBoundingClientRect().width;
    const deltaCol = Math.round(pointInfo.offset.x / (colWidth + gap));
    const deltaRow = Math.round(pointInfo.offset.y / (height + gap));
    const origin = dragOriginRef.current;
    const colEnd = Math.max(
      origin.columns[0] + 1,
      Math.min(origin.columns[1] + deltaCol, columnCount + 1)
    );
    const rowEnd = Math.max(
      origin.rows[0] + 1,
      Math.min(origin.rows[1] + deltaRow, rowCount + 1)
    );
    const newColumns = [origin.columns[0], colEnd];
    const newRows = [origin.rows[0], rowEnd];
    currentBlock.current = {
      id: currentBlock.current.id,
      columns: newColumns,
      rows: newRows,
    };
    const updatedBlocks = blocks.map((block) =>
      block.id !== currentBlock.current.id
        ? block
        : {
            ...block,
            columns: newColumns,
            rows: newRows,
          }
    );
    onBlocksSave(updatedBlocks);
    setResizing(true);
  };

  const handleDrag = (e, pointInfo) => {
    if (isResizingRef.current) return;
    if (e.target?.closest?.(".resize")) return;
    if (!currentBlock.current || !dragOriginRef.current) return;

    if (Math.abs(pointInfo.offset.x) > 2 || Math.abs(pointInfo.offset.y) > 2) {
      suppressClickRef.current = true;
    }

    const colWidth = columnsRef.current[0].getBoundingClientRect().width;
    const deltaCol = Math.round(pointInfo.offset.x / (colWidth + gap));
    const deltaRow = Math.round(pointInfo.offset.y / (height + gap));
    const newColumns = [
      dragOriginRef.current.columns[0] + deltaCol,
      dragOriginRef.current.columns[1] + deltaCol,
    ];
    const newRows = [
      dragOriginRef.current.rows[0] + deltaRow,
      dragOriginRef.current.rows[1] + deltaRow,
    ];
    currentBlock.current = {
      id: currentBlock.current.id,
      columns: newColumns,
      rows: newRows,
    };
    const updatedBlocks = blocks.map((block) =>
      block.id !== currentBlock.current.id
        ? block
        : {
            ...block,
            columns: newColumns,
            rows: newRows,
          }
    );
    onBlocksSave(updatedBlocks);
    setDragging(true);
  };

  return (
    <div>
      <div className={`container grid-with-labels${isMobile ? " grid-readonly" : ""}`}>
        <div
          className="grid-body"
          style={{
            display: "grid",
            gap: gap,
            "--row-gap": `${gap}px`,
            gridTemplateColumns: `40px repeat( ${columnCount}, minmax(0, 1fr) )`,
            gridTemplateRows: `auto repeat( ${rowCount}, ${height}px )`,
          }}
        >
          <div className="column-title column-title-corner" style={{ gridColumn: 1, gridRow: 1 }} />
          {daysOfWeek.map((day, index) => (
            <div
              key={index}
              className="column-title"
              style={{ gridColumn: index + 2, gridRow: 1 }}
            >
              {day}
            </div>
          ))}
          {swimlaneRows.map(({ swimlane, startRow, rowSpan }, i) => {
            const prev = swimlaneRows[i - 1];
            const next = swimlaneRows[i + 1];
            const startNum = swimlaneHourNumber(swimlane.start);
            const endNum = swimlaneHourNumber(swimlane.end);
            const showTop = !prev || swimlaneHourNumber(prev.swimlane.end) !== startNum;
            const isSharedWithNext = next && swimlaneHourNumber(next.swimlane.start) === endNum;
            return (
              <div
                key={swimlane.id}
                className="row-label row-label-span"
                style={{
                  gridColumn: 1,
                  gridRow: `${startRow + 2} / span ${rowSpan}`,
                }}
              >
                {editingSwimlaneId === swimlane.id && onSwimlaneChange ? (
                  <div className="row-label-edit" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="time"
                      value={swimlane.start}
                      onChange={(e) => onSwimlaneChange(swimlane.id, 'start', e.target.value)}
                      className="row-label-time"
                    />
                    <span className="swimlane-sep">–</span>
                    <input
                      type="time"
                      value={swimlane.end}
                      onChange={(e) => onSwimlaneChange(swimlane.id, 'end', e.target.value)}
                      className="row-label-time"
                    />
                    <button
                      type="button"
                      className="row-label-done"
                      onClick={() => setEditingSwimlaneId(null)}
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="row-label-hours"
                    onClick={() => onSwimlaneChange && setEditingSwimlaneId(swimlane.id)}
                    title="Click to set time for this row"
                  >
                    {showTop ? (
                      <span className="row-label-top">{startNum}</span>
                    ) : (
                      <span className="row-label-top row-label-empty" aria-hidden="true" />
                    )}
                    <span
                      className={`row-label-bottom ${isSharedWithNext ? "row-label-boundary" : ""}`}
                    >
                      {endNum}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
          <div
            className="grid-inner-wrapper"
            style={{
              gridColumn: "2 / -1",
              gridRow: "2 / -1",
              position: "relative",
              display: "block",
              minHeight: rowCount * height + (rowCount - 1) * gap,
            }}
          >
            <div className="swimlane-boundary" style={{ top: 0 }} />
            {swimlaneRows.slice(0, -1).map(({ startRow, rowSpan }) => {
              const topPx = (startRow + rowSpan) * height + (startRow + rowSpan - 1) * gap + (gap - 1) / 2;
              return (
                <div
                  key={`boundary-${startRow + rowSpan}`}
                  className="swimlane-boundary"
                  style={{ top: topPx }}
                />
              );
            })}
            <div
              className="swimlane-boundary"
              style={{ top: rowCount * height + (rowCount - 1) * gap }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 0,
                display: "grid",
                gap: gap,
                gridTemplateColumns: `repeat( ${columnCount}, minmax(0, 1fr) )`,
                gridTemplateRows: `repeat( ${rowCount}, ${height}px )`,
              }}
              className="shadow-grid"
              onMouseLeave={!isMobile ? () => setSlotHint(null) : undefined}
            >
              {[...Array(columnCount * rowCount)].map((col, index) => (
                <div
                  className="shadow-item"
                  key={index}
                  onMouseDown={!isMobile ? (e) => {
                    e.preventDefault();
                    handleMouseDown(index);
                  } : undefined}
                  onTouchStart={!isMobile ? (e) => handleTouchStart(index, e) : undefined}
                  ref={(el) => (columnsRef.current[index] = el)}
                  onMouseEnter={!isMobile ? (e) => handleGridEnter(index, e) : undefined}
                ></div>
              ))}
            </div>
            {newBlockSpan && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 1,
                  pointerEvents: "none",
                  display: "grid",
                  gap: gap,
                  gridTemplateColumns: `repeat( ${columnCount}, minmax(0, 1fr) )`,
                  gridTemplateRows: `repeat( ${rowCount}, ${height}px )`,
                }}
                className="shadow-grid"
              >
                <div
                  className="new-item"
                  style={{
                    gridColumn: newBlockSpan.columns.join("/"),
                    gridRow: newBlockSpan.rows.join("/"),
                  }}
                />
              </div>
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 2,
                pointerEvents: "none",
                gap: gap,
                gridTemplateColumns: `repeat( ${columnCount}, minmax(0px, 1fr) )`,
                gridTemplateRows: `repeat( ${rowCount}, ${height}px )`,
              }}
              className="grid"
            >
          {displayBlocks.map((block, index) => (
            <motion.div
              key={index}
              tabIndex={0}
              className={`block ${
                currentBlock.current?.id === block.id
                  ? "resizing"
                  : "not-resizing"
              } ${block.widthType} ${
                selectedBlockId === block.id ? "selected" : ""
              }`}
              style={{
                gridColumn: block.columns.join("/"),
                gridRow: block.rows.join("/"),
                cursor: isMobile ? "default" : dragging ? "grabbing" : undefined,
                backgroundColor: block.color || DEFAULT_BLOCK_COLOR,
                "--block-accent": block.color || DEFAULT_BLOCK_COLOR,
                "--block-accent-ring": blockAccentToA7(block.color || DEFAULT_BLOCK_COLOR),
              }}
              ref={(el) => (blocksRef.current[block.id] = el)}
              onClick={!isMobile ? (e) => {
                e.stopPropagation();
                if (suppressClickRef.current) {
                  suppressClickRef.current = false;
                  return;
                }
                openBlockEditor(block);
              } : undefined}
            >
              <div className="block-label-wrap">
                <span
                  className={`block-label${
                    block.title ? "" : " block-label-empty"
                  }`}
                >
                  {block.title || "Untitled"}
                </span>
              </div>

              {!isMobile && (
                <motion.div
                  className="block-drag-surface"
                  style={{ cursor: dragging ? "grabbing" : "grab" }}
                  onMouseDown={() => {
                    suppressClickRef.current = false;
                    setBlockDragOrigin(block);
                    setSelectedBlockId(block.id);
                  }}
                  onPanStart={() => {
                    suppressClickRef.current = false;
                    setDragging(true);
                    setBlockDragOrigin(block);
                  }}
                  onPanEnd={() => {
                    setDragging(false);
                    dragOriginRef.current = null;
                    if (currentBlock.current) {
                      const updated = blocks.map((b) =>
                        b.id === currentBlock.current.id
                          ? { ...b, columns: [...currentBlock.current.columns], rows: [...currentBlock.current.rows] }
                          : b
                      );
                      onBlocksSave(updated);
                      saveBlocks(updated).catch((e) =>
                        console.error("Error saving blocks after drag:", e)
                      );
                    }
                    currentBlock.current = null;
                  }}
                  onPan={handleDrag}
                />
              )}

              <motion.div className="resizer">
                <motion.div
                  className="resize resize-left"
                  onPointerDown={!isMobile ? (e) => {
                    e.stopPropagation();
                    isResizingRef.current = true;
                    suppressClickRef.current = false;
                    setBlockDragOrigin(block);
                    setSelectedBlockId(block.id);
                  } : undefined}
                  onPanStart={!isMobile ? (e) => {
                    e.stopPropagation();
                    isResizingRef.current = true;
                    setResizing(true);
                    setBlockDragOrigin(block);
                  } : undefined}
                  onPanEnd={!isMobile ? () => {
                    isResizingRef.current = false;
                    setResizing(false);
                    dragOriginRef.current = null;
                    if (currentBlock.current) {
                      const updated = blocks.map((b) =>
                        b.id === currentBlock.current.id
                          ? { ...b, columns: [...currentBlock.current.columns], rows: [...currentBlock.current.rows] }
                          : b
                      );
                      onBlocksSave(updated);
                      saveBlocks(updated).catch((e) =>
                        console.error("Error saving blocks after resize:", e)
                      );
                    }
                    currentBlock.current = null;
                  } : undefined}
                  onPan={!isMobile ? handleResize : undefined}
                />
              </motion.div>
            </motion.div>
          ))}
            </div>
          </div>
        </div>
      </div>

      {slotHint && !isMobile && (
        <div
          className="grid-slot-hint"
          style={{ left: slotHint.x, top: slotHint.y }}
          role="tooltip"
        >
          {slotHint.text}
        </div>
      )}

      <Dialog.Root
        open={!!editingBlockId}
        onOpenChange={(open) => {
          if (!open) closeBlockEditor();
        }}
      >
        <Dialog.Content
          className="block-editor-dialog"
          style={{ maxWidth: 360 }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const isTextarea = e.target.tagName === "TEXTAREA";
            if (isTextarea && !e.metaKey && !e.ctrlKey) return;
            e.preventDefault();
            saveBlockEditor();
          }}
        >
          <Dialog.Title>Time block</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Set the title, notes, and color for this block.
          </Dialog.Description>
          <div className="block-editor-fields">
            <label className="block-editor-label" htmlFor="block-editor-title">
              Title
            </label>
            <TextField.Root size="2" mb="3">
              <TextField.Input
                id="block-editor-title"
                value={editDraft.title}
                onChange={(e) =>
                  setEditDraft((draft) => ({ ...draft, title: e.target.value }))
                }
                placeholder="Untitled"
              />
            </TextField.Root>
            <label className="block-editor-label" htmlFor="block-editor-notes">
              Notes
            </label>
            <TextArea
              id="block-editor-notes"
              size="2"
              mb="3"
              value={editDraft.notes}
              onChange={(e) =>
                setEditDraft((draft) => ({ ...draft, notes: e.target.value }))
              }
              placeholder="Add notes"
              rows={3}
            />
            <span className="block-editor-label">Color</span>
            <div className="block-color-grid block-editor-colors">
              {RADIX_BLOCK_COLORS.map((colorValue) => (
                <button
                  key={colorValue}
                  type="button"
                  className={`block-color-option${
                    editingBlock?.color === colorValue ? " selected" : ""
                  }`}
                  style={{ backgroundColor: colorValue }}
                  onClick={() => handleEditorColorChange(colorValue)}
                  aria-label={`Color ${colorValue}`}
                />
              ))}
            </div>
          </div>
          <div className="block-editor-actions">
            <Button color="red" variant="soft" onClick={handleEditorDelete}>
              <TrashIcon width="16" height="16" />
              Delete
            </Button>
            <Button onClick={saveBlockEditor}>Save</Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}
