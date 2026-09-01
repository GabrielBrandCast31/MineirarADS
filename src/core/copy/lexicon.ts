import type { EmotionTrigger } from "@/core/types/analysis";

/**
 * Léxicos em pt-BR usados pelas heurísticas de copy.
 * Termos já normalizados (minúsculo, sem acento) — comparar sempre com
 * `normalize()` aplicado ao texto.
 *
 * Estes léxicos são o "modelo" da análise heurística. Ampliá-los melhora a
 * cobertura sem tocar no algoritmo.
 */

export const EMOTION_LEXICON: Record<EmotionTrigger, string[]> = {
  curiosidade: [
    "segredo","descubra","voce sabia","poucos sabem","ninguem te conta","o que ninguem",
    "revelado","por tras","o motivo","a verdade","surpreendente","truque","metodo secreto",
    "isso muda","olha so","veja o que",
  ],
  medo: [
    "cuidado","perigo","risco","erro","evite","antes que","pode perder","prejuizo",
    "consequencia","irreversivel","piora","nunca mais","fique atento","alerta","problema grave",
  ],
  desejo: [
    "sonho","conquiste","realize","liberdade","transforme","do seu jeito","merece",
    "finalmente","imagine","viva","aproveite","prazer","conforto","sem esforco",
  ],
  urgencia: [
    "ultimas vagas","ultimas unidades","hoje","agora","so ate","termina","expira","corre",
    "restam","vagas limitadas","por tempo limitado","imperdivel","ultimo dia","acaba",
  ],
  prova_social: [
    "clientes","alunos","pessoas ja","mais de","depoimento","avaliacoes","aprovado por",
    "recomendado","milhares","5 estrelas","quem usou","case","resultado real","antes e depois",
  ],
  autoridade: [
    "especialista","doutor","dr","dra","medico","certificado","registro","crm","anos de experiencia",
    "referencia","premiado","credenciado","formado","professor","phd","mestre",
  ],
  transformacao: [
    "antes e depois","mudou","transformacao","nova vida","evolucao","passo a passo",
    "de zero a","saiu de","chegou a","resultado em","em apenas","conseguiu",
  ],
  pertencimento: [
    "comunidade","grupo","turma","junte se","faca parte","time","clube","junto",
    "com a gente","voce nao esta sozinho","nossa turma",
  ],
};

/** Marcadores de prova verificável (números, prazos, instituições). */
export const PROOF_MARKERS = [
  "mais de","clientes","alunos","depoimento","case","resultado","comprovado","estudo",
  "pesquisa","aprovado","certificado","garantia","satisfacao","avaliacao","nota",
];

/** Marcadores de objeção sendo tratada na copy. */
export const OBJECTION_MARKERS = [
  "sem precisar","sem dor","sem sair de casa","mesmo que","ainda que","nao precisa",
  "mesmo sem","sem experiencia","sem investir","sem taxa","sem fidelidade","sem burocracia",
  "sem cirurgia","sem juros","sem contrato","sem enrolacao","mesmo com","garantia de",
  "devolvemos","reembolso","cancele quando quiser","risco zero",
];

/** Marcadores de problema/dor. */
export const PROBLEM_MARKERS = [
  "cansado de","cansada de","voce sofre","dificuldade","dor","incomodo","vergonha",
  "nao consegue","ja tentou","frustrado","perdendo","problema","sofre com","preocupado",
  "desconforto","travado","estagnado","insegur",
];

/** Marcadores de mecanismo — o "como funciona". */
export const MECHANISM_MARKERS = [
  "atraves de","por meio de","com a tecnica","utilizando","metodo","protocolo","sistema",
  "processo","tecnologia","tratamento","avaliacao","diagnostico","passo a passo","formula",
  "framework","abordagem","procedimento",
];

/** Marcadores de promessa/benefício. */
export const PROMISE_MARKERS = [
  "voce vai","voce consegue","garantimos","em ate","em apenas","sem precisar","conquiste",
  "aumente","reduza","economize","recupere","tenha","ganhe","alcance","dobre","triplique",
];

/** Marcadores de janela de urgência com prazo explícito. */
export const URGENCY_WINDOW = [
  "so ate","ultimo dia","termina hoje","restam","ultimas","por tempo limitado","expira",
  "ate sexta","ate domingo","48 horas","24 horas","essa semana",
];

/** Menções a WhatsApp — CTA muito comum no mercado brasileiro. */
export const WHATSAPP_MARKERS = ["whatsapp", "whats", "zap", "wa me", "chame no"];

/** Padrões de preço em pt-BR. */
export const PRICE_RE = /(r\$|rs\s?\$?)\s?\d|(\d+\s?(reais|x de|vezes de))|\bgratis\b|\bgratuito\b/i;

/** Verbos imperativos comuns em CTA. */
export const CTA_VERBS = [
  "clique","agende","garanta","baixe","cadastre","inscreva","compre","adquira","solicite",
  "fale","chame","acesse","assista","aproveite","comece","teste","peca","reserve","saiba",
  "descubra","entre","participe","preencha","envie",
];

/** Ângulos de comunicação reconhecidos no gerador de insights. */
export const ANGLE_LEXICON: Record<string, string[]> = {
  "Dor / problema": PROBLEM_MARKERS,
  "Prova social": EMOTION_LEXICON.prova_social,
  "Autoridade": EMOTION_LEXICON.autoridade,
  "Preço / oferta": ["promocao","desconto","off","a partir de","parcelado","condicao especial","preco"],
  "Urgência / escassez": EMOTION_LEXICON.urgencia,
  "Transformação": EMOTION_LEXICON.transformacao,
  "Curiosidade": EMOTION_LEXICON.curiosidade,
  "Facilidade / conveniência": ["sem sair de casa","rapido","simples","facil","em minutos","pratico","online"],
  "Garantia / risco zero": ["garantia","reembolso","risco zero","devolvemos","satisfacao ou"],
};
