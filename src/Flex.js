import "./styles.css";
import { useState, useEffect, useCallback, useRef } from "react";
import { Rnd } from "react-rnd";
import { motion } from "framer-motion";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { Reorder } from "framer-motion";

export default function Flex({
  onBlocksSave,
  blocks,
  onAddBlock,
  gap,
  height,
  minWidth
}) {
  const handleColumnSize = ({ block, size }) => {
    const updatedBlocks = [...blocks];
    const updatedBlock = updatedBlocks.find((b) => b.id === block.id);
    updatedBlock.widthType = size;
    onBlocksSave(updatedBlocks);
  };

  return (
    <div className="container">
      {blocks.length === 0 && (
        <p className="empty-text">Add your first block</p>
      )}
      <div
        style={{
          gap: gap
        }}
        className="flex"
      >
        {blocks.map((block, index) => (
          <motion.div
            className={`block ${block.widthType}`}
            key={index}
            style={{
              minWidth: minWidth + "px",
              minHeight: height + "px"
            }}
          >
            <motion.div className="resizer">
              <div className="tools">
                <motion.div className="drag-handle">
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
                <ToggleGroup.Root
                  className="ToggleGroup"
                  type="single"
                  defaultValue="fill"
                  value={block.widthType}
                  onValueChange={(size) => handleColumnSize({ block, size })}
                  aria-label="Block width"
                >
                  <ToggleGroup.Item
                    className="ToggleGroupItem"
                    value="fill"
                    aria-label="Fill"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9.375 7L5 11.5M5 11.5L9.375 16M5 11.5H20M20 11.5L15.625 7M20 11.5L15.625 16"
                        stroke="currentColor"
                        stroke-width="1.5"
                      />
                    </svg>
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    className="ToggleGroupItem"
                    value="fit"
                    aria-label="Fit"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect
                        x="10"
                        y="3"
                        width="4"
                        height="18"
                        rx="1.5"
                        fill="currentColor"
                      />
                      <path
                        d="M20.8289 15.9762L18 11.9881L20.8289 8L21.7715 8.9762L19.635 11.9881L21.7715 15L20.8289 15.9762Z"
                        fill="currentColor"
                      />
                      <path
                        d="M2.94256 8L5.7715 11.9881L2.94256 15.9762L2 15L4.13652 11.9881L2 8.97619L2.94256 8Z"
                        fill="currentColor"
                      />
                    </svg>
                  </ToggleGroup.Item>
                </ToggleGroup.Root>
              </div>
              <motion.div className="resize resize-left" />
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}