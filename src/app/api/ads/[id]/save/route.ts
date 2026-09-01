import { z } from "zod";
import { apiHandler, readJson } from "@/lib/api/handler";
import { getRepositories } from "@/data";
import { assertQuota } from "@/server/services/quota";

const bodySchema = z.object({
  collectionId: z.string().min(1).optional(),
  collectionName: z.string().min(1).max(80).optional(),
  note: z.string().max(500).optional(),
});

/**
 * POST /api/ads/[id]/save
 *
 * Salva o anúncio em uma coleção existente (`collectionId`) ou cria uma nova
 * pelo nome (`collectionName`).
 */
export const POST = apiHandler<{ id: string }>(async ({ request, session, params }) => {
  const body = await readJson(request, bodySchema);
  const repositories = getRepositories();

  let collectionId = body.collectionId;
  if (!collectionId) {
    const collection = await repositories.library.createCollection(session, {
      name: body.collectionName ?? "Salvos",
    });
    collectionId = collection.id;
  }

  await assertQuota(session, "saved_items");
  const item = await repositories.library.addItem(session, {
    collectionId,
    kind: "ad",
    entityId: params.id,
    note: body.note ?? null,
  });
  await repositories.usage.increment(session, "saved_items");

  return item;
});
