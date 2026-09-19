"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthContext } from "../../providers/AuthProvider";
import { VeritasOrb } from "../brand/veritas-orb";

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

  if (isLoading || !isAuthenticated || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eaf0f6] px-6">
        <div className="flex items-center gap-3 rounded-xl border border-[#cbe0f2] bg-white px-5 py-4 shadow-sm">
          <VeritasOrb size={24} className="text-[#487aa8]" />
          <div>
            <p className="m-0 text-sm font-semibold text-stone-900">
              Opening your workspace
            </p>
            <p className="m-0 pt-0.5 text-xs text-stone-500">
              Checking your secure session…
            </p>
          </div>
        </div>
      </main>
    );
  }

  return children;
}
