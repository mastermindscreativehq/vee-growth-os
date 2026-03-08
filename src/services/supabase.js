// ╔══════════════════════════════════════════════════════════════════╗
// ║  VEE URBAN VOGUE GROWTH OS — SUPABASE SERVICE LAYER            ║
// ║  Drop-in replacement for in-memory store persistence            ║
// ║                                                                 ║
// ║  Project: vee-growth-os                                         ║
// ║  Project ID: iiufbcxbmgnmzxehnrcg                               ║
// ║  URL: https://iiufbcxbmgnmzxehnrcg.supabase.co                 ║
// ║  Region: eu-west-1                                              ║
// ╚══════════════════════════════════════════════════════════════════╝
//
// INSTALLATION:
//   npm install @supabase/supabase-js
//
// ENVIRONMENT VARIABLES (add to .env):
//   VITE_SUPABASE_URL=https://iiufbcxbmgnmzxehnrcg.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpdWZiY3hibWdubXp4ZWhucmNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3Mjg0NDcsImV4cCI6MjA4ODMwNDQ0N30.KW4O4zJYv0LY_j4pB8XAAZFzVVW596H8rO0QsXx8wwA
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { createClient } from "@supabase/supabase-js";

// ── Supabase Client Initialization ──────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  AUTH SERVICE
//  Simple email/password auth for Vera
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const AuthService = {
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CLIENTS SERVICE (Pipeline CRM)
//  Table: public.clients
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ClientsDB = {
  async getAll() {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async add(client) {
    const { data, error } = await supabase
      .from("clients")
      .insert({
        name: client.name,
        source: client.source || "Instagram",
        stage: client.stage || "lead",
        note: client.note || "",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStage(id, stage) {
    const { data, error } = await supabase
      .from("clients")
      .update({ stage, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw error;
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GROWTH MEMORY SERVICE
//  Table: public.growth_memory
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const GrowthMemoryDB = {
  async getAll() {
    const { data, error } = await supabase
      .from("growth_memory")
      .select("*")
      .order("impact_score", { ascending: false });
    if (error) throw error;
    return data;
  },

  async add(memory) {
    const { data, error } = await supabase
      .from("growth_memory")
      .insert({
        category: memory.category,
        insight: memory.insight,
        impact_score: memory.impact_score,
        notes: memory.notes || "",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from("growth_memory")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from("growth_memory").delete().eq("id", id);
    if (error) throw error;
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TIMELINE SERVICE
//  Table: public.timeline_events
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const TimelineDB = {
  async getAll() {
    const { data, error } = await supabase
      .from("timeline_events")
      .select("*")
      .order("date", { ascending: false });
    if (error) throw error;
    return data;
  },

  async add(event) {
    const { data, error } = await supabase
      .from("timeline_events")
      .insert({
        type: event.type,
        title: event.title,
        description: event.description || "",
        date: event.date || new Date().toISOString().split("T")[0],
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from("timeline_events").delete().eq("id", id);
    if (error) throw error;
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  OPPORTUNITIES SERVICE (Lead Intelligence)
//  Table: public.opportunities
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const OpportunitiesDB = {
  async getAll() {
    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .order("intent_score", { ascending: false });
    if (error) throw error;
    return data;
  },

  async add(opp) {
    const { data, error } = await supabase
      .from("opportunities")
      .insert({
        username: opp.username,
        event: opp.event || "Birthday",
        intent_score: opp.intentScore || opp.intent_score || 5,
        location: opp.location || "Abuja",
        source: opp.source || "Instagram",
        notes: opp.notes || "",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) throw error;
  },

  // Convert opportunity to pipeline client
  async convertToClient(id) {
    const { data: opp, error: fetchErr } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchErr) throw fetchErr;

    // Create client from opportunity
    const client = await ClientsDB.add({
      name: opp.username,
      source: opp.source || "Instagram",
      stage: "lead",
      note: `${opp.event} — Intent: ${opp.intent_score}/10`,
    });

    // Remove opportunity
    await supabase.from("opportunities").delete().eq("id", id);

    return client;
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  EVENTS RADAR SERVICE
//  Table: public.events
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const EventsDB = {
  async getAll() {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async add(event) {
    const { data, error } = await supabase
      .from("events")
      .insert({
        type: event.type,
        name: event.name,
        date: event.date || "",
        location: event.location || "Abuja",
        estimated_guests: event.estimatedGuests || "",
        notes: event.notes || "",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) throw error;
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ORDERS SERVICE (Revenue Tracking)
//  Table: public.orders
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const OrdersDB = {
  async getCurrentMonth() {
    const month = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("month", month);
    if (error) throw error;
    // Convert array to { tier: count } map
    const orders = {};
    for (const row of data) {
      orders[row.tier] = row.count;
    }
    return orders;
  },

  async upsert(tier, count) {
    const month = new Date().toISOString().slice(0, 7);
    const { data, error } = await supabase
      .from("orders")
      .upsert(
        { tier, count, month, updated_at: new Date().toISOString() },
        { onConflict: "user_id,tier,month" }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  AI CACHE SERVICE (Decisions, Briefings, Weekly Focus)
//  Table: public.ai_cache
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const AICacheDB = {
  async get(type, day = "") {
    const { data, error } = await supabase
      .from("ai_cache")
      .select("*")
      .eq("type", type)
      .eq("day", day)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
    return data?.data || null;
  },

  async set(type, data, day = "") {
    const { error } = await supabase
      .from("ai_cache")
      .insert({ type, data, day });
    if (error) throw error;
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CONTENT CALENDAR SERVICE
//  Table: public.content_calendar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ContentCalendarDB = {
  async getCurrent() {
    const { data, error } = await supabase
      .from("content_calendar")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data?.calendar || null;
  },

  async save(calendar) {
    const { data, error } = await supabase
      .from("content_calendar")
      .insert({ calendar })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  COMPLETED TASKS SERVICE
//  Table: public.completed_tasks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const TasksDB = {
  async getCompleted() {
    const { data, error } = await supabase
      .from("completed_tasks")
      .select("task_key");
    if (error) throw error;
    // Convert to { taskKey: true } map for store compatibility
    const map = {};
    for (const row of data) {
      map[row.task_key] = true;
    }
    return map;
  },

  async toggle(taskKey) {
    // Check if exists
    const { data: existing } = await supabase
      .from("completed_tasks")
      .select("id")
      .eq("task_key", taskKey)
      .single();

    if (existing) {
      // Remove (un-complete)
      await supabase.from("completed_tasks").delete().eq("task_key", taskKey);
      return false;
    } else {
      // Add (complete)
      await supabase.from("completed_tasks").insert({ task_key: taskKey });
      return true;
    }
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GROWTH METRICS SERVICE
//  Table: public.growth_metrics
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const MetricsDB = {
  async getToday() {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("growth_metrics")
      .select("*")
      .eq("date", today)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data || { tasks_today: 0, leads_today: 0, orders_today: 0, content_today: 0 };
  },

  async upsert(metrics) {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("growth_metrics")
      .upsert(
        {
          date: today,
          tasks_today: metrics.tasksToday ?? metrics.tasks_today ?? 0,
          leads_today: metrics.leadsToday ?? metrics.leads_today ?? 0,
          orders_today: metrics.ordersToday ?? metrics.orders_today ?? 0,
          content_today: metrics.contentToday ?? metrics.content_today ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date" }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HYDRATION — Load all data from Supabase into the store on app start
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function hydrateStore(dispatch) {
  try {
    const [
      clients,
      growthMemory,
      timeline,
      opportunities,
      events,
      orders,
      completedTasks,
      growthMetrics,
      contentCalendar,
      todayDecision,
      briefing,
      weeklyFocus,
    ] = await Promise.all([
      ClientsDB.getAll(),
      GrowthMemoryDB.getAll(),
      TimelineDB.getAll(),
      OpportunitiesDB.getAll(),
      EventsDB.getAll(),
      OrdersDB.getCurrentMonth(),
      TasksDB.getCompleted(),
      MetricsDB.getToday(),
      ContentCalendarDB.getCurrent(),
      AICacheDB.get("decision", new Date().toLocaleDateString("en-US", { weekday: "long" })),
      AICacheDB.get("briefing", new Date().toLocaleDateString("en-US", { weekday: "long" })),
      AICacheDB.get("weekly_focus"),
    ]);

    dispatch({
      type: "HYDRATE",
      payload: {
        clients,
        growthMemory,
        timeline,
        opportunities,
        events,
        orders,
        completedTasks,
        growthMetrics: {
          tasksToday: growthMetrics.tasks_today || 0,
          leadsToday: growthMetrics.leads_today || 0,
          ordersToday: growthMetrics.orders_today || 0,
          contentToday: growthMetrics.content_today || 0,
        },
        contentCalendar,
        todayDecision: todayDecision,
        aiBriefing: briefing,
        weeklyFocus: weeklyFocus,
      },
    });

    console.log("[GrowthOS] Store hydrated from Supabase");
  } catch (err) {
    console.error("[GrowthOS] Hydration error:", err);
  }
}
