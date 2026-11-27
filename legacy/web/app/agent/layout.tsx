import type { ReactNode } from "react";
import { ProtectedRoute } from "../../components/auth/protected-route";

export default function AgentLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
