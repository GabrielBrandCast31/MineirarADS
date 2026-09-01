import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GitCompareArrows, Lightbulb } from "lucide-react";
import { COLLECTION_ITEM_LABEL } from "@/core/types/library";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AdGrid } from "@/components/ads/ad-grid";
import { OfferCard } from "@/components/offers/offer-card";
import { AdvertiserCard } from "@/components/advertisers/advertiser-card";
import { DeleteCollectionButton } from "@/components/library/delete-collection";
import { getRepositories } from "@/data";
import { requireSession } from "@/server/auth";
import { formatNumber } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await requireSession();
  const collection = await getRepositories().library.getCollection(session, id);
  return { title: collection?.name ?? "Coleção" };
}

export default async function CollectionPage({ params }: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const session = await requireSession();
  const repositories = getRepositories();

  const collection = await repositories.library.getCollection(session, id);
  if (!collection) notFound();

  const items = await repositories.library.listItems(session, collection.id);
  const idsByKind = {
    ad: items.filter((item) => item.kind === "ad").map((item) => item.entityId),
    offer: items.filter((item) => item.kind === "offer").map((item) => item.entityId),
    advertiser: items.filter((item) => item.kind === "advertiser").map((item) => item.entityId),
  };

  const [ads, offers, advertisers] = await Promise.all([
    repositories.catalog.getAdsByIds(session, idsByKind.ad),
    Promise.all(idsByKind.offer.map((offerId) => repositories.catalog.getOffer(session, offerId))),
    Promise.all(
      idsByKind.advertiser.map((advertiserId) =>
        repositories.catalog.getAdvertiser(session, advertiserId),
      ),
    ),
  ]);

  const validOffers = offers.filter((offer) => offer !== null);
  const validAdvertisers = advertisers.filter((advertiser) => advertiser !== null);
  const isEmpty = ads.length === 0 && validOffers.length === 0 && validAdvertisers.length === 0;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/library">
          <ArrowLeft />
          Biblioteca
        </Link>
      </Button>

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: `var(--color-${collection.color})` }}
              aria-hidden
            />
            <h1 className="truncate text-2xl font-semibold tracking-[-0.02em] text-ink">
              {collection.name}
            </h1>
          </div>
          {collection.description ? (
            <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-faint">
              {collection.description}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(["ad", "offer", "advertiser"] as const).map((kind) =>
              idsByKind[kind].length > 0 ? (
                <Badge key={kind} variant="neutral" size="sm">
                  {formatNumber(idsByKind[kind].length)} {COLLECTION_ITEM_LABEL[kind].toLowerCase()}
                  {idsByKind[kind].length > 1 ? "s" : ""}
                </Badge>
              ) : null,
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {ads.length >= 2 ? (
            <>
              <Button asChild variant="secondary" size="sm">
                <Link href={`/compare?ads=${ads.slice(0, 4).map((ad) => ad.id).join(",")}`}>
                  <GitCompareArrows />
                  Comparar
                </Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href={`/insights?ads=${ads.map((ad) => ad.id).join(",")}`}>
                  <Lightbulb />
                  Gerar insights
                </Link>
              </Button>
            </>
          ) : null}
          <DeleteCollectionButton collectionId={collection.id} name={collection.name} />
        </div>
      </header>

      {isEmpty ? (
        <EmptyState
          title="Coleção vazia"
          description="Salve anúncios, ofertas ou páginas usando o ícone de marcador nos cards."
          action={
            <Button asChild variant="heat">
              <Link href="/mine">Minerar anúncios</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {ads.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-[15px] font-semibold text-ink">Anúncios</h2>
              <AdGrid ads={ads} />
            </section>
          ) : null}

          {validOffers.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-[15px] font-semibold text-ink">Ofertas</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {validOffers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            </section>
          ) : null}

          {validAdvertisers.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-[15px] font-semibold text-ink">Anunciantes</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {validAdvertisers.map((advertiser) => (
                  <AdvertiserCard key={advertiser.id} advertiser={advertiser} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
