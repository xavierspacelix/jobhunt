import { Sidebar } from "@/components/sidebar";

export function DashboardShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userEmail={userEmail} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
