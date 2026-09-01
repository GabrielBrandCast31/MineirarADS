import type { InsightReport } from "@/core/types/analysis";
import type { SessionContext } from "@/core/types/workspace";
import { getRepositories } from "@/data";
import { getAIProvider } from "@/providers/ai";
import { analyzeMany } from "./analysis";
import { assertFeature } from "./quota";
import { log } from "./logging";

/**
 * Gera o relatório de insights de um conjunto de anúncios.
 *
 * Os números vêm de contagem local; a narrativa pode vir de LLM. A separação é
 * mantida dentro do provider — ver `AnthropicAIProvider.generateInsights`.
 */
export async function generateInsights(
  ctx: SessionContext,
  adIds: string[],
  options: { query?: string | null; title?: string | null } = {},
): Promise<InsightReport> {
  assertFeature(ctx, "insights");
  const repositories = getRepositories();

  const ads = await repositories.catalog.getAdsByIds(ctx, adIds);
  if (ads.length === 0) {
    throw new Error("Nenhum anúncio válido no conjunto selecionado.");
  }

  const analyses = await analyzeMany(ctx, ads);
  const ai = getAIProvider();

  const report = await ai.generateInsights({
    workspaceId: ctx.workspace.id,
    ads,
    analyses,
    query: options.query ?? null,
  });

  if (ai.capabilities.llm) await repositories.usage.increment(ctx, "ai_calls");

  const saved = await repositories.analysis.saveInsightReport(ctx, report, {
    title: options.title ?? null,
    query: options.query ?? null,
    adIds: ads.map((ad) => ad.id),
  });

  await log(
    {
      level: "info",
      scope: "insights",
      message: `Relatório de insights com ${ads.length} anúncios`,
      context: { engine: report.engine, query: options.query },
    },
    ctx,
  );

  return saved;
}
