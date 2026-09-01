"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Collection, CollectionItem } from "@/core/types/library";
import { getRepositories } from "@/data";
import { requireSession } from "@/server/auth";
import { assertQuota } from "@/server/services/quota";
import { failure, success, type ActionResult } from "./result";

const kindSchema = z.enum(["ad", "creative", "offer", "advertiser"]);

export async function createCollectionAction(input: {
  name: string;
  description?: string;
  color?: string;
}): Promise<ActionResult<Collection>> {
  try {
    const session = await requireSession();
    const parsed = z
      .object({
        name: z.string().trim().min(1, "Dê um nome à coleção.").max(80),
        description: z.string().trim().max(280).optional(),
        color: z.string().optional(),
      })
      .parse(input);

    const collection = await getRepositories().library.createCollection(session, parsed);
    revalidatePath("/library");
    return success(collection);
  } catch (error) {
    return failure(error);
  }
}

export async function saveItemAction(input: {
  collectionId: string;
  kind: z.infer<typeof kindSchema>;
  entityId: string;
  note?: string;
}): Promise<ActionResult<CollectionItem>> {
  try {
    const session = await requireSession();
    await assertQuota(session, "saved_items");

    const repositories = getRepositories();
    const item = await repositories.library.addItem(session, {
      collectionId: input.collectionId,
      kind: kindSchema.parse(input.kind),
      entityId: input.entityId,
      note: input.note ?? null,
    });
    await repositories.usage.increment(session, "saved_items");

    revalidatePath("/library");
    revalidatePath("/dashboard");
    return success(item);
  } catch (error) {
    return failure(error);
  }
}

export async function removeItemAction(itemId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await getRepositories().library.removeItem(session, itemId);
    revalidatePath("/library");
    return success(undefined);
  } catch (error) {
    return failure(error);
  }
}

export async function deleteCollectionAction(collectionId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await getRepositories().library.deleteCollection(session, collectionId);
    revalidatePath("/library");
    return success(undefined);
  } catch (error) {
    return failure(error);
  }
}

/** Coleções + em quais delas a entidade já está — alimenta o modal de salvar. */
export async function loadSaveTargetsAction(input: {
  kind: z.infer<typeof kindSchema>;
  entityId: string;
}): Promise<ActionResult<{ collections: Collection[]; selected: string[] }>> {
  try {
    const session = await requireSession();
    const repositories = getRepositories();
    const [collections, selected] = await Promise.all([
      repositories.library.listCollections(session),
      repositories.library.collectionsContaining(
        session,
        kindSchema.parse(input.kind),
        input.entityId,
      ),
    ]);
    return success({ collections, selected });
  } catch (error) {
    return failure(error);
  }
}
