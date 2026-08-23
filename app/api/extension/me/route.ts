import {
  authenticateExtensionRequest,
  extensionApiResponse,
  extensionOptionsResponse,
  getExtensionRequestOrigin,
  getClientAddress,
} from "@/lib/extension-api";
import { extensionApiRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export const OPTIONS = extensionOptionsResponse;

export async function GET(request: Request) {
  const connection = await authenticateExtensionRequest(
    request,
    "EXTENSION_ACCOUNT_READ",
  );
  if (!connection) {
    const origin = getExtensionRequestOrigin(request);
    if (!origin) {
      return Response.json({ error: "Forbidden origin" }, { status: 403 });
    }
    return extensionApiResponse(origin, { error: "Unauthorized" }, 401);
  }
  const requestOrigin = request.headers.get("origin");
  const corsOrigin = requestOrigin || `chrome-extension://${connection.extensionId}`;
  const address = getClientAddress(request);
  if (!extensionApiRateLimit(`ip:${address}`)) {
    return extensionApiResponse(corsOrigin, { error: "Rate limit exceeded" }, 429);
  }
  if (!extensionApiRateLimit(`connection:${connection.id}`)) {
    return extensionApiResponse(corsOrigin, { error: "Rate limit exceeded" }, 429);
  }
  const profile = await prisma.profile.findUnique({
    where: { userId: connection.userId },
    select: { id: true },
  });
  return extensionApiResponse(corsOrigin, {
    connected: true,
    email: connection.user.email,
    name: connection.user.name,
    hasProfile: Boolean(profile),
  });
}
