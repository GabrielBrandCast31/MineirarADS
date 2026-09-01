import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  Building2,
  Calendar,
  ExternalLink,
  Eye,
  Globe,
  Layers,
  MonitorSmartphone,
  Timer,
} from "lucide-react";
import type { AdEnriched } from "@/core/types/ad";
import {
  COUNTRY_LABEL,
  CTA_LABEL,
  FORMAT_LABEL,
  PLATFORM_LABEL,
  STATUS_LABEL,
} from "@/core/constants/meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProvenanceTag } from "@/components/ui/provenance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreativePreview } from "@/components/ads/creative-preview";
import { ScoreBreakdown } from "@/components/ads/ad-score";
import { SaveButton } from "@/components/ads/save-button";
import { MonitorButton } from "@/components/ads/monitor-button";
import { CopyAnalysisPanel } from "@/components/ads/copy-analysis-panel";
import { CreativeAnalysisPanel } from "@/components/ads/creative-analysis-panel";
import { TranscriptionPanel } from "@/components/ads/transcription-panel";
import { AdCard } from "@/components/ads/ad-card";
import { Avatar } from "@/components/ui/avatar";
import { getRepositories } from "@/data";
import { requireSession } from "@/server/auth";
import { formatDate, formatDays, formatNumber, formatRelative } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await requireSession();
  const ad = await getRepositories().catalog.getAd(session, id);
  return { title: ad?.headline ?? "Anúncio" };
}

export default async function AdPage({ params }: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const session = await requireSession();
  const repositories = getRepositories();

  const ad = await repositories.catalog.getAd(session, id);
  if (!ad) notFound();

  const [copyAnalysis, offer, related] = await Promise.all([
    repositories.analysis.getCopyAnalysis(session, ad.id),
    ad.offerId ? repositories.catalog.getOffer(session, ad.offerId) : Promise.resolve(null),
    ad.offerId
      ? repositories.catalog.listAdsByOffer(session, ad.offerId, 8)
      : Promise.resolve([]),
  ]);

  const creativeAnalyses = (
    await Promise.all(
      ad.creatives.map((creative) =>
        repositories.analysis.getCreativeAnalysis(session, creative.id),
      ),
    )
  ).filter((analysis) => analysis !== null);

  const transcription = ad.creatives[0]
    ? await repositories.analysis.getTranscription(session, ad.creatives[0].id)
    : null;

  const hasVideo = ad.creatives.some((creative) => creative.format === "video");
  const siblings = related.filter((item) => item.id !== ad.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/mine">
            <ArrowLeft />
            Voltar para a mineração
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <SaveButton
            kind="ad"
            entityId={ad.id}
            label={ad.headline ?? ad.advertiserName}
            initiallySaved={ad.saved}
            variant="secondary"
            size="sm"
            showLabel
          />
          <MonitorButton
            target="ad"
            entityId={ad.id}
            label={ad.headline ?? ad.advertiserName}
            thumbnail={ad.creatives[0]?.thumbnailUrl ?? null}
            initiallyMonitored={ad.monitored}
            variant="secondary"
            size="sm"
            showLabel
          />
          <Button asChild variant="outline" size="sm">
            <a href={ad.adLibraryUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              Ver na Meta Ad Library
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <div className="grid gap-5 sm:grid-cols-[240px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-xl border border-line">
              <CreativePreview
                creatives={ad.creatives}
                alt={ad.headline ?? ad.advertiserName}
              />
            </div>

            <div className="min-w-0 space-y-3">
              <Link
                href={`/advertisers/${ad.advertiserId}`}
                className="inline-flex items-center gap-2 text-ink-muted transition-colors hover:text-ink"
              >
                <Avatar
                  src={ad.advertiserAvatarUrl}
                  name={ad.advertiserName}
                  className="size-7"
                />
                <span className="text-[13.5px] font-medium">{ad.advertiserName}</span>
              </Link>

              {ad.headline ? (
                <h1 className="text-balance text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
                  {ad.headline}
                </h1>
              ) : null}

              <div className="flex flex-wrap gap-1.5">
                <Badge variant={ad.status === "active" ? "ok" : "neutral"}>
                  {STATUS_LABEL[ad.status]}
                </Badge>
                <Badge variant={ad.activeDays >= 60 ? "heat" : "neutral"}>
                  <Timer />
                  Ativo há {formatDays(ad.activeDays)}
                </Badge>
                <Badge variant="outline">{FORMAT_LABEL[ad.format]}</Badge>
                {ad.callToAction && ad.callToAction !== "NONE" ? (
                  <Badge variant="brand">{CTA_LABEL[ad.callToAction]}</Badge>
                ) : null}
              </div>

              {ad.bodyText ? (
                <div className="panel p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                      Texto principal
                    </p>
                    <ProvenanceTag provenance="observed" compact source="meta_ad_library" />
                  </div>
                  <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink-muted">
                    {ad.bodyText}
                  </p>
                </div>
              ) : null}

              {ad.bodyVariations.length > 1 ? (
                <details className="panel group px-4 py-3">
                  <summary className="cursor-pointer list-none text-[13px] font-medium text-ink-muted transition-colors hover:text-ink">
                    {ad.bodyVariations.length - 1} outra(s) variação(ões) de texto no mesmo arquivo
                  </summary>
                  <div className="mt-3 space-y-3 border-t border-line pt-3">
                    {ad.bodyVariations.slice(1).map((variation, index) => (
                      <p
                        key={index}
                        className="whitespace-pre-line text-[13px] leading-relaxed text-ink-faint"
                      >
                        {variation}
                      </p>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          </div>

          <Tabs defaultValue="copy">
            <TabsList>
              <TabsTrigger value="copy">Análise de copy</TabsTrigger>
              <TabsTrigger value="creative">Análise de criativo</TabsTrigger>
              <TabsTrigger value="transcript">Transcrição</TabsTrigger>
              <TabsTrigger value="raw">Dados brutos</TabsTrigger>
            </TabsList>

            <TabsContent value="copy">
              <CopyAnalysisPanel adId={ad.id} initial={copyAnalysis} />
            </TabsContent>

            <TabsContent value="creative">
              <CreativeAnalysisPanel
                adId={ad.id}
                creatives={ad.creatives}
                initial={creativeAnalyses}
              />
            </TabsContent>

            <TabsContent value="transcript">
              <TranscriptionPanel transcription={transcription} hasVideo={hasVideo} />
            </TabsContent>

            <TabsContent value="raw">
              <RawData ad={ad} />
            </TabsContent>
          </Tabs>

          {siblings.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                  <Layers className="size-3.5 text-brand-hi" />
                  Outros anúncios da mesma oferta
                </h2>
                {offer ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/offers/${offer.id}`}>Ver a oferta</Link>
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {siblings.slice(0, 6).map((sibling) => (
                  <AdCard key={sibling.id} ad={sibling} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-[4.75rem] xl:h-fit">
          <Card>
            <CardHeader>
              <CardTitle>Ad Score</CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreBreakdown score={ad.score} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Dados observados</CardTitle>
                <ProvenanceTag provenance="observed" compact source="meta_ad_library" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="divide-y divide-line text-[13px]">
                <Row icon={<Calendar className="size-3.5" />} label="Início" value={formatDate(ad.startedAt)} />
                <Row
                  icon={<Calendar className="size-3.5" />}
                  label="Fim"
                  value={ad.endedAt ? formatDate(ad.endedAt) : "Ainda no ar"}
                />
                <Row
                  icon={<Eye className="size-3.5" />}
                  label="Última coleta"
                  value={formatRelative(ad.lastSeenAt)}
                />
                <Row
                  icon={<MonitorSmartphone className="size-3.5" />}
                  label="Plataformas"
                  value={ad.platforms.map((p) => PLATFORM_LABEL[p]).join(", ") || "—"}
                />
                <Row
                  icon={<Globe className="size-3.5" />}
                  label="Países"
                  value={ad.countries.map((c) => COUNTRY_LABEL[c] ?? c).join(", ") || "—"}
                />
                <Row
                  icon={<Layers className="size-3.5" />}
                  label="Criativos"
                  value={formatNumber(ad.creatives.length)}
                />
                {ad.impressionsLowerBound != null ? (
                  <Row
                    icon={<Eye className="size-3.5" />}
                    label="Impressões"
                    value={`${formatNumber(ad.impressionsLowerBound)}–${formatNumber(
                      ad.impressionsUpperBound ?? ad.impressionsLowerBound,
                    )}`}
                  />
                ) : null}
              </dl>
              {ad.impressionsLowerBound == null ? (
                <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
                  Impressões e gasto só são públicos em anúncios de tema social, eleitoral ou
                  político. Para os demais, esses números não existem na fonte — e não são
                  estimados aqui.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {offer ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="size-3.5 text-brand-hi" />
                  Oferta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <Link
                  href={`/offers/${offer.id}`}
                  className="block text-[14px] font-medium text-ink hover:underline"
                >
                  {offer.name}
                </Link>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="heat" size="sm">
                    Ativa há {formatDays(offer.stats.activeDays)}
                  </Badge>
                  <Badge variant="brand" size="sm">
                    {formatNumber(offer.stats.totalCreatives)} criativos
                  </Badge>
                  <Badge variant="outline" size="sm">
                    {formatNumber(offer.stats.totalAds)} anúncios
                  </Badge>
                </div>
                <p className="text-[12px] leading-relaxed text-ink-faint">
                  Este anúncio faz parte de um conjunto que o anunciante mantém em torno da mesma
                  promessa. Volume de criativos sob uma oferta é sinal de teste ativo.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-3.5 text-info" />
                Anunciante
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Link
                href={`/advertisers/${ad.advertiserId}`}
                className="flex items-center gap-3 rounded-md p-1 transition-colors hover:bg-surface-2"
              >
                <Avatar
                  src={ad.advertiserAvatarUrl}
                  name={ad.advertiserName}
                  className="size-9 rounded-lg"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium text-ink">
                    {ad.advertiserName}
                  </span>
                  <span className="block text-[12px] text-ink-faint">Ver perfil completo</span>
                </span>
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="flex items-center gap-2 text-ink-faint">
        {icon}
        {label}
      </dt>
      <dd className="truncate text-right text-ink-muted">{value}</dd>
    </div>
  );
}

function RawData({ ad }: { ad: AdEnriched }): React.ReactElement {
  // Campos internos não interessam a quem quer auditar o dado da fonte.
  const { creatives, score, ...rest } = ad;
  void creatives;
  void score;

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-relaxed text-ink-faint">
        Exatamente o que foi coletado e persistido para este anúncio, antes de qualquer
        interpretação. Útil para conferir a origem de cada número exibido acima.
      </p>
      <pre className="panel max-h-[420px] overflow-auto p-4 font-mono text-[11.5px] leading-relaxed text-ink-muted">
        {JSON.stringify(rest, null, 2)}
      </pre>
    </div>
  );
}
