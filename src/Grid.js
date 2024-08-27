import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TextField, IconButton } from "@radix-ui/themes"; // Import IconButton
import { fetchBlocks, saveBlocks, deleteBlock } from "./Api";
import { v4 as uuidv4 } from "uuid";
import { TrashIcon } from "@radix-ui/react-icons"; // Importing the trashcan icon

export default function Grid({
  onBlocksSave,
  blocks,
  gap,
  height,
  columnCount,
  rowCount,
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
  const currentBlock = useRef(null);
  const [resizing, setResizing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [blockTitles, setBlockTitles] = useState({});
  const daysOfWeek = ["M", "T", "W", "T", "F"];

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
            { ...newBlockSpan, title: blockTitles[newBlockSpan.id] || "" },
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
    });
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
      <div className="container">
        <div
          style={{
            display: "grid",
            gap: gap,
            gridTemplateColumns: `repeat( ${columnCount}, minmax(0px, 1fr) )`,
            gridTemplateRows: "auto",
          }}
        >
          {daysOfWeek.map((day, index) => (
            <div key={index} className="column-title">
              {day}
            </div>
          ))}
        </div>
      </div>
      <div className="container">
        {newBlockSpan && (
          <div
            style={{
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
            pointerEvents: "none",
            gap: gap,
            gridTemplateColumns: `repeat( ${columnCount}, minmax(0px, 1fr) )`,
            gridTemplateRows: `repeat( ${rowCount}, ${height}px )`,
          }}
          className="grid"
        >
          {blocks.map((block, index) => (
            <motion.div
              className={`block ${
                currentBlock.current?.id === block.id
                  ? "resizing"
                  : "not-resizing"
              } ${block.widthType} ${
                selectedBlockId === block.id ? "selected" : ""
              }`}
              key={index}
              style={{
                gridColumn: block.columns.join("/"),
                gridRow: block.rows.join("/"),
                cursor: dragging ? "grabbing" : "grab", // Open hand (grab) by default, closed hand (grabbing) while dragging
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
              <TextField.Input
                variant="soft"
                color="red"
                value={blockTitles[block.id] || ""}
                onChange={(e) => handleTitleChange(block.id, e.target.value)}
                onBlur={() => handleTitleBlur(block.id)}
                autoFocus={block.id === newBlockSpan?.id}
                onFocus={(e) => e.stopPropagation()}
              />

              <motion.div className="resizer">
                <div className="tools">
                  <IconButton
                    onClick={() => handleBlockDelete(block.id)}
                    variant="soft"
                    color="red"
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
        <div
          style={{
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
              ref={(el) => (columnsRef.current[index] = el)}
              onMouseEnter={() => handleGridEnter(index)}
            ></div>
          ))}
        </div>
        <div></div>
      </div>
    </div>
  );
}
