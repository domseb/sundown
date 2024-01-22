// Replace this import with the correct import statement based on your project structure
import { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { motion } from 'framer-motion';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Reorder } from 'framer-motion';
import { TextField } from '@radix-ui/themes'; // Updated import statement

export default function Grid({
  onBlocksSave,
  blocks,
  gap,
  height,
  columnCount,
  rowCount,
  minWidth,
}) {
  const blocksRef = useRef([]);
  const columnsRef = useRef([]);
  const [newBlockSpan, setNewBlockSpan] = useState(null);
  const currentBlock = useRef(null);
  const [resizing, setResizing] = useState(false);
  const [blockTitles, setBlockTitles] = useState({});

  useEffect(() => {
    const saveNewBlock = (event) => {
      if (newBlockSpan !== null) {
        onBlocksSave((blocks) => [
          ...blocks,
          { ...newBlockSpan, title: blockTitles[newBlockSpan.id] || '' },
        ]);
        setNewBlockSpan(null);
      }
    };

    document.addEventListener('mouseup', saveNewBlock);
    return () => {
      document.removeEventListener('mouseup', saveNewBlock);
    };
  }, [newBlockSpan, blockTitles, onBlocksSave]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      // Deselect the text input when hitting the return key
      if (event.key === 'Enter' && currentBlock.current) {
        currentBlock.current = null;
      }

      // Delete the selected block when hitting backspace or delete key
      if (
        (event.key === 'Backspace' || event.key === 'Delete') &&
        currentBlock.current
      ) {
        const updatedBlocks = blocks.filter(
          (block) => block.id !== currentBlock.current.id
        );
        onBlocksSave(updatedBlocks);
        currentBlock.current = null;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [blocks, onBlocksSave]);

  const handleGridEnter = (index) => {
    const colPlace =
      (index + 1) % columnCount === 0
        ? columnCount
        : (index + 1) % columnCount;
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
      widthType: 'fill',
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
    if (e.target.classList.contains('resize')) return;

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
              gridColumn: newBlockSpan.columns.join('/'),
              gridRow: newBlockSpan.rows.join('/'),
            }}
          />
        </div>
      )}
      <div
        style={{
          pointerEvents: 'none',
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
                ? 'resizing'
                : 'not-resizing'
            } ${block.widthType}`}
            key={index}
            style={{
              gridColumn: block.columns.join('/'),
              gridRow: block.rows.join('/'),
            }}
            ref={(el) => (blocksRef.current[block.id] = el)}
          >
            {/* Radix UI TextField.Input */}
            <TextField.Input
              value={blockTitles[block.id] || ""}
              onChange={(e) => handleTitleChange(block.id, e.target.value)}
              autoFocus={block.id === newBlockSpan?.id}
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
  );
}
