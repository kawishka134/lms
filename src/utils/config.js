import { supabase } from '../lib/supabase';

/**
 * Fetches a site configuration value by key
 * @param {string} key - The config key to fetch
 * @returns {Promise<any>} - The parsed value
 */
export const getConfig = async (key) => {
  try {
    const { data, error } = await supabase
      .from('site_configs')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      console.error(`Error fetching config ${key}:`, error);
      return null;
    }

    return data.value;
  } catch (err) {
    console.error(`Unexpected error fetching config ${key}:`, err);
    return null;
  }
};

/**
 * Checks if SMS is enabled globally
 * @returns {Promise<boolean>}
 */
export const isSmsEnabled = async () => {
  const enabled = await getConfig('sms_enabled');
  return enabled === true || enabled === 'true';
};
