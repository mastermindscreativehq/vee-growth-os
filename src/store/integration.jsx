// ╔══════════════════════════════════════════════════════════════════╗
// ║  STORE INTEGRATION — connects V4 actions to Supabase            ║
// ║  Replace the existing StoreProvider in the V4 app with this     ║
// ╚══════════════════════════════════════════════════════════════════╝
//
// This file shows the exact changes needed inside the V4 JSX app.
// Each action now does TWO things:
//   1. Updates local state immediately (optimistic UI)
//   2. Persists to Supabase in the background
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import {
  supabase,
  AuthService,
  ClientsDB,
  GrowthMemoryDB,
  TimelineDB,
  OpportunitiesDB,
  EventsDB,
  OrdersDB,
  AICacheDB,
  ContentCalendarDB,
  TasksDB,
  MetricsDB,
  hydrateStore,
} from "./services/supabase.js";

// ── UPDATED StoreProvider ───────────────────────────────────────
// Replace the existing StoreProvider function with this one.
// The reducer stays EXACTLY the same — we only change the actions
// to add async Supabase calls after the dispatch.

function StoreProvider({ children }) {
  const [state, dispatch] = React.useReducer(storeReducer, INITIAL_STATE);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Auth listener ──
  useEffect(() => {
    AuthService.getUser().then(u => {
      setUser(u);
      if (u) hydrateStore(dispatch).finally(() => setLoading(false));
      else setLoading(false);
    });
    const { data: { subscription } } = AuthService.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) hydrateStore(dispatch);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Actions: dispatch locally THEN persist to Supabase ──
  const actions = useMemo(() => ({
    // Navigation (local only, no DB)
    setTab: (tab) => dispatch({ type: "SET_TAB", payload: tab }),
    setDay: (day) => dispatch({ type: "SET_DAY", payload: day }),

    // Tasks — optimistic local + persist
    toggleTask: async (key) => {
      dispatch({ type: "TOGGLE_TASK", payload: key });
      await TasksDB.toggle(key);
    },

    // Pipeline — optimistic local + persist
    addClient: async (client) => {
      dispatch({ type: "ADD_CLIENT", payload: client });
      await ClientsDB.add(client);
    },
    moveClient: async (id, stage) => {
      dispatch({ type: "MOVE_CLIENT", payload: { id, stage } });
      await ClientsDB.updateStage(id, stage);
    },
    removeClient: async (id) => {
      dispatch({ type: "REMOVE_CLIENT", payload: id });
      await ClientsDB.remove(id);
    },

    // Opportunities — optimistic + persist
    addOpportunity: async (opp) => {
      dispatch({ type: "ADD_OPPORTUNITY", payload: opp });
      await OpportunitiesDB.add(opp);
    },
    removeOpportunity: async (id) => {
      dispatch({ type: "REMOVE_OPPORTUNITY", payload: id });
      await OpportunitiesDB.remove(id);
    },
    convertOpportunity: async (id) => {
      dispatch({ type: "CONVERT_OPPORTUNITY", payload: id });
      await OpportunitiesDB.convertToClient(id);
    },

    // Events — optimistic + persist
    addEvent: async (evt) => {
      dispatch({ type: "ADD_EVENT", payload: evt });
      await EventsDB.add(evt);
    },
    removeEvent: async (id) => {
      dispatch({ type: "REMOVE_EVENT", payload: id });
      await EventsDB.remove(id);
    },

    // Revenue — optimistic + persist
    setOrders: async (orders) => {
      dispatch({ type: "SET_ORDERS", payload: orders });
      for (const [tier, count] of Object.entries(orders)) {
        await OrdersDB.upsert(tier, count);
      }
    },

    // Growth Metrics — optimistic + persist
    setGrowthMetric: async (m) => {
      dispatch({ type: "SET_GROWTH_METRIC", payload: m });
      // Merge with existing and upsert
      const current = { ...state.growthMetrics, ...m };
      await MetricsDB.upsert(current);
    },

    // AI outputs — optimistic + cache to DB
    setAiBriefing: async (b) => {
      dispatch({ type: "SET_AI_BRIEFING", payload: b });
      const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
      await AICacheDB.set("briefing", b, day);
    },
    setAiLoading: (l) => dispatch({ type: "SET_AI_LOADING", payload: l }),

    setContentCalendar: async (c) => {
      dispatch({ type: "SET_CONTENT_CALENDAR", payload: c });
      await ContentCalendarDB.save(c);
    },

    setWeeklyReport: async (r) => {
      dispatch({ type: "SET_WEEKLY_REPORT", payload: r });
      await AICacheDB.set("weekly_report", r);
    },

    // Growth Memory — optimistic + persist
    addMemory: async (m) => {
      dispatch({ type: "ADD_MEMORY", payload: m });
      await GrowthMemoryDB.add(m);
    },
    removeMemory: async (id) => {
      dispatch({ type: "REMOVE_MEMORY", payload: id });
      await GrowthMemoryDB.remove(id);
    },
    updateMemory: async (id, updates) => {
      dispatch({ type: "UPDATE_MEMORY", payload: { id, updates } });
      await GrowthMemoryDB.update(id, updates);
    },

    // Decision Engine — optimistic + cache
    setTodayDecision: async (d) => {
      dispatch({ type: "SET_TODAY_DECISION", payload: d });
      const day = new Date().toLocaleDateString("en-US", { weekday: "long" });
      await AICacheDB.set("decision", d, day);
    },
    setWeeklyFocus: async (f) => {
      dispatch({ type: "SET_WEEKLY_FOCUS", payload: f });
      await AICacheDB.set("weekly_focus", f);
    },

    // Timeline — optimistic + persist
    addTimelineEvent: async (e) => {
      dispatch({ type: "ADD_TIMELINE_EVENT", payload: e });
      await TimelineDB.add(e);
    },
    removeTimelineEvent: async (id) => {
      dispatch({ type: "REMOVE_TIMELINE_EVENT", payload: id });
      await TimelineDB.remove(id);
    },

    // Auth
    signIn: AuthService.signIn,
    signUp: AuthService.signUp,
    signOut: AuthService.signOut,
  }), [state.growthMetrics]);

  return (
    <StoreContext.Provider value={{ state, dispatch, actions, user, loading }}>
      {children}
    </StoreContext.Provider>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  AUTH GATE — Wraps the app to require login
//  Add this inside the root export
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AuthGate({ children }) {
  const { user, loading, actions } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: T.bg, color: T.accent, fontFamily: T.font.body, fontSize: 12,
      }}>Loading...</div>
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
      setError(err.message);
    }
    setSubmitting(false);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: T.bg, fontFamily: T.font.body, position: "relative",
    }}>
      <Glow color={T.accent} size={400} x="50%" y="40%" />
      <div style={{
        width: 320, padding: 32, borderRadius: T.radius.xl,
        background: T.surface, border: `1px solid ${T.border}`,
        position: "relative", zIndex: 1,
      }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: T.font.display, fontSize: 28, color: T.white, marginBottom: 4 }}>
            Vee Urban Vogue
          </div>
          <div style={{ fontSize: 10, color: T.accent, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>
            Growth Operating System
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
            type="email" style={{
              padding: "12px 14px", borderRadius: T.radius.sm, border: `1px solid ${T.borderLit}`,
              background: T.bg, color: T.text, fontSize: 13, fontFamily: T.font.body, outline: "none",
            }} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
            type="password" style={{
              padding: "12px 14px", borderRadius: T.radius.sm, border: `1px solid ${T.borderLit}`,
              background: T.bg, color: T.text, fontSize: 13, fontFamily: T.font.body, outline: "none",
            }} />
          {error && <div style={{ fontSize: 11, color: T.danger }}>{error}</div>}
          <button onClick={handleSubmit} disabled={submitting} style={{
            padding: "12px", borderRadius: T.radius.sm, border: "none",
            background: T.accent, color: T.bg, fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: T.font.body,
          }}>{submitting ? "..." : isSignUp ? "Create Account" : "Sign In"}</button>
          <button onClick={() => setIsSignUp(!isSignUp)} style={{
            background: "none", border: "none", color: T.textDim, fontSize: 11,
            cursor: "pointer", fontFamily: T.font.body,
          }}>{isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Updated Root Export ──
// Replace the existing export with:

export default function VeeGrowthOS_V4() {
  return (
    <StoreProvider>
      <AuthGate>
        <AppShell />
      </AuthGate>
    </StoreProvider>
  );
}
