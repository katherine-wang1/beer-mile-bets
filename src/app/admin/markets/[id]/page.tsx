import { AppShell } from "@/components/AppShell";
import { AdminMarketDetail } from "@/components/AdminMarketDetail";

export default async function AdminMarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell>
      <AdminMarketDetail id={id} />
    </AppShell>
  );
}
