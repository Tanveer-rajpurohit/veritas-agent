import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent",
  description: "Work with the Veritas legal research and drafting agent.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AgentPage() {
  return <div className="min-h-screen w-full bg-white" />;
}
