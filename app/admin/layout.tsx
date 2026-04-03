import AdminShell from "@/components/admin/AdminShell";
import { PwaInstallBanner } from "@/components/admin/PwaInstallBanner";
import { AdminThemeProvider } from "@/components/admin/AdminThemeProvider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminThemeProvider>
      <AdminShell>
        {children}
        <PwaInstallBanner />
      </AdminShell>
    </AdminThemeProvider>
  );
}
