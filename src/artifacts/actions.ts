"use server";

import { auth } from "@/app/(auth)/auth";
import { actorHasPermission, getCurrentActor } from "@/lib/auth/authorization";
import { createNextAuthBridgeHeaders } from "@/lib/auth/nextauth-bridge";
import { fetchFastApi, isFastApiBackendEnabled } from "@/lib/backend/fastapi";
import { getDocumentsById, getSuggestionsByDocumentId } from "@/lib/db/queries";
import type { Suggestion } from "@/lib/db/schema";

export async function getSuggestions({ documentId }: { documentId: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (isFastApiBackendEnabled) {
    const actor = await getCurrentActor();

    if (!actor || !actorHasPermission(actor, "document.read")) {
      throw new Error("Forbidden");
    }

    try {
      const response = await fetchFastApi(
        `/api/v1/suggestions?documentId=${encodeURIComponent(documentId)}&workspace_id=${encodeURIComponent(actor.workspaceId)}`,
        {
          headers: {
            ...createNextAuthBridgeHeaders({
              email: session.user.email ?? null,
              isGuest: actor.isGuest,
              permissions: actor.permissions,
              role: actor.role,
              subject: actor.userId,
              workspaceId: actor.workspaceId,
            }),
            "x-forwarded-by": "nextjs-bff",
          },
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error("Suggestion lookup failed");
      }

      const payload = (await response.json()) as unknown;
      if (!Array.isArray(payload)) {
        throw new Error("Suggestion response is invalid");
      }

      return payload as Suggestion[];
    } catch (error) {
      throw new Error("Unable to load suggestions", { cause: error });
    }
  }

  const documents = await getDocumentsById({
    id: documentId,
    userId: session.user.id,
  });

  if (documents.length === 0) {
    throw new Error("Forbidden");
  }

  const suggestions = await getSuggestionsByDocumentId({ documentId });
  return suggestions ?? [];
}
