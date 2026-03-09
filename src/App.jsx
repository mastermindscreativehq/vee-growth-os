import { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from "react";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";

// ╔══════════════════════════════════════════════════════════════════╗
// ║  VEE URBAN VOGUE — AI GROWTH OPERATING SYSTEM v4.0             ║
// ║  Live Production Build · Supabase Connected                     ║
// ║  Modular Architecture · Zustand-pattern Store · Service Layer   ║
// ╚══════════════════════════════════════════════════════════════════╝

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SUPABASE CLIENT + DATABASE SERVICES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const AuthService = {
  signUp: (email, password) => supabase.auth.signUp({ email, password }).then(({ data, error }) => { if (error) throw error; return data; }),
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }).then(({ data, error }) => { if (error) throw error; return data; }),
  signOut: () => supabase.auth.signOut(),
  getUser: () => supabase.auth.getUser().then(({ data }) => data.user),
  onAuthStateChange: (cb) => supabase.auth.onAuthStateChange(cb),
};

const ClientsDB = {
  getAll: async () => { const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; },
  add: async (c) => { const { data, error } = await supabase.from("clients").insert({ name: c.name, source: c.source || "Instagram", stage: c.stage || "lead", note: c.note || "" }).select().single(); if (error) throw error; return data; },
  updateStage: async (id, stage) => { const { error } = await supabase.from("clients").update({ stage, updated_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
  remove: async (id) => { await supabase.from("clients").delete().eq("id", id); },
};

const GrowthMemoryDB = {
  getAll: async () => { const { data, error } = await supabase.from("growth_memory").select("*").order("impact_score", { ascending: false }); if (error) throw error; return data; },
  add: async (m) => { const { data, error } = await supabase.from("growth_memory").insert({ category: m.category, insight: m.insight, impact_score: m.impact_score, notes: m.notes || "" }).select().single(); if (error) throw error; return data; },
  update: async (id, u) => { await supabase.from("growth_memory").update(u).eq("id", id); },
  remove: async (id) => { await supabase.from("growth_memory").delete().eq("id", id); },
};

const TimelineDB = {
  getAll: async () => { const { data, error } = await supabase.from("timeline_events").select("*").order("date", { ascending: false }); if (error) throw error; return data; },
  add: async (e) => { const { data, error } = await supabase.from("timeline_events").insert({ type: e.type, title: e.title, description: e.description || "", date: e.date || new Date().toISOString().split("T")[0] }).select().single(); if (error) throw error; return data; },
  remove: async (id) => { await supabase.from("timeline_events").delete().eq("id", id); },
};

const OpportunitiesDB = {
  getAll: async () => { const { data, error } = await supabase.from("opportunities").select("*").order("intent_score", { ascending: false }); if (error) throw error; return data; },
  add: async (o) => { const { data, error } = await supabase.from("opportunities").insert({ username: o.username, event: o.event || "Birthday", intent_score: o.intentScore || o.intent_score || 5, location: o.location || "Abuja", source: o.source || "Instagram", notes: o.notes || "" }).select().single(); if (error) throw error; return data; },
  remove: async (id) => { await supabase.from("opportunities").delete().eq("id", id); },
  convertToClient: async (id) => {
    const { data: opp } = await supabase.from("opportunities").select("*").eq("id", id).single();
    if (opp) { await ClientsDB.add({ name: opp.username, source: opp.source, stage: "lead", note: `${opp.event} — Intent: ${opp.intent_score}/10` }); }
    await supabase.from("opportunities").delete().eq("id", id);
  },
};

const EventsDB = {
  getAll: async () => { const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; },
  add: async (e) => { const { data, error } = await supabase.from("events").insert({ type: e.type, name: e.name, date: e.date || "", location: e.location || "Abuja", estimated_guests: e.estimatedGuests || "", notes: e.notes || "" }).select().single(); if (error) throw error; return data; },
  remove: async (id) => { await supabase.from("events").delete().eq("id", id); },
};

const OrdersDB = {
  getCurrentMonth: async () => {
    const month = new Date().toISOString().slice(0, 7);
    const { data } = await supabase.from("orders").select("*").eq("month", month);
    const orders = {}; for (const r of (data || [])) orders[r.tier] = r.count;
    return orders;
  },
  upsert: async (tier, count) => {
    const month = new Date().toISOString().slice(0, 7);
    await supabase.from("orders").upsert({ tier, count, month, updated_at: new Date().toISOString() }, { onConflict: "user_id,tier,month" });
  },
};

const AICacheDB = {
  get: async (type, day = "") => {
    const { data } = await supabase.from("ai_cache").select("data").eq("type", type).eq("day", day).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return data?.data || null;
  },
  set: async (type, payload, day = "") => { await supabase.from("ai_cache").insert({ type, data: payload, day }); },
};

const ContentCalendarDB = {
  getCurrent: async () => { const { data } = await supabase.from("content_calendar").select("calendar").order("created_at", { ascending: false }).limit(1).maybeSingle(); return data?.calendar || null; },
  save: async (cal) => { await supabase.from("content_calendar").insert({ calendar: cal }); },
};

const TasksDB = {
  getCompleted: async () => {
    const { data } = await supabase.from("completed_tasks").select("task_key");
    const map = {}; for (const r of (data || [])) map[r.task_key] = true;
    return map;
  },
  toggle: async (key) => {
    const { data: existing } = await supabase.from("completed_tasks").select("id").eq("task_key", key).maybeSingle();
    if (existing) { await supabase.from("completed_tasks").delete().eq("task_key", key); return false; }
    else { await supabase.from("completed_tasks").insert({ task_key: key }); return true; }
  },
};

const MetricsDB = {
  getToday: async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("growth_metrics").select("*").eq("date", today).maybeSingle();
    return data || { tasks_today: 0, leads_today: 0, orders_today: 0, content_today: 0 };
  },
  upsert: async (m) => {
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("growth_metrics").upsert({ date: today, tasks_today: m.tasksToday ?? 0, leads_today: m.leadsToday ?? 0, orders_today: m.ordersToday ?? 0, content_today: m.contentToday ?? 0, updated_at: new Date().toISOString() }, { onConflict: "user_id,date" });
  },
};

async function hydrateStore(dispatch) {
  try {
    const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const [clients, growthMemory, timeline, opportunities, events, orders, completedTasks, gm, contentCalendar, todayDecision, aiBriefing, weeklyFocus] = await Promise.all([
      ClientsDB.getAll(), GrowthMemoryDB.getAll(), TimelineDB.getAll(), OpportunitiesDB.getAll(),
      EventsDB.getAll(), OrdersDB.getCurrentMonth(), TasksDB.getCompleted(), MetricsDB.getToday(),
      ContentCalendarDB.getCurrent(), AICacheDB.get("decision", dayName), AICacheDB.get("briefing", dayName), AICacheDB.get("weekly_focus"),
    ]);
    dispatch({ type: "HYDRATE", payload: {
      clients, growthMemory, timeline, opportunities, events, orders, completedTasks,
      growthMetrics: { tasksToday: gm.tasks_today || 0, leadsToday: gm.leads_today || 0, ordersToday: gm.orders_today || 0, contentToday: gm.content_today || 0 },
      contentCalendar, todayDecision, aiBriefing, weeklyFocus,
    }});
    console.log("[GrowthOS] Hydrated from Supabase");
  } catch (err) { console.error("[GrowthOS] Hydration error:", err); }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LAYER 0 — DESIGN TOKENS & THEME SYSTEM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const T = {
  bg:        "#06060B",
  surface:   "#0C0C14",
  surfaceAlt:"#10101A",
  border:    "#ffffff07",
  borderLit: "#ffffff12",
  text:      "#D8D8E0",
  textDim:   "#6B6B80",
  textMute:  "#3A3A4A",
  white:     "#F5F5F8",
  accent:    "#D4A574",   // warm gold
  accentAlt: "#B8967A",
  rose:      "#C4868C",
  lavender:  "#A898C8",
  mint:      "#7CC4A8",
  sky:       "#88AAC8",
  amber:     "#D4AA58",
  coral:     "#D48874",
  slate:     "#8898A8",
  success:   "#58C488",
  danger:    "#C45858",
  font: {
    display: "'Cormorant', serif",
    body:    "'Sora', sans-serif",
  },
  radius:    { sm: 8, md: 12, lg: 16, xl: 20 },
  shadow:    "0 2px 20px rgba(0,0,0,0.4)",
};

const FONTS_URL = "https://fonts.googleapis.com/css2?family=Cormorant:wght@300;400;500;600;700&family=Sora:wght@300;400;500;600;700;800&display=swap";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LAYER 1 — GLOBAL STORE (Zustand pattern via useContext + reducer)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const INITIAL_STATE = {
  // Navigation
  activeTab: "command",
  currentDay: new Date().toLocaleDateString("en-US", { weekday: "long" }),

  // Tasks
  completedTasks: {},
  taskStreak: 0,

  // Pipeline
  clients: [],

  // Leads / Opportunities
  opportunities: [],

  // Events Radar
  events: [],

  // Revenue
  orders: {},

  // Growth Score
  growthMetrics: { tasksToday: 0, leadsToday: 0, ordersToday: 0, contentToday: 0 },

  // AI states
  aiBriefing: null,
  aiLoading: {},

  // Content Calendar
  contentCalendar: null,

  // Weekly Report
  weeklyReport: null,

  // v3.5 — Growth Memory
  growthMemory: [],

  // v3.5 — Decision Engine
  todayDecision: null,

  // v3.5 — Strategy
  weeklyFocus: null,

  // v4.0 — Growth Timeline
  timeline: [],
};

function storeReducer(state, action) {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, activeTab: action.payload };
    case "SET_DAY":
      return { ...state, currentDay: action.payload };
    case "TOGGLE_TASK": {
      const key = action.payload;
      const updated = { ...state.completedTasks, [key]: !state.completedTasks[key] };
      const streak = Object.values(updated).filter(Boolean).length;
      return { ...state, completedTasks: updated, taskStreak: streak };
    }
    case "ADD_CLIENT":
      return { ...state, clients: [...state.clients, { ...action.payload, id: Date.now(), createdAt: new Date().toISOString() }] };
    case "MOVE_CLIENT":
      return { ...state, clients: state.clients.map(c => c.id === action.payload.id ? { ...c, stage: action.payload.stage } : c) };
    case "REMOVE_CLIENT":
      return { ...state, clients: state.clients.filter(c => c.id !== action.payload) };
    case "ADD_OPPORTUNITY":
      return { ...state, opportunities: [...state.opportunities, { ...action.payload, id: Date.now() }] };
    case "REMOVE_OPPORTUNITY":
      return { ...state, opportunities: state.opportunities.filter(o => o.id !== action.payload) };
    case "CONVERT_OPPORTUNITY": {
      const opp = state.opportunities.find(o => o.id === action.payload);
      if (!opp) return state;
      return {
        ...state,
        opportunities: state.opportunities.filter(o => o.id !== action.payload),
        clients: [...state.clients, { id: Date.now(), name: opp.username, source: opp.source || "Instagram", stage: "lead", note: `${opp.event} — Intent: ${opp.intentScore}/10`, createdAt: new Date().toISOString() }],
      };
    }
    case "ADD_EVENT":
      return { ...state, events: [...state.events, { ...action.payload, id: Date.now() }] };
    case "REMOVE_EVENT":
      return { ...state, events: state.events.filter(e => e.id !== action.payload) };
    case "SET_ORDERS":
      return { ...state, orders: { ...state.orders, ...action.payload } };
    case "SET_GROWTH_METRIC":
      return { ...state, growthMetrics: { ...state.growthMetrics, ...action.payload } };
    case "SET_AI_BRIEFING":
      return { ...state, aiBriefing: action.payload };
    case "SET_AI_LOADING":
      return { ...state, aiLoading: { ...state.aiLoading, ...action.payload } };
    case "SET_CONTENT_CALENDAR":
      return { ...state, contentCalendar: action.payload };
    case "SET_WEEKLY_REPORT":
      return { ...state, weeklyReport: action.payload };
    // v3.5 — Growth Memory
    case "ADD_MEMORY":
      return { ...state, growthMemory: [{ ...action.payload, id: Date.now(), date: new Date().toISOString().split("T")[0] }, ...state.growthMemory] };
    case "REMOVE_MEMORY":
      return { ...state, growthMemory: state.growthMemory.filter(m => m.id !== action.payload) };
    case "UPDATE_MEMORY":
      return { ...state, growthMemory: state.growthMemory.map(m => m.id === action.payload.id ? { ...m, ...action.payload.updates } : m) };
    // v3.5 — Decision Engine
    case "SET_TODAY_DECISION":
      return { ...state, todayDecision: action.payload };
    // v3.5 — Strategy
    case "SET_WEEKLY_FOCUS":
      return { ...state, weeklyFocus: action.payload };
    // v4.0 — Growth Timeline
    case "ADD_TIMELINE_EVENT":
      return { ...state, timeline: [{ ...action.payload, id: Date.now(), date: action.payload.date || new Date().toISOString().split("T")[0] }, ...state.timeline] };
    case "REMOVE_TIMELINE_EVENT":
      return { ...state, timeline: state.timeline.filter(e => e.id !== action.payload) };
    case "HYDRATE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

const StoreContext = createContext(null);

function StoreProvider({ children }) {
  const [state, dispatch] = React.useReducer(storeReducer, INITIAL_STATE);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Auth listener — hydrate store when user signs in
  useEffect(() => {
    AuthService.getUser().then(u => {
      setUser(u);
      if (u) hydrateStore(dispatch).finally(() => setAuthLoading(false));
      else setAuthLoading(false);
    });
    const { data: { subscription } } = AuthService.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) hydrateStore(dispatch);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Actions: optimistic local dispatch + background Supabase persist
  const actions = useMemo(() => ({
    setTab: (tab) => dispatch({ type: "SET_TAB", payload: tab }),
    setDay: (day) => dispatch({ type: "SET_DAY", payload: day }),
    toggleTask: (key) => { dispatch({ type: "TOGGLE_TASK", payload: key }); TasksDB.toggle(key).catch(console.error); },
    addClient: (client) => { dispatch({ type: "ADD_CLIENT", payload: client }); ClientsDB.add(client).catch(console.error); },
    moveClient: (id, stage) => { dispatch({ type: "MOVE_CLIENT", payload: { id, stage } }); ClientsDB.updateStage(id, stage).catch(console.error); },
    removeClient: (id) => { dispatch({ type: "REMOVE_CLIENT", payload: id }); ClientsDB.remove(id).catch(console.error); },
    addOpportunity: (opp) => { dispatch({ type: "ADD_OPPORTUNITY", payload: opp }); OpportunitiesDB.add(opp).catch(console.error); },
    removeOpportunity: (id) => { dispatch({ type: "REMOVE_OPPORTUNITY", payload: id }); OpportunitiesDB.remove(id).catch(console.error); },
    convertOpportunity: (id) => { dispatch({ type: "CONVERT_OPPORTUNITY", payload: id }); OpportunitiesDB.convertToClient(id).catch(console.error); },
    addEvent: (evt) => { dispatch({ type: "ADD_EVENT", payload: evt }); EventsDB.add(evt).catch(console.error); },
    removeEvent: (id) => { dispatch({ type: "REMOVE_EVENT", payload: id }); EventsDB.remove(id).catch(console.error); },
    setOrders: (orders) => { dispatch({ type: "SET_ORDERS", payload: orders }); for (const [tier, count] of Object.entries(orders)) OrdersDB.upsert(tier, count).catch(console.error); },
    setGrowthMetric: (m) => { dispatch({ type: "SET_GROWTH_METRIC", payload: m }); const merged = { ...stateRef.current.growthMetrics, ...m }; MetricsDB.upsert(merged).catch(console.error); },
    setAiBriefing: (b) => { dispatch({ type: "SET_AI_BRIEFING", payload: b }); AICacheDB.set("briefing", b, new Date().toLocaleDateString("en-US", { weekday: "long" })).catch(console.error); },
    setAiLoading: (l) => dispatch({ type: "SET_AI_LOADING", payload: l }),
    setContentCalendar: (c) => { dispatch({ type: "SET_CONTENT_CALENDAR", payload: c }); ContentCalendarDB.save(c).catch(console.error); },
    setWeeklyReport: (r) => { dispatch({ type: "SET_WEEKLY_REPORT", payload: r }); AICacheDB.set("weekly_report", r).catch(console.error); },
    addMemory: (m) => { dispatch({ type: "ADD_MEMORY", payload: m }); GrowthMemoryDB.add(m).catch(console.error); },
    removeMemory: (id) => { dispatch({ type: "REMOVE_MEMORY", payload: id }); GrowthMemoryDB.remove(id).catch(console.error); },
    updateMemory: (id, updates) => { dispatch({ type: "UPDATE_MEMORY", payload: { id, updates } }); GrowthMemoryDB.update(id, updates).catch(console.error); },
    setTodayDecision: (d) => { dispatch({ type: "SET_TODAY_DECISION", payload: d }); AICacheDB.set("decision", d, new Date().toLocaleDateString("en-US", { weekday: "long" })).catch(console.error); },
    setWeeklyFocus: (f) => { dispatch({ type: "SET_WEEKLY_FOCUS", payload: f }); AICacheDB.set("weekly_focus", f).catch(console.error); },
    addTimelineEvent: (e) => { dispatch({ type: "ADD_TIMELINE_EVENT", payload: e }); TimelineDB.add(e).catch(console.error); },
    removeTimelineEvent: (id) => { dispatch({ type: "REMOVE_TIMELINE_EVENT", payload: id }); TimelineDB.remove(id).catch(console.error); },
    // Auth
    signIn: AuthService.signIn,
    signUp: AuthService.signUp,
    signOut: () => AuthService.signOut().then(() => setUser(null)),
  }), []);

  return (
    <StoreContext.Provider value={{ state, dispatch, actions, user, authLoading }}>
      {children}
    </StoreContext.Provider>
  );
}

function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// (React already imported at top)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LAYER 2 — SERVICE LAYER (API abstraction)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const AIService = {
  async call(prompt, fallback = null) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = (data.content || []).map(i => i.text || "").join("");
      return JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      return fallback;
    }
  },

  async generateBriefing(day, theme) {
    return this.call(
      `You are a fashion business growth coach for "Vee Urban Vogue" — a female bespoke & ready-to-wear fashion brand in Abuja, Nigeria run by Vera Chioma. Today is ${day}, theme: "${theme}". Generate a personalized briefing as ONLY JSON (no markdown): {"greeting":"warm 1-line greeting","focus":"ONE priority in 1 sentence","tip":"specific Nigerian fashion market tip","affirmation":"powerful 1-line affirmation","marketInsight":"one data-driven insight about Nigerian fashion market"}`,
      { greeting: `Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, Vera! Time to build your empire.`, focus: `Today is all about ${theme.toLowerCase()} — every action compounds.`, tip: "Abuja brides spend ₦150K-₦500K on bespoke outfits. Target them with dedicated bridal content.", affirmation: "Your hands create what others can only dream of wearing.", marketInsight: "Nigerian fashion e-commerce grew 35% last year. Digital-first brands are winning." }
    );
  },

  async generateConversationReply(customerMessage) {
    return this.call(
      `You are a customer service AI for "Vee Urban Vogue" — a female bespoke fashion brand in Abuja, Nigeria. A customer sent this WhatsApp message: "${customerMessage}". Generate a professional, warm reply as ONLY JSON: {"reply":"the WhatsApp reply text","tone":"detected tone of customer","intent":"what the customer wants","suggestedAction":"what Vera should do next"}`,
      { reply: "Thank you for reaching out! I'd love to help you find the perfect piece. Could you tell me more about the occasion and your style preferences?", tone: "neutral", intent: "general enquiry", suggestedAction: "Ask about occasion, timeline, and budget" }
    );
  },

  async generateWeeklyReport(metrics) {
    return this.call(
      `You are a business analyst for "Vee Urban Vogue" fashion brand in Abuja. Generate a weekly growth report as ONLY JSON based on these metrics: ${JSON.stringify(metrics)}. Format: {"summary":"2-sentence executive summary","wins":["win1","win2","win3"],"improvements":["area1","area2"],"nextWeekFocus":"one key priority","revenueInsight":"revenue analysis","growthTip":"one specific growth recommendation"}`,
      { summary: "Solid week of foundation building. Focus next week on converting existing leads to orders.", wins: ["Consistent daily task completion", "New leads added to pipeline", "Content posted regularly"], improvements: ["Follow up with older leads", "Increase DM outreach volume"], nextWeekFocus: "Convert 3 pipeline leads into paid orders", revenueInsight: "Pipeline value growing — focus on deposit collection", growthTip: "Send a broadcast offer to all leads who haven't ordered in 30 days" }
    );
  },

  async generateContentCalendar() {
    return this.call(
      `You are a content strategist for "Vee Urban Vogue" fashion brand in Abuja, Nigeria. Generate a 7-day content calendar as ONLY JSON: {"week":[{"day":"Monday","type":"Reel","topic":"specific topic","hook":"scroll-stopping first line","hashtags":"#tag1 #tag2 #tag3 #tag4 #tag5","time":"best post time","platform":"IG/TikTok/Both"}]}. Make all 7 days. Topics must be specific to Nigerian bespoke fashion, Ankara, lace, Owambe, Aso-Ebi culture.`,
      { week: [
        { day:"Monday", type:"Reel", topic:"Ankara fabric to finished gown transformation", hook:"48 hours. One fabric. Pure magic ✨", hashtags:"#AnkaraFashion #AbujaDesigner #BespokeNigeria #FashionTransformation #VeeUrbanVogue", time:"9:00 AM", platform:"Both" },
        { day:"Tuesday", type:"Carousel", topic:"5 lace styles every Abuja woman needs", hook:"Slide 3 is the one everyone's been asking for...", hashtags:"#LaceStyles #NigerianFashion #AsoEbi #AbujaBrides #FashionGuide", time:"12:00 PM", platform:"IG" },
        { day:"Wednesday", type:"Reel", topic:"How to pick fabric for your skin tone", hook:"Your tailor probably never told you this...", hashtags:"#StyleTips #FashionEducation #AbujaFashion #BespokeStyle #FabricGuide", time:"11:00 AM", platform:"Both" },
        { day:"Thursday", type:"Static", topic:"Limited bespoke slots announcement", hook:"Only 5 slots left this month 🚨", hashtags:"#BespokeAbuja #CustomDesign #LimitedSlots #NigerianDesigner #BookNow", time:"1:00 PM", platform:"IG" },
        { day:"Friday", type:"Carousel", topic:"Client of the week transformation", hook:"She came with a vision. She left a queen 👑", hashtags:"#ClientFeature #FashionGlow #AbujaStyle #HappyClient #Transformation", time:"10:00 AM", platform:"IG" },
        { day:"Saturday", type:"Reel", topic:"Studio tour and design process", hook:"Come inside the studio where dreams become outfits...", hashtags:"#StudioLife #BehindTheScenes #FashionBTS #AbujaDesigner #SaturdayVibes", time:"9:00 AM", platform:"Both" },
        { day:"Sunday", type:"Static", topic:"New week collection teaser", hook:"Next week's drop is going to break the internet ✨", hashtags:"#ComingSoon #NewCollection #SundayInspo #FashionTeaser #VeeUrbanVogue", time:"5:00 PM", platform:"IG" },
      ]}
    );
  },

  // ── v3.5 — Decision Engine Service ──
  async generateDecision(businessData) {
    return this.call(
      `You are a fashion business strategist for "Vee Urban Vogue" — a female bespoke & ready-to-wear fashion brand in Abuja, Nigeria.

Here is the current business data:
${JSON.stringify(businessData, null, 2)}

Analyze all signals and determine the ONE highest-impact action the owner should take today.

Respond as ONLY JSON (no markdown):
{
  "action": "one specific, actionable sentence describing what to do",
  "reason": "why this is the highest-impact move right now based on the data",
  "expected_impact": "what result this action is likely to produce",
  "urgency": "high" | "medium" | "low",
  "category": "content" | "sales" | "leads" | "retention" | "branding"
}`,
      {
        action: "Send a WhatsApp broadcast with a limited-time offer to your warm leads list",
        reason: "You have active leads in your pipeline who haven't converted yet. A time-sensitive offer creates urgency.",
        expected_impact: "2-3 new bookings within 48 hours from existing warm leads",
        urgency: "high",
        category: "sales",
      }
    );
  },

  // ── v3.5 — Weekly Focus Strategy ──
  async generateWeeklyFocus(businessData, growthMemory) {
    const topMemories = (growthMemory || []).slice(0, 5).map(m => `[${m.category}] ${m.insight} (impact: ${m.impact_score}/10)`).join("\n");
    return this.call(
      `You are a strategic advisor for "Vee Urban Vogue" — a female bespoke fashion brand in Abuja, Nigeria.

Business snapshot:
${JSON.stringify(businessData, null, 2)}

Growth Memory (past learnings):
${topMemories || "No historical data yet."}

Generate a weekly strategic focus as ONLY JSON (no markdown):
{
  "weeklyTheme": "one clear theme for the week in 3-5 words",
  "whyNow": "1-2 sentences on why this matters this week specifically",
  "keyActions": ["action1", "action2", "action3"],
  "metricToWatch": "the one number to track this week",
  "avoidThis": "one common mistake to avoid this week"
}`,
      {
        weeklyTheme: "Bridal Season Push",
        whyNow: "Wedding season demand is rising in Abuja. Brides plan 4-8 weeks ahead — this week's outreach becomes next month's revenue.",
        keyActions: ["Post 2 bridal-focused reels this week", "DM 10 recent engagement announcements on Instagram", "Create a bridal package highlight with clear pricing"],
        metricToWatch: "Number of bridal enquiries received",
        avoidThis: "Don't spread content across too many niches — stay focused on bridal this week for maximum impact",
      }
    );
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LAYER 2B — ANALYTICS SERVICE (calculations & scoring)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const AnalyticsService = {
  REVENUE_TIERS: [
    { key: "rtw", label: "Ready-to-Wear", avg: 25000, emoji: "👗" },
    { key: "bespoke", label: "Bespoke Standard", avg: 55000, emoji: "✂️" },
    { key: "premium", label: "Bespoke Premium", avg: 120000, emoji: "💎" },
    { key: "bridal", label: "Bridal", avg: 250000, emoji: "👰" },
    { key: "bridesmaid", label: "Bridesmaid Set", avg: 200000, emoji: "💐" },
  ],

  calculateRevenue(orders) {
    return this.REVENUE_TIERS.reduce((sum, tier) => sum + (orders[tier.key] || 0) * tier.avg, 0);
  },

  forecastRevenue(leads, conversionRate = 0.15, avgOrderValue = 65000) {
    return Math.round(leads * conversionRate * avgOrderValue);
  },

  calculateGrowthScore(metrics) {
    const weights = { tasksToday: 25, leadsToday: 30, ordersToday: 30, contentToday: 15 };
    const maxes = { tasksToday: 6, leadsToday: 5, ordersToday: 3, contentToday: 3 };
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      const val = Math.min(metrics[key] || 0, maxes[key]);
      score += (val / maxes[key]) * weight;
    }
    return Math.round(score);
  },

  getPipelineStats(clients) {
    const stages = {};
    for (const c of clients) {
      stages[c.stage] = (stages[c.stage] || 0) + 1;
    }
    return stages;
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LAYER 2C — GROWTH MEMORY SERVICE (v3.5)
//  /services/growthMemoryService.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GrowthMemoryService = {
  CATEGORIES: [
    { id: "content", label: "Content", icon: "📸", color: T.accent },
    { id: "sales", label: "Sales", icon: "💰", color: T.success },
    { id: "offer", label: "Offer", icon: "🎁", color: T.amber },
    { id: "client", label: "Client", icon: "👤", color: T.lavender },
  ],

  getTopInsights(memories, limit = 3) {
    return [...memories].sort((a, b) => b.impact_score - a.impact_score).slice(0, limit);
  },

  getByCategory(memories, category) {
    return memories.filter(m => m.category === category);
  },

  getRecentInsights(memories, days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return memories.filter(m => new Date(m.date) >= cutoff);
  },

  getAverageImpact(memories) {
    if (!memories.length) return 0;
    return Math.round(memories.reduce((sum, m) => sum + m.impact_score, 0) / memories.length * 10) / 10;
  },

  getCategoryBreakdown(memories) {
    const breakdown = {};
    for (const cat of this.CATEGORIES) {
      const catMems = memories.filter(m => m.category === cat.id);
      breakdown[cat.id] = {
        count: catMems.length,
        avgImpact: this.getAverageImpact(catMems),
        topInsight: catMems.sort((a, b) => b.impact_score - a.impact_score)[0] || null,
      };
    }
    return breakdown;
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LAYER 2D — DECISION SERVICE (v3.5)
//  /services/decisionService.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DecisionService = {
  collectBusinessSignals(state) {
    const pipelineStats = AnalyticsService.getPipelineStats(state.clients);
    const revenue = AnalyticsService.calculateRevenue(state.orders);
    const topMemories = GrowthMemoryService.getTopInsights(state.growthMemory, 3);
    const forecast = AnalyticsService.forecastRevenue(
      state.clients.filter(c => ["lead", "convo", "quoted"].includes(c.stage)).length + state.opportunities.length
    );

    return {
      pipeline: {
        totalClients: state.clients.length,
        stages: pipelineStats,
        newLeadsThisSession: state.clients.filter(c => c.stage === "lead").length,
        inConversation: pipelineStats.convo || 0,
        quoted: pipelineStats.quoted || 0,
        deposited: pipelineStats.deposit || 0,
      },
      revenue: {
        currentMonth: revenue,
        forecast: forecast,
      },
      opportunities: {
        total: state.opportunities.length,
        hotLeads: state.opportunities.filter(o => o.intentScore >= 8).length,
      },
      events: {
        tracked: state.events.length,
        types: state.events.map(e => e.type),
      },
      growthMemory: {
        totalInsights: state.growthMemory.length,
        topPatterns: topMemories.map(m => `[${m.category}] ${m.insight}`),
        avgImpact: GrowthMemoryService.getAverageImpact(state.growthMemory),
      },
      content: {
        hasCalendar: !!state.contentCalendar,
      },
      growthScore: AnalyticsService.calculateGrowthScore(state.growthMetrics),
      tasksCompleted: state.taskStreak,
    };
  },

  async getDecision(state) {
    const signals = this.collectBusinessSignals(state);
    return AIService.generateDecision(signals);
  },

  async getWeeklyFocus(state) {
    const signals = this.collectBusinessSignals(state);
    return AIService.generateWeeklyFocus(signals, state.growthMemory);
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LAYER 3 — DATA (Playbooks, Pipeline Stages, Event Types)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const PIPELINE_STAGES = [
  { id: "lead", label: "New Lead", color: T.lavender, icon: "👀" },
  { id: "convo", label: "In Conversation", color: T.accent, icon: "💬" },
  { id: "quoted", label: "Quoted", color: T.amber, icon: "📐" },
  { id: "deposit", label: "Deposit Paid", color: T.mint, icon: "💳" },
  { id: "production", label: "In Production", color: T.sky, icon: "🧵" },
  { id: "delivered", label: "Delivered", color: T.success, icon: "✅" },
];

const EVENT_TYPES = [
  { id: "wedding", label: "Wedding", icon: "💒", color: T.rose, avgSpend: "₦200K-₦500K" },
  { id: "birthday", label: "Birthday", icon: "🎂", color: T.amber, avgSpend: "₦30K-₦80K" },
  { id: "asoebi", label: "Aso-Ebi", icon: "👗", color: T.lavender, avgSpend: "₦25K-₦60K" },
  { id: "bridal_shower", label: "Bridal Shower", icon: "🥂", color: T.coral, avgSpend: "₦40K-₦100K" },
  { id: "owambe", label: "Owambe Party", icon: "🎉", color: T.mint, avgSpend: "₦35K-₦120K" },
  { id: "corporate", label: "Corporate Event", icon: "💼", color: T.sky, avgSpend: "₦50K-₦150K" },
];

const PLAYBOOKS = {
  Monday: {
    theme: "Content & Visibility", icon: "📸", color: T.accent, mantra: "Be seen before you sell.",
    tasks: [
      { time: "8:00 AM", action: "Post a 'Behind the Scenes' reel of your design process", type: "content", impact: "high", why: "BTS content gets 3x more saves. People buy the process, not just the product." },
      { time: "9:30 AM", action: "Create a client transformation carousel — fabric to finished outfit", type: "content", impact: "high", why: "Transformation posts are the #1 converting format in bespoke fashion." },
      { time: "11:00 AM", action: "Comment meaningfully on 15 posts from Abuja fashion influencers", type: "engagement", impact: "medium", why: "Strategic commenting puts you on their radar and feeds." },
      { time: "1:00 PM", action: "Run an IG Stories poll: 'Which fabric for a dinner date?'", type: "engagement", impact: "medium", why: "Polls boost Story reach 40% and reveal customer preferences." },
      { time: "3:00 PM", action: "DM 5 poll respondents with personalized style recommendations", type: "outreach", impact: "high", why: "Warm DMs from engagement convert 6x better than cold ones." },
      { time: "5:00 PM", action: "Pin your best-performing reel to your profile grid", type: "optimization", impact: "low", why: "Your grid is your storefront. Pin winners to keep converting." },
    ],
  },
  Tuesday: {
    theme: "Lead Generation & DMs", icon: "🎯", color: T.rose, mantra: "Every conversation is a potential order.",
    tasks: [
      { time: "8:00 AM", action: "Post a 'Style Quiz' in Stories — 'Pick A, B, or C' outfits", type: "lead-gen", impact: "high", why: "Quizzes generate 2x more DMs than regular stories." },
      { time: "9:30 AM", action: "DM each quiz respondent with personalized design suggestions", type: "outreach", impact: "high", why: "Strike while engagement is hot." },
      { time: "11:00 AM", action: "Search #AbujaBrides #AbujaFashion — comment on 20 fresh posts", type: "prospecting", impact: "medium", why: "Hashtag prospecting finds people actively looking." },
      { time: "1:00 PM", action: "Update 'Book a Consultation' highlight with pricing tiers", type: "conversion", impact: "high", why: "Clear pricing reduces friction for buyers." },
      { time: "3:00 PM", action: "Follow up with last week's enquiries — offer a styling bonus", type: "follow-up", impact: "high", why: "80% of sales happen after the 5th follow-up." },
      { time: "5:00 PM", action: "Post a client testimonial with their tagged approval", type: "social-proof", impact: "medium", why: "Fresh social proof accelerates trust." },
    ],
  },
  Wednesday: {
    theme: "Skills & Industry Intel", icon: "🧠", color: T.lavender, mantra: "The brand that learns fastest wins.",
    tasks: [
      { time: "8:00 AM", action: "Watch one YouTube tutorial on a trending fashion technique", type: "skill", impact: "high", why: "One new technique/week = 52 new skills/year." },
      { time: "9:30 AM", action: "Audit one competitor's top 3 posts — decode format, hook, CTA", type: "research", impact: "medium", why: "Understanding what works saves months of trial." },
      { time: "11:00 AM", action: "Post educational reel: 'How to pick fabric for your body type'", type: "authority", impact: "high", why: "Educational content positions you as the expert." },
      { time: "1:00 PM", action: "Engage in a fashion community — share one valuable tip", type: "networking", impact: "medium", why: "Community visibility = referral opportunities." },
      { time: "3:00 PM", action: "Research trending Ankara, Lace, and Adire patterns", type: "trend", impact: "medium", why: "First to offer trending patterns = pricing power." },
      { time: "5:00 PM", action: "Save 10 design inspirations for next week's moodboard", type: "planning", impact: "low", why: "Pre-loaded inspiration eliminates creative blocks." },
    ],
  },
  Thursday: {
    theme: "Offers & Conversions", icon: "💰", color: T.mint, mantra: "Today we close. No hesitation.",
    tasks: [
      { time: "8:00 AM", action: "Create time-limited offer: 'Book by Sunday for free consultation'", type: "offer", impact: "high", why: "Urgency drives deposits. Deadlines beat open invitations." },
      { time: "9:30 AM", action: "Post offer as 3-slide Stories with countdown sticker", type: "urgency", impact: "high", why: "Countdown stickers send reminders — free marketing." },
      { time: "11:00 AM", action: "Send offer via WhatsApp Broadcast to warm leads", type: "broadcast", impact: "high", why: "WhatsApp broadcasts feel personal. 3-5x higher conversion." },
      { time: "1:00 PM", action: "Share 'Process to Product' reel — sketch to final piece", type: "trust", impact: "medium", why: "De-risks purchase by showing craftsmanship." },
      { time: "3:00 PM", action: "DM 10 people who saved/shared recent posts — invite to book", type: "conversion", impact: "high", why: "Saves signal buying intent — they need a nudge." },
      { time: "5:00 PM", action: "Update WhatsApp Status with offer + client photo", type: "visibility", impact: "medium", why: "Your entire contact list sees WhatsApp Status." },
    ],
  },
  Friday: {
    theme: "Community & Social Proof", icon: "✨", color: T.amber, mantra: "Let your clients sell for you.",
    tasks: [
      { time: "8:00 AM", action: "Feature a client wearing your design — celebrate their style", type: "social-proof", impact: "high", why: "Client features get 4x more engagement than product posts." },
      { time: "9:30 AM", action: "Go Live on Instagram — show studio, take style questions", type: "connection", impact: "high", why: "15 min of authenticity > 15 polished posts." },
      { time: "11:00 AM", action: "Post 'Client of the Week' — tag them publicly", type: "community", impact: "medium", why: "Celebrated clients share the post to their network." },
      { time: "1:00 PM", action: "Send review request to 3 recent clients", type: "reviews", impact: "high", why: "Google + IG reviews compound trust over time." },
      { time: "3:00 PM", action: "Reply to every comment from past 2 days with personality", type: "engagement", impact: "medium", why: "Thoughtful replies boost algorithm ranking." },
      { time: "5:00 PM", action: "Post 'Weekend Outfit Inspo' carousel with styling variations", type: "inspiration", impact: "medium", why: "Weekend content gets high save rates." },
    ],
  },
  Saturday: {
    theme: "Revenue Review & Batch", icon: "📊", color: T.sky, mantra: "What gets measured gets multiplied.",
    tasks: [
      { time: "9:00 AM", action: "Review IG Insights — note top 3 posts by reach and saves", type: "analytics", impact: "high", why: "Data reveals what your audience wants." },
      { time: "10:00 AM", action: "Count pipeline: new leads → conversations → orders", type: "tracking", impact: "high", why: "These 3 numbers reveal where your funnel leaks." },
      { time: "11:00 AM", action: "Calculate weekly revenue — compare to target", type: "finance", impact: "high", why: "Know your number. Celebrate wins. Adjust plan." },
      { time: "12:00 PM", action: "Plan next week's content: 2 reels, 3 carousels, daily stories", type: "planning", impact: "high", why: "Content calendar eliminates 'what to post' anxiety." },
      { time: "2:00 PM", action: "Batch-shoot 5-8 content pieces for the week", type: "batch", impact: "high", why: "One focused session > scattered daily shooting." },
      { time: "4:00 PM", action: "Send thank-you messages to every client who ordered this week", type: "retention", impact: "medium", why: "Post-purchase care creates repeat buyers." },
    ],
  },
  Sunday: {
    theme: "Rest & Vision", icon: "🌿", color: T.slate, mantra: "A rested mind designs masterpieces.",
    tasks: [
      { time: "10:00 AM", action: "Browse global fashion for inspiration — save 10 pieces", type: "inspiration", impact: "low", why: "Global exposure keeps your designs unique locally." },
      { time: "12:00 PM", action: "Sketch 3 new design ideas — don't overthink, just flow", type: "creative", impact: "medium", why: "Consistent ideation means fresh collections ready." },
      { time: "3:00 PM", action: "Post one 'soft life' Story — workspace, mood, coffee", type: "personal-brand", impact: "low", why: "People connect with Vera, not just the business." },
      { time: "5:00 PM", action: "Write 3 goals for next week: content, sales, growth", type: "mindset", impact: "high", why: "Written goals are 42% more likely to be achieved." },
    ],
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LAYER 4 — UI PRIMITIVES (components/ui/)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const Glow = ({ color, size = 300, x = "50%", y = "50%" }) => (
  <div style={{
    position: "absolute", left: x, top: y, width: size, height: size,
    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
    opacity: 0.06, borderRadius: "50%", pointerEvents: "none", filter: "blur(60px)",
    transform: "translate(-50%, -50%)",
  }} />
);

const Card = ({ children, style, glow, onClick, hover = false }) => (
  <div onClick={onClick} style={{
    background: T.surface, borderRadius: T.radius.lg, padding: 18,
    border: `1px solid ${T.border}`, position: "relative", overflow: "hidden",
    transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: onClick ? "pointer" : "default", ...style,
  }}>
    {glow && <Glow color={glow} size={180} x="85%" y="15%" />}
    <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
  </div>
);

const Badge = ({ children, color = T.accent, filled }) => (
  <span style={{
    display: "inline-block", padding: "2px 8px", borderRadius: 5,
    background: filled ? color : `${color}18`, color: filled ? T.bg : color,
    fontSize: 9, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase",
    border: `1px solid ${color}20`,
  }}>{children}</span>
);

const Label = ({ children, color = T.textMute }) => (
  <div style={{ fontSize: 9, letterSpacing: 4, color, textTransform: "uppercase", fontWeight: 800, fontFamily: T.font.body }}>
    {children}
  </div>
);

const Heading = ({ children, size = 22 }) => (
  <div style={{ fontFamily: T.font.display, fontSize: size, fontWeight: 400, color: T.white, letterSpacing: -0.3 }}>
    {children}
  </div>
);

const ImpactDot = ({ level }) => {
  const c = { high: T.success, medium: T.amber, low: T.slate };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c[level], boxShadow: `0 0 6px ${c[level]}40` }} />
      <span style={{ fontSize: 8, color: c[level], fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>{level}</span>
    </span>
  );
};

const ProgressBar = ({ value, max = 100, color = T.accent, height = 4 }) => (
  <div style={{ height, borderRadius: height / 2, background: T.surfaceAlt, overflow: "hidden" }}>
    <div style={{
      width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", borderRadius: height / 2,
      background: `linear-gradient(90deg, ${color}, ${color}AA)`,
      transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
    }} />
  </div>
);

const ScoreRing = ({ score, size = 56, color = T.accent }) => {
  const r = (size - 6) / 2, circ = 2 * Math.PI * r, off = circ - (score / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.surfaceAlt} strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 800, color: T.white, fontFamily: T.font.body,
      }}>{score}</div>
    </div>
  );
};

const InputField = ({ value, onChange, placeholder, style: s }) => (
  <input value={value} onChange={onChange} placeholder={placeholder} style={{
    padding: "10px 12px", borderRadius: T.radius.sm, border: `1px solid ${T.borderLit}`,
    background: T.bg, color: T.text, fontSize: 12, fontFamily: T.font.body,
    outline: "none", width: "100%", ...s,
  }} />
);

const Select = ({ value, onChange, options }) => (
  <select value={value} onChange={onChange} style={{
    padding: "10px 12px", borderRadius: T.radius.sm, border: `1px solid ${T.borderLit}`,
    background: T.bg, color: T.text, fontSize: 12, fontFamily: T.font.body,
    appearance: "none", width: "100%",
  }}>
    {options.map(o => <option key={o.value || o} value={o.value || o} style={{ background: T.bg }}>{o.label || o}</option>)}
  </select>
);

const Btn = ({ children, onClick, color = T.accent, variant = "filled", disabled, small, style: s }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: small ? "5px 10px" : "8px 16px", borderRadius: T.radius.sm,
    border: variant === "ghost" ? `1px solid ${color}30` : "none",
    background: variant === "ghost" ? `${color}10` : disabled ? T.textMute : color,
    color: variant === "ghost" ? color : T.bg, fontSize: small ? 10 : 11,
    fontWeight: 800, cursor: disabled ? "default" : "pointer",
    fontFamily: T.font.body, transition: "all 0.3s", letterSpacing: 0.3,
    opacity: disabled ? 0.5 : 1, ...s,
  }}>{children}</button>
);

const StatCard = ({ icon, label, value, color = T.accent }) => (
  <div style={{
    background: T.surface, borderRadius: T.radius.md, padding: "14px 12px",
    border: `1px solid ${T.border}`, flex: 1, minWidth: 100,
  }}>
    <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
    <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: T.font.body }}>{value}</div>
    <div style={{ fontSize: 9, color: T.textMute, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, marginTop: 2 }}>{label}</div>
  </div>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LAYER 5 — FEATURE MODULES (features/)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 5A: COMMAND CENTER (Dashboard) ──────────────────────────────

function CommandCenter() {
  const { state, actions } = useStore();
  const { currentDay, completedTasks, aiBriefing, aiLoading, growthMetrics, clients, opportunities } = state;
  const pb = PLAYBOOKS[currentDay];
  const tasks = pb?.tasks || [];
  const doneCount = Object.keys(completedTasks).filter(k => k.startsWith(currentDay) && completedTasks[k]).length;
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const growthScore = AnalyticsService.calculateGrowthScore(growthMetrics);
  const [expandedTask, setExpandedTask] = useState(null);

  const handleBriefing = async () => {
    actions.setAiLoading({ briefing: true });
    const result = await AIService.generateBriefing(currentDay, pb.theme);
    actions.setAiBriefing(result);
    actions.setAiLoading({ briefing: false });
  };

  return (
    <div style={{ animation: "slideUp .5s ease" }}>
      {/* Stats Row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", scrollbarWidth: "none" }}>
        <StatCard icon="🎯" label="Growth" value={growthScore + "%"} color={growthScore >= 70 ? T.success : growthScore >= 40 ? T.amber : T.rose} />
        <StatCard icon="🔥" label="Streak" value={state.taskStreak} color={T.accent} />
        <StatCard icon="👥" label="Pipeline" value={clients.length} color={T.lavender} />
        <StatCard icon="💡" label="Opps" value={opportunities.length} color={T.mint} />
      </div>

      {/* Day Selector */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, overflowX: "auto", scrollbarWidth: "none" }}>
        {DAYS.map((d, i) => (
          <button key={d} onClick={() => { actions.setDay(d); actions.setAiBriefing(null); setExpandedTask(null); }} style={{
            width: 38, height: 38, borderRadius: T.radius.sm, border: "none", cursor: "pointer",
            background: currentDay === d ? PLAYBOOKS[d].color : T.surface,
            color: currentDay === d ? T.bg : T.textMute, fontSize: 10, fontWeight: 800,
            fontFamily: T.font.body, transition: "all 0.3s", flexShrink: 0,
            outline: i === new Date().getDay() && currentDay !== d ? `1px solid ${PLAYBOOKS[d].color}40` : "none",
          }}>{d.slice(0, 2)}</button>
        ))}
      </div>

      {/* AI Briefing */}
      <Card style={{ marginBottom: 10, border: `1px solid ${T.lavender}15` }} glow={T.lavender}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Label color={T.lavender}>🤖 AI Daily Briefing</Label>
          <Btn onClick={handleBriefing} disabled={aiLoading.briefing} color={T.lavender} variant="ghost" small>
            {aiLoading.briefing ? "..." : aiBriefing ? "↻" : "Generate"}
          </Btn>
        </div>
        {aiBriefing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{aiBriefing.greeting}</div>
            <div style={{ padding: "8px 10px", borderRadius: T.radius.sm, background: `${T.lavender}08`, border: `1px solid ${T.lavender}10` }}>
              <Label color={T.lavender}>Focus</Label>
              <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.6, marginTop: 4 }}>{aiBriefing.focus}</div>
            </div>
            <div style={{ padding: "8px 10px", borderRadius: T.radius.sm, background: `${T.mint}08`, border: `1px solid ${T.mint}10` }}>
              <Label color={T.mint}>Market Tip</Label>
              <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.6, marginTop: 4 }}>{aiBriefing.tip}</div>
            </div>
            {aiBriefing.marketInsight && (
              <div style={{ padding: "8px 10px", borderRadius: T.radius.sm, background: `${T.sky}08`, border: `1px solid ${T.sky}10` }}>
                <Label color={T.sky}>Insight</Label>
                <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.6, marginTop: 4 }}>{aiBriefing.marketInsight}</div>
              </div>
            )}
            <div style={{ fontSize: 12, color: T.accent, fontStyle: "italic", textAlign: "center", padding: "6px 0" }}>
              ✨ {aiBriefing.affirmation}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: T.textMute, textAlign: "center", padding: "10px 0" }}>
            Tap Generate for today's personalized AI briefing
          </div>
        )}
      </Card>

      {/* Theme */}
      <Card style={{ marginBottom: 10, border: `1px solid ${pb.color}10` }} glow={pb.color}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>{pb.icon}</span>
          <div>
            <Heading size={20}>{pb.theme}</Heading>
            <div style={{ fontSize: 11, color: pb.color, fontStyle: "italic", marginTop: 2 }}>"{pb.mantra}"</div>
          </div>
        </div>
        <ProgressBar value={progress} color={pb.color} />
        <div style={{ fontSize: 10, color: T.textMute, marginTop: 6, textAlign: "right" }}>{doneCount}/{tasks.length} completed</div>
      </Card>

      {/* Tasks */}
      <Label>Action Steps</Label>
      <div style={{ marginTop: 8 }}>
        {tasks.map((t, i) => {
          const k = `${currentDay}-${i}`;
          const isDone = completedTasks[k];
          const isOpen = expandedTask === k;
          return (
            <div key={i} style={{ marginBottom: 4, borderRadius: T.radius.md, overflow: "hidden", border: `1px solid ${isDone ? pb.color + "18" : T.border}`, transition: "all 0.3s" }}>
              <div onClick={() => actions.toggleTask(k)} style={{
                display: "flex", gap: 10, padding: "12px 10px", background: isDone ? `${pb.color}05` : T.surface,
                cursor: "pointer", opacity: isDone ? 0.5 : 1, transition: "all 0.3s",
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                  border: `2px solid ${isDone ? pb.color : T.textMute}`, background: isDone ? pb.color : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: T.bg, fontWeight: 900,
                }}>{isDone && "✓"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9, color: pb.color, fontWeight: 800 }}>{t.time}</span>
                    <Badge color={pb.color}>{t.type}</Badge>
                    <ImpactDot level={t.impact} />
                  </div>
                  <div style={{ fontSize: 11, color: isDone ? T.textMute : T.text, lineHeight: 1.6, textDecoration: isDone ? "line-through" : "none" }}>{t.action}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); setExpandedTask(isOpen ? null : k); }} style={{
                  background: "none", border: "none", cursor: "pointer", color: T.textMute,
                  fontSize: 9, fontWeight: 700, fontFamily: T.font.body, padding: "2px 4px", flexShrink: 0,
                }}>{isOpen ? "▲" : "?"}</button>
              </div>
              {isOpen && (
                <div style={{ padding: "0 10px 12px 38px", background: T.surface }}>
                  <div style={{ padding: "8px 10px", borderRadius: T.radius.sm, background: `${pb.color}05`, border: `1px solid ${pb.color}08`, fontSize: 10, color: T.textDim, lineHeight: 1.8, borderLeft: `3px solid ${pb.color}30` }}>
                    💭 {t.why}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 5B: LEAD INTELLIGENCE ENGINE (features/leads/) ──────────────

function OpportunitiesDashboard() {
  const { state, actions } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", event: "Birthday", intentScore: 7, location: "Abuja", source: "Instagram", notes: "" });

  const addOpp = () => {
    if (!form.username.trim()) return;
    actions.addOpportunity(form);
    setForm({ username: "", event: "Birthday", intentScore: 7, location: "Abuja", source: "Instagram", notes: "" });
    setShowForm(false);
  };

  const hotLeads = state.opportunities.filter(o => o.intentScore >= 8);
  const warmLeads = state.opportunities.filter(o => o.intentScore >= 5 && o.intentScore < 8);
  const coldLeads = state.opportunities.filter(o => o.intentScore < 5);

  return (
    <div style={{ animation: "slideUp .5s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <Label color={T.accent}>Lead Intelligence</Label>
          <Heading size={20}>Opportunities</Heading>
          <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>Detect & track potential fashion buyers</div>
        </div>
        <Btn onClick={() => setShowForm(!showForm)} color={T.accent} variant="ghost" small>+ Add</Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 12, border: `1px solid ${T.accent}20` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <InputField value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="@username or name" />
            <div style={{ display: "flex", gap: 6 }}>
              <Select value={form.event} onChange={e => setForm(p => ({ ...p, event: e.target.value }))}
                options={EVENT_TYPES.map(e => ({ value: e.label, label: `${e.icon} ${e.label}` }))} />
              <Select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                options={["Instagram", "WhatsApp", "TikTok", "Referral", "Facebook", "Walk-in"]} />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <InputField value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Location" />
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 120 }}>
                <span style={{ fontSize: 10, color: T.textDim, whiteSpace: "nowrap" }}>Intent:</span>
                <input type="range" min={1} max={10} value={form.intentScore}
                  onChange={e => setForm(p => ({ ...p, intentScore: parseInt(e.target.value) }))}
                  style={{ flex: 1, accentColor: T.accent }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: form.intentScore >= 8 ? T.success : form.intentScore >= 5 ? T.amber : T.rose, minWidth: 18, textAlign: "center" }}>
                  {form.intentScore}
                </span>
              </div>
            </div>
            <InputField value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes (style preference, budget, etc.)" />
            <Btn onClick={addOpp} color={T.accent}>Add Opportunity</Btn>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <StatCard icon="🔥" label="Hot" value={hotLeads.length} color={T.success} />
        <StatCard icon="☀️" label="Warm" value={warmLeads.length} color={T.amber} />
        <StatCard icon="❄️" label="Cold" value={coldLeads.length} color={T.sky} />
      </div>

      {[
        { label: "Hot Leads (8-10)", leads: hotLeads, color: T.success, icon: "🔥" },
        { label: "Warm Leads (5-7)", leads: warmLeads, color: T.amber, icon: "☀️" },
        { label: "Cold Leads (1-4)", leads: coldLeads, color: T.sky, icon: "❄️" },
      ].map(group => group.leads.length > 0 && (
        <div key={group.label} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span>{group.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: group.color }}>{group.label}</span>
            <Badge color={group.color}>{group.leads.length}</Badge>
          </div>
          {group.leads.map(opp => (
            <Card key={opp.id} style={{ padding: 14, marginBottom: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{opp.username}</div>
                  <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                    <Badge color={group.color}>{opp.event}</Badge>
                    <Badge color={T.lavender}>{opp.source}</Badge>
                    <Badge color={T.slate}>{opp.location}</Badge>
                  </div>
                  {opp.notes && <div style={{ fontSize: 10, color: T.textDim, marginTop: 6 }}>{opp.notes}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: `${group.color}15`, border: `2px solid ${group.color}30`,
                    fontSize: 12, fontWeight: 800, color: group.color,
                  }}>{opp.intentScore}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
                <Btn onClick={() => actions.convertOpportunity(opp.id)} color={T.success} variant="ghost" small>→ Pipeline</Btn>
                <Btn onClick={() => actions.removeOpportunity(opp.id)} color={T.danger} variant="ghost" small>✕</Btn>
              </div>
            </Card>
          ))}
        </div>
      ))}

      {state.opportunities.length === 0 && (
        <Card style={{ textAlign: "center", padding: 30 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.textDim }}>No opportunities tracked yet</div>
          <div style={{ fontSize: 11, color: T.textMute, lineHeight: 1.6, marginTop: 4 }}>
            Add potential leads from Instagram DMs, wedding hashtags, or event announcements
          </div>
        </Card>
      )}
    </div>
  );
}

// ── 5C: EVENT RADAR (features/leads/) ───────────────────────────

function EventRadar() {
  const { state, actions } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "wedding", name: "", date: "", location: "Abuja", estimatedGuests: "", notes: "" });

  const addEvent = () => {
    if (!form.name.trim()) return;
    const eventType = EVENT_TYPES.find(e => e.id === form.type);
    actions.addEvent({ ...form, typeData: eventType });
    setForm({ type: "wedding", name: "", date: "", location: "Abuja", estimatedGuests: "", notes: "" });
    setShowForm(false);
  };

  return (
    <div style={{ animation: "slideUp .5s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <Label color={T.coral}>Event Radar</Label>
          <Heading size={20}>Fashion Opportunities</Heading>
          <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>Track events that drive outfit purchases</div>
        </div>
        <Btn onClick={() => setShowForm(!showForm)} color={T.coral} variant="ghost" small>+ Track</Btn>
      </div>

      {/* Event Type Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
        {EVENT_TYPES.map(et => {
          const count = state.events.filter(e => e.type === et.id).length;
          return (
            <div key={et.id} style={{
              padding: "12px 8px", borderRadius: T.radius.md, background: T.surface,
              border: `1px solid ${T.border}`, textAlign: "center",
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{et.icon}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: et.color, letterSpacing: 0.5 }}>{et.label}</div>
              <div style={{ fontSize: 8, color: T.textMute, marginTop: 2 }}>{et.avgSpend}</div>
              {count > 0 && <Badge color={et.color} filled>{count}</Badge>}
            </div>
          );
        })}
      </div>

      {showForm && (
        <Card style={{ marginBottom: 12, border: `1px solid ${T.coral}20` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              options={EVENT_TYPES.map(e => ({ value: e.id, label: `${e.icon} ${e.label}` }))} />
            <InputField value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Event name or client name" />
            <div style={{ display: "flex", gap: 6 }}>
              <InputField value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} placeholder="Date (e.g. March 15)" style={{ flex: 1 }} />
              <InputField value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Location" style={{ flex: 1 }} />
            </div>
            <InputField value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Details — style needs, group orders, etc." />
            <Btn onClick={addEvent} color={T.coral}>Track Event</Btn>
          </div>
        </Card>
      )}

      {/* Event List */}
      {state.events.map(evt => {
        const et = EVENT_TYPES.find(e => e.id === evt.type) || EVENT_TYPES[0];
        return (
          <Card key={evt.id} style={{ padding: 14, marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 10, flex: 1 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: T.radius.md, display: "flex", alignItems: "center", justifyContent: "center",
                  background: `${et.color}12`, border: `1px solid ${et.color}18`, fontSize: 20,
                }}>{et.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{evt.name}</div>
                  <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                    <Badge color={et.color}>{et.label}</Badge>
                    {evt.date && <Badge color={T.slate}>{evt.date}</Badge>}
                    <Badge color={T.lavender}>{evt.location}</Badge>
                  </div>
                  {evt.notes && <div style={{ fontSize: 10, color: T.textDim, marginTop: 6, lineHeight: 1.5 }}>{evt.notes}</div>}
                  <div style={{ fontSize: 9, color: et.color, marginTop: 6, fontWeight: 700 }}>
                    💰 Potential spend: {et.avgSpend}
                  </div>
                </div>
              </div>
              <Btn onClick={() => actions.removeEvent(evt.id)} color={T.danger} variant="ghost" small>✕</Btn>
            </div>
          </Card>
        );
      })}

      {state.events.length === 0 && (
        <Card style={{ textAlign: "center", padding: 30 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📡</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.textDim }}>No events on your radar</div>
          <div style={{ fontSize: 11, color: T.textMute, lineHeight: 1.6, marginTop: 4 }}>
            Track upcoming weddings, birthdays, aso-ebi events — each is a selling opportunity
          </div>
        </Card>
      )}
    </div>
  );
}

// ── 5D: CLIENT PIPELINE (features/leads/) ───────────────────────

function PipelineManager() {
  const { state, actions } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", source: "Instagram", stage: "lead", note: "" });

  const addClient = () => {
    if (!form.name.trim()) return;
    actions.addClient(form);
    setForm({ name: "", source: "Instagram", stage: "lead", note: "" });
    setShowForm(false);
  };

  return (
    <div style={{ animation: "slideUp .5s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <Label color={T.lavender}>CRM Pipeline</Label>
          <Heading size={20}>Client Tracker</Heading>
        </div>
        <Btn onClick={() => setShowForm(!showForm)} color={T.lavender} variant="ghost" small>+ Add</Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 12, border: `1px solid ${T.lavender}20` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <InputField value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Client name" />
            <div style={{ display: "flex", gap: 6 }}>
              <Select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                options={["Instagram", "WhatsApp", "Referral", "Walk-in", "Facebook", "TikTok"]} />
              <Select value={form.stage} onChange={e => setForm(p => ({ ...p, stage: e.target.value }))}
                options={PIPELINE_STAGES.map(s => ({ value: s.id, label: `${s.icon} ${s.label}` }))} />
            </div>
            <InputField value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="Notes" />
            <Btn onClick={addClient} color={T.lavender}>Add Client</Btn>
          </div>
        </Card>
      )}

      {PIPELINE_STAGES.map((stage, si) => {
        const cls = state.clients.filter(c => c.stage === stage.id);
        const next = PIPELINE_STAGES[si + 1];
        return (
          <div key={stage.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>{stage.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: stage.color }}>{stage.label}</span>
              <Badge color={stage.color}>{cls.length}</Badge>
            </div>
            {cls.length === 0 ? (
              <div style={{ padding: 10, borderRadius: T.radius.sm, border: `1px dashed ${T.border}`, textAlign: "center", fontSize: 10, color: T.textMute }}>—</div>
            ) : cls.map(c => (
              <Card key={c.id} style={{ padding: 12, marginBottom: 3 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.white }}>{c.name}</div>
                    <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                      <Badge color={stage.color}>{c.source}</Badge>
                    </div>
                    {c.note && <div style={{ fontSize: 10, color: T.textDim, marginTop: 4 }}>{c.note}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {next && <Btn onClick={() => actions.moveClient(c.id, next.id)} color={next.color} variant="ghost" small>→</Btn>}
                    <Btn onClick={() => actions.removeClient(c.id)} color={T.danger} variant="ghost" small>✕</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── 5E: AI CONVERSATION ASSISTANT (features/ai/) ────────────────

function ConversationAssistant() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const handleGenerate = async () => {
    if (!message.trim()) return;
    setLoading(true);
    const result = await AIService.generateConversationReply(message);
    setReply(result);
    setHistory(prev => [{ customer: message, ...result, timestamp: new Date().toLocaleTimeString() }, ...prev].slice(0, 20));
    setLoading(false);
  };

  const copyReply = () => {
    if (reply?.reply) navigator.clipboard.writeText(reply.reply).catch(() => {});
  };

  return (
    <div style={{ animation: "slideUp .5s ease" }}>
      <Label color={T.mint}>AI Assistant</Label>
      <Heading size={20}>Conversation Copilot</Heading>
      <div style={{ fontSize: 11, color: T.textDim, marginTop: 2, marginBottom: 16 }}>Paste a customer message → Get a professional reply</div>

      <Card style={{ marginBottom: 14, border: `1px solid ${T.mint}15` }}>
        <textarea value={message} onChange={e => setMessage(e.target.value)}
          placeholder="Paste the customer's WhatsApp message here..."
          rows={4} style={{
            width: "100%", padding: "10px", borderRadius: T.radius.sm, border: `1px solid ${T.borderLit}`,
            background: T.bg, color: T.text, fontSize: 12, fontFamily: T.font.body,
            outline: "none", resize: "vertical", lineHeight: 1.6,
          }} />
        <div style={{ marginTop: 8 }}>
          <Btn onClick={handleGenerate} disabled={loading || !message.trim()} color={T.mint}>
            {loading ? "Analyzing..." : "Generate Reply"}
          </Btn>
        </div>
      </Card>

      {reply && (
        <Card style={{ marginBottom: 14, border: `1px solid ${T.mint}18` }} glow={T.mint}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            <Badge color={T.mint}>Tone: {reply.tone}</Badge>
            <Badge color={T.lavender}>Intent: {reply.intent}</Badge>
          </div>
          <div style={{
            padding: "12px", borderRadius: T.radius.sm, background: T.bg,
            border: `1px solid ${T.borderLit}`, fontSize: 12, color: T.text,
            lineHeight: 1.8, whiteSpace: "pre-wrap",
          }}>{reply.reply}</div>
          <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: T.radius.sm, background: `${T.amber}08`, border: `1px solid ${T.amber}10` }}>
            <Label color={T.amber}>Suggested Action</Label>
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 3 }}>{reply.suggestedAction}</div>
          </div>
          <div style={{ marginTop: 10 }}>
            <Btn onClick={copyReply} color={T.mint} variant="ghost" small>📋 Copy Reply</Btn>
          </div>
        </Card>
      )}

      {history.length > 0 && (
        <>
          <Label color={T.textMute}>Recent Conversations</Label>
          <div style={{ marginTop: 8 }}>
            {history.map((h, i) => (
              <Card key={i} style={{ padding: 12, marginBottom: 4 }}>
                <div style={{ fontSize: 10, color: T.textMute, marginBottom: 4 }}>{h.timestamp}</div>
                <div style={{ fontSize: 11, color: T.textDim, marginBottom: 6, fontStyle: "italic" }}>"{h.customer.slice(0, 80)}{h.customer.length > 80 ? "..." : ""}"</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <Badge color={T.mint}>{h.tone}</Badge>
                  <Badge color={T.lavender}>{h.intent}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── 5F: REVENUE & FORECASTING (features/analytics/) ─────────────

function RevenueForecasting() {
  const { state, actions } = useStore();
  const currentRevenue = AnalyticsService.calculateRevenue(state.orders);
  const forecastLeadCount = state.clients.filter(c => ["lead", "convo", "quoted"].includes(c.stage)).length + state.opportunities.length;
  const forecast = AnalyticsService.forecastRevenue(forecastLeadCount);

  return (
    <div style={{ animation: "slideUp .5s ease" }}>
      <Label color={T.success}>Revenue Engine</Label>
      <Heading size={20}>Revenue & Forecasting</Heading>
      <div style={{ fontSize: 11, color: T.textDim, marginTop: 2, marginBottom: 16 }}>Track orders and project future earnings</div>

      {/* Forecast Card */}
      <Card style={{ marginBottom: 12, border: `1px solid ${T.success}15`, background: `linear-gradient(135deg, ${T.surface} 0%, #0C1410 100%)` }} glow={T.success}>
        <Label color={T.success}>📈 Revenue Forecast</Label>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 9, color: T.textMute, marginBottom: 2 }}>Projected from {forecastLeadCount} active leads</div>
            <div style={{ fontFamily: T.font.display, fontSize: 32, color: T.white }}>₦{forecast.toLocaleString()}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: T.textMute }}>Formula</div>
            <div style={{ fontSize: 10, color: T.success, fontFamily: "monospace" }}>{forecastLeadCount} × 15% × ₦65K</div>
          </div>
        </div>
        <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: T.radius.sm, background: `${T.success}08` }}>
          <div style={{ fontSize: 10, color: T.textDim, lineHeight: 1.6 }}>
            Based on {forecastLeadCount} leads in your pipeline + opportunities at a 15% conversion rate with ₦65K average order value.
            {forecastLeadCount < 5 && " Add more leads to increase your forecast."}
          </div>
        </div>
      </Card>

      {/* Revenue Calculator */}
      <Card style={{ marginBottom: 12, border: `1px solid ${T.accent}12` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Label color={T.accent}>Monthly Revenue Tracker</Label>
          <div style={{ fontFamily: T.font.display, fontSize: 24, color: T.white }}>₦{currentRevenue.toLocaleString()}</div>
        </div>
        {AnalyticsService.REVENUE_TIERS.map(tier => (
          <div key={tier.key} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
            borderTop: `1px solid ${T.border}`,
          }}>
            <span style={{ fontSize: 18 }}>{tier.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{tier.label}</div>
              <div style={{ fontSize: 9, color: T.textMute }}>₦{tier.avg.toLocaleString()}/order</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => actions.setOrders({ [tier.key]: Math.max(0, (state.orders[tier.key] || 0) - 1) })}
                style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.borderLit}`, background: T.bg, color: T.textDim, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
              <span style={{ fontSize: 14, fontWeight: 800, color: T.white, minWidth: 18, textAlign: "center" }}>{state.orders[tier.key] || 0}</span>
              <button onClick={() => actions.setOrders({ [tier.key]: (state.orders[tier.key] || 0) + 1 })}
                style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.borderLit}`, background: T.bg, color: T.textDim, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.success, minWidth: 70, textAlign: "right" }}>
              ₦{((state.orders[tier.key] || 0) * tier.avg).toLocaleString()}
            </div>
          </div>
        ))}
      </Card>

      {/* Funnel */}
      <Card>
        <Label color={T.accent}>Conversion Funnel</Label>
        <div style={{ marginTop: 10 }}>
          {[
            { step: "Content Reach", num: "1,000", pct: 100, color: T.lavender },
            { step: "Profile Visits", num: "~100", pct: 70, color: T.accent },
            { step: "DMs / WhatsApp", num: "~5-10", pct: 40, color: T.amber },
            { step: "Consultations", num: "~3-5", pct: 25, color: T.mint },
            { step: "Paid Orders", num: "~1-3", pct: 12, color: T.success },
          ].map((s, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: T.textDim }}>{s.step}</span>
                <span style={{ fontSize: 9, color: s.color, fontWeight: 700 }}>{s.num}</span>
              </div>
              <ProgressBar value={s.pct} color={s.color} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── 5G: CONTENT ENGINE (features/ai/) ───────────────────────────

function ContentEngine() {
  const { state, actions } = useStore();
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    actions.setAiLoading({ content: true });
    const result = await AIService.generateContentCalendar();
    actions.setContentCalendar(result?.week || null);
    actions.setAiLoading({ content: false });
    setLoading(false);
  };

  const typeColors = { Reel: T.accent, Carousel: T.lavender, Static: T.mint };

  return (
    <div style={{ animation: "slideUp .5s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <Label color={T.accent}>AI Content</Label>
          <Heading size={20}>Content Engine</Heading>
        </div>
        <Btn onClick={generate} disabled={loading} color={T.accent} variant="ghost" small>
          {loading ? "..." : state.contentCalendar ? "↻ Regen" : "🤖 Generate"}
        </Btn>
      </div>

      {state.contentCalendar ? (
        <div>
          {state.contentCalendar.map((c, i) => {
            const dayPb = PLAYBOOKS[c.day];
            return (
              <Card key={i} style={{ padding: 14, marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: dayPb?.color || T.accent }}>{c.day}</span>
                  <Badge color={typeColors[c.type] || T.accent}>{c.type}</Badge>
                  {c.platform && <Badge color={T.slate}>{c.platform}</Badge>}
                  <span style={{ marginLeft: "auto", fontSize: 9, color: T.textMute }}>{c.time}</span>
                </div>
                <div style={{ fontSize: 12, color: T.text, fontWeight: 600, marginBottom: 3 }}>{c.topic}</div>
                <div style={{ fontSize: 11, color: T.textDim, fontStyle: "italic", marginBottom: 6 }}>"{c.hook}"</div>
                <div style={{ fontSize: 9, color: T.textMute, lineHeight: 1.6 }}>{c.hashtags}</div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card style={{ textAlign: "center", padding: 30 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📸</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.textDim }}>Generate a 7-day content calendar</div>
          <div style={{ fontSize: 11, color: T.textMute, marginTop: 4 }}>AI creates topics, hooks, hashtags & posting times for your brand</div>
        </Card>
      )}
    </div>
  );
}

// ── 5H: WEEKLY AI REPORT (features/analytics/) ──────────────────

function WeeklyReport() {
  const { state, actions } = useStore();
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const metrics = {
      totalTasks: state.taskStreak,
      pipelineClients: state.clients.length,
      opportunities: state.opportunities.length,
      events: state.events.length,
      revenue: AnalyticsService.calculateRevenue(state.orders),
      stageBreakdown: AnalyticsService.getPipelineStats(state.clients),
    };
    const result = await AIService.generateWeeklyReport(metrics);
    actions.setWeeklyReport(result);
    setLoading(false);
  };

  const report = state.weeklyReport;

  return (
    <div style={{ animation: "slideUp .5s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <Label color={T.sky}>AI Report</Label>
          <Heading size={20}>Weekly Growth Report</Heading>
        </div>
        <Btn onClick={generate} disabled={loading} color={T.sky} variant="ghost" small>
          {loading ? "..." : report ? "↻ Refresh" : "🤖 Generate"}
        </Btn>
      </div>

      {/* Growth Score */}
      <Card style={{ marginBottom: 12, border: `1px solid ${T.accent}12` }} glow={T.accent}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ScoreRing score={AnalyticsService.calculateGrowthScore(state.growthMetrics)} size={64} color={T.accent} />
          <div>
            <Label color={T.accent}>Growth Score</Label>
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 4, lineHeight: 1.6 }}>
              Based on tasks completed, leads generated, orders closed, and content posted today
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginTop: 12 }}>
          {[
            { label: "Tasks", key: "tasksToday", max: 6, color: T.accent },
            { label: "Leads", key: "leadsToday", max: 5, color: T.lavender },
            { label: "Orders", key: "ordersToday", max: 3, color: T.success },
            { label: "Content", key: "contentToday", max: 3, color: T.rose },
          ].map(m => (
            <div key={m.key} style={{ textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 4 }}>
                <button onClick={() => actions.setGrowthMetric({ [m.key]: Math.max(0, (state.growthMetrics[m.key] || 0) - 1) })}
                  style={{ width: 20, height: 20, borderRadius: 4, border: `1px solid ${T.borderLit}`, background: T.bg, color: T.textDim, fontSize: 11, cursor: "pointer" }}>−</button>
                <span style={{ fontSize: 14, fontWeight: 800, color: m.color, minWidth: 14 }}>{state.growthMetrics[m.key] || 0}</span>
                <button onClick={() => actions.setGrowthMetric({ [m.key]: Math.min((state.growthMetrics[m.key] || 0) + 1, m.max) })}
                  style={{ width: 20, height: 20, borderRadius: 4, border: `1px solid ${T.borderLit}`, background: T.bg, color: T.textDim, fontSize: 11, cursor: "pointer" }}>+</button>
              </div>
              <div style={{ fontSize: 8, color: T.textMute, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{m.label}</div>
              <ProgressBar value={state.growthMetrics[m.key] || 0} max={m.max} color={m.color} height={3} />
            </div>
          ))}
        </div>
      </Card>

      {report ? (
        <>
          <Card style={{ marginBottom: 8, border: `1px solid ${T.sky}12` }}>
            <Label color={T.sky}>Executive Summary</Label>
            <div style={{ fontSize: 12, color: T.text, lineHeight: 1.7, marginTop: 6 }}>{report.summary}</div>
          </Card>

          <Card style={{ marginBottom: 8, border: `1px solid ${T.success}12` }}>
            <Label color={T.success}>✅ Wins</Label>
            <div style={{ marginTop: 6 }}>
              {(report.wins || []).map((w, i) => (
                <div key={i} style={{ fontSize: 11, color: T.textDim, lineHeight: 1.7, padding: "4px 0", borderBottom: i < report.wins.length - 1 ? `1px solid ${T.border}` : "none" }}>
                  ✦ {w}
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ marginBottom: 8, border: `1px solid ${T.amber}12` }}>
            <Label color={T.amber}>🔧 Improvements</Label>
            <div style={{ marginTop: 6 }}>
              {(report.improvements || []).map((im, i) => (
                <div key={i} style={{ fontSize: 11, color: T.textDim, lineHeight: 1.7, padding: "4px 0" }}>→ {im}</div>
              ))}
            </div>
          </Card>

          <Card style={{ marginBottom: 8, border: `1px solid ${T.lavender}12` }}>
            <Label color={T.lavender}>🎯 Next Week Focus</Label>
            <div style={{ fontSize: 12, color: T.text, lineHeight: 1.7, marginTop: 6 }}>{report.nextWeekFocus}</div>
          </Card>

          <Card style={{ border: `1px solid ${T.mint}12` }}>
            <Label color={T.mint}>💡 Growth Tip</Label>
            <div style={{ fontSize: 12, color: T.text, lineHeight: 1.7, marginTop: 6 }}>{report.growthTip}</div>
          </Card>
        </>
      ) : (
        <Card style={{ textAlign: "center", padding: 30 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.textDim }}>Generate your weekly performance report</div>
          <div style={{ fontSize: 11, color: T.textMute, marginTop: 4, lineHeight: 1.6 }}>
            AI analyzes your pipeline, tasks, and revenue data to produce actionable insights
          </div>
        </Card>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LAYER 4B — GROWTH SNAPSHOT (components/dashboard/GrowthSnapshot)
//  Instant business overview — renders above tabs on every screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function GrowthSnapshot() {
  const { state } = useStore();

  // ── Derive snapshot data from existing store + services ──
  const snapshot = useMemo(() => {
    // Pipeline Leads — active leads (exclude delivered)
    const activeClients = state.clients.filter(c => c.stage !== "delivered");
    const pipelineCount = activeClients.length + state.opportunities.length;

    // Projected Revenue — use forecast engine
    const activePipelineLeads = state.clients.filter(c => ["lead", "convo", "quoted"].includes(c.stage)).length;
    const totalLeadPool = activePipelineLeads + state.opportunities.length;
    const actualRevenue = AnalyticsService.calculateRevenue(state.orders);
    const forecast = AnalyticsService.forecastRevenue(totalLeadPool);
    const projectedRevenue = actualRevenue > 0 ? actualRevenue : forecast;

    // Today's Priority — from Decision Engine output, or fallback
    const priorityAction = state.todayDecision?.action || null;

    // Best Performing Content — top content insight from Growth Memory
    const contentMemories = GrowthMemoryService.getByCategory(state.growthMemory, "content");
    const topContent = GrowthMemoryService.getTopInsights(contentMemories, 1)[0];
    const bestContent = topContent?.insight || null;

    return { pipelineCount, projectedRevenue, priorityAction, bestContent };
  }, [state.clients, state.opportunities, state.orders, state.todayDecision, state.growthMemory]);

  // ── Fallback demo values (shown when system is fresh) ──
  const DEMO = {
    pipeline: 5,
    revenue: 180000,
    priority: "Post a transformation reel today",
    content: "Ankara transformation video",
  };

  // ── Display: real data when available, demo values otherwise ──
  const hasPipeline = snapshot.pipelineCount > 0;
  const hasRevenue = snapshot.projectedRevenue > 0;
  const hasPriority = !!snapshot.priorityAction;
  const hasContent = !!snapshot.bestContent;
  const anyReal = hasPipeline || hasRevenue || hasPriority || hasContent;

  const display = {
    pipeline: {
      value: hasPipeline ? snapshot.pipelineCount : DEMO.pipeline,
      label: hasPipeline
        ? `${snapshot.pipelineCount} potential client${snapshot.pipelineCount !== 1 ? "s" : ""}`
        : `${DEMO.pipeline} potential clients`,
      active: true,
      isDemo: !hasPipeline,
    },
    revenue: {
      value: hasRevenue ? `₦${snapshot.projectedRevenue.toLocaleString()}` : `₦${DEMO.revenue.toLocaleString()}`,
      label: hasRevenue ? "projected this month" : "projected this month",
      active: true,
      isDemo: !hasRevenue,
    },
    priority: {
      value: hasPriority ? snapshot.priorityAction : DEMO.priority,
      active: true,
      isDemo: !hasPriority,
    },
    content: {
      value: hasContent ? snapshot.bestContent : DEMO.content,
      active: true,
      isDemo: !hasContent,
    },
  };

  const metrics = [
    {
      icon: "👥", title: "Pipeline Leads", color: T.lavender,
      main: String(display.pipeline.value),
      sub: display.pipeline.label,
      active: display.pipeline.active,
      isDemo: display.pipeline.isDemo,
    },
    {
      icon: "💰", title: "Projected Revenue", color: T.success,
      main: display.revenue.value,
      sub: display.revenue.label,
      active: display.revenue.active,
      isDemo: display.revenue.isDemo,
    },
    {
      icon: "🎯", title: "Today's Priority", color: T.accent,
      main: null,
      sub: display.priority.value,
      active: display.priority.active,
      isDemo: display.priority.isDemo,
    },
    {
      icon: "📸", title: "Best Content", color: T.amber,
      main: null,
      sub: display.content.value,
      active: display.content.active,
      isDemo: display.content.isDemo,
    },
  ];

  return (
    <div style={{
      margin: "12px 14px 0", padding: 0, position: "relative", zIndex: 2,
      animation: "snapshotReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) both",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 7, marginBottom: 10, paddingLeft: 2,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
          background: `linear-gradient(135deg, ${T.accent}25, ${T.accent}08)`,
          border: `1px solid ${T.accent}18`, fontSize: 11,
        }}>🚀</div>
        <span style={{
          fontSize: 10, letterSpacing: 3, color: T.accent, textTransform: "uppercase",
          fontWeight: 800, fontFamily: T.font.body,
        }}>Growth Snapshot</span>
        <div style={{
          marginLeft: "auto", width: 5, height: 5, borderRadius: "50%",
          background: metrics.every(m => !m.isDemo) ? T.success : T.amber,
          boxShadow: `0 0 8px ${metrics.every(m => !m.isDemo) ? T.success : T.amber}60`,
        }} />
        {metrics.some(m => m.isDemo) && (
          <span style={{ fontSize: 8, color: T.textMute, marginLeft: 6, fontWeight: 600, letterSpacing: 0.5 }}>demo</span>
        )}
      </div>

      {/* 2×2 Metric Grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
      }}>
        {metrics.map((m, i) => (
          <div key={i} style={{
            position: "relative", overflow: "hidden",
            background: m.active
              ? `linear-gradient(145deg, ${T.surface} 0%, ${m.color}04 100%)`
              : T.surface,
            borderRadius: T.radius.md, padding: "14px 12px",
            border: `1px solid ${m.active ? m.color + "12" : T.border}`,
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            animationDelay: `${i * 0.08}s`,
            animation: "snapshotCardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}>
            {/* Subtle corner glow for active metrics */}
            {m.active && (
              <div style={{
                position: "absolute", top: -20, right: -20, width: 60, height: 60,
                background: `radial-gradient(circle, ${m.color}15 0%, transparent 70%)`,
                borderRadius: "50%", pointerEvents: "none",
              }} />
            )}

            <div style={{ position: "relative", zIndex: 1 }}>
              {/* Icon + Title Row */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                <span style={{ fontSize: 13 }}>{m.icon}</span>
                <span style={{
                  fontSize: 8, letterSpacing: 2, color: m.active ? m.color : T.textMute,
                  textTransform: "uppercase", fontWeight: 800, fontFamily: T.font.body,
                }}>{m.title}</span>
              </div>

              {/* Main Value */}
              {m.main && (
                <div style={{
                  fontFamily: T.font.display, fontSize: 22, fontWeight: 500,
                  color: m.active ? T.white : T.textMute, lineHeight: 1.1, marginBottom: 3,
                  letterSpacing: -0.3,
                }}>{m.main}</div>
              )}

              {/* Sub Label */}
              <div style={{
                fontSize: 10, color: m.active ? T.textDim : T.textMute,
                lineHeight: 1.5, fontWeight: 400,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>{m.sub}</div>

              {/* Demo indicator — subtle, disappears when real data arrives */}
              {m.isDemo && (
                <div style={{
                  marginTop: 6, fontSize: 7, letterSpacing: 2, textTransform: "uppercase",
                  color: T.textMute, fontWeight: 800, opacity: 0.6,
                }}>sample data</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes snapshotReveal {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes snapshotCardIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LAYER 5 v3.5 — NEW FEATURE MODULES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 5I: GROWTH MEMORY (features/analytics/growthMemory) ─────────

function GrowthMemoryDashboard() {
  const { state, actions } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "content", insight: "", impact_score: 7, notes: "" });
  const [filterCat, setFilterCat] = useState("all");

  const addInsight = () => {
    if (!form.insight.trim()) return;
    actions.addMemory(form);
    setForm({ category: "content", insight: "", impact_score: 7, notes: "" });
    setShowForm(false);
  };

  const filtered = filterCat === "all" ? state.growthMemory : state.growthMemory.filter(m => m.category === filterCat);
  const breakdown = GrowthMemoryService.getCategoryBreakdown(state.growthMemory);
  const avgImpact = GrowthMemoryService.getAverageImpact(state.growthMemory);

  return (
    <div style={{ animation: "slideUp .5s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <Label color={T.amber}>Growth Memory</Label>
          <Heading size={20}>What Works</Heading>
          <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>Store insights about what drives results</div>
        </div>
        <Btn onClick={() => setShowForm(!showForm)} color={T.amber} variant="ghost" small>+ Record</Btn>
      </div>

      {/* Stats Overview */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", scrollbarWidth: "none" }}>
        <StatCard icon="🧠" label="Insights" value={state.growthMemory.length} color={T.amber} />
        <StatCard icon="⚡" label="Avg Impact" value={avgImpact + "/10"} color={avgImpact >= 7 ? T.success : T.accent} />
        {GrowthMemoryService.CATEGORIES.map(cat => (
          <StatCard key={cat.id} icon={cat.icon} label={cat.label} value={breakdown[cat.id]?.count || 0} color={cat.color} />
        ))}
      </div>

      {/* Add Form */}
      {showForm && (
        <Card style={{ marginBottom: 12, border: `1px solid ${T.amber}20` }}>
          <Label color={T.amber}>Record New Insight</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            <Select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              options={GrowthMemoryService.CATEGORIES.map(c => ({ value: c.id, label: `${c.icon} ${c.label}` }))} />
            <textarea value={form.insight} onChange={e => setForm(p => ({ ...p, insight: e.target.value }))}
              placeholder="What worked? Be specific. e.g. 'Ankara transformation reels generate the most DMs'"
              rows={3} style={{
                width: "100%", padding: "10px", borderRadius: T.radius.sm, border: `1px solid ${T.borderLit}`,
                background: T.bg, color: T.text, fontSize: 12, fontFamily: T.font.body,
                outline: "none", resize: "vertical", lineHeight: 1.6,
              }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: T.textDim, whiteSpace: "nowrap" }}>Impact Score:</span>
              <input type="range" min={1} max={10} value={form.impact_score}
                onChange={e => setForm(p => ({ ...p, impact_score: parseInt(e.target.value) }))}
                style={{ flex: 1, accentColor: T.amber }} />
              <span style={{
                fontSize: 14, fontWeight: 800, minWidth: 22, textAlign: "center",
                color: form.impact_score >= 8 ? T.success : form.impact_score >= 5 ? T.amber : T.rose,
              }}>{form.impact_score}</span>
            </div>
            <InputField value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes (e.g. '3 orders from one reel')" />
            <Btn onClick={addInsight} color={T.amber}>Save to Memory</Btn>
          </div>
        </Card>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto", scrollbarWidth: "none" }}>
        <button onClick={() => setFilterCat("all")} style={{
          padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer",
          background: filterCat === "all" ? `${T.amber}15` : T.surface,
          color: filterCat === "all" ? T.amber : T.textMute,
          fontSize: 10, fontWeight: 700, fontFamily: T.font.body,
        }}>All</button>
        {GrowthMemoryService.CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setFilterCat(cat.id)} style={{
            padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer",
            background: filterCat === cat.id ? `${cat.color}15` : T.surface,
            color: filterCat === cat.id ? cat.color : T.textMute,
            fontSize: 10, fontWeight: 700, fontFamily: T.font.body,
          }}>{cat.icon} {cat.label}</button>
        ))}
      </div>

      {/* Insights List */}
      {filtered.map(m => {
        const cat = GrowthMemoryService.CATEGORIES.find(c => c.id === m.category) || GrowthMemoryService.CATEGORIES[0];
        return (
          <Card key={m.id} style={{ padding: 14, marginBottom: 6, borderLeft: `3px solid ${cat.color}40` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Badge color={cat.color}>{cat.icon} {cat.label}</Badge>
                  <span style={{ fontSize: 9, color: T.textMute }}>{m.date}</span>
                </div>
                <div style={{ fontSize: 13, color: T.white, fontWeight: 500, lineHeight: 1.6, marginBottom: 4 }}>{m.insight}</div>
                {m.notes && <div style={{ fontSize: 10, color: T.textDim, fontStyle: "italic", lineHeight: 1.5 }}>📝 {m.notes}</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginLeft: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: `${m.impact_score >= 8 ? T.success : m.impact_score >= 5 ? T.amber : T.rose}12`,
                  border: `2px solid ${m.impact_score >= 8 ? T.success : m.impact_score >= 5 ? T.amber : T.rose}30`,
                  fontSize: 12, fontWeight: 800, color: m.impact_score >= 8 ? T.success : m.impact_score >= 5 ? T.amber : T.rose,
                }}>{m.impact_score}</div>
                <Btn onClick={() => actions.removeMemory(m.id)} color={T.danger} variant="ghost" small>✕</Btn>
              </div>
            </div>
          </Card>
        );
      })}

      {state.growthMemory.length === 0 && (
        <Card style={{ textAlign: "center", padding: 30 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🧠</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.textDim }}>No insights recorded yet</div>
          <div style={{ fontSize: 11, color: T.textMute, lineHeight: 1.6, marginTop: 4 }}>
            Start recording what works — best content, top clients, winning offers.
            Over time, Growth Memory becomes your most valuable business asset.
          </div>
        </Card>
      )}
    </div>
  );
}

// ── 5J: STRATEGY TAB (features/decision/) ───────────────────────

function StrategyDashboard() {
  const { state, actions } = useStore();
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [focusLoading, setFocusLoading] = useState(false);

  const generateDecision = async () => {
    setDecisionLoading(true);
    actions.setAiLoading({ decision: true });
    const result = await DecisionService.getDecision(state);
    actions.setTodayDecision(result);
    actions.setAiLoading({ decision: false });
    setDecisionLoading(false);
  };

  const generateFocus = async () => {
    setFocusLoading(true);
    actions.setAiLoading({ weeklyFocus: true });
    const result = await DecisionService.getWeeklyFocus(state);
    actions.setWeeklyFocus(result);
    actions.setAiLoading({ weeklyFocus: false });
    setFocusLoading(false);
  };

  const topMemory = GrowthMemoryService.getTopInsights(state.growthMemory, 1)[0];
  const breakdown = GrowthMemoryService.getCategoryBreakdown(state.growthMemory);
  const decision = state.todayDecision;
  const focus = state.weeklyFocus;

  const urgencyColors = { high: T.danger, medium: T.amber, low: T.slate };
  const categoryIcons = { content: "📸", sales: "💰", leads: "🎯", retention: "🔄", branding: "✨" };

  return (
    <div style={{ animation: "slideUp .5s ease" }}>
      <div style={{ marginBottom: 18 }}>
        <Label color={T.accent}>Intelligence</Label>
        <Heading size={22}>Strategy Center</Heading>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>AI-powered decisions · Memory-driven insights · Weekly focus</div>
      </div>

      {/* ─── TODAY'S PRIORITY (Decision Engine) ─── */}
      <Card style={{
        marginBottom: 12,
        background: `linear-gradient(145deg, ${T.surface} 0%, #100D14 100%)`,
        border: `1px solid ${T.accent}15`,
      }} glow={T.accent}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              background: `${T.accent}15`, fontSize: 14,
            }}>🎯</div>
            <Label color={T.accent}>Today's Priority</Label>
          </div>
          <Btn onClick={generateDecision} disabled={decisionLoading} color={T.accent} variant="ghost" small>
            {decisionLoading ? "Analyzing..." : decision ? "↻ Refresh" : "🤖 Analyze"}
          </Btn>
        </div>

        {decision ? (
          <div>
            <div style={{
              padding: "14px 16px", borderRadius: T.radius.md, background: T.bg,
              border: `1px solid ${T.accent}12`, marginBottom: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>{categoryIcons[decision.category] || "⚡"}</span>
                <Badge color={urgencyColors[decision.urgency] || T.amber} filled>{decision.urgency} priority</Badge>
                <Badge color={T.lavender}>{decision.category}</Badge>
              </div>
              <div style={{ fontSize: 15, color: T.white, fontWeight: 600, lineHeight: 1.5, fontFamily: T.font.display, marginBottom: 10 }}>
                {decision.action}
              </div>
              <div style={{
                padding: "8px 10px", borderRadius: T.radius.sm, background: `${T.accent}06`,
                borderLeft: `3px solid ${T.accent}40`,
              }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: T.accent, textTransform: "uppercase", fontWeight: 800, marginBottom: 3 }}>Why This?</div>
                <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.7 }}>{decision.reason}</div>
              </div>
              <div style={{
                marginTop: 8, padding: "8px 10px", borderRadius: T.radius.sm, background: `${T.success}06`,
                borderLeft: `3px solid ${T.success}40`,
              }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: T.success, textTransform: "uppercase", fontWeight: 800, marginBottom: 3 }}>Expected Impact</div>
                <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.7 }}>{decision.expected_impact}</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            padding: "20px 16px", borderRadius: T.radius.md, background: T.bg,
            border: `1px dashed ${T.accent}15`, textAlign: "center",
          }}>
            <div style={{ fontSize: 11, color: T.textMute, lineHeight: 1.6 }}>
              The Decision Engine analyzes your pipeline, revenue, leads, and growth memory to determine your single highest-impact action for today.
            </div>
          </div>
        )}
      </Card>

      {/* ─── WEEKLY FOCUS ─── */}
      <Card style={{
        marginBottom: 12,
        background: `linear-gradient(145deg, ${T.surface} 0%, #0D1014 100%)`,
        border: `1px solid ${T.sky}12`,
      }} glow={T.sky}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              background: `${T.sky}15`, fontSize: 14,
            }}>📅</div>
            <Label color={T.sky}>Weekly Focus</Label>
          </div>
          <Btn onClick={generateFocus} disabled={focusLoading} color={T.sky} variant="ghost" small>
            {focusLoading ? "Planning..." : focus ? "↻ Refresh" : "🤖 Plan Week"}
          </Btn>
        </div>

        {focus ? (
          <div>
            <div style={{
              padding: "14px 16px", borderRadius: T.radius.md, background: T.bg,
              border: `1px solid ${T.sky}10`,
            }}>
              <div style={{ fontFamily: T.font.display, fontSize: 20, color: T.white, fontWeight: 500, marginBottom: 6 }}>
                {focus.weeklyTheme}
              </div>
              <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.7, marginBottom: 12 }}>
                {focus.whyNow}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: T.sky, textTransform: "uppercase", fontWeight: 800, marginBottom: 8 }}>Key Actions</div>
                {(focus.keyActions || []).map((action, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px",
                    borderRadius: T.radius.sm, background: `${T.sky}05`, marginBottom: 4,
                    border: `1px solid ${T.sky}08`,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                      background: `${T.sky}15`, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 800, color: T.sky,
                    }}>{i + 1}</div>
                    <div style={{ fontSize: 11, color: T.text, lineHeight: 1.6 }}>{action}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, padding: "8px 10px", borderRadius: T.radius.sm, background: `${T.mint}06`, border: `1px solid ${T.mint}10` }}>
                  <div style={{ fontSize: 8, letterSpacing: 2, color: T.mint, textTransform: "uppercase", fontWeight: 800, marginBottom: 3 }}>Track This</div>
                  <div style={{ fontSize: 10, color: T.textDim, lineHeight: 1.5 }}>{focus.metricToWatch}</div>
                </div>
                <div style={{ flex: 1, padding: "8px 10px", borderRadius: T.radius.sm, background: `${T.rose}06`, border: `1px solid ${T.rose}10` }}>
                  <div style={{ fontSize: 8, letterSpacing: 2, color: T.rose, textTransform: "uppercase", fontWeight: 800, marginBottom: 3 }}>Avoid</div>
                  <div style={{ fontSize: 10, color: T.textDim, lineHeight: 1.5 }}>{focus.avoidThis}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            padding: "20px 16px", borderRadius: T.radius.md, background: T.bg,
            border: `1px dashed ${T.sky}12`, textAlign: "center",
          }}>
            <div style={{ fontSize: 11, color: T.textMute, lineHeight: 1.6 }}>
              Generate a strategic weekly focus based on your business data and growth memory patterns.
            </div>
          </div>
        )}
      </Card>

      {/* ─── GROWTH INSIGHT (from Memory) ─── */}
      <Card style={{
        marginBottom: 12,
        background: `linear-gradient(145deg, ${T.surface} 0%, #14100D 100%)`,
        border: `1px solid ${T.amber}12`,
      }} glow={T.amber}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            background: `${T.amber}15`, fontSize: 14,
          }}>🧠</div>
          <Label color={T.amber}>Growth Insight</Label>
        </div>

        {topMemory ? (
          <div style={{
            padding: "14px 16px", borderRadius: T.radius.md, background: T.bg,
            border: `1px solid ${T.amber}10`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Badge color={GrowthMemoryService.CATEGORIES.find(c => c.id === topMemory.category)?.color || T.amber}>
                {topMemory.category}
              </Badge>
              <Badge color={T.success}>Impact: {topMemory.impact_score}/10</Badge>
            </div>
            <div style={{ fontSize: 14, color: T.white, fontWeight: 500, lineHeight: 1.6, fontFamily: T.font.display, marginBottom: 6 }}>
              {topMemory.insight}
            </div>
            {topMemory.notes && (
              <div style={{ fontSize: 11, color: T.textDim, fontStyle: "italic" }}>📝 {topMemory.notes}</div>
            )}
            <div style={{
              marginTop: 10, padding: "8px 10px", borderRadius: T.radius.sm, background: `${T.amber}06`,
              borderLeft: `3px solid ${T.amber}30`, fontSize: 11, color: T.textDim, lineHeight: 1.6,
            }}>
              💡 Use this insight to guide today's actions. Your highest-performing patterns should be repeated and amplified.
            </div>
          </div>
        ) : (
          <div style={{
            padding: "20px 16px", borderRadius: T.radius.md, background: T.bg,
            border: `1px dashed ${T.amber}12`, textAlign: "center",
          }}>
            <div style={{ fontSize: 11, color: T.textMute, lineHeight: 1.6 }}>
              No insights yet. Go to the <span style={{ color: T.amber, fontWeight: 700 }}>Memory</span> tab to record what's working in your business.
              The Strategy tab surfaces your most impactful learnings here automatically.
            </div>
          </div>
        )}
      </Card>

      {/* ─── SYSTEM STATUS ─── */}
      <Card style={{ border: `1px solid ${T.border}` }}>
        <Label color={T.textMute}>Intelligence Status</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          {[
            { label: "Growth Memories", value: state.growthMemory.length, icon: "🧠", color: T.amber },
            { label: "Pipeline Leads", value: state.clients.length, icon: "🔄", color: T.lavender },
            { label: "Opportunities", value: state.opportunities.length, icon: "🎯", color: T.mint },
            { label: "Events Tracked", value: state.events.length, icon: "📡", color: T.coral },
            { label: "Growth Score", value: AnalyticsService.calculateGrowthScore(state.growthMetrics) + "%", icon: "⚡", color: T.accent },
            { label: "Revenue", value: "₦" + AnalyticsService.calculateRevenue(state.orders).toLocaleString(), icon: "💰", color: T.success },
          ].map((item, i) => (
            <div key={i} style={{
              padding: "10px", borderRadius: T.radius.sm, background: T.bg,
              border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 8, color: T.textMute, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>{item.label}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 10, color: T.textMute, textAlign: "center", fontStyle: "italic" }}>
          The more data you feed the system, the smarter Strategy becomes.
        </div>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LAYER 5 v4.0 — WELCOME, STRATEGY PREVIEW, GROWTH TIMELINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── WELCOME PANEL (components/dashboard/WelcomePanel) ───────────

function WelcomePanel() {
  const { state } = useStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const pb = PLAYBOOKS[state.currentDay];

  // Pull today's priority from Decision Engine or use day theme
  const mission = state.todayDecision?.action
    || `Focus on ${pb?.theme?.toLowerCase() || "growing your brand"} and move one client forward.`;

  return (
    <div style={{
      margin: "14px 14px 0", position: "relative", zIndex: 2,
      animation: "welcomeFadeIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) both",
    }}>
      <div style={{
        position: "relative", overflow: "hidden",
        background: `linear-gradient(145deg, ${T.surface} 0%, ${T.accent}06 50%, ${T.surface} 100%)`,
        borderRadius: T.radius.xl, padding: "22px 20px",
        border: `1px solid ${T.accent}10`,
      }}>
        {/* Decorative glow */}
        <div style={{
          position: "absolute", top: -40, right: -40, width: 120, height: 120,
          background: `radial-gradient(circle, ${T.accent}12 0%, transparent 70%)`,
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -30, left: -20, width: 80, height: 80,
          background: `radial-gradient(circle, ${T.lavender}08 0%, transparent 70%)`,
          borderRadius: "50%", pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Greeting */}
          <div style={{
            fontFamily: T.font.display, fontSize: 26, fontWeight: 400, color: T.white,
            lineHeight: 1.2, marginBottom: 4, letterSpacing: -0.3,
          }}>
            {greeting}, Vera <span style={{ fontSize: 22 }}>👋</span>
          </div>

          {/* Brand context */}
          <div style={{
            fontSize: 11, color: T.textDim, lineHeight: 1.6, marginBottom: 14,
          }}>
            Your Growth OS is ready. Here's what matters today.
          </div>

          {/* Today's mission */}
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-start",
            padding: "12px 14px", borderRadius: T.radius.md,
            background: `${T.accent}06`, border: `1px solid ${T.accent}10`,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: `${T.accent}15`, border: `1px solid ${T.accent}20`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13,
            }}>🎯</div>
            <div>
              <div style={{
                fontSize: 8, letterSpacing: 3, color: T.accent,
                textTransform: "uppercase", fontWeight: 800, marginBottom: 3,
              }}>Today's Mission</div>
              <div style={{
                fontSize: 12, color: T.text, lineHeight: 1.6, fontWeight: 400,
              }}>{mission}</div>
            </div>
          </div>

          {/* Day indicator */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginTop: 12,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: pb?.color || T.accent,
              boxShadow: `0 0 8px ${pb?.color || T.accent}50`,
            }} />
            <span style={{ fontSize: 10, color: T.textDim, fontWeight: 600 }}>
              {state.currentDay} — {pb?.theme || "Growth Day"}
            </span>
            <div style={{
              marginLeft: "auto", padding: "2px 8px", borderRadius: 5,
              background: `${pb?.color || T.accent}12`,
              border: `1px solid ${pb?.color || T.accent}15`,
            }}>
              <span style={{ fontSize: 9, color: pb?.color || T.accent, fontWeight: 700 }}>{pb?.icon}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes welcomeFadeIn {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── STRATEGY PREVIEW (components/dashboard/StrategyPreview) ─────

function StrategyPreview() {
  const { state, actions } = useStore();
  const [loading, setLoading] = useState(false);
  const decision = state.todayDecision;

  const generate = async () => {
    setLoading(true);
    actions.setAiLoading({ decision: true });
    const result = await DecisionService.getDecision(state);
    actions.setTodayDecision(result);
    actions.setAiLoading({ decision: false });
    setLoading(false);
  };

  const urgencyColor = { high: T.danger, medium: T.amber, low: T.slate };
  const catIcon = { content: "📸", sales: "💰", leads: "🎯", retention: "🔄", branding: "✨" };

  // Fallback preview when no decision generated yet
  const fallback = {
    action: "Post a transformation reel showing fabric to finished outfit",
    reason: "Transformation content consistently drives the most enquiries for bespoke fashion brands in Abuja.",
    expected_impact: "3-5 new DM conversations within 24 hours",
    urgency: "high",
    category: "content",
  };

  const d = decision || fallback;
  const isDemo = !decision;

  return (
    <div style={{
      margin: "8px 14px 0", position: "relative", zIndex: 2,
      animation: "strategySlide 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both",
    }}>
      <div style={{
        position: "relative", overflow: "hidden",
        background: `linear-gradient(155deg, ${T.surface} 0%, ${T.mint}04 100%)`,
        borderRadius: T.radius.lg, padding: "16px 16px",
        border: `1px solid ${T.mint}10`,
      }}>
        {/* Corner glow */}
        <div style={{
          position: "absolute", top: -25, right: -25, width: 80, height: 80,
          background: `radial-gradient(circle, ${T.mint}10 0%, transparent 70%)`,
          borderRadius: "50%", pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13 }}>🧭</span>
              <span style={{
                fontSize: 8, letterSpacing: 3, color: T.mint,
                textTransform: "uppercase", fontWeight: 800,
              }}>Highest Impact Move</span>
              {isDemo && (
                <span style={{ fontSize: 7, color: T.textMute, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.6 }}>sample</span>
              )}
            </div>
            <button onClick={generate} disabled={loading} style={{
              padding: "4px 10px", borderRadius: 5, border: `1px solid ${T.mint}25`,
              background: `${T.mint}08`, color: T.mint, fontSize: 9, fontWeight: 800,
              cursor: loading ? "default" : "pointer", fontFamily: T.font.body,
              opacity: loading ? 0.5 : 1,
            }}>
              {loading ? "..." : decision ? "↻" : "🤖 Analyze"}
            </button>
          </div>

          {/* Action */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: `${urgencyColor[d.urgency] || T.amber}12`,
              border: `1px solid ${urgencyColor[d.urgency] || T.amber}20`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15,
            }}>{catIcon[d.category] || "⚡"}</div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 13, color: T.white, fontWeight: 500, lineHeight: 1.5,
                fontFamily: T.font.display, marginBottom: 4,
              }}>{d.action}</div>
              <div style={{
                fontSize: 10, color: T.textDim, lineHeight: 1.5,
              }}>{d.reason}</div>
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                <span style={{
                  padding: "2px 6px", borderRadius: 4, fontSize: 8, fontWeight: 800,
                  background: `${urgencyColor[d.urgency] || T.amber}15`,
                  color: urgencyColor[d.urgency] || T.amber,
                  textTransform: "uppercase", letterSpacing: 1,
                }}>{d.urgency}</span>
                <span style={{
                  padding: "2px 6px", borderRadius: 4, fontSize: 8, fontWeight: 800,
                  background: `${T.lavender}12`, color: T.lavender,
                  textTransform: "uppercase", letterSpacing: 1,
                }}>{d.category}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes strategySlide {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── GROWTH TIMELINE (features/timeline/GrowthTimeline) ──────────

const TIMELINE_TYPES = {
  lead:      { icon: "📩", label: "New Lead", color: T.lavender },
  content:   { icon: "📱", label: "Content Posted", color: T.accent },
  sale:      { icon: "💰", label: "Sale / Deposit", color: T.success },
  delivery:  { icon: "📦", label: "Delivery", color: T.sky },
  milestone: { icon: "⭐", label: "Milestone", color: T.amber },
};

// Seed events so timeline never looks empty
const SEED_TIMELINE = [
  { id: "seed-1", date: "2025-04-10", type: "lead", title: "Ada — Birthday dress enquiry", description: "Found via Instagram DM after seeing transformation reel", isDemo: true },
  { id: "seed-2", date: "2025-04-12", type: "content", title: "Ankara transformation reel posted", description: "Fabric-to-finish video — 15 sec edit with trending audio", isDemo: true },
  { id: "seed-3", date: "2025-04-14", type: "sale", title: "Deposit received — ₦30,000", description: "Ada confirmed bespoke birthday dress order", isDemo: true },
  { id: "seed-4", date: "2025-04-18", type: "delivery", title: "Birthday dress delivered to Ada", description: "Client loved the fit — shared photos on her IG story", isDemo: true },
  { id: "seed-5", date: "2025-04-19", type: "milestone", title: "First 5-star Google review", description: "Ada left a glowing review — social proof growing", isDemo: true },
];

function GrowthTimeline() {
  const { state, actions } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "lead", title: "", description: "", date: "" });

  const addEvent = () => {
    if (!form.title.trim()) return;
    actions.addTimelineEvent(form);
    setForm({ type: "lead", title: "", description: "", date: "" });
    setShowForm(false);
  };

  // Show real events if any, otherwise show seed examples
  const hasRealEvents = state.timeline.length > 0;
  const displayEvents = hasRealEvents ? state.timeline : SEED_TIMELINE;

  // Group events by date
  const grouped = {};
  for (const evt of displayEvents) {
    const d = evt.date || "Today";
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(evt);
  }
  const dateKeys = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div style={{ animation: "slideUp .5s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <Label color={T.accent}>Business History</Label>
          <Heading size={20}>Growth Timeline</Heading>
          <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>Every lead, sale, and milestone in one place</div>
        </div>
        <Btn onClick={() => setShowForm(!showForm)} color={T.accent} variant="ghost" small>+ Log</Btn>
      </div>

      {!hasRealEvents && (
        <div style={{
          padding: "8px 12px", borderRadius: T.radius.sm, marginBottom: 12,
          background: `${T.amber}06`, border: `1px solid ${T.amber}10`,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ fontSize: 11 }}>💡</span>
          <span style={{ fontSize: 10, color: T.amber, fontWeight: 600 }}>
            Showing example timeline — add your first event to start tracking
          </span>
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <Card style={{ marginBottom: 12, border: `1px solid ${T.accent}20` }}>
          <Label color={T.accent}>Log Business Event</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            <Select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              options={Object.entries(TIMELINE_TYPES).map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label}` }))} />
            <InputField value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="What happened? e.g. 'New enquiry from Ada'" />
            <InputField value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Details (optional)" />
            <InputField value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} placeholder="Date (e.g. 2025-04-14) — leave blank for today" />
            <Btn onClick={addEvent} color={T.accent}>Add to Timeline</Btn>
          </div>
        </Card>
      )}

      {/* Type Legend */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, overflowX: "auto", scrollbarWidth: "none" }}>
        {Object.entries(TIMELINE_TYPES).map(([k, v]) => (
          <div key={k} style={{
            padding: "4px 8px", borderRadius: 5, background: `${v.color}10`,
            border: `1px solid ${v.color}12`, display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
          }}>
            <span style={{ fontSize: 10 }}>{v.icon}</span>
            <span style={{ fontSize: 8, color: v.color, fontWeight: 700, letterSpacing: 0.5 }}>{v.label}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      {dateKeys.map(dateKey => (
        <div key={dateKey} style={{ marginBottom: 16 }}>
          {/* Date header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: T.accent,
              boxShadow: `0 0 8px ${T.accent}40`,
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{dateKey}</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          {/* Events for this date */}
          {grouped[dateKey].map((evt, i) => {
            const typeInfo = TIMELINE_TYPES[evt.type] || TIMELINE_TYPES.milestone;
            return (
              <div key={evt.id || i} style={{
                display: "flex", gap: 10, marginBottom: 4, marginLeft: 16,
                position: "relative",
              }}>
                {/* Vertical connector line */}
                {i < grouped[dateKey].length - 1 && (
                  <div style={{
                    position: "absolute", left: 15, top: 36, bottom: -4, width: 1,
                    background: `${typeInfo.color}20`,
                  }} />
                )}

                {/* Icon */}
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: `${typeInfo.color}10`, border: `1px solid ${typeInfo.color}15`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, position: "relative", zIndex: 1,
                }}>{typeInfo.icon}</div>

                {/* Content */}
                <div style={{
                  flex: 1, padding: "10px 12px", borderRadius: T.radius.md,
                  background: T.surface, border: `1px solid ${T.border}`,
                  position: "relative",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                        <Badge color={typeInfo.color}>{typeInfo.label}</Badge>
                        {evt.isDemo && <span style={{ fontSize: 7, color: T.textMute, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>sample</span>}
                      </div>
                      <div style={{ fontSize: 12, color: T.white, fontWeight: 500, lineHeight: 1.5 }}>{evt.title}</div>
                      {evt.description && (
                        <div style={{ fontSize: 10, color: T.textDim, lineHeight: 1.5, marginTop: 3 }}>{evt.description}</div>
                      )}
                    </div>
                    {!evt.isDemo && (
                      <button onClick={() => actions.removeTimelineEvent(evt.id)} style={{
                        background: "none", border: "none", cursor: "pointer", color: T.textMute,
                        fontSize: 10, padding: "2px 4px", fontFamily: T.font.body,
                      }}>✕</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LAYER 6 — SHELL (App Layout, Navigation, Routing)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const NAV_ITEMS = [
  { id: "command", label: "Command", icon: "⚡", color: T.accent },
  { id: "strategy", label: "Strategy", icon: "🧭", color: T.accent },
  { id: "timeline", label: "Timeline", icon: "📈", color: T.accent },
  { id: "memory", label: "Memory", icon: "🧠", color: T.amber },
  { id: "opportunities", label: "Leads", icon: "🎯", color: T.mint },
  { id: "radar", label: "Radar", icon: "📡", color: T.coral },
  { id: "pipeline", label: "Pipeline", icon: "🔄", color: T.lavender },
  { id: "assistant", label: "AI Chat", icon: "💬", color: T.mint },
  { id: "content", label: "Content", icon: "📸", color: T.accent },
  { id: "revenue", label: "Revenue", icon: "💰", color: T.success },
  { id: "report", label: "Report", icon: "📊", color: T.sky },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PROFILE MENU — Top-right dropdown with logout
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ProfileMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Vera";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "#111118", border: `1px solid ${T.border}`, color: T.text,
          padding: "7px 11px", borderRadius: T.radius.sm, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 11, fontFamily: T.font.body, fontWeight: 600,
        }}
      >
        <span>👤</span>
        <span style={{ color: T.accent }}>{displayName}</span>
        <span style={{ fontSize: 8, color: T.textMute }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "#111118", border: `1px solid ${T.border}`,
          borderRadius: T.radius.md, boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
          minWidth: 170, zIndex: 200, overflow: "hidden",
        }}>
          <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 9, color: T.textMute, fontFamily: T.font.body, letterSpacing: 1 }}>SIGNED IN AS</div>
            <div style={{ fontSize: 11, color: T.text, fontFamily: T.font.body, marginTop: 3, fontWeight: 600 }}>{user?.email}</div>
          </div>
          <button
            onClick={onSignOut}
            style={{
              width: "100%", padding: "10px 14px", background: "none", border: "none",
              color: T.danger, fontSize: 12, fontFamily: T.font.body, fontWeight: 600,
              cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8,
            }}
          >
            🚪 Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TODAY'S FOCUS CARD — AI insight at top of dashboard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TodayFocusCard() {
  const { state } = useStore();
  const raw = state.aiBriefing;
  const lines = typeof raw === "string" && raw.trim() ? raw.split("\n") : null;
  const action = lines ? lines[0] : "Post a transformation reel today.";
  const reason = lines && lines.length > 1
    ? lines.slice(1).join(" ")
    : "Transformation content is currently generating the highest engagement in Abuja fashion audiences.";

  return (
    <div style={{
      margin: "14px 16px 0", padding: "14px 16px",
      borderRadius: T.radius.md, background: "#121218",
      border: `1px solid ${T.accent}20`,
      boxShadow: "0 4px 24px rgba(212,165,116,0.07)",
      position: "relative", zIndex: 2,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>🎯</span>
        <span style={{
          fontSize: 9, letterSpacing: 4, color: T.accent,
          textTransform: "uppercase", fontWeight: 800, fontFamily: T.font.body,
        }}>Today's Focus</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: T.accent, fontWeight: 700, fontFamily: T.font.body, marginBottom: 3 }}>🎯 Priority Action</div>
          <div style={{ fontSize: 13, color: T.text, fontFamily: T.font.body, lineHeight: 1.55 }}>{action}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.mint, fontWeight: 700, fontFamily: T.font.body, marginBottom: 3 }}>📈 Reason</div>
          <div style={{ fontSize: 12, color: T.textDim, fontFamily: T.font.body, lineHeight: 1.55 }}>{reason}</div>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  APP SHELL — Main layout
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AppShell() {
  const { state, actions, dispatch, user } = useStore();
  const [splash, setSplash] = useState(true);
  const [fadeIn, setFadeIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function refreshDashboard() {
    if (refreshing) return;
    setRefreshing(true);
    await hydrateStore(dispatch);
    setRefreshing(false);
  }

  useEffect(() => {
    setTimeout(() => setFadeIn(true), 80);
    setTimeout(() => setSplash(false), 2600);
  }, []);

  if (splash) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: T.bg, fontFamily: T.font.display, overflow: "hidden", position: "relative",
      }}>
        <link href={FONTS_URL} rel="stylesheet" />
        <Glow color={T.accent} size={500} x="50%" y="40%" />
        <Glow color={T.lavender} size={350} x="65%" y="65%" />
        <div style={{
          textAlign: "center", opacity: fadeIn ? 1 : 0, transform: fadeIn ? "none" : "translateY(30px)",
          transition: "all 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <div style={{ fontSize: 9, letterSpacing: 8, color: T.accent, fontFamily: T.font.body, fontWeight: 800, textTransform: "uppercase", marginBottom: 18 }}>
            AI Growth Operating System
          </div>
          <div style={{ fontSize: 46, fontWeight: 300, color: T.white, lineHeight: 1.1 }}>Vee Urban Vogue</div>
          <div style={{
            fontSize: 10, letterSpacing: 2, color: T.accent, fontFamily: T.font.body,
            fontWeight: 700, marginTop: 10, textTransform: "uppercase",
          }}>Built for Vera Chioma</div>
          <div style={{ fontSize: 13, color: T.textMute, fontFamily: T.font.body, fontWeight: 300, marginTop: 8 }}>v4.0 — Welcome · Snapshot · Strategy · Timeline</div>
          <div style={{ width: 50, height: 1, background: `linear-gradient(90deg, transparent, ${T.accent}, transparent)`, margin: "24px auto 0", animation: "breathe 2s ease infinite" }} />
        </div>
        <style>{`@keyframes breathe{0%,100%{opacity:.3;width:50px}50%{opacity:1;width:90px}}`}</style>
      </div>
    );
  }

  const pb = PLAYBOOKS[state.currentDay];
  const activeNav = NAV_ITEMS.find(n => n.id === state.activeTab);

  const renderTab = () => {
    switch (state.activeTab) {
      case "command": return <CommandCenter />;
      case "strategy": return <StrategyDashboard />;
      case "timeline": return <GrowthTimeline />;
      case "memory": return <GrowthMemoryDashboard />;
      case "opportunities": return <OpportunitiesDashboard />;
      case "radar": return <EventRadar />;
      case "pipeline": return <PipelineManager />;
      case "assistant": return <ConversationAssistant />;
      case "content": return <ContentEngine />;
      case "revenue": return <RevenueForecasting />;
      case "report": return <WeeklyReport />;
      default: return <CommandCenter />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.font.body, position: "relative", overflow: "hidden" }}>
      <link href={FONTS_URL} rel="stylesheet" />
      <Glow color={activeNav?.color || T.accent} size={500} x="-10%" y="-5%" />
      <Glow color={T.lavender} size={400} x="110%" y="90%" />

      {/* Header */}
      <div style={{ padding: "16px 16px 0", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 8, letterSpacing: 5, color: T.accent, textTransform: "uppercase", fontWeight: 800 }}>Growth OS v4.0</div>
            <div style={{ fontFamily: T.font.display, fontSize: 22, fontWeight: 400, color: T.white, marginTop: 2 }}>Vee Urban Vogue</div>
            <div style={{ fontSize: 10, letterSpacing: 1, color: T.accent, fontWeight: 700, marginTop: 2 }}>Built for Vera Chioma</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ScoreRing
              score={PLAYBOOKS[state.currentDay]?.tasks.length ? Math.round(Object.keys(state.completedTasks).filter(k => k.startsWith(state.currentDay) && state.completedTasks[k]).length / PLAYBOOKS[state.currentDay].tasks.length * 100) : 0}
              size={44} color={pb?.color || T.accent}
            />
            <button
              onClick={refreshDashboard}
              title="Refresh Insights"
              disabled={refreshing}
              style={{
                background: "#111118", border: `1px solid ${T.border}`, color: T.text,
                padding: "8px 10px", borderRadius: T.radius.sm, cursor: refreshing ? "default" : "pointer",
                fontSize: 15, lineHeight: 1, display: "flex", alignItems: "center",
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              <span style={{ display: "inline-block", animation: refreshing ? "spin 0.7s linear infinite" : "none" }}>🔄</span>
            </button>
            <ProfileMenu user={user} onSignOut={actions.signOut} />
          </div>
        </div>
      </div>

      {/* Today's Focus Card */}
      <TodayFocusCard />

      {/* ── V4 Dashboard Narrative: Welcome → Situation → Decision ── */}
      <WelcomePanel />
      <GrowthSnapshot />
      <StrategyPreview />

      {/* Navigation */}
      <div style={{
        display: "flex", gap: 2, padding: "10px 10px 8px", overflowX: "auto",
        scrollbarWidth: "none", position: "relative", zIndex: 2,
      }}>
        {NAV_ITEMS.map(n => (
          <button key={n.id} onClick={() => actions.setTab(n.id)} style={{
            padding: "6px 10px", borderRadius: 7, border: "none", cursor: "pointer",
            background: state.activeTab === n.id ? `${n.color}12` : "transparent",
            color: state.activeTab === n.id ? n.color : T.textMute,
            fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", fontFamily: T.font.body,
            transition: "all 0.3s",
            outline: state.activeTab === n.id ? `1px solid ${n.color}18` : "none",
          }}>
            <span style={{ marginRight: 3 }}>{n.icon}</span>{n.label}
          </button>
        ))}
      </div>
      <div style={{ height: 1, background: T.border }} />

      {/* Content */}
      <div style={{ padding: "14px 14px 100px", position: "relative", zIndex: 2 }}>
        {renderTab()}
      </div>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        body { background: ${T.bg}; }
        input::placeholder, textarea::placeholder { color: ${T.textMute}; }
        option { background: ${T.bg}; }
      `}</style>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  AUTH GATE — Login/Signup screen matching luxury dark theme
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AuthGate({ children }) {
  const { user, authLoading, actions } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: T.bg, fontFamily: T.font.body,
      }}>
        <link href={FONTS_URL} rel="stylesheet" />
        <Glow color={T.accent} size={400} x="50%" y="50%" />
        <div style={{ fontFamily: T.font.display, fontSize: 24, color: T.white, marginBottom: 8 }}>Vee Urban Vogue</div>
        <div style={{ fontSize: 10, color: T.accent, letterSpacing: 3, textTransform: "uppercase", fontWeight: 700 }}>Loading...</div>
      </div>
    );
  }

  if (user) return children;

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (isSignUp) await actions.signUp(email, password);
      else await actions.signIn(email, password);
    } catch (err) {
      setError(err.message || "Authentication failed");
    }
    setSubmitting(false);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: T.bg, fontFamily: T.font.body, position: "relative", overflow: "hidden",
    }}>
      <link href={FONTS_URL} rel="stylesheet" />
      <Glow color={T.accent} size={500} x="50%" y="35%" />
      <Glow color={T.lavender} size={300} x="70%" y="70%" />

      <div style={{
        width: 340, padding: "36px 28px", borderRadius: T.radius.xl,
        background: T.surface, border: `1px solid ${T.border}`,
        position: "relative", zIndex: 1, boxShadow: T.shadow,
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 9, letterSpacing: 6, color: T.accent, textTransform: "uppercase", fontWeight: 800, marginBottom: 12 }}>
            Growth Operating System
          </div>
          <div style={{ fontFamily: T.font.display, fontSize: 32, color: T.white, fontWeight: 300 }}>
            Vee Urban Vogue
          </div>
          <div style={{ fontSize: 10, color: T.accent, letterSpacing: 1, fontWeight: 700, marginTop: 6 }}>
            Built for Vera Chioma
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email"
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{
              padding: "12px 14px", borderRadius: T.radius.sm, border: `1px solid ${T.borderLit}`,
              background: T.bg, color: T.text, fontSize: 13, fontFamily: T.font.body, outline: "none",
            }} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password"
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{
              padding: "12px 14px", borderRadius: T.radius.sm, border: `1px solid ${T.borderLit}`,
              background: T.bg, color: T.text, fontSize: 13, fontFamily: T.font.body, outline: "none",
            }} />
          {error && (
            <div style={{ fontSize: 11, color: T.danger, padding: "6px 10px", borderRadius: T.radius.sm, background: `${T.danger}10`, border: `1px solid ${T.danger}15` }}>
              {error}
            </div>
          )}
          <button onClick={handleSubmit} disabled={submitting || !email || !password} style={{
            padding: "13px", borderRadius: T.radius.sm, border: "none", marginTop: 4,
            background: submitting ? T.textMute : T.accent, color: T.bg, fontSize: 13, fontWeight: 700,
            cursor: submitting ? "default" : "pointer", fontFamily: T.font.body, letterSpacing: 0.5,
            transition: "all 0.3s",
          }}>{submitting ? "Signing in..." : isSignUp ? "Create Account" : "Sign In"}</button>
          <button onClick={() => { setIsSignUp(!isSignUp); setError(null); }} style={{
            background: "none", border: "none", color: T.textDim, fontSize: 11,
            cursor: "pointer", fontFamily: T.font.body, padding: "4px",
          }}>{isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}</button>
        </div>
      </div>

      <style>{`
        body { background: ${T.bg}; margin: 0; }
        input::placeholder { color: ${T.textMute}; }
      `}</style>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ROOT EXPORT — StoreProvider → AuthGate → AppShell
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function VeeGrowthOS_V4() {
  return (
    <StoreProvider>
      <AuthGate>
        <AppShell />
      </AuthGate>
    </StoreProvider>
  );
}
