import { analyticsService } from "./analyticsService";
import { revenueService } from "./revenueService";

export const dashboardService = {
  async loadDashboardData() {
    try {
      const [pipelineCount, recentClients, revenueSummary] = await Promise.all([
        analyticsService.getPipelineCount(),
        analyticsService.getRecentClients(5),
        revenueService.getRevenueSummary(),
      ]);

      const stageBreakdown = recentClients.reduce((acc, client) => {
        acc[client.stage] = (acc[client.stage] ?? 0) + 1;
        return acc;
      }, {});

      return {
        pipeline: {
          total: pipelineCount,
          stageBreakdown,
        },
        revenue: {
          total: revenueSummary.total,
          thisMonth: revenueSummary.thisMonth,
          bySource: revenueSummary.bySource,
        },
        recentClients,
      };
    } catch (err) {
      console.error("[dashboardService] loadDashboardData:", err.message);
      return {
        pipeline: { total: 0, stageBreakdown: {} },
        revenue: { total: 0, thisMonth: 0, bySource: {} },
        recentClients: [],
      };
    }
  },
};
