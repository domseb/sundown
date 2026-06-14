import { createClient } from '@supabase/supabase-js';

// Set in .env.local (dev) and in Vercel Project Settings → Environment Variables (production)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// For persistence, set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in .env.local (dev) or Vercel env (production). Restart dev server after changing .env.
const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const BLOCKS_STORAGE_KEY = 'calendar-app-blocks';

function blockToRow(block, { includeNotes = true } = {}) {
  const row = {
    id: block.id,
    title: block.title ?? '',
    color: block.color ?? 'var(--crimson-4)',
    columns: block.columns,
    rows: block.rows ?? [1, 2],
    widthType: block.widthType ?? 'fill',
    startTime: block.startTime ?? '09:00',
    endTime: block.endTime ?? '10:00',
  };

  if (includeNotes) {
    row.notes = block.notes ?? '';
  }

  return row;
}

export function loadBlocksFromStorage() {
  try {
    const raw = localStorage.getItem(BLOCKS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.error('Error loading blocks from localStorage:', error);
    return null;
  }
}

export function saveBlocksToStorage(blocks) {
  try {
    localStorage.setItem(BLOCKS_STORAGE_KEY, JSON.stringify(blocks));
  } catch (error) {
    console.error('Error saving blocks to localStorage:', error);
  }
}

const OPTIONAL_BLOCK_COLUMNS = ['notes', 'startTime', 'endTime', 'widthType'];

function stripOptionalBlockColumns(rows, columnsToStrip) {
  const strip = new Set(columnsToStrip);
  return rows.map((row) => {
    const next = { ...row };
    for (const key of strip) {
      delete next[key];
    }
    return next;
  });
}

function missingBlockColumn(error) {
  if (error?.code !== 'PGRST204' || typeof error.message !== 'string') {
    return null;
  }
  const match = error.message.match(/Could not find the '([^']+)' column/);
  return match?.[1] ?? null;
}

async function upsertBlockRows(rows) {
  let payload = rows;
  const strippedColumns = new Set();

  for (let attempt = 0; attempt <= OPTIONAL_BLOCK_COLUMNS.length; attempt += 1) {
    const { error } = await supabase
      .from('blocks')
      .upsert(payload, { onConflict: 'id' });

    if (!error) {
      if (strippedColumns.size > 0) {
        console.warn(
          `Saved blocks without Supabase columns: ${[...strippedColumns].join(', ')}. Run the SQL in SUPABASE.md to add them.`
        );
      }
      return;
    }

    const missingColumn = missingBlockColumn(error);
    if (!missingColumn || strippedColumns.has(missingColumn)) {
      throw error;
    }

    strippedColumns.add(missingColumn);
    payload = stripOptionalBlockColumns(payload, strippedColumns);
  }
}

async function deleteRemovedBlocks(blocks) {
  const keepIds = new Set(blocks.map((block) => block.id));

  if (keepIds.size === 0) {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
    return;
  }

  const { data: existing, error: fetchError } = await supabase
    .from('blocks')
    .select('id');

  if (fetchError) throw fetchError;

  const idsToDelete = (existing || [])
    .map((row) => row.id)
    .filter((id) => !keepIds.has(id));

  if (idsToDelete.length === 0) return;

  const { error: deleteError } = await supabase
    .from('blocks')
    .delete()
    .in('id', idsToDelete);

  if (deleteError) throw deleteError;
}

export const fetchBlocks = async () => {
  const localBlocks = loadBlocksFromStorage();

  if (!supabase) {
    return localBlocks || [];
  }

  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (data?.length > 0) {
      const merged = data.map((block) => {
        const local = localBlocks?.find((item) => item.id === block.id);
        if (local?.notes && !block.notes) {
          return { ...block, notes: local.notes };
        }
        return block;
      });
      saveBlocksToStorage(merged);
      return merged;
    }

    if (localBlocks?.length > 0) {
      saveBlocks(localBlocks).catch((restoreError) => {
        console.error('Error restoring blocks to Supabase:', restoreError);
      });
      return localBlocks;
    }

    return [];
  } catch (error) {
    console.error('Error fetching blocks:', error);
    return localBlocks || [];
  }
};

export const saveBlocks = async (blocks) => {
  saveBlocksToStorage(blocks);

  if (!supabase) {
    return { success: true, localOnly: true };
  }

  try {
    if (blocks.length > 0) {
      await upsertBlockRows(blocks.map((block) => blockToRow(block)));
    }

    await deleteRemovedBlocks(blocks);
    return { success: true };
  } catch (error) {
    console.error('Error saving blocks:', error);
    return { success: true, localOnly: true };
  }
};

export const deleteBlock = async (id) => {
  if (!supabase) {
    return Promise.reject(new Error('Supabase is not configured'));
  }
  try {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting block:', error);
    throw error;
  }
};

const SWIMLANES_STORAGE_KEY = 'calendar-app-swimlanes';

export function loadSwimlanesFromStorage() {
  try {
    const raw = localStorage.getItem(SWIMLANES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch (error) {
    console.error('Error loading swimlanes from localStorage:', error);
    return null;
  }
}

export function saveSwimlanesToStorage(swimlanes) {
  try {
    localStorage.setItem(SWIMLANES_STORAGE_KEY, JSON.stringify(swimlanes));
  } catch (error) {
    console.error('Error saving swimlanes to localStorage:', error);
  }
}

export const fetchSwimlanes = async () => {
  if (!supabase) {
    return loadSwimlanesFromStorage();
  }
  try {
    const { data, error } = await supabase
      .from('swimlanes')
      .select('id, start, end')
      .order('position', { ascending: true });

    if (error) {
      if (error.code === 'PGRST205') {
        return loadSwimlanesFromStorage();
      }
      throw error;
    }

    if (data?.length > 0) {
      saveSwimlanesToStorage(data);
      return data;
    }

    return loadSwimlanesFromStorage();
  } catch (error) {
    console.error('Error fetching swimlanes:', error);
    return loadSwimlanesFromStorage();
  }
};

export const saveSwimlanes = async (swimlanes) => {
  saveSwimlanesToStorage(swimlanes);

  if (!supabase) {
    return { success: true };
  }
  try {
    const { error: deleteError } = await supabase
      .from('swimlanes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      if (deleteError.code === 'PGRST205') {
        return { success: true, localOnly: true };
      }
      throw deleteError;
    }

    if (swimlanes.length > 0) {
      const rows = swimlanes.map((swimlane, index) => ({
        id: swimlane.id,
        start: swimlane.start,
        end: swimlane.end,
        position: index,
      }));

      const { error: insertError } = await supabase
        .from('swimlanes')
        .insert(rows);

      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error) {
    if (error.code === 'PGRST205') {
      return { success: true, localOnly: true };
    }
    console.error('Error saving swimlanes:', error);
    throw error;
  }
};
