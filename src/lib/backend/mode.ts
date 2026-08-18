export const isFastApiDirectMode =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_API_MODE === "fastapi-direct";

export const fastApiBrowserBaseUrl = (
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "");
