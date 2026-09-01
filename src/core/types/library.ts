import type { ISODateTime } from "./common";

export type CollectionItemKind = "ad" | "creative" | "offer" | "advertiser";

export const COLLECTION_ITEM_LABEL: Record<CollectionItemKind, string> = {
  ad: "Anúncio",
  creative: "Criativo",
  offer: "Oferta",
  advertiser: "Anunciante",
};

export interface Collection {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  /** Cor de acento usada nos cards. Um dos tokens de `COLLECTION_COLORS`. */
  color: string;
  icon: string | null;
  itemCount: number;
  /** Miniaturas dos últimos itens, para a capa do card. */
  coverThumbnails: string[];
  createdBy: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  workspaceId: string;
  kind: CollectionItemKind;
  /** ID da entidade referenciada, conforme `kind`. */
  entityId: string;
  note: string | null;
  addedBy: string | null;
  createdAt: ISODateTime;
}

export interface Tag {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  usageCount: number;
  createdAt: ISODateTime;
}

export const COLLECTION_COLORS = [
  "brand",
  "heat",
  "ok",
  "info",
  "bad",
  "warn",
] as const;

export type CollectionColor = (typeof COLLECTION_COLORS)[number];
