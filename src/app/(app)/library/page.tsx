import type { Metadata } from "next";
import { Library, Tag as TagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { CollectionCard } from "@/components/library/collection-card";
import { CreateCollectionButton } from "@/components/library/create-collection";
import { getRepositories } from "@/data";
import { requireSession } from "@/server/auth";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Biblioteca" };

export default async function LibraryPage(): Promise<React.ReactElement> {
  const session = await requireSession();
  const repositories = getRepositories();

  const [collections, tags] = await Promise.all([
    repositories.library.listCollections(session),
    repositories.library.listTags(session),
  ]);

  const totalItems = collections.reduce((sum, collection) => sum + collection.itemCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Library className="size-3.5" />
            Acervo
          </>
        }
        title="Biblioteca"
        description={`${formatNumber(collections.length)} coleções e ${formatNumber(totalItems)} itens salvos. Guarde anúncios, criativos, ofertas e páginas para consultar depois.`}
        actions={<CreateCollectionButton />}
      />

      {tags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <TagIcon className="size-3.5 text-ink-faint" />
          {tags.map((tag) => (
            <Badge key={tag.id} variant="outline" size="sm">
              {tag.name}
              {tag.usageCount > 0 ? (
                <span className="text-ink-faint">{tag.usageCount}</span>
              ) : null}
            </Badge>
          ))}
        </div>
      ) : null}

      {collections.length === 0 ? (
        <EmptyState
          icon={<Library />}
          title="Nenhuma coleção ainda"
          description="Crie coleções como “Odonto — Concorrentes”, “Hooks” ou “VSL” e salve os anúncios direto dos cards da mineração."
          action={<CreateCollectionButton />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </div>
  );
}
