import { redirect } from "next/navigation";

// Root redirects to /home (proxy handles auth → /signin if needed)
export default function Home() {
  redirect("/home");
}
