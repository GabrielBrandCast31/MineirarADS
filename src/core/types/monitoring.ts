import type { ISODateTime } from "./common";

export type MonitorTarget = "ad" | "offer" | "advertiser";

export const MONITOR_TARGET_LABEL: Record<MonitorTarget, string> = {
  ad: "Anúncio",
  offer: "Oferta",
  advertiser: "Página / anunciante",
};

export type MonitorFrequency = "hourly" | "daily" | "weekly";

export const MONITOR_FREQUENCY_LABEL: Record<MonitorFrequency, string> = {
  hourly: "A cada hora",
  daily: "Diário",
  weekly: "Semanal",
};

export interface Monitor {
  id: string;
  workspaceId: string;
  target: MonitorTarget;
  entityId: string;
  /** Denormalizado para listar sem N+1. */
  entityLabel: string;
  entityThumbnail: string | null;
  frequency: MonitorFrequency;
  active: boolean;
  lastCheckedAt: ISODateTime | null;
  nextCheckAt: ISODateTime | null;
  /** Contagem de eventos não lidos. */
  unseenEvents: number;
  createdBy: string | null;
  createdAt: ISODateTime;
}

export type MonitoringEventType =
  | "new_ad"
  | "ad_removed"
  | "new_variation"
  | "copy_changed"
  | "creative_changed"
  | "cta_changed"
  | "volume_increase"
  | "volume_decrease"
  | "offer_creatives_added";

export const MONITORING_EVENT_LABEL: Record<MonitoringEventType, string> = {
  new_ad: "Novo anúncio encontrado",
  ad_removed: "Anúncio removido",
  new_variation: "Nova variação detectada",
  copy_changed: "Copy alterada",
  creative_changed: "Criativo alterado",
  cta_changed: "CTA alterado",
  volume_increase: "Aumento no volume de anúncios",
  volume_decrease: "Queda no volume de anúncios",
  offer_creatives_added: "Oferta ganhou novos criativos",
};

export type EventSeverity = "info" | "positive" | "warning";

export interface MonitoringEvent {
  id: string;
  workspaceId: string;
  monitorId: string;
  type: MonitoringEventType;
  severity: EventSeverity;
  title: string;
  description: string;
  /** Dados brutos do diff que originou o evento. */
  payload: Record<string, unknown>;
  /** Entidade tocada, quando aplicável. */
  relatedAdId: string | null;
  seen: boolean;
  createdAt: ISODateTime;
}

/** Ponto da linha do tempo de um monitoramento. */
export interface MonitoringSnapshot {
  id: string;
  monitorId: string;
  workspaceId: string;
  capturedAt: ISODateTime;
  adCount: number;
  activeAdCount: number;
  creativeCount: number;
  contentHash: string;
}

export interface Notification {
  id: string;
  workspaceId: string;
  userId: string | null;
  kind: "monitoring" | "system" | "quota" | "job";
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: ISODateTime;
}
