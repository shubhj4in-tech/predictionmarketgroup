import { redirect } from "next/navigation";

// Root redirects to /groups (proxy handles auth → /signin if needed)
export default function Home() {
  redirect("/groups");
}
