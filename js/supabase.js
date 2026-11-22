import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://rhezfmxutnmdnpkrqtxl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MLPCoXOA3s0Ib4ouXc-NCQ_UMtKyyEF';

const isConfigured =
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('SUA_SUPABASE_URL') &&
  Boolean(SUPABASE_ANON_KEY) &&
  SUPABASE_ANON_KEY !== 'SUA_SUPABASE_ANON_KEY';

export const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const CloudSync = {
  user: null,

  isAvailable() {
    return Boolean(supabase);
  },

  async init(onAuthChange) {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    this.user = data?.session?.user || null;

    supabase.auth.onAuthStateChange((_event, session) => {
      this.user = session?.user || null;
      if (onAuthChange) onAuthChange(this.user);
    });

    return this.user;
  },

  async signUp(email, password) {
    if (!supabase) throw new Error('Supabase não configurado em js/supabase.js.');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    if (!supabase) throw new Error('Supabase não configurado em js/supabase.js.');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.user = data.user;
    return data;
  },

  async signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    this.user = null;
  },

  async pushSave(stateObj) {
    if (!supabase || !this.user || !stateObj?.created) return null;

    const payload = {
      user_id: this.user.id,
      character_name: stateObj.name || 'Iniciado',
      faction: stateObj.faction || 'vampire',
      level: Number(stateObj.level) || 1,
      max_abyss_floor: Number(stateObj.abyss?.maxFloor) || 1,
      prestige_count: Number(stateObj.prestige?.count) || 0,
      save_data: stateObj
    };

    const { data, error } = await supabase
      .from('player_saves')
      .upsert(payload, { onConflict: 'user_id' })
      .select('updated_at')
      .single();

    if (error) throw error;
    return data?.updated_at || new Date().toISOString();
  },

  async pullSave() {
    if (!supabase || !this.user) return null;

    const { data, error } = await supabase
      .from('player_saves')
      .select('save_data, updated_at')
      .eq('user_id', this.user.id)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }
};