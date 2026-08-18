import "server-only";

import { auth } from "@/app/(auth)/auth";
import { DEFAULT_WORKSPACE_ID, isMockDatabase } from "@/lib/constants";
import { getWorkspaceMembershipForUser } from "@/lib/db/workspace-queries";
import { getEffectivePermissions, type Permission } from "@/lib/permissions";

export type CurrentActor = {
  isGuest: boolean;
  permissions: Permission[];
  role: "owner" | "admin" | "editor" | "viewer";
  userId: string;
  workspaceId: string;
  workspaceName: string;
  membershipId: string;
};

export async function getCurrentActor(): Promise<CurrentActor | null> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  if (isMockDatabase) {
    const isGuest = session.user.type === "guest";
    return {
      isGuest,
      membershipId: "mock-membership",
      permissions: [...getEffectivePermissions("owner", [], isGuest)],
      role: "owner",
      userId,
      workspaceId: DEFAULT_WORKSPACE_ID,
      workspaceName: "Asianode Default Workspace",
    };
  }

  const membership = await getWorkspaceMembershipForUser(userId);

  if (membership?.status !== "active") {
    return null;
  }

  const isGuest = session.user.type === "guest";

  return {
    isGuest,
    membershipId: membership.id,
    permissions: [
      ...getEffectivePermissions(
        membership.role,
        membership.overrides,
        isGuest
      ),
    ],
    role: membership.role,
    userId,
    workspaceId: membership.workspaceId,
    workspaceName: membership.workspaceName,
  };
}

export function actorHasPermission(
  actor: CurrentActor,
  permission: Permission
) {
  return actor.permissions.includes(permission);
}
