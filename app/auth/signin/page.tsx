// app/auth/signin/page.tsx
// Redirect legacy /auth/signin to canonical /login

import { redirect } from "next/navigation";

export default function SignInRedirectPage() {
  redirect("/login");
}
