import type { AdEnriched } from "@/core/types/ad";
import type { CopyAnalysis, CreativeAnalysis } from "@/core/types/analysis";
import type { SessionContext } from "@/core/types/workspace";
import { CTA_LABEL } from "@/core/constants/meta";
import { getRepositories } from "@/data";
import { getAIProvider } from "@/providers/ai";
import { assertFeature, assertQuota } from "./quota";
import { errorContext, log } from "./logging";

/**
 * Análise de copy com cache.
 *
 * Reanalisar o mesmo anúncio não deve consumir cota nem chamar IA de novo:
 * a análise é determinística no motor heurístico e cara no motor de LLM.
 * `force` existe para reprocessar quando o motor mudar.
 */
export async function analyzeAdCopy(
  ctx: SessionContext,
  ad: AdEnriched,
  options: { force?: boolean } = {},
): Promise<CopyAnalysis> {
  const repositories = getRepositories();

  if (!options.force) {
    const cached = await repositories.analysis.getCopyAnalysis(ctx, ad.id);
    if (cached) return cached;
  }

  assertFeature(ctx, "copy_analysis");
  await assertQuota(ctx, "analyses");

  const ai = getAIProvider();
  const analysis = await ai.analyzeCopy({
    ad: {
      id: ad.id,
      bodyText: ad.bodyText,
      headline: ad.headline,
      linkDescription: ad.linkDescription,
      callToAction: ad.callToAction,
      bodyVariations: ad.bodyVariations,
    },
    workspaceId: ctx.workspace.id,
    ctaLabel: ad.callToAction ? CTA_LABEL[ad.callToAction] : null,
    category: null,
  });

  const saved = await repositories.analysis.saveCopyAnalysis(ctx, analysis);
  await repositories.usage.increment(ctx, "analyses");
  if (ai.capabilities.llm) await repositories.usage.increment(ctx, "ai_calls");

  await log(
    {
      level: "info",
      scope: "analysis",
      message: `Análise de copy do anúncio ${ad.id}`,
      context: { engine: analysis.engine },
    },
    ctx,
  );

  return saved;
}

export async function analyzeAdCreatives(
  ctx: SessionContext,
  ad: AdEnriched,
  options: { force?: boolean } = {},
): Promise<CreativeAnalysis[]> {
  const repositories = getRepositories();
  assertFeature(ctx, "creative_analysis");
  const ai = getAIProvider();
  const out: CreativeAnalysis[] = [];

  for (const creative of ad.creatives) {
    if (!options.force) {
      const cached = await repositories.analysis.getCreativeAnalysis(ctx, creative.id);
      if (cached) {
        out.push(cached);
        continue;
      }
    }

    try {
      const analysis = await ai.analyzeCreative({
        creative,
        adId: ad.id,
        workspaceId: ctx.workspace.id,
        ctaLabel: ad.callToAction ? CTA_LABEL[ad.callToAction] : null,
        bodyText: ad.bodyText,
      });
      out.push(await repositories.analysis.saveCreativeAnalysis(ctx, analysis));
      if (ai.capabilities.vision) await repositories.usage.increment(ctx, "ai_calls");
    } catch (error) {
      await log(
        {
          level: "warn",
          scope: "analysis",
          message: `Falha ao analisar criativo ${creative.id}`,
          context: errorContext(error),
        },
        ctx,
      );
    }
  }

  return out;
}

/** Análises de copy de vários anúncios — usado pelo comparador e pelos insights. */
export async function analyzeMany(
  ctx: SessionContext,
  ads: AdEnriched[],
): Promise<CopyAnalysis[]> {
  const repositories = getRepositories();
  const cached = await repositories.analysis.getCopyAnalysesForAds(
    ctx,
    ads.map((ad) => ad.id),
  );
  const cachedIds = new Set(cached.map((analysis) => analysis.adId));
  const missing = ads.filter((ad) => !cachedIds.has(ad.id));

  const fresh: CopyAnalysis[] = [];
  for (const ad of missing) {
    try {
      fresh.push(await analyzeAdCopy(ctx, ad));
    } catch {
      // Cota estourada no meio do lote: seguimos com o que já temos.
      break;
    }
  }

  return [...cached, ...fresh];
}
