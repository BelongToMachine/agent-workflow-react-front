export const devOidcStandardScopes = ["openid", "profile", "email"] as const;

export type DevOidcStandardScope = (typeof devOidcStandardScopes)[number];
