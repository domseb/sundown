import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { TextField, IconButton } from "@radix-ui/themes";
import { fetchBlocks, saveBlocks, deleteBlock } from "./Api";
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
  const [colorPickerOpen, setColorPickerOpen] = useState({ blockId: null, top: 0, left: 0 });
  const colorPickerRef = useRef(null);
  const currentBlock = useRef(null);
  const [, setResizing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [blockTitles, setBlockTitles] = useState({});
  const daysOfWeek = ["M", "T", "W", "T", "F"];
  const DEFAULT_BLOCK_COLOR = "var(--crimson-4)";

  useEffect(() => {
    fetchBlocks()
      .then((blocksData) => {
        const titles = {};
        blocksData.forEach((block) => {
          titles[block.id] = block.title || "";
        });
        setBlockTitles(titles);
        onBlocksSave(blocksData);
      })
      .catch((error) => console.error("Error loading blocks:", error));
  }, [onBlocksSave]);

  useEffect(() => {
    const saveNewBlock = (event) => {
      if (newBlockSpan !== null) {
        onBlocksSave((blocks) => {
          const newBlocks = [
            ...blocks,
            {
              ...newBlockSpan,
              title: blockTitles[newBlockSpan.id] || "",
              color: newBlockSpan.color || DEFAULT_BLOCK_COLOR,
            },
          ];
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
      }
    };

    const saveBlockPositions = () => {
      if (currentBlock.current) {
        const updatedBlocks = blocks.map((block) =>
          block.id === currentBlock.current.id
            ? { ...currentBlock.current }
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
      }
    };

    document.addEventListener("mouseup", saveNewBlock);
    document.addEventListener("mouseup", saveBlockPositions);

    return () => {
      document.removeEventListener("mouseup", saveNewBlock);
      document.removeEventListener("mouseup", saveBlockPositions);
    };
  }, [newBlockSpan, blocks, blockTitles, onBlocksSave]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        currentBlock.current &&
        document.activeElement.tagName !== "INPUT"
      ) {
        const blockId = currentBlock.current.id;

        deleteBlock(blockId)
          .then(() => {
            onBlocksSave(blocks.filter((block) => block.id !== blockId));
          })
          .catch((error) => {
            console.error("Error deleting block:", error);
          });

        currentBlock.current = null;
        setSelectedBlockId(null);
      }

      if (event.key === "Escape") {
        setSelectedBlockId(null);
        currentBlock.current = null;
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [blocks, onBlocksSave]);

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

  const handleGridEnter = (index) => {
    const colPlace =
      (index + 1) % columnCount === 0 ? columnCount : (index + 1) % columnCount;
    const rowPlace = Math.ceil((index + 1) / columnCount);
    if (newBlockSpan) {
      const newBlock = { ...newBlockSpan };
      newBlock.columns[1] = colPlace + 1;
      newBlock.rows[1] = rowPlace + 1;
      setNewBlockSpan(newBlock);
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

  const handleResize = (e, pointInfo) => {
    e.stopPropagation();
    if (!currentBlock.current) return;
    const colWidth = columnsRef.current[0].getBoundingClientRect().width;
    const updatedBlocks = [...blocks];
    const updatedBlock = updatedBlocks.find(
      (b) => b.id === currentBlock.current.id
    );

    updatedBlock.columns[1] =
      currentBlock.current.columns[1] +
      Math.round(pointInfo.offset.x / (colWidth + gap));

    updatedBlock.rows[1] =
      currentBlock.current.rows[1] +
      Math.round(pointInfo.offset.y / (height + gap));

    onBlocksSave(updatedBlocks);
    setResizing(true);
  };

  const handleDrag = (e, pointInfo) => {
    if (!currentBlock.current) return;

    const colWidth = columnsRef.current[0].getBoundingClientRect().width;
    const updatedBlocks = [...blocks];
    const updatedBlock = updatedBlocks.find(
      (b) => b.id === currentBlock.current.id
    );

    updatedBlock.columns[0] =
      currentBlock.current.columns[0] +
      Math.round(pointInfo.offset.x / (colWidth + gap));
    updatedBlock.columns[1] =
      currentBlock.current.columns[1] +
      Math.round(pointInfo.offset.x / (colWidth + gap));

    updatedBlock.rows[0] =
      currentBlock.current.rows[0] +
      Math.round(pointInfo.offset.y / (height + gap));
    updatedBlock.rows[1] =
      currentBlock.current.rows[1] +
      Math.round(pointInfo.offset.y / (height + gap));

    onBlocksSave(updatedBlocks);
    setDragging(true);
  };

  const handleTitleChange = (blockId, newTitle) => {
    setBlockTitles((prevTitles) => ({
      ...prevTitles,
      [blockId]: newTitle,
    }));
  };

  const handleTitleBlur = (blockId) => {
    const updatedBlocks = blocks.map((block) =>
      block.id === blockId ? { ...block, title: blockTitles[blockId] } : block
    );

    onBlocksSave(updatedBlocks);

    saveBlocks(updatedBlocks)
      .then(() => {
        console.log("Blocks saved successfully with titles on blur");
      })
      .catch((error) => {
        console.error("Error saving blocks with titles on blur:", error);
      });
  };

  useEffect(() => {
    if (!colorPickerOpen.blockId) return;
    const onMouseDown = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setColorPickerOpen((prev) => ({ ...prev, blockId: null }));
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [colorPickerOpen.blockId]);

  const handleBlockColorChange = (blockId, color) => {
    const updatedBlocks = blocks.map((block) =>
      block.id === blockId ? { ...block, color } : block
    );
    onBlocksSave(updatedBlocks);
    saveBlocks(updatedBlocks).catch((error) =>
      console.error("Error saving block color:", error)
    );
    setColorPickerOpen((prev) => ({ ...prev, blockId: null }));
    onBlockColorUsed?.(color);
  };

  const openColorPicker = (blockId, event) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setColorPickerOpen({
      blockId,
      top: rect.bottom + 4,
      left: rect.left,
    });
  };

  const handleBlockDelete = (blockId) => {
    deleteBlock(blockId)
      .then(() => {
        onBlocksSave(blocks.filter((block) => block.id !== blockId));
      })
      .catch((error) =>
        console.error(`Error deleting block with ID ${blockId}:`, error)
      );
  };

  return (
    <div>
      <div className="container grid-with-labels">
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
            >
              {[...Array(columnCount * rowCount)].map((col, index) => (
                <div
                  className="shadow-item"
                  key={index}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleMouseDown(index);
                  }}
                  onTouchStart={(e) => handleTouchStart(index, e)}
                  ref={(el) => (columnsRef.current[index] = el)}
                  onMouseEnter={() => handleGridEnter(index)}
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
          {blocks.map((block, index) => (
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
                cursor: dragging ? "grabbing" : "grab",
                backgroundColor: block.color || DEFAULT_BLOCK_COLOR,
                "--block-accent": block.color || DEFAULT_BLOCK_COLOR,
              }}
              ref={(el) => (blocksRef.current[block.id] = el)}
              onMouseDown={(e) => {
                if (e.target.tagName !== "INPUT") {
                  currentBlock.current = {
                    id: block.id,
                    columns: [...block.columns],
                    rows: [...block.rows],
                  };
                  setSelectedBlockId(block.id);
                }
              }}
              onTouchStart={(e) => {
                if (e.target.tagName !== "INPUT") {
                  e.preventDefault();
                  currentBlock.current = {
                    id: block.id,
                    columns: [...block.columns],
                    rows: [...block.rows],
                  };
                  setSelectedBlockId(block.id);
                }
              }}
              onPanStart={(e) => {
                setDragging(true);
                currentBlock.current = {
                  id: block.id,
                  columns: [...block.columns],
                  rows: [...block.rows],
                };
              }}
              onPanEnd={() => {
                setDragging(false);
                saveBlocks(blocks)
                  .then(() => {
                    console.log("Blocks saved successfully after drag");
                  })
                  .catch((error) => {
                    console.error("Error saving blocks after drag:", error);
                  });
                currentBlock.current = null;
              }}
              onPan={handleDrag}
            >
              <div className="block-title-wrap">
                <TextField.Input
                  variant="soft"
                  value={blockTitles[block.id] || ""}
                  onChange={(e) => handleTitleChange(block.id, e.target.value)}
                  onBlur={() => handleTitleBlur(block.id)}
                  autoFocus={block.id === newBlockSpan?.id}
                  onFocus={(e) => e.stopPropagation()}
                />
              </div>

              <motion.div className="resizer">
                <div className="tools">
                  <button
                    type="button"
                    className="block-color-swatch"
                    style={{
                      backgroundColor: block.color || DEFAULT_BLOCK_COLOR,
                    }}
                    onClick={(e) => openColorPicker(block.id, e)}
                    title="Block color"
                    aria-label="Block color"
                  />
                  <IconButton
                    className="block-delete-btn"
                    onClick={() => handleBlockDelete(block.id)}
                    variant="soft"
                  >
                    <TrashIcon />
                  </IconButton>
                </div>
                <motion.div
                  className="resize resize-left"
                  onPanStart={(e) => {
                    setResizing(true);
                    currentBlock.current = {
                      id: block.id,
                      columns: [...block.columns],
                      rows: [...block.rows],
                    };
                  }}
                  onPanEnd={() => {
                    setResizing(false);
                    saveBlocks(blocks)
                      .then(() => {
                        console.log("Blocks saved successfully after resize");
                      })
                      .catch((error) => {
                        console.error(
                          "Error saving blocks after resize:",
                          error
                        );
                      });
                    currentBlock.current = null;
                  }}
                  onPan={handleResize}
                />
              </motion.div>
            </motion.div>
          ))}
            </div>
          </div>
        </div>
      </div>
      {typeof document !== "undefined" &&
        colorPickerOpen.blockId &&
        createPortal(
          <div
            ref={colorPickerRef}
            className="block-color-picker-dropdown"
            style={{
              position: "fixed",
              top: colorPickerOpen.top,
              left: colorPickerOpen.left,
              zIndex: 9999,
            }}
          >
            <div className="block-color-grid">
              {RADIX_BLOCK_COLORS.map((colorValue) => (
                <button
                  key={colorValue}
                  type="button"
                  className="block-color-option"
                  style={{ backgroundColor: colorValue }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBlockColorChange(colorPickerOpen.blockId, colorValue);
                  }}
                  aria-label={`Color ${colorValue}`}
                />
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
