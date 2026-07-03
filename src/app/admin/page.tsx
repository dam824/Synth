import { redirect } from "next/navigation";

import { getAdminContext } from "@/lib/admin/access";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

// Back-office admin. Inaccessible aux utilisateurs normaux : la vérification
// se fait côté serveur via getAdminContext (rôle DB ou allowlist email).
export default async function AdminPage() {
  const admin = await getAdminContext();
  if (!admin) {
    redirect("/app");
  }

  return <AdminDashboard adminEmail={admin.email ?? ""} />;
}
