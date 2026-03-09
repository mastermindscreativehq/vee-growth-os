import { supabase } from "../lib/supabaseClient";

export const analyticsService = {
  async getPipelineCount() {
    try {
      const { count, error } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    } catch (err) {
      console.error("[analyticsService] getPipelineCount:", err.message);
      return 0;
    }
  },

  async getRevenueTotal() {
    try {
      const { data, error } = await supabase
        .from("revenue")
        .select("amount");
      if (error) throw error;
      return (data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0);
    } catch (err) {
      console.error("[analyticsService] getRevenueTotal:", err.message);
      return 0;
    }
  },

  async getRecentClients(limit = 5) {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, event_type, stage, price, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    } catch (err) {
      console.error("[analyticsService] getRecentClients:", err.message);
      return [];
    }
  },
};
