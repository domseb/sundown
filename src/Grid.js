// Replace this import with the correct import statement based on your project structure
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TextField } from "@radix-ui/themes"; // Updated import statement
import { fetchBlocks, saveBlocks, deleteBlock } from "./Api";

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
  const [selectedBlockId, setSelectedBlockId] = useState(null); // State to track the selected block
  const currentBlock = useRef(null);
  const [resizing, setResizing] = useState(false);
  const [blockTitles, setBlockTitles] = useState({});
  const daysOfWeek = ["M", "T", "W", "T", "F"];

  useEffect(() => {
    fetchBlocks()
      .then((blocksData) => {
        // Assuming your state expects an array of blocks
        onBlocksSave(blocksData);
      })
      .catch((error) => console.error("Error loading blocks:", error));
  }, []);

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

    document.addEventListener("mouseup", saveNewBlock);
    return () => {
      document.removeEventListener("mouseup", saveNewBlock);
    };
  }, [newBlockSpan, blockTitles, onBlocksSave]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      // Check if a text field is focused
      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        currentBlock.current &&
        document.activeElement.tagName !== "INPUT"
      ) {
        const updatedBlocks = blocks.filter(
          (block) => block.id !== currentBlock.current.id
        );
        onBlocksSave(updatedBlocks);
        currentBlock.current = null;
        setSelectedBlockId(null); // Deselect the block after deletion
      }

      // Deselect block if Esc key is pressed
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
      id: Date.now(),
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

    //update horizontal
    updatedBlock.columns[1] =
      currentBlock.current.columns[1] +
      Math.round(pointInfo.offset.x / (colWidth + gap));

    //update vertical
    updatedBlock.rows[1] =
      currentBlock.current.rows[1] +
      Math.round(pointInfo.offset.y / (height + gap));

    onBlocksSave(updatedBlocks);
  };

  const handleDrag = (e, pointInfo) => {
    if (!currentBlock.current) return;
    if (e.target.classList.contains("resize")) return;

    const colWidth = columnsRef.current[0].getBoundingClientRect().width;
    const updatedBlocks = [...blocks];
    const updatedBlock = updatedBlocks.find(
      (b) => b.id === currentBlock.current.id
    );

    //update horizontal
    updatedBlock.columns[0] =
      currentBlock.current.columns[0] +
      Math.round(pointInfo.offset.x / (colWidth + gap));
    updatedBlock.columns[1] =
      currentBlock.current.columns[1] +
      Math.round(pointInfo.offset.x / (colWidth + gap));

    //update vertical
    updatedBlock.rows[0] =
      currentBlock.current.rows[0] +
      Math.round(pointInfo.offset.y / (height + gap));
    updatedBlock.rows[1] =
      currentBlock.current.rows[1] +
      Math.round(pointInfo.offset.y / (height + gap));

    onBlocksSave(updatedBlocks);
  };

  // Function to handle title changes
  const handleTitleChange = (blockId, newTitle) => {
    setBlockTitles((prevTitles) => ({
      ...prevTitles,
      [blockId]: newTitle,
    }));
  };

  return (
    <div>
      <div className="container">
        {/* Column Titles */}
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
            className="shadow-grid" // The grid that is shown on drag
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
          className="grid" // The actual grid
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
              }}
              ref={(el) => (blocksRef.current[block.id] = el)}
              onMouseDown={(e) => {
                if (e.target.tagName !== "INPUT") {
                  currentBlock.current = {
                    id: block.id,
                    columns: [...block.columns],
                    rows: [...block.rows],
                  };
                  setSelectedBlockId(block.id); // Set the selected block ID
                }
              }}
            >
              {/* Radix UI TextField.Input */}
              <TextField.Input
                variant="soft"
                color="red"
                value={blockTitles[block.id] || ""}
                onChange={(e) => handleTitleChange(block.id, e.target.value)}
                autoFocus={block.id === newBlockSpan?.id}
                onFocus={(e) => e.stopPropagation()} // Prevent block selection on text field focus
              />

              <motion.div className="resizer">
                <div className="tools">
                  <motion.div
                    className="drag-handle"
                    onPanStart={(e) => {
                      setResizing(true);
                      currentBlock.current = {
                        id: block.id,
                        columns: [...block.columns],
                        rows: [...block.rows],
                      };
                    }}
                    onPanEnd={() => {
                      currentBlock.current = null;
                      setResizing(false);
                    }}
                    onPan={handleDrag}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M8 7H10V5H8V7ZM8 13H10V11H8V13ZM8 19H10V17H8V19ZM14 5V7H16V5H14ZM14 13H16V11H14V13ZM14 19H16V17H14V19Z"
                        fill="currentColor"
                      />
                    </svg>
                  </motion.div>
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
                    currentBlock.current = null;
                    setResizing(false);
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
          className="shadow-grid" // The grid that is shown by default
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
