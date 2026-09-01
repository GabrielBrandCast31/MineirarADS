import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AdvertiserCard } from "@/components/advertisers/advertiser-card";
import { getRepositories } from "@/data";
import { requireSession } from "@/server/auth";
import { AdvertiserSearch } from "@/components/advertisers/advertiser-search";

export const metadata: Metadata = { title: "Anunciantes" };

export default async function AdvertisersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<React.ReactElement> {
  const session = await requireSession();
  const { q } = await searchParams;

  const advertisers = await getRepositories().catalog.listAdvertisers(session, {
    limit: 60,
    query: q,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Building2 className="size-3.5" />
            Catálogo
          </>
        }
        title="Anunciantes"
        description="Páginas observadas nas suas minerações, ordenadas por volume de anúncios ativos."
        actions={<AdvertiserSearch initial={q ?? ""} />}
      />

      {advertisers.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="Nenhum anunciante encontrado"
          description={
            q
              ? `Nada corresponde a "${q}". Tente outro nome.`
              : "Faça uma mineração para começar a mapear páginas."
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {advertisers.map((advertiser) => (
            <AdvertiserCard key={advertiser.id} advertiser={advertiser} />
          ))}
        </div>
      )}
    </div>
  );
}
