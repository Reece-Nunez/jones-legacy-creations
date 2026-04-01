import AdminShell from "@/components/admin/AdminShell";
import { PwaInstallBanner } from "@/components/admin/PwaInstallBanner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminShell>
      {children}
      <PwaInstallBanner />
    </AdminShell>
  );
}
