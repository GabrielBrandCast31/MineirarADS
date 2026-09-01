import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { OfferCard } from "@/components/offers/offer-card";
import { getRepositories } from "@/data";
import { requireSession } from "@/server/auth";

export const metadata: Metadata = { title: "Ofertas" };

export default async function OffersPage(): Promise<React.ReactElement> {
  const session = await requireSession();
  const offers = await getRepositories().catalog.listTopOffers(session, 60);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Boxes className="size-3.5" />
            Agrupamentos
          </>
        }
        title="Ofertas"
        description="Anúncios do mesmo anunciante girando em torno da mesma promessa são agrupados em uma oferta. É a leitura mais útil: 14 criativos sob uma oferta contam uma história que 14 anúncios soltos esconderiam."
      />

      {offers.length === 0 ? (
        <EmptyState
          icon={<Boxes />}
          title="Nenhuma oferta identificada"
          description="Faça uma mineração — o agrupamento acontece automaticamente sobre os anúncios coletados."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      )}
    </div>
  );
}
