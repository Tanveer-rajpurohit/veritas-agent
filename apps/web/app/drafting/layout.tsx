import type { ReactNode } from "react";
import { ProtectedRoute } from "../../components/auth/protected-route";

export default function DraftingLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
