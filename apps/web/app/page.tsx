import { redirect } from "next/navigation";

/* Auth lands first; the matter workspace replaces this once it exists. */
export default function HomePage() {
  redirect("/login");
}
