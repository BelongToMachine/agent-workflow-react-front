export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isMockDatabase = process.env.MOCK_DB === "1";
export const isChatLimitsDisabled = process.env.DISABLE_CHAT_LIMITS === "1";
export const isGuestAccessEnabled =
  !isProductionEnvironment && process.env.DISABLE_GUEST_AUTH !== "1";
export const isPublicRegistrationEnabled =
  !isProductionEnvironment || process.env.ALLOW_PUBLIC_REGISTRATION === "1";

export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export const guestRegex = /^guest-\d+$/;

export const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

export const DUMMY_PASSWORD = "frontend-only";

export const suggestions = [
  "找出价格低于 10 美元、交期不超过 30 天的家居产品，并列出供应商和 MOQ。",
  "推荐适合土耳其卖家的产品：价格不高于 8 美元、MOQ 不超过 500、交期不超过 30 天。",
  "查看内容计划中已经安排拍摄的选题，并按拍摄状态整理。",
  "找出运营数据里缺少价格、供应商或资质信息的产品。",
];
