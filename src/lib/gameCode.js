import { supabase } from './supabase';

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateJoinCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

/**
 * Generate a join code that isn't already in use by an existing game.
 * Falls back to a plain random code after a few attempts so a transient
 * lookup failure can never hang game creation.
 */
export async function generateUniqueJoinCode(attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    const code = generateJoinCode();
    const { data } = await supabase
      .from('games')
      .select('id')
      .eq('join_code', code)
      .maybeSingle();
    if (!data) return code;
  }
  return generateJoinCode();
}
