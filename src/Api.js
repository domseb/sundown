import { createClient } from '@supabase/supabase-js';

// Set in .env.local (dev) and in Vercel Project Settings → Environment Variables (production)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing Supabase config. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in .env.local or in Vercel Environment Variables.'
  );
}

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const fetchBlocks = async () => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching blocks:', error);
    throw error;
  }
};

export const saveBlocks = async (blocks) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  try {
    // First, delete all existing blocks
    const { error: deleteError } = await supabase
      .from('blocks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteError) throw deleteError;

    // Then insert all new blocks (only fields the table expects)
    if (blocks.length > 0) {
      const rows = blocks.map((b) => ({
        id: b.id,
        title: b.title ?? '',
        color: b.color ?? 'var(--crimson-4)',
        columns: Array.isArray(b.columns) ? b.columns : [1, 2],
        widthType: b.widthType ?? 'fill',
        startTime: b.startTime ?? '09:00',
        endTime: b.endTime ?? '10:00',
      }));
      const { error: insertError } = await supabase
        .from('blocks')
        .insert(rows);

      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving blocks:', error);
    throw error;
  }
};

export const deleteBlock = async (id) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
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
