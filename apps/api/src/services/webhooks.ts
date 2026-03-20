import { db } from "../lib/db";
import { createHmac } from "crypto";

export async function fireWebhook(tenantId: string, event: string, data: any) {
  try {
    const webhooks = await db.webhook.findMany({
      where: {
        tenantId,
        isActive: true,
        events: { has: event },
      },
    });

    for (const webhook of webhooks) {
      const payload = JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
        id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });

      const signature = createHmac("sha256", webhook.secret)
        .update(payload)
        .digest("hex");

      // Fire and forget — don't block the request
      fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-TrackKit-Signature": `sha256=${signature}`,
          "X-TrackKit-Event": event,
        },
        body: payload,
      }).catch((err) => {
        console.error(`Webhook delivery failed for ${webhook.url}:`, err.message);
        // TODO: Implement retry queue with exponential backoff
      });
    }
  } catch (err) {
    console.error("Webhook fire error:", err);
  }
}
