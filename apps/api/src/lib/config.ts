import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3001"),
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  databaseUrl: process.env.DATABASE_URL || "",
  
  // Routing services (self-hosted or public)
  valhallaUrl: process.env.VALHALLA_URL || "https://valhalla1.openstreetmap.de",
  nominatimUrl: process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org",
  
  // Limits per plan
  planLimits: {
    FREE: { deliveriesPerMonth: 500, webhooks: 1 },
    GROWTH: { deliveriesPerMonth: 5000, webhooks: 5 },
    SCALE: { deliveriesPerMonth: 50000, webhooks: 20 },
    MANAGED: { deliveriesPerMonth: Infinity, webhooks: 100 },
  },
} as const;
