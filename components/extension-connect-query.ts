export type ExtensionConnectRequest = {
  redirectUri: string;
  state: string;
  codeChallenge: string;
  installationId: string;
};

export type ExtensionConnectQueryResult =
  | { success: true; data: ExtensionConnectRequest }
  | { success: false; error: string };

const EXTENSION_REDIRECT_PATTERN =
  /^https:\/\/[a-p]{32}\.chromiumapp\.org\/connected$/;
const STATE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
const CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const INSTALLATION_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const BUNDLED_EXTENSION_REDIRECT =
  "https://lokhjkfokakakehiojciicjhfokmkldg.chromiumapp.org/connected";

export function parseExtensionConnectQuery(
  params: URLSearchParams,
): ExtensionConnectQueryResult {
  for (const key of [
    "redirect_uri",
    "state",
    "code_challenge",
    "installation_id",
  ] as const) {
    if (params.getAll(key).length !== 1) {
      return {
        success: false,
        error: "Permintaan koneksi extension tidak lengkap atau tidak valid.",
      };
    }
  }

  const redirectUri = params.get("redirect_uri") ?? "";
  const state = params.get("state") ?? "";
  const codeChallenge = params.get("code_challenge") ?? "";
  const installationId = params.get("installation_id") ?? "";

  if (
    !EXTENSION_REDIRECT_PATTERN.test(redirectUri) ||
    redirectUri !== BUNDLED_EXTENSION_REDIRECT ||
    !STATE_PATTERN.test(state) ||
    !INSTALLATION_ID_PATTERN.test(installationId)
  ) {
    return {
      success: false,
      error: "Permintaan koneksi extension tidak lengkap atau tidak valid.",
    };
  }

  if (!CODE_CHALLENGE_PATTERN.test(codeChallenge)) {
    return {
      success: false,
      error:
        "Kode keamanan extension tidak valid. Mulai ulang koneksi dari extension.",
    };
  }

  return {
    success: true,
    data: { redirectUri, state, codeChallenge, installationId },
  };
}
