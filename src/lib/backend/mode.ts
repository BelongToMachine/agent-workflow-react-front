const apiMode = process.env.NEXT_PUBLIC_API_MODE || "fastapi-proxy";

export const isFastApiDirectMode =
  process.env.NODE_ENV !== "production" && apiMode === "fastapi-direct";

export const isFastApiProxyMode =
  process.env.NODE_ENV !== "production" && apiMode === "fastapi-proxy";

export const fastApiWorkspaceId =
  process.env.NEXT_PUBLIC_WORKSPACE_ID ||
  "00000000-0000-0000-0000-000000000001";

export const fastApiBrowserBaseUrl = (
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");
