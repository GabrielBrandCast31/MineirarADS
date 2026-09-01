import * as React from "react";
import { AudioLines } from "lucide-react";
import type { Transcription } from "@/core/types/analysis";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatTimecode } from "@/lib/format";

/**
 * Transcrição de vídeo.
 *
 * A arquitetura está pronta (tabela `transcriptions`, tipo `Transcription`,
 * método `transcribeVideo` no `AIProvider`), mas nenhum provider de STT está
 * configurado por padrão — e a Meta Ad Library não entrega o arquivo de vídeo.
 * Em vez de simular, a interface diz exatamente o que falta.
 */
export function TranscriptionPanel({
  transcription,
  hasVideo,
}: {
  transcription: Transcription | null;
  hasVideo: boolean;
}): React.ReactElement {
  if (!transcription) {
    return (
      <EmptyState
        icon={<AudioLines />}
        title={hasVideo ? "Transcrição indisponível" : "Este anúncio não tem vídeo"}
        description={
          hasVideo ? (
            <>
              A transcrição exige o arquivo de vídeo e um provider de fala-para-texto. A Meta Ad
              Library não fornece o arquivo pela API oficial — a arquitetura já está pronta
              (tabela <code className="font-mono text-[11px]">transcriptions</code> e{" "}
              <code className="font-mono text-[11px]">AIProvider.transcribeVideo</code>) para
              quando houver uma fonte autorizada, incluindo importação manual.
            </>
          ) : (
            "A transcrição só se aplica a criativos em vídeo."
          )
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral" size="sm">
          Motor: {transcription.engine}
        </Badge>
        <Badge variant="outline" size="sm">
          {transcription.language}
        </Badge>
        {transcription.durationSeconds ? (
          <Badge variant="outline" size="sm">
            {formatTimecode(transcription.durationSeconds)}
          </Badge>
        ) : null}
      </div>

      {transcription.summary.value ? (
        <div className="panel p-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
            Resumo
          </p>
          <p className="text-[13.5px] leading-relaxed text-ink-muted">
            {transcription.summary.value}
          </p>
        </div>
      ) : null}

      <ol className="panel divide-y divide-line">
        {transcription.segments.map((segment, index) => (
          <li key={index} className="flex gap-4 px-4 py-3">
            <span className="tnum shrink-0 font-mono text-[12px] text-ink-faint">
              {formatTimecode(segment.startSeconds)}
            </span>
            <div className="min-w-0 flex-1">
              {segment.role ? (
                <Badge variant="brand" size="sm" className="mb-1">
                  {segment.role}
                </Badge>
              ) : null}
              <p className="text-[13.5px] leading-relaxed text-ink-muted">{segment.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
