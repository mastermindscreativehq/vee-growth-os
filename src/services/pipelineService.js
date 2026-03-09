import { supabase } from "../lib/supabaseClient";

const VALID_STAGES = ["lead", "conversation", "quoted", "deposit", "production", "delivered"];

export const pipelineService = {
  async getPipelineClients() {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    } catch (err) {
      console.error("[pipelineService] getPipelineClients:", err.message);
      return [];
    }
  },

  async addClient({ name, event_type = "", stage = "lead", price = 0, notes = "" }) {
    try {
      const { data, error } = await supabase
        .from("clients")
        .insert({ name, event_type, stage, price, notes })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error("[pipelineService] addClient:", err.message);
      throw err;
    }
  },

  async moveClientStage(clientId, newStage, notes = "") {
    if (!VALID_STAGES.includes(newStage)) {
      throw new Error(`Invalid stage: ${newStage}`);
    }
    try {
      const { data, error } = await supabase
        .from("clients")
        .update({ stage: newStage })
        .eq("id", clientId)
        .select()
        .single();
      if (error) throw error;

      // Log stage change to pipeline history
      await supabase
        .from("pipeline")
        .insert({ client_id: clientId, stage: newStage, notes });

      return data;
    } catch (err) {
      console.error("[pipelineService] moveClientStage:", err.message);
      throw err;
    }
  },
};
