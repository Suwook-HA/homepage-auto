import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/admin/login/ui/login-form";
import { isAdminAuthEnabled, isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Login | Auto Homepage",
};

export default async function AdminLoginPage() {
  const [authEnabled, authenticated] = await Promise.all([
    isAdminAuthEnabled(),
    isAdminAuthenticated(),
  ]);

  if (!authEnabled || authenticated) {
    redirect("/admin");
  }

  return (
    <main className="page">
      <section className="card">
        <div className="section-header">
          <h1>Admin Login</h1>
          <Link href="/">Back to Home</Link>
        </div>
        <p className="hint">Sign in to manage profile and force refresh content.</p>
        <LoginForm />
      </section>
    </main>
  );
}
