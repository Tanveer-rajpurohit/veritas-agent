"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthContext } from "../../providers/AuthProvider";
import { WorkspaceSkeleton } from "../ui/skeleton-loaders";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuthContext();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      const redirect = encodeURIComponent(pathname || "/workspace");
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [isAuthenticated, isLoading, pathname, router, user]);

  if (isLoading) {
    return <WorkspaceSkeleton />;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return children;
}
