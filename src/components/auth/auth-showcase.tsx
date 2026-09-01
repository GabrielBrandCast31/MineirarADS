import * as React from "react";
import { Activity, Boxes, Flame, LineChart } from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: <Flame className="size-4 text-heat" />,
    title: "Ad Score explicável",
    body: "Nota de 0 a 100 a partir de sinais observáveis — com a justificativa de cada ponto.",
  },
  {
    icon: <Boxes className="size-4 text-brand-hi" />,
    title: "Agrupamento por oferta",
    body: "14 criativos da mesma promessa aparecem como uma oferta, não como 14 anúncios soltos.",
  },
  {
    icon: <Activity className="size-4 text-ok" />,
    title: "Monitoramento com linha do tempo",
    body: "Snapshots periódicos detectam anúncio novo, variação e mudança de copy.",
  },
  {
    icon: <LineChart className="size-4 text-info" />,
    title: "Dado observado ≠ inferência",
    body: "Toda interpretação vem marcada. A plataforma não vende achismo como métrica.",
  },
];

/** Painel lateral da autenticação: conta o que o produto faz, sem enfeite vazio. */
export function AuthShowcase(): React.ReactElement {
  return (
    <div className="relative hidden overflow-hidden border-l border-line bg-bg lg:block">
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 h-[520px]"
        style={{
          background:
            "radial-gradient(48% 52% at 30% 0%, color-mix(in oklch, var(--color-brand) 30%, transparent), transparent 70%), radial-gradient(42% 48% at 78% 12%, color-mix(in oklch, var(--color-heat) 18%, transparent), transparent 68%)",
          filter: "blur(30px)",
        }}
        aria-hidden
      />
      <div className="grain-layer" aria-hidden />

      <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Inteligência de anúncios
          </p>
          <h2 className="max-w-md text-balance text-3xl font-semibold leading-[1.15] tracking-[-0.025em] text-ink xl:text-[34px]">
            Descubra o que a concorrência mantém{" "}
            <span className="text-gradient-brand">no ar há meses</span>.
          </h2>
          <p className="max-w-md text-pretty text-sm leading-relaxed text-ink-faint">
            Mineração da Meta Ad Library, agrupamento por oferta, análise de copy e criativo e
            monitoramento contínuo — usando apenas dados públicos.
          </p>
        </div>

        <ul className="mt-10 space-y-3.5">
          {HIGHLIGHTS.map((item) => (
            <li key={item.title} className="flex gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-surface-2">
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-ink">{item.title}</p>
                <p className="text-[12.5px] leading-relaxed text-ink-faint">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-10 max-w-md text-[11.5px] leading-relaxed text-ink-faint">
          A plataforma usa exclusivamente fontes públicas e APIs oficiais. Não contorna
          autenticação, limites de uso ou proteções da Meta, e não estima faturamento ou ROAS —
          esses dados não são públicos.
        </p>
      </div>
    </div>
  );
}
