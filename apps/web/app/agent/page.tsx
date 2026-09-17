import type { Metadata } from "next";
import { AgentClientPage } from "./agent-client-page";

export const metadata: Metadata = {
  title: "Agent",
  description: "Work with the Veritas legal research and drafting agent.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AgentPage() {
  return <AgentClientPage />;
}
