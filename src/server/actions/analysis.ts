"use server";

import { revalidatePath } from "next/cache";
import type { CopyAnalysis, CreativeAnalysis, InsightReport } from "@/core/types/analysis";
import { getRepositories } from "@/data";
import { requireSession } from "@/server/auth";
import { analyzeAdCopy, analyzeAdCreatives } from "@/server/services/analysis";
import { generateInsights } from "@/server/services/insights";
import { failure, success, type ActionResult } from "./result";

export async function analyzeCopyAction(
  adId: string,
  options: { force?: boolean } = {},
): Promise<ActionResult<CopyAnalysis>> {
  try {
    const session = await requireSession();
    const ad = await getRepositories().catalog.getAd(session, adId);
    if (!ad) return failure(new Error("Anúncio não encontrado."));

    const analysis = await analyzeAdCopy(session, ad, options);
    revalidatePath(`/ads/${adId}`);
    return success(analysis);
  } catch (error) {
    return failure(error);
  }
}

export async function analyzeCreativesAction(
  adId: string,
  options: { force?: boolean } = {},
): Promise<ActionResult<CreativeAnalysis[]>> {
  try {
    const session = await requireSession();
    const ad = await getRepositories().catalog.getAd(session, adId);
    if (!ad) return failure(new Error("Anúncio não encontrado."));

    const analyses = await analyzeAdCreatives(session, ad, options);
    revalidatePath(`/ads/${adId}`);
    return success(analyses);
  } catch (error) {
    return failure(error);
  }
}

export async function generateInsightsAction(input: {
  adIds: string[];
  query?: string | null;
  title?: string | null;
}): Promise<ActionResult<InsightReport>> {
  try {
    const session = await requireSession();
    const report = await generateInsights(session, input.adIds, {
      query: input.query ?? null,
      title: input.title ?? null,
    });
    revalidatePath("/insights");
    return success(report);
  } catch (error) {
    return failure(error);
  }
}
