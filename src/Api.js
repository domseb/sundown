import axios from "axios";

const api = axios.create({
  baseURL: "https://calendar-app-navy.vercel.app", // Change this to the actual URL if deployed
});

// Function to fetch blocks from the server
export const fetchBlocks = async () => {
  try {
    const response = await api.get("/blocks");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch blocks:", error);
    throw error;
  }
};

// Function to save blocks to the server
export const saveBlocks = async (blocks) => {
  try {
    const response = await api.post("/blocks", { blocks });
    return response.data;
  } catch (error) {
    console.error("Failed to save blocks:", error);
    throw error;
  }
};

// Function to delete a block from the server
export const deleteBlock = async (id) => {
  try {
    console.log(`Attempting to delete block with id: ${id}`);
    const response = await api.delete(`/blocks/${id}`);
    console.log(`Response from delete request:`, response);
    return response.data;
  } catch (error) {
    console.error("Failed to delete block:", error);
    throw error;
  }
};
