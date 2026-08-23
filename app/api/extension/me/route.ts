import {
  authenticateExtensionRequest,
  extensionApiResponse,
  extensionOptionsResponse,
  getExtensionRequestOrigin,
  getClientAddress,
} from "@/lib/extension-api";
import { extensionApiRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export const OPTIONS = extensionOptionsResponse;

export async function GET(request: Request) {
  const origin = getExtensionRequestOrigin(request);
  if (!origin) {
    return Response.json({ error: "Forbidden origin" }, { status: 403 });
  }
  const address = getClientAddress(request);
  if (
    !extensionApiRateLimit(`ip:${address}`)
  ) {
    return extensionApiResponse(origin, { error: "Rate limit exceeded" }, 429);
  }

  const connection = await authenticateExtensionRequest(
    request,
    "EXTENSION_ACCOUNT_READ",
  );
  if (!connection) {
    return extensionApiResponse(origin, { error: "Unauthorized" }, 401);
  }
  if (!extensionApiRateLimit(`connection:${connection.id}`)) {
    return extensionApiResponse(origin, { error: "Rate limit exceeded" }, 429);
  }
  return extensionApiResponse(origin, {
    connected: true,
    email: connection.user.email,
    name: connection.user.name,
  });
}
