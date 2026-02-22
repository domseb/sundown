import "./styles.css";
import React from "react";
import { motion } from "framer-motion";
import { Reorder, useDragControls } from "framer-motion";

export default function AutoGrid({
  onBlocksSave,
  blocks,
  onAddBlock,
  gap,
  height,
  minWidth
}) {
  return (
    <div className="container">
      {blocks.length === 0 && (
        <p className="empty-text">Add your first block</p>
      )}
      <Reorder.Group
        values={blocks}
        onReorder={onBlocksSave}
        as="div"
        style={{
          gap: gap,
          gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
          gridAutoRows: height
        }}
        className="grid"
      >
        {blocks.map((block, index) => (
          <AutoGridItem key={block.id} block={block} index={index} />
        ))}
      </Reorder.Group>
    </div>
  );
}

function AutoGridItem({ block, index }) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      drag
      as="div"
      value={block}
      dragListener={false}
      dragControls={controls}
      className={`block ${block.widthType}`}
    >
      <motion.div className="resizer">
        <div className="tools">
          <motion.div
            className="drag-handle"
            onPointerDown={(e) => controls.start(e)}
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
      </motion.div>
    </Reorder.Item>
  );
}