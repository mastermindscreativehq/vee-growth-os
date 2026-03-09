import { supabase } from "../lib/supabaseClient";

export const revenueService = {
  async recordRevenue({ client_id = null, amount, source = "direct" }) {
    try {
      const { data, error } = await supabase
        .from("revenue")
        .insert({ client_id, amount, source })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error("[revenueService] recordRevenue:", err.message);
      throw err;
    }
  },

  async getRevenueByMonth() {
    try {
      const { data, error } = await supabase
        .from("revenue")
        .select("amount, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Group by YYYY-MM
      const byMonth = {};
      for (const row of data ?? []) {
        const month = row.created_at.slice(0, 7); // "YYYY-MM"
        byMonth[month] = (byMonth[month] ?? 0) + (row.amount ?? 0);
      }
      return byMonth;
    } catch (err) {
      console.error("[revenueService] getRevenueByMonth:", err.message);
      return {};
    }
  },

  async getRevenueSummary() {
    try {
      const { data, error } = await supabase
        .from("revenue")
        .select("amount, source, created_at");
      if (error) throw error;

      const rows = data ?? [];
      const total = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);

      const currentMonth = new Date().toISOString().slice(0, 7);
      const thisMonth = rows
        .filter((r) => r.created_at.startsWith(currentMonth))
        .reduce((sum, r) => sum + (r.amount ?? 0), 0);

      const bySource = {};
      for (const r of rows) {
        bySource[r.source] = (bySource[r.source] ?? 0) + (r.amount ?? 0);
      }

      return { total, thisMonth, bySource };
    } catch (err) {
      console.error("[revenueService] getRevenueSummary:", err.message);
      return { total: 0, thisMonth: 0, bySource: {} };
    }
  },
};
