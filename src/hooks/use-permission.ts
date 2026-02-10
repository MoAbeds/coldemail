"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { Permission } from "@/lib/security/permissions";

interface TeamPermissions {
  teamId: string;
  role: string;
  permissions: Permission[];
}

interface UsePermissionReturn {
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  role: string | null;
  isLoading: boolean;
}

/**
 * Client hook to check user permissions for the current team.
 * Fetches the user's role and caches it.
 */
export function usePermission(teamId?: string): UsePermissionReturn {
  const { data: session } = useSession();
  const [teamPerms, setTeamPerms] = useState<TeamPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setIsLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const params = teamId ? `?teamId=${teamId}` : "";
        const res = await fetch(`/api/permissions${params}`);
        if (res.ok) {
          const data = await res.json();
          setTeamPerms(data);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [session?.user?.id, teamId]);

  const hasPermission = (permission: Permission): boolean => {
    if (!teamPerms) return false;
    return teamPerms.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!teamPerms) return false;
    return permissions.some((p) => teamPerms.permissions.includes(p));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    if (!teamPerms) return false;
    return permissions.every((p) => teamPerms.permissions.includes(p));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    role: teamPerms?.role ?? null,
    isLoading,
  };
}

/**
 * Component wrapper that conditionally renders children based on permission.
 */
export function PermissionGate({
  permission,
  children,
  fallback = null,
  teamId,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  teamId?: string;
}) {
  const { hasPermission, isLoading } = usePermission(teamId);

  if (isLoading) return null;
  if (!hasPermission(permission)) return fallback;
  return children;
}
