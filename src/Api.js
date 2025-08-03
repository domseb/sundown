import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://gwxvhmayyrbovijtrwpa.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3eHZobWF5eXJib3ZpanRyd3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMTg3ODQsImV4cCI6MjA2OTc5NDc4NH0.m1zKMltW9ZQmpuINM0g_vgUp4IWbYKWhq9SPl_Wd0RY';

const supabase = createClient(supabaseUrl, supabaseKey);

export const fetchBlocks = async () => {
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
  try {
    // First, delete all existing blocks
    const { error: deleteError } = await supabase
      .from('blocks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteError) throw deleteError;

    // Then insert all new blocks
    if (blocks.length > 0) {
      const { error: insertError } = await supabase
        .from('blocks')
        .insert(blocks);

      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving blocks:', error);
    throw error;
  }
};

export const deleteBlock = async (id) => {
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
