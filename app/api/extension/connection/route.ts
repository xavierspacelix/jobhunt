import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isValidExtensionInstallationId } from "@/lib/extension-auth";

export const runtime = "nodejs";

export const GET = auth(async (request) => {
  const email = request.auth?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const installationId = new URL(request.url).searchParams.get("installationId");
  if (installationId && !isValidExtensionInstallationId(installationId)) {
    return NextResponse.json({ error: "Invalid installation" }, { status: 400 });
  }
  const connections = await prisma.extensionConnection.findMany({
    where: { user: { email }, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { createdAt: true, lastUsedAt: true, installationId: true },
    orderBy: { createdAt: "asc" },
  });
  if (!connections.length) {
    return NextResponse.json({
      connected: false,
      activeInstallations: 0,
      currentBrowserConnected: false,
    });
  }

  return NextResponse.json({
    connected: true,
    activeInstallations: connections.length,
    currentBrowserConnected: installationId
      ? connections.some((connection) => connection.installationId === installationId)
      : false,
    createdAt: connections[0].createdAt,
    lastUsedAt: connections.reduce<Date | null>(
      (latest, connection) =>
        !latest || (connection.lastUsedAt && connection.lastUsedAt > latest)
          ? connection.lastUsedAt
          : latest,
      null,
    ),
  });
});

export const DELETE = auth(async (request) => {
  const email = request.auth?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.$transaction([
    prisma.extensionConnection.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.extensionAuthCode.deleteMany({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({ connected: false });
});
