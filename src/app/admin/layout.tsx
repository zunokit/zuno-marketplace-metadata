import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/better-auth.config";
import { headers } from "next/headers";
import { AdminSidebar } from "@/components/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get session from server-side
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect if not authenticated or not admin
  if (!session || session.user.role !== "admin") {
    redirect("/auth/signin");
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar
        userEmail={session.user.email}
        userName={session.user.name}
      />

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-4 pt-16 lg:p-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
