import { supabase } from './supabaseCore';

// ---------------------------------------------------------------------------
// Entity proxy – maps base44 entity SDK calls to Supabase table operations
// ---------------------------------------------------------------------------
function createEntityProxy(entityName) {
  // Convert PascalCase entity names to snake_case table names
  const tableName = entityName
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');

  return {
    async list(sort, limit) {
      let query = supabase.from(tableName).select('*');
      if (sort) {
        const desc = sort.startsWith('-');
        const col = desc ? sort.slice(1) : sort;
        query = query.order(col, { ascending: !desc });
      }
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async filter(filters, sort, limit) {
      let query = supabase.from(tableName).select('*');
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }
      if (sort) {
        const desc = sort.startsWith('-');
        const col = desc ? sort.slice(1) : sort;
        query = query.order(col, { ascending: !desc });
      }
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async create(record) {
      const { data, error } = await supabase
        .from(tableName)
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async bulkCreate(records) {
      const { data, error } = await supabase
        .from(tableName)
        .insert(records)
        .select();
      if (error) throw error;
      return data || [];
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },

    subscribe(callback) {
      const channel = supabase
        .channel(`${tableName}-changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
          const typeMap = { INSERT: 'create', UPDATE: 'update', DELETE: 'delete' };
          callback({
            type: typeMap[payload.eventType] || payload.eventType,
            id: payload.new?.id || payload.old?.id,
            data: payload.new || payload.old,
          });
        })
        .subscribe();

      return () => supabase.removeChannel(channel);
    },

    async schema() {
      // Return empty schema – pages that need it will gracefully degrade
      return { type: 'object', properties: {} };
    },
  };
}

const entitiesHandler = {
  get(_target, entityName) {
    return createEntityProxy(entityName);
  },
};

const entities = new Proxy({}, entitiesHandler);

// ---------------------------------------------------------------------------
// Auth shim – wraps Supabase auth to match base44 SDK interface
// ---------------------------------------------------------------------------
const auth = {
  async me() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Try to load extended profile from a profiles table
    let profile = {};
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) profile = data;
    } catch (_) { /* profiles table may not exist yet */ }

    return {
      id: user.id,
      email: user.email,
      full_name: profile.full_name || user.user_metadata?.full_name || '',
      role: profile.role || 'user',
      ...profile,
      // Ensure core fields aren't overridden by profile
      email: user.email,
      id: user.id,
    };
  },

  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  async updateMe(data) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...data }, { onConflict: 'id' });
    if (error) throw error;
  },

  logout(redirectUrl) {
    supabase.auth.signOut().then(() => {
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        window.location.reload();
      }
    });
  },

  redirectToLogin(nextUrl) {
    const loginPath = nextUrl ? `/login?next=${encodeURIComponent(nextUrl)}` : '/login';
    window.location.href = loginPath;
  },
};

// ---------------------------------------------------------------------------
// Functions shim – calls backend functions via Supabase Edge Functions
// ---------------------------------------------------------------------------
const functions = {
  async invoke(functionName, params) {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: params,
    });
    if (error) throw error;
    // Mimic axios-like response shape that the app expects
    return { data, status: 200 };
  },
};

// ---------------------------------------------------------------------------
// Integrations stub
// ---------------------------------------------------------------------------
const integrations = new Proxy({}, {
  get(_target, packageName) {
    return new Proxy({}, {
      get(_t, methodName) {
        return async (params) => {
          console.warn(`[base44 shim] integrations.${packageName}.${methodName} called – not yet wired to Supabase`);
          return {};
        };
      },
    });
  },
});

// ---------------------------------------------------------------------------
// Analytics stub
// ---------------------------------------------------------------------------
const analytics = {
  track({ eventName, properties }) {
    console.log(`[analytics] ${eventName}`, properties);
  },
};

// ---------------------------------------------------------------------------
// Users stub
// ---------------------------------------------------------------------------
const users = {
  async inviteUser(email, role) {
    console.warn(`[base44 shim] users.inviteUser(${email}, ${role}) – not yet wired to Supabase`);
  },
};

// ---------------------------------------------------------------------------
// Connectors stub
// ---------------------------------------------------------------------------
const connectors = {
  async connectAppUser(connectorId) {
    console.warn(`[base44 shim] connectors.connectAppUser – not yet wired`);
    return '';
  },
  async disconnectAppUser(connectorId) {
    console.warn(`[base44 shim] connectors.disconnectAppUser – not yet wired`);
  },
};

// ---------------------------------------------------------------------------
// Export the unified base44 object
// ---------------------------------------------------------------------------
export const base44 = {
  entities,
  auth,
  functions,
  integrations,
  analytics,
  users,
  connectors,
};