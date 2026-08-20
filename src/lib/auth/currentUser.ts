import { useMemo } from "react";
import { fastApiWorkspaceId } from "../backend/mode";
import { useBackendQuery } from "../backend/reactQuery";
import { type User, useSession } from "../auth";
import type { Permission, WorkspaceRole } from "../permissions";
import { isLogtoAuthMode } from "./logtoConfig";

export type WorkspaceMembership = {
  membershipId: string;
  overrides: { effect: "grant" | "deny"; permission: string }[];
  permissions: Permission[];
  role: WorkspaceRole;
  status: string;
  workspaceId: string;
  workspaceName: string;
};

export type CurrentUserResponse = {
  email: string | null;
  isDevelopment: boolean;
  isGuest: boolean;
  memberships: WorkspaceMembership[];
  name: string | null;
  userId: string;
};

function developmentMembership(user: User): WorkspaceMembership {
  return {
    membershipId: "development-membership",
    overrides: [],
    permissions: user.permissions ?? [],
    role: user.role ?? "viewer",
    status: "active",
    workspaceId: user.workspaceId ?? fastApiWorkspaceId,
    workspaceName: "Development workspace",
  };
}

export function useCurrentUserAccess() {
  const { data: session, status } = useSession();
  const identity = session?.user?.id ?? "anonymous";
  const currentUserQuery = useBackendQuery<CurrentUserResponse>({
    enabled: isLogtoAuthMode && status === "authenticated",
    path: "/api/v1/me",
    queryKey: ["backend", "user", identity, "current-user"],
    retry: false,
  });

  const currentUser = useMemo<CurrentUserResponse | null>(() => {
    if (!session?.user) {
      return null;
    }

    if (isLogtoAuthMode) {
      return currentUserQuery.data ?? null;
    }

    return {
      email: session.user.email ?? null,
      isDevelopment: true,
      isGuest: false,
      memberships: [developmentMembership(session.user)],
      name: session.user.name ?? null,
      userId: session.user.id ?? identity,
    };
  }, [currentUserQuery.data, identity, session]);

  const activeMembership = useMemo(
    () =>
      currentUser?.memberships.find(
        (membership) => membership.workspaceId === fastApiWorkspaceId
      ) ?? (currentUser?.memberships.length === 1
        ? currentUser.memberships[0]
        : null),
    [currentUser]
  );

  const hasPermission = (permission: Permission) =>
    activeMembership?.permissions.includes(permission) ?? false;

  return {
    activeMembership,
    currentUser,
    error: currentUserQuery.error,
    hasPermission,
    isLoading:
      status === "loading" ||
      (isLogtoAuthMode && status === "authenticated" && currentUserQuery.isLoading),
  };
}
