import { isLogtoAuthMode } from "../auth/logtoConfig";

const apiMode = process.env.NEXT_PUBLIC_API_MODE || "fastapi-proxy";
const isProduction = import.meta.env.PROD;

export const isFastApiDirectMode =
  (!isProduction && apiMode === "fastapi-direct") ||
  (isProduction && isLogtoAuthMode);

export const isFastApiProxyMode =
  !isProduction && apiMode === "fastapi-proxy";

export const fastApiWorkspaceId =
  process.env.NEXT_PUBLIC_WORKSPACE_ID ||
  "00000000-0000-0000-0000-000000000001";

export const fastApiBrowserBaseUrl = (
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");
