import { FastifyInstance, FastifyRequest } from "fastify";
import { randomBytes } from "crypto";
import { db } from "../lib/db";

function generateApiKey(isLive: boolean): string {
  const prefix = isLive ? "tk_live_" : "tk_test_";
  return prefix + randomBytes(24).toString("base64url");
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    + "-" + randomBytes(3).toString("hex");
}

export async function authRoutes(app: FastifyInstance) {
  // Sign up — creates a new tenant + first API key
  app.post("/signup", async (request: FastifyRequest) => {
    const body = request.body as any;

    if (!body?.name || typeof body.name !== "string" || body.name.trim().length < 2) {
      return { error: "validation_error", message: "name is required (min 2 characters)" };
    }

    const name = body.name.trim();
    const slug = generateSlug(name);

    const tenant = await db.tenant.create({
      data: {
        name,
        slug,
        brandColor: body.brandColor || "#38bdf8",
      },
    });

    const testKey = generateApiKey(false);
    const liveKey = generateApiKey(true);

    const [testApiKey, liveApiKey] = await Promise.all([
      db.apiKey.create({
        data: {
          key: testKey,
          name: "Default Test Key",
          tenantId: tenant.id,
          isLive: false,
        },
      }),
      db.apiKey.create({
        data: {
          key: liveKey,
          name: "Default Live Key",
          tenantId: tenant.id,
          isLive: true,
        },
      }),
    ]);

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
      },
      keys: {
        test: { id: testApiKey.id, key: testKey },
        live: { id: liveApiKey.id, key: liveKey },
      },
      message: "Save your API keys — they won't be shown again in full.",
    };
  });
}
