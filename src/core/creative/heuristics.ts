import type { CreativeAnalysis } from "@/core/types/analysis";
import type { Creative } from "@/core/types/creative";
import { aspectRatioOf } from "@/core/types/creative";
import { derived, inferred, observed } from "@/core/types/provenance";
import { computeCopyMetrics } from "@/core/copy/metrics";

export const CREATIVE_HEURISTIC_ENGINE = "heuristic:v1";

/**
 * Campo que exige visão computacional. A heurística NÃO inventa: devolve
 * `null` com nota explicando o que seria necessário. Um `AIProvider` com
 * suporte a imagem preenche depois.
 */
const NEEDS_VISION = "Requer análise de imagem/vídeo por um provider de IA com visão.";

const unknownVisual = <T>(): ReturnType<typeof inferred<T | null>> =>
  inferred<T | null>(null, CREATIVE_HEURISTIC_ENGINE, 0, NEEDS_VISION);

export interface CreativeAnalysisInput {
  creative: Creative;
  adId: string;
  workspaceId: string | null;
  ctaLabel?: string | null;
}

export function analyzeCreativeHeuristic(
  input: CreativeAnalysisInput,
  now: Date = new Date(),
): CreativeAnalysis {
  const { creative } = input;
  const ratio = aspectRatioOf(creative);
  const overlayText = [creative.title, creative.linkDescription].filter(Boolean).join(" ");
  const density = overlayText ? textDensityOf(overlayText) : null;

  return {
    id: `creative_analysis_${creative.id}`,
    creativeId: creative.id,
    adId: input.adId,
    workspaceId: input.workspaceId,
    engine: CREATIVE_HEURISTIC_ENGINE,
    format: creative.format,

    aspectRatio: ratio
      ? derived(ratio, CREATIVE_HEURISTIC_ENGINE, "Calculado a partir das dimensões observadas.")
      : inferred(null, CREATIVE_HEURISTIC_ENGINE, 0, "Dimensões não informadas pela fonte."),
    durationSeconds:
      creative.durationSeconds != null
        ? observed(creative.durationSeconds, "meta_ad_library")
        : inferred(null, CREATIVE_HEURISTIC_ENGINE, 0, "Duração não informada pela fonte."),

    hasPerson: unknownVisual<boolean>(),
    hasOnScreenText: unknownVisual<boolean>(),
    hasCaptions: unknownVisual<boolean>(),
    hasProduct: unknownVisual<boolean>(),
    textDensity: density
      ? derived(density, CREATIVE_HEURISTIC_ENGINE, "Estimado pelo texto do card (title/description).")
      : unknownVisual<"baixa" | "media" | "alta">(),

    visualHeadline: creative.title
      ? observed(creative.title, "meta_ad_library")
      : inferred(null, CREATIVE_HEURISTIC_ENGINE, 0, "Sem título de card na fonte."),
    visualCta: input.ctaLabel
      ? observed(input.ctaLabel, "meta_ad_library")
      : inferred(null, CREATIVE_HEURISTIC_ENGINE, 0, "Sem CTA declarado."),

    openingBeats:
      creative.format === "video"
        ? unknownVisual<string>()
        : inferred(null, CREATIVE_HEURISTIC_ENGINE, 0, "Aplicável apenas a vídeo."),
    visualStructure: derived(
      structureOf(creative),
      CREATIVE_HEURISTIC_ENGINE,
      "Montado a partir de formato, proporção e duração observados.",
    ),
    createdAt: now.toISOString(),
  };
}

function textDensityOf(text: string): "baixa" | "media" | "alta" {
  const { wordCount } = computeCopyMetrics(text);
  if (wordCount <= 6) return "baixa";
  if (wordCount <= 16) return "media";
  return "alta";
}

/** Descreve o "esqueleto" observável do criativo. */
function structureOf(creative: Creative): string[] {
  const parts: string[] = [];
  parts.push(FORMAT_STRUCTURE_LABEL[creative.format] ?? "Peça única");
  const ratio = aspectRatioOf(creative);
  if (ratio) parts.push(ratio === "9:16" ? "Vertical (feed/stories)" : `Proporção ${ratio}`);
  if (creative.durationSeconds != null) {
    parts.push(
      creative.durationSeconds <= 15
        ? "Vídeo curto (≤15s)"
        : creative.durationSeconds <= 45
          ? "Vídeo médio (16–45s)"
          : "Vídeo longo (>45s)",
    );
  }
  if (creative.title) parts.push("Card com título");
  return parts;
}

const FORMAT_STRUCTURE_LABEL: Partial<Record<Creative["format"], string>> = {
  image: "Imagem estática",
  video: "Vídeo",
  carousel: "Carrossel",
  dco: "Criativo dinâmico",
  unknown: "Formato não identificado",
};
