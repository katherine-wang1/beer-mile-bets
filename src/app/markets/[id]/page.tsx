import { AppShell } from "@/components/AppShell";
import { MarketDetailView } from "@/components/MarketDetailView";

export default async function MarketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell>
      <MarketDetailView id={id} />
    </AppShell>
  );
}
