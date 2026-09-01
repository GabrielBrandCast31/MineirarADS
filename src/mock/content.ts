import type { CallToAction } from "@/core/types/common";

/**
 * Conteúdo do dataset de demonstração.
 *
 * As copies são sintéticas — escritas para parecerem anúncios reais do mercado
 * brasileiro, sem reproduzir texto de anunciante existente. Os corpos de texto
 * são montados combinando hook + dor + mecanismo + prova + objeção + CTA, o que
 * gera variações realistas a partir de pouco conteúdo escrito à mão.
 */

export interface OfferTemplate {
  name: string;
  keywords: string[];
  domain: string;
  path: string;
  headlines: string[];
  hooks: string[];
  problems: string[];
  mechanisms: string[];
  ctas: CallToAction[];
  /** Faixa de anúncios que a oferta costuma ter no dataset. */
  adRange: [number, number];
}

export interface NicheTemplate {
  key: string;
  category: string;
  keywords: string[];
  advertisers: string[];
  offers: OfferTemplate[];
}

export const NICHES: NicheTemplate[] = [
  {
    key: "odonto",
    category: "Odontologia",
    keywords: ["odontologia", "dentista", "dente", "sorriso", "implante"],
    advertisers: [
      "Clínica Oral Prime",
      "Instituto Sorriso Vivo",
      "OdontoCenter Vila Nova",
      "Dental Excellence",
      "Clínica Dr. Renan Costa",
    ],
    offers: [
      {
        name: "Implante Dentário",
        keywords: ["implante dentário", "implante", "dentadura", "prótese"],
        domain: "oralprime.com.br",
        path: "implante-dentario",
        adRange: [6, 16],
        headlines: [
          "Implante dentário com avaliação gratuita",
          "Volte a mastigar sem medo",
        ],
        hooks: [
          "Você ainda usa dentadura?",
          "Perdeu um dente e está evitando sorrir nas fotos?",
          "Mastigar virou um problema no seu dia a dia?",
        ],
        problems: [
          "A prótese que solta na hora de comer trava a vida social e machuca a gengiva.",
          "Ficar sem um dente muda a mordida, sobrecarrega os outros dentes e envelhece o rosto.",
        ],
        mechanisms: [
          "Fazemos uma avaliação com tomografia digital e planejamos o implante antes de qualquer procedimento.",
          "O protocolo é feito em etapas, com anestesia local e acompanhamento até a coroa definitiva.",
        ],
        ctas: ["WHATSAPP_MESSAGE", "LEARN_MORE", "CONTACT_US"],
      },
      {
        name: "Clareamento Dental",
        keywords: ["clareamento", "dente branco", "estética dental"],
        domain: "oralprime.com.br",
        path: "clareamento",
        adRange: [3, 9],
        headlines: [
          "Clareamento dental em 2 sessões",
          "Dentes até 6 tons mais claros",
        ],
        hooks: [
          "Seus dentes amarelaram e o clareamento de farmácia não resolveu?",
          "Café todo dia deixou marca no seu sorriso?",
        ],
        problems: [
          "Clareador de supermercado costuma manchar de forma irregular e aumentar a sensibilidade.",
          "Manchas de café e cigarro não saem só com escovação.",
        ],
        mechanisms: [
          "Usamos clareamento em consultório com controle de sensibilidade sessão por sessão.",
        ],
        ctas: ["LEARN_MORE", "WHATSAPP_MESSAGE", "GET_OFFER"],
      },
      {
        name: "Alinhador Invisível",
        keywords: ["aparelho invisível", "alinhador", "ortodontia"],
        domain: "sorrisovivo.com.br",
        path: "alinhador-invisivel",
        adRange: [4, 12],
        headlines: [
          "Alinhe os dentes sem aparelho metálico",
          "Aparelho invisível a partir de 12x",
        ],
        hooks: [
          "Adulto com aparelho metálico? Existe outro caminho.",
          "Quer alinhar os dentes sem ninguém perceber?",
        ],
        problems: [
          "Muita gente adia o tratamento por vergonha do aparelho fixo no trabalho.",
          "Dentes tortos não são só estética: atrapalham a higiene e desgastam o esmalte.",
        ],
        mechanisms: [
          "Escaneamos a arcada, simulamos o resultado final e você troca os alinhadores em casa.",
        ],
        ctas: ["LEARN_MORE", "SIGN_UP", "WHATSAPP_MESSAGE"],
      },
    ],
  },
  {
    key: "estetica",
    category: "Estética e beleza",
    keywords: ["estética", "beleza", "harmonização", "laser", "pele"],
    advertisers: [
      "Studio Belle Estética",
      "Clínica Lumière",
      "Espaço Renova Corpo",
      "Instituto Dermaplus",
    ],
    offers: [
      {
        name: "Harmonização Facial",
        keywords: ["harmonização facial", "preenchimento", "botox"],
        domain: "clinicalumiere.com.br",
        path: "harmonizacao-facial",
        adRange: [5, 14],
        headlines: [
          "Harmonização facial com avaliação 3D",
          "Resultado natural, sem exagero",
        ],
        hooks: [
          "Cansada de ver harmonização que deixa o rosto artificial?",
          "Quer um rosto mais definido sem parecer que fez procedimento?",
          "O espelho anda te incomodando à tarde?",
        ],
        problems: [
          "Preenchimento aplicado sem planejamento deixa assimetria que leva meses para reabsorver.",
          "Flacidez no terço inferior do rosto muda a expressão e nenhum creme resolve.",
        ],
        mechanisms: [
          "Fazemos avaliação com foto 3D e definimos o plano por área antes de aplicar qualquer produto.",
        ],
        ctas: ["WHATSAPP_MESSAGE", "LEARN_MORE", "CONTACT_US"],
      },
      {
        name: "Depilação a Laser",
        keywords: ["depilação a laser", "laser", "pelos"],
        domain: "studiobelle.com.br",
        path: "depilacao-laser",
        adRange: [4, 11],
        headlines: ["Depilação a laser: pacote anual", "Adeus lâmina e cera quente"],
        hooks: [
          "Quantas vezes você já se cortou depilando na correria?",
          "Pelo encravado virou rotina no seu verão?",
        ],
        problems: [
          "Cera e lâmina resolvem por 3 dias e cobram foliculite como juros.",
        ],
        mechanisms: [
          "Aplicamos laser de diodo com resfriamento, ajustando a potência por fototipo de pele.",
        ],
        ctas: ["GET_OFFER", "WHATSAPP_MESSAGE", "SHOP_NOW"],
      },
      {
        name: "Protocolo Corporal",
        keywords: ["criolipólise", "gordura localizada", "corporal"],
        domain: "renovacorpo.com.br",
        path: "protocolo-corporal",
        adRange: [3, 8],
        headlines: ["Protocolo corporal em 6 semanas", "Medidas que aparecem na fita"],
        hooks: [
          "A gordura localizada não sai nem com dieta fechada?",
          "Você treina, come bem e a barriga não muda?",
        ],
        problems: [
          "Gordura localizada responde pouco a déficit calórico e muito a estímulo local.",
        ],
        mechanisms: [
          "Combinamos avaliação de bioimpedância, criolipólise e acompanhamento semanal de medidas.",
        ],
        ctas: ["LEARN_MORE", "WHATSAPP_MESSAGE"],
      },
    ],
  },
  {
    key: "emagrecimento",
    category: "Saúde e bem-estar",
    keywords: ["emagrecimento", "dieta", "peso", "nutrição", "saúde"],
    advertisers: [
      "Método Corpo Leve",
      "Nutri Clara Menezes",
      "Programa Vida Ativa",
      "Clínica Metabólica SP",
    ],
    offers: [
      {
        name: "Programa de Emagrecimento",
        keywords: ["emagrecimento", "perder peso", "dieta"],
        domain: "corpoleve.com.br",
        path: "programa-emagrecimento",
        adRange: [8, 18],
        headlines: [
          "Programa de emagrecimento com acompanhamento",
          "Emagreça sem dieta de gaveta",
        ],
        hooks: [
          "Você já emagreceu e engordou tudo de novo?",
          "Terceira dieta do ano e o ponteiro voltou?",
          "Não é falta de força de vontade. É falta de método.",
        ],
        problems: [
          "Dieta restritiva derruba o metabolismo e o efeito rebote vem em semanas.",
          "Sem ajuste de rotina, qualquer plano alimentar dura até o primeiro fim de semana.",
        ],
        mechanisms: [
          "O acompanhamento é semanal, com ajuste de plano conforme exames e rotina real.",
          "Trabalhamos em ciclos de 4 semanas, medindo composição corporal em vez de só peso.",
        ],
        ctas: ["SIGN_UP", "LEARN_MORE", "WHATSAPP_MESSAGE"],
      },
      {
        name: "Consulta Nutricional Online",
        keywords: ["nutricionista", "consulta online", "plano alimentar"],
        domain: "nutriclara.com.br",
        path: "consulta-online",
        adRange: [3, 9],
        headlines: ["Consulta nutricional online", "Plano alimentar que cabe na sua rotina"],
        hooks: [
          "Plano alimentar com comida que você não come não funciona.",
          "Você precisa de dieta ou de rotina?",
        ],
        problems: [
          "Cardápio genérico ignora horário de trabalho, orçamento e o que existe na sua geladeira.",
        ],
        mechanisms: [
          "A consulta é por vídeo e o plano sai a partir do seu registro alimentar de 7 dias.",
        ],
        ctas: ["SIGN_UP", "CONTACT_US", "LEARN_MORE"],
      },
      {
        name: "Desafio 21 Dias",
        keywords: ["desafio", "treino em casa", "21 dias"],
        domain: "vidaativa.com.br",
        path: "desafio-21-dias",
        adRange: [4, 10],
        headlines: ["Desafio de 21 dias em casa", "20 minutos por dia, sem equipamento"],
        hooks: [
          "Não tem tempo para academia? 20 minutos por dia resolvem o começo.",
          "Voltar a treinar depois de 2 anos parados dá medo — comece devagar.",
        ],
        problems: [
          "Quem começa com treino pesado desiste na primeira semana por dor e frustração.",
        ],
        mechanisms: [
          "São 21 treinos curtos em vídeo, com progressão semanal e checklist diário.",
        ],
        ctas: ["SIGN_UP", "SHOP_NOW", "LEARN_MORE"],
      },
    ],
  },
  {
    key: "solar",
    category: "Energia solar",
    keywords: ["energia solar", "solar", "placa solar", "conta de luz"],
    advertisers: [
      "SolarMais Engenharia",
      "EcoWatt Energia",
      "Helios Solar Brasil",
      "Volt Livre Solar",
    ],
    offers: [
      {
        name: "Energia Solar Residencial",
        keywords: ["energia solar", "placa solar", "conta de luz"],
        domain: "solarmais.com.br",
        path: "residencial",
        adRange: [7, 17],
        headlines: [
          "Energia solar sem entrada",
          "Troque a conta de luz pela parcela do sistema",
        ],
        hooks: [
          "Sua conta de luz passou de R$ 600?",
          "Você paga energia há 10 anos e não tem nada no seu nome.",
          "A bandeira tarifária subiu de novo. Até quando?",
        ],
        problems: [
          "Tarifa de energia sobe acima da inflação e não existe teto previsto para os próximos anos.",
          "Quem aluga o telhado para o vizinho economiza; quem só paga a conta, não.",
        ],
        mechanisms: [
          "Fazemos o projeto pelo seu histórico de consumo, cuidamos da homologação na distribuidora e instalamos em até 30 dias.",
        ],
        ctas: ["GET_QUOTE", "WHATSAPP_MESSAGE", "LEARN_MORE"],
      },
      {
        name: "Solar para Comércio",
        keywords: ["energia solar comercial", "empresa", "galpão"],
        domain: "ecowatt.com.br",
        path: "comercial",
        adRange: [3, 8],
        headlines: ["Energia solar para o seu comércio", "Reduza o custo fixo do seu negócio"],
        hooks: [
          "Energia é o segundo maior custo fixo do seu comércio?",
          "Padaria, mercado, salão: a conta de luz come a margem.",
        ],
        problems: [
          "Negócio com consumo alto no horário comercial é exatamente o caso em que solar rende mais.",
        ],
        mechanisms: [
          "Analisamos 12 meses de faturas, dimensionamos o sistema e apresentamos o payback antes do contrato.",
        ],
        ctas: ["GET_QUOTE", "CONTACT_US"],
      },
    ],
  },
  {
    key: "saas",
    category: "Software / SaaS",
    keywords: ["crm", "software", "saas", "automação", "gestão"],
    advertisers: [
      "Pipefy Clínicas",
      "Nexo CRM",
      "Fluxo Automação",
      "Gestor360",
    ],
    offers: [
      {
        name: "CRM para Clínicas",
        keywords: ["crm", "crm para clínicas", "gestão de pacientes"],
        domain: "nexocrm.com.br",
        path: "crm-clinicas",
        adRange: [5, 13],
        headlines: ["CRM para clínicas com agenda integrada", "Pare de perder paciente no WhatsApp"],
        hooks: [
          "Quantos orçamentos da sua clínica morreram no WhatsApp esse mês?",
          "Sua secretária responde e o lead esfria. O problema não é ela.",
          "Você sabe quantos pacientes o anúncio de ontem trouxe?",
        ],
        problems: [
          "Sem CRM, o histórico do paciente vive na cabeça de quem atende — e vai embora com a rotatividade.",
          "Planilha não cobra retorno, não agenda follow-up e não mostra origem do lead.",
        ],
        mechanisms: [
          "Integramos WhatsApp, agenda e funil em um só painel, com relatório por origem de lead.",
        ],
        ctas: ["SIGN_UP", "LEARN_MORE", "SUBSCRIBE"],
      },
      {
        name: "Automação de WhatsApp",
        keywords: ["automação whatsapp", "chatbot", "atendimento"],
        domain: "fluxoauto.com.br",
        path: "whatsapp",
        adRange: [4, 11],
        headlines: ["Automação de WhatsApp sem parecer robô", "Atenda 300 conversas com 2 pessoas"],
        hooks: [
          "Seu time responde as mesmas 5 perguntas 80 vezes por dia?",
          "Lead que espera 1 hora por resposta já falou com o concorrente.",
        ],
        problems: [
          "Atendimento manual não escala: o custo por conversa cresce junto com o investimento em mídia.",
        ],
        mechanisms: [
          "Você monta o fluxo por arrastar e soltar e o humano entra só quando o lead qualifica.",
        ],
        ctas: ["SIGN_UP", "LEARN_MORE", "DOWNLOAD"],
      },
      {
        name: "ERP para Pequenos Negócios",
        keywords: ["erp", "gestão financeira", "nota fiscal"],
        domain: "gestor360.com.br",
        path: "erp",
        adRange: [3, 7],
        headlines: ["ERP simples para quem odeia ERP", "Financeiro, estoque e nota fiscal num lugar"],
        hooks: [
          "Você fecha o mês sem saber se deu lucro?",
          "Três planilhas, dois cadernos e nenhuma resposta.",
        ],
        problems: [
          "Sem controle integrado, faltam dados básicos: margem por produto e caixa projetado.",
        ],
        mechanisms: [
          "Importamos seus dados atuais e você emite a primeira nota no mesmo dia.",
        ],
        ctas: ["SIGN_UP", "SUBSCRIBE", "LEARN_MORE"],
      },
    ],
  },
  {
    key: "ingles",
    category: "Educação",
    keywords: ["curso de inglês", "inglês", "idioma", "fluência"],
    advertisers: [
      "Fluency Lab",
      "Escola Speak Now",
      "Método Inglês Direto",
      "Language Hub",
    ],
    offers: [
      {
        name: "Curso de Inglês para Conversação",
        keywords: ["curso de inglês", "conversação", "fluência"],
        domain: "fluencylab.com.br",
        path: "conversacao",
        adRange: [6, 15],
        headlines: ["Curso de inglês focado em conversação", "Fale inglês em 6 meses, não em 6 anos"],
        hooks: [
          "Você estuda inglês há anos e trava na hora de falar?",
          "Entende série sem legenda mas não consegue pedir um café?",
          "Gramática você já sabe. Falar é outro músculo.",
        ],
        problems: [
          "Curso tradicional gasta 80% do tempo em regra e 20% em fala — o inverso do que o cérebro precisa.",
          "Sem prática com gente de verdade, o vocabulário fica passivo.",
        ],
        mechanisms: [
          "São aulas em grupos de até 4 pessoas, com 70% do tempo de fala do aluno e correção em tempo real.",
        ],
        ctas: ["SIGN_UP", "LEARN_MORE", "APPLY_NOW"],
      },
      {
        name: "Inglês para Entrevista Técnica",
        keywords: ["inglês para entrevista", "inglês para ti", "carreira"],
        domain: "languagehub.com.br",
        path: "entrevista-tecnica",
        adRange: [3, 8],
        headlines: ["Inglês para entrevista técnica", "Passe na entrevista em inglês"],
        hooks: [
          "Vaga internacional caiu por causa do inglês na entrevista?",
          "Você resolve o algoritmo mas não consegue explicá-lo em inglês.",
        ],
        problems: [
          "Entrevista técnica exige narrar raciocínio ao vivo — habilidade que curso genérico não treina.",
        ],
        mechanisms: [
          "Simulamos entrevistas reais com feedback gravado sobre clareza, vocabulário e pronúncia.",
        ],
        ctas: ["APPLY_NOW", "SIGN_UP", "LEARN_MORE"],
      },
    ],
  },
  {
    key: "info",
    category: "Infoprodutos",
    keywords: ["curso online", "tráfego pago", "marketing", "mentoria"],
    advertisers: [
      "Escola de Tráfego Pro",
      "Mentoria Escala Digital",
      "Academia do Copy",
      "Growth Sem Achismo",
    ],
    offers: [
      {
        name: "Curso de Tráfego Pago",
        keywords: ["tráfego pago", "gestor de tráfego", "meta ads"],
        domain: "trafegopro.com.br",
        path: "curso-trafego",
        adRange: [8, 20],
        headlines: ["Curso de tráfego pago do zero ao primeiro cliente", "Aprenda Meta Ads na prática"],
        hooks: [
          "Você aprendeu a subir campanha, mas não a fechar cliente.",
          "Gestor de tráfego não vive de curso. Vive de contrato assinado.",
          "Quantas contas você já gerenciou fora do seu próprio Instagram?",
        ],
        problems: [
          "A maioria dos cursos ensina a plataforma e para exatamente onde começa a parte difícil: prospecção e retenção.",
          "Sem processo de diagnóstico, o gestor vira apertador de botão e é trocado no primeiro mês ruim.",
        ],
        mechanisms: [
          "São 9 módulos com estudo de caso real, planilha de diagnóstico e roteiro de reunião com cliente.",
        ],
        ctas: ["SIGN_UP", "LEARN_MORE", "SHOP_NOW"],
      },
      {
        name: "Mentoria de Copywriting",
        keywords: ["copywriting", "copy", "escrita persuasiva"],
        domain: "academiadocopy.com.br",
        path: "mentoria-copy",
        adRange: [4, 11],
        headlines: ["Mentoria de copywriting em grupo", "Escreva anúncio que segura o scroll"],
        hooks: [
          "Sua copy explica o produto. E é justamente por isso que ela não vende.",
          "Você escreve bem. Só não escreve para vender.",
        ],
        problems: [
          "Texto sem hook morre nos primeiros 3 segundos, por melhor que seja o resto.",
        ],
        mechanisms: [
          "Você entrega uma copy por semana e recebe revisão linha a linha em call ao vivo.",
        ],
        ctas: ["APPLY_NOW", "SIGN_UP", "LEARN_MORE"],
      },
    ],
  },
  {
    key: "advocacia",
    category: "Advocacia",
    keywords: ["advogado", "aposentadoria", "direito", "inss"],
    advertisers: [
      "Ribeiro & Associados",
      "Escritório Previdenciário Alves",
      "Direito Claro Advocacia",
    ],
    offers: [
      {
        name: "Revisão de Aposentadoria",
        keywords: ["aposentadoria", "inss", "revisão de benefício"],
        domain: "ribeiroadv.com.br",
        path: "revisao-aposentadoria",
        adRange: [5, 12],
        headlines: ["Revisão de aposentadoria: análise gratuita", "Seu benefício pode estar menor do que deveria"],
        hooks: [
          "Você se aposentou e o valor veio menor do que esperava?",
          "Trabalhou com carteira assinada por 30 anos e recebe o mínimo?",
        ],
        problems: [
          "Erro de cálculo do INSS e período não averbado são causas comuns de benefício abaixo do devido.",
          "Muita gente aceita o valor da carta de concessão sem nunca ter conferido a memória de cálculo.",
        ],
        mechanisms: [
          "Analisamos seu CNIS e a carta de concessão e dizemos, por escrito, se há tese de revisão.",
        ],
        ctas: ["WHATSAPP_MESSAGE", "CONTACT_US", "LEARN_MORE"],
      },
      {
        name: "Direito Trabalhista",
        keywords: ["direito trabalhista", "demissão", "rescisão"],
        domain: "direitoclaro.adv.br",
        path: "trabalhista",
        adRange: [3, 9],
        headlines: ["Fui demitido e agora?", "Consulta trabalhista sem compromisso"],
        hooks: [
          "Demitido sem receber tudo o que era seu?",
          "Assinou a rescisão sem conferir? Ainda dá tempo.",
        ],
        problems: [
          "Verba rescisória errada e hora extra não paga prescrevem — e o prazo corre contra você.",
        ],
        mechanisms: [
          "A primeira consulta é online, com leitura dos seus documentos e parecer em até 48h.",
        ],
        ctas: ["WHATSAPP_MESSAGE", "CONTACT_US"],
      },
    ],
  },
  {
    key: "imobiliario",
    category: "Imobiliário",
    keywords: ["imóvel", "apartamento", "financiamento", "planta"],
    advertisers: [
      "Vértice Incorporadora",
      "Imobiliária Marco Zero",
      "Construtora Novo Lar",
    ],
    offers: [
      {
        name: "Apartamento na Planta",
        keywords: ["apartamento na planta", "imóvel", "lançamento"],
        domain: "verticeinc.com.br",
        path: "lancamento",
        adRange: [4, 12],
        headlines: ["Apartamento na planta com entrada facilitada", "2 dormitórios a 400m do metrô"],
        hooks: [
          "Pagar aluguel por mais 5 anos ou começar a pagar o seu?",
          "Entrada parcelada em 60 meses muda a conta.",
        ],
        problems: [
          "Quem espera juntar a entrada inteira costuma ver o preço do metro quadrado subir mais rápido que a poupança.",
        ],
        mechanisms: [
          "Simulamos financiamento com 3 bancos e mostramos o fluxo de pagamento mês a mês antes de qualquer visita.",
        ],
        ctas: ["LEARN_MORE", "GET_QUOTE", "WHATSAPP_MESSAGE"],
      },
    ],
  },
  {
    key: "pet",
    category: "Pet",
    keywords: ["pet", "cachorro", "gato", "veterinário", "adestramento"],
    advertisers: ["PetVida Saúde Animal", "Clínica AmigoFiel", "Adestra Bem"],
    offers: [
      {
        name: "Plano de Saúde Pet",
        keywords: ["plano de saúde pet", "veterinário", "pet"],
        domain: "petvida.com.br",
        path: "plano-pet",
        adRange: [4, 10],
        headlines: ["Plano de saúde pet a partir de R$ 49", "Consulta, vacina e exame inclusos"],
        hooks: [
          "Uma cirurgia de emergência no seu cachorro custa quanto?",
          "Seu pet ficou doente às 23h. E agora?",
        ],
        problems: [
          "Emergência veterinária no fim de semana facilmente passa de R$ 3.000 no cartão.",
        ],
        mechanisms: [
          "O plano cobre consulta, vacina, exame de imagem e cirurgia, com rede credenciada 24h.",
        ],
        ctas: ["SUBSCRIBE", "LEARN_MORE", "SIGN_UP"],
      },
      {
        name: "Adestramento em Casa",
        keywords: ["adestramento", "cachorro", "comportamento"],
        domain: "adestrabem.com.br",
        path: "adestramento",
        adRange: [3, 7],
        headlines: ["Adestramento em casa, sem gritos", "Seu cachorro para de destruir a casa"],
        hooks: [
          "Seu cachorro late para tudo e você já tentou de tudo?",
          "Destruiu o sofá de novo?",
        ],
        problems: [
          "Comportamento destrutivo quase sempre é energia acumulada, não teimosia.",
        ],
        mechanisms: [
          "Vamos até sua casa, avaliamos a rotina do animal e treinamos você a conduzir os comandos.",
        ],
        ctas: ["WHATSAPP_MESSAGE", "CONTACT_US"],
      },
    ],
  },
];

/* --------------------------------------------------- blocos reutilizáveis -- */

/** Provas sociais genéricas — `{n}` é substituído por um número plausível. */
export const PROOF_LINES = [
  "Mais de {n} clientes atendidos desde 2019.",
  "{n} avaliações 5 estrelas no Google.",
  "Já são {n} atendimentos realizados só neste ano.",
  "Nota 4,9 em {n} avaliações de quem passou pelo processo.",
  "{n} pessoas concluíram o processo com a gente.",
  "Equipe com mais de 12 anos de experiência na área.",
];

export const OBJECTION_LINES = [
  "Sem cirurgia e sem afastamento do trabalho.",
  "Sem taxa de adesão e sem fidelidade.",
  "Você não precisa ter experiência prévia.",
  "Mesmo que você já tenha tentado antes e não funcionado.",
  "Garantia de 7 dias: não gostou, devolvemos o valor.",
  "Sem sair de casa: tudo pode ser resolvido online.",
  "Cancele quando quiser, sem multa.",
  "Sem juros e sem consulta ao SPC.",
];

export const CTA_LINES = [
  "Clique em “Saiba mais” e faça sua avaliação.",
  "Chame no WhatsApp e receba o diagnóstico hoje mesmo.",
  "Agende sua avaliação gratuita agora.",
  "Preencha o formulário e nossa equipe entra em contato.",
  "Toque no botão abaixo e garanta sua vaga.",
  "Fale com um especialista e receba a proposta por escrito.",
  "Deixe seu contato e receba a simulação em minutos.",
];

export const URGENCY_LINES = [
  "Últimas vagas para esta semana.",
  "Condição válida só até domingo.",
  "Restam poucas unidades no lote atual.",
  "Agenda de avaliações fecha na sexta.",
];

export const EMOJI_POOL = ["🔥", "✅", "👇", "📲", "⚡", "💬", "🎯", "⭐", "🚀", "💡"];

/** Sufixos que criam variações de headline sem reescrever o conteúdo. */
export const HEADLINE_VARIANTS = [
  "",
  " | Avaliação gratuita",
  " | Condição de setembro",
  " | Vagas limitadas",
  " – Fale agora",
];
