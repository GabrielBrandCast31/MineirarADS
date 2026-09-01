import type { Metadata } from "next";
import Link from "next/link";
import { GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { CompareTable } from "@/components/compare/compare-table";
import { getRepositories } from "@/data";
import { requireSession } from "@/server/auth";
import { analyzeMany } from "@/server/services/analysis";

export const metadata: Metadata = { title: "Comparador" };

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ads?: string }>;
}): Promise<React.ReactElement> {
  const session = await requireSession();
  const { ads: adsParam } = await searchParams;

  const ids = (adsParam ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 4);

  const ads = ids.length > 0 ? await getRepositories().catalog.getAdsByIds(session, ids) : [];
  // Reaproveita análises já feitas; só analisa o que falta (respeitando cota).
  const analyses = ads.length > 0 ? await analyzeMany(session, ads) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <GitCompareArrows className="size-3.5" />
            Comparação
          </>
        }
        title="Comparador de anúncios"
        description="Coloque de 2 a 4 anúncios lado a lado. As linhas trazem o rótulo de origem: dado observado, cálculo ou inferência."
      />

      {ads.length < 2 ? (
        <EmptyState
          icon={<GitCompareArrows />}
          title="Selecione de 2 a 4 anúncios"
          description="Na tela de mineração, passe o mouse sobre um card e marque a caixa no canto superior esquerdo. Depois clique em “Comparar”."
          action={
            <Button asChild variant="heat">
              <Link href="/mine">Ir para a mineração</Link>
            </Button>
          }
        />
      ) : (
        <CompareTable ads={ads} analyses={analyses} />
      )}
    </div>
  );
}
