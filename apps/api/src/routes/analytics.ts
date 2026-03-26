import { FastifyInstance, FastifyRequest } from "fastify";
import { db } from "../lib/db";

export async function analyticsRoutes(app: FastifyInstance) {
  // GET /v1/analytics — delivery stats, daily volume, avg times
  app.get("/", async (request: FastifyRequest) => {
    const tenant = (request as any).tenant;
    const tenantId = tenant.id;

    // Status breakdown
    const statusCounts = await db.delivery.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    });

    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      byStatus[row.status] = row._count;
    }

    // Daily delivery volume (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDeliveries = await db.delivery.findMany({
      where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, status: true, confirmedAt: true, deliveredAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by day
    const dailyVolume: Record<string, number> = {};
    for (const d of recentDeliveries) {
      const day = d.createdAt.toISOString().slice(0, 10);
      dailyVolume[day] = (dailyVolume[day] || 0) + 1;
    }

    // Fill in missing days with 0
    const dailyData: { date: string; count: number }[] = [];
    const cursor = new Date(thirtyDaysAgo);
    const today = new Date();
    while (cursor <= today) {
      const day = cursor.toISOString().slice(0, 10);
      dailyData.push({ date: day, count: dailyVolume[day] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Average delivery time (confirmed → delivered)
    const completedDeliveries = recentDeliveries.filter(
      (d) => d.status === "DELIVERED" && d.confirmedAt && d.deliveredAt
    );

    let avgDeliveryMinutes: number | null = null;
    if (completedDeliveries.length > 0) {
      const totalMs = completedDeliveries.reduce((sum, d) => {
        return sum + (d.deliveredAt!.getTime() - d.confirmedAt!.getTime());
      }, 0);
      avgDeliveryMinutes = Math.round(totalMs / completedDeliveries.length / 60000);
    }

    // Completion rate
    const totalRecent = recentDeliveries.length;
    const deliveredCount = completedDeliveries.length;
    const cancelledCount = recentDeliveries.filter((d) => d.status === "CANCELLED").length;
    const completionRate = totalRecent > 0
      ? Math.round((deliveredCount / totalRecent) * 100)
      : null;

    // Peak hours (which hour of the day gets the most deliveries)
    const hourCounts = new Array(24).fill(0);
    for (const d of recentDeliveries) {
      hourCounts[d.createdAt.getHours()]++;
    }
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

    return {
      byStatus,
      dailyVolume: dailyData,
      avgDeliveryMinutes,
      completionRate,
      cancelledCount,
      totalLast30Days: totalRecent,
      deliveredLast30Days: deliveredCount,
      peakHour,
      hourlyDistribution: hourCounts,
    };
  });
}
