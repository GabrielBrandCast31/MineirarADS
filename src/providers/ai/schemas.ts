import { z } from "zod";

/**
 * Esquemas de saída estruturada usados pelos providers de LLM.
 *
 * Só descrevem campos **interpretativos**. Nada de contagem, data ou métrica:
 * esses vêm do núcleo determinístico e o modelo nunca os vê como saída.
 */

export const HOOK_TYPE_ENUM = z.enum([
  "pergunta",
  "afirmacao_polemica",
  "estatistica",
  "historia",
  "beneficio_direto",
  "negacao",
  "comando",
  "indefinido",
]);

export const EMOTION_ENUM = z.enum([
  "curiosidade",
  "medo",
  "desejo",
  "urgencia",
  "prova_social",
  "autoridade",
  "transformacao",
  "pertencimento",
]);

export const copyAnalysisSchema = z.object({
  hook: z.string().describe("Trecho literal que funciona como gancho de abertura."),
  hook_type: HOOK_TYPE_ENUM,
  problem: z.string().describe("Dor endereçada. String vazia se não houver."),
  promise: z.string().describe("Promessa central. String vazia se não houver."),
  mechanism: z.string().describe("Como a promessa é entregue. Vazio se não houver."),
  benefits: z.array(z.string()).max(6),
  proof: z.array(z.string()).max(6).describe("Elementos de prova citados no texto."),
  objections: z.array(z.string()).max(6).describe("Objeções tratadas explicitamente."),
  cta: z.string().describe("Ação pedida ao leitor."),
  structure: z
    .array(z.string())
    .max(10)
    .describe("Blocos na ordem em que aparecem: hook, problema, prova, oferta, cta..."),
  emotions: z.array(EMOTION_ENUM).max(5),
  dominant_emotion: EMOTION_ENUM,
  confidence: z.number().min(0).max(1).describe("Sua confiança global na leitura."),
});

export type LlmCopyAnalysis = z.infer<typeof copyAnalysisSchema>;

export const creativeAnalysisSchema = z.object({
  has_person: z.boolean(),
  has_on_screen_text: z.boolean(),
  has_captions: z.boolean(),
  has_product: z.boolean(),
  text_density: z.enum(["baixa", "media", "alta"]),
  visual_headline: z.string().describe("Texto em destaque na peça. Vazio se não houver."),
  visual_cta: z.string().describe("Chamada visual na peça. Vazio se não houver."),
  opening_beats: z.string().describe("O que acontece nos primeiros segundos. Só vídeo."),
  visual_structure: z.array(z.string()).max(8),
  confidence: z.number().min(0).max(1),
});

export type LlmCreativeAnalysis = z.infer<typeof creativeAnalysisSchema>;

export const hooksSchema = z.object({
  hooks: z
    .array(
      z.object({
        text: z.string().max(200),
        hook_type: HOOK_TYPE_ENUM,
        rationale: z.string().max(280),
      }),
    )
    .max(12),
});

export const classificationSchema = z.object({
  niche: z.string(),
  funnel_stage: z.enum(["topo", "meio", "fundo"]),
  audience: z.string().describe("Público provável, em uma frase."),
  suggested_cta: z.enum([
    "LEARN_MORE",
    "SHOP_NOW",
    "SIGN_UP",
    "SUBSCRIBE",
    "CONTACT_US",
    "GET_OFFER",
    "DOWNLOAD",
    "WHATSAPP_MESSAGE",
    "MESSAGE_PAGE",
    "APPLY_NOW",
    "GET_QUOTE",
  ]),
  confidence: z.number().min(0).max(1),
});

export const insightNarrativeSchema = z.object({
  readings: z
    .array(z.string().max(320))
    .max(5)
    .describe("Leituras do conjunto, cada uma citando números já fornecidos."),
  opportunities: z
    .array(
      z.object({
        text: z.string().max(320),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(6)
    .describe("Ângulos pouco explorados pelo conjunto analisado."),
});
