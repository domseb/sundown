require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const { v4: uuidv4, validate: validateUUID } = require("uuid"); // Import UUID and validate

const app = express();
const port = process.env.PORT || 5000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/blocks", async (req, res) => {
  try {
    console.log("Fetching blocks...");
    const { data: blocks, error } = await supabase.from("blocks").select("*");
    if (error) {
      console.error("Error fetching blocks:", error);
      throw error;
    }
    console.log("Fetched blocks:", blocks);
    res.json(blocks);
  } catch (error) {
    console.error("Error fetching blocks:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/blocks", async (req, res) => {
  try {
    console.log("Saving blocks...");
    const blocks = req.body.blocks;
    console.log("Blocks received from client:", blocks);

    // Validate and generate UUIDs if necessary
    const validatedBlocks = blocks.map((block) => {
      if (!block.id || !validateUUID(block.id)) {
        const newId = uuidv4();
        console.log(
          `Invalid or missing UUID for block: ${JSON.stringify(
            block
          )}. Generated new UUID: ${newId}`
        );
        return { ...block, id: newId };
      }
      return block;
    });

    console.log("Validated blocks:", validatedBlocks);

    // Upsert blocks (insert new or update existing)
    const { data, error } = await supabase
      .from("blocks")
      .upsert(validatedBlocks, { onConflict: ["id"] });

    if (error) {
      console.error("Error upserting blocks:", error);
      throw error;
    }

    console.log("Blocks saved successfully");
    res.status(200).send("Blocks saved");
  } catch (error) {
    console.error("Error saving blocks:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/blocks/:id", async (req, res) => {
  const { id } = req.params;
  try {
    console.log(`Received request to delete block with id: ${id}`);
    const { data, error } = await supabase
      .from("blocks")
      .delete()
      .match({ id });

    if (error) {
      console.error("Error deleting block:", error);
      res.status(500).json({ error: error.message });
    } else {
      console.log("Deleted block:", data);
      res.status(200).json({ message: "Block deleted successfully", data });
    }
  } catch (error) {
    console.error("Server error deleting block:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
