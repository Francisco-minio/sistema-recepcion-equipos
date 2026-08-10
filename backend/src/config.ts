export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "servicehub-dev-secret",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:8080",
  microsoft: {
    tenantId: process.env.MS_TENANT_ID || "common",
    clientId: process.env.MS_CLIENT_ID || "",
    clientSecret: process.env.MS_CLIENT_SECRET || "",
    redirectUri: process.env.MS_REDIRECT_URI || "http://localhost:8080/api/integrations/microsoft/callback",
    scopes:
      process.env.MS_SCOPES ||
      "offline_access openid profile email Calendars.Read Calendars.Read.Shared User.Read",
  },
};
