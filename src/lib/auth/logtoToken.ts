import { isLogtoAuthMode, logtoApiResource } from "./logtoConfig";

type AccessTokenProvider = (
  resource: string
) => Promise<string | null | undefined>;

let accessTokenProvider: AccessTokenProvider | null = null;

export function setLogtoAccessTokenProvider(
  provider: AccessTokenProvider | null
) {
  accessTokenProvider = provider;
}

export async function getLogtoAccessToken(): Promise<string | null> {
  if (!isLogtoAuthMode || !accessTokenProvider) {
    return null;
  }

  try {
    return (await accessTokenProvider(logtoApiResource)) ?? null;
  } catch {
    // The API request will receive the normal 401 response when the user is
    // not authenticated or Logto cannot refresh the cached token.
    return null;
  }
}
