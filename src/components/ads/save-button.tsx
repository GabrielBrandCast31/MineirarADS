"use client";

import * as React from "react";
import { Bookmark, BookmarkCheck, Check, Loader2, Plus } from "lucide-react";
import type { Collection, CollectionItemKind } from "@/core/types/library";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  createCollectionAction,
  loadSaveTargetsAction,
  saveItemAction,
} from "@/server/actions/library";

/**
 * Salvar em coleção.
 *
 * As coleções são carregadas sob demanda, ao abrir o diálogo — evita mandar a
 * lista inteira junto de cada um dos 24 cards da grade.
 */
export function SaveButton({
  kind,
  entityId,
  label,
  initiallySaved = false,
  variant = "ghost",
  size = "icon-sm",
  showLabel = false,
  className,
}: {
  kind: CollectionItemKind;
  entityId: string;
  label: string;
  initiallySaved?: boolean;
  variant?: "ghost" | "outline" | "secondary";
  size?: "icon-sm" | "sm" | "md";
  showLabel?: boolean;
  className?: string;
}): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [saved, setSaved] = React.useState(initiallySaved);
  const [loading, setLoading] = React.useState(false);
  const [collections, setCollections] = React.useState<Collection[]>([]);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [newName, setNewName] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  /**
   * A carga é disparada pelo evento de abrir, não por um efeito: buscar dados
   * é consequência da ação do usuário. Num efeito, o `setLoading(true)`
   * síncrono provocaria um render em cascata a cada abertura.
   */
  async function loadTargets(): Promise<void> {
    setLoading(true);
    const result = await loadSaveTargetsAction({ kind, entityId });
    if (result.ok) {
      setCollections(result.data.collections);
      setSelected(result.data.selected);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  function handleOpenChange(next: boolean): void {
    setOpen(next);
    if (next) void loadTargets();
  }

  function save(collectionId: string): void {
    startTransition(async () => {
      const result = await saveItemAction({ collectionId, kind, entityId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSelected((prev) => [...new Set([...prev, collectionId])]);
      setSaved(true);
      toast.success("Salvo na coleção.");
    });
  }

  function createAndSave(): void {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const created = await createCollectionAction({ name });
      if (!created.ok) {
        toast.error(created.error);
        return;
      }
      setCollections((prev) => [created.data, ...prev]);
      setNewName("");
      const result = await saveItemAction({ collectionId: created.data.id, kind, entityId });
      if (result.ok) {
        setSelected((prev) => [...prev, created.data.id]);
        setSaved(true);
        toast.success(`Coleção "${name}" criada e item salvo.`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(saved && "text-heat", className)}
          aria-label="Salvar em coleção"
          title="Salvar em coleção"
        >
          {saved ? <BookmarkCheck /> : <Bookmark />}
          {showLabel ? (saved ? "Salvo" : "Salvar") : null}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar em uma coleção</DialogTitle>
          <DialogDescription className="line-clamp-1">{label}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-ink-faint">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : collections.length === 0 ? (
            <p className="py-2 text-[13px] text-ink-faint">
              Você ainda não tem coleções. Crie a primeira abaixo.
            </p>
          ) : (
            <ul className="space-y-1">
              {collections.map((collection) => {
                const isSelected = selected.includes(collection.id);
                return (
                  <li key={collection.id}>
                    <button
                      type="button"
                      disabled={isSelected || pending}
                      onClick={() => save(collection.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                        isSelected
                          ? "cursor-default border-ok/30 bg-ok/8"
                          : "border-line hover:border-line-strong hover:bg-surface-2",
                      )}
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: `var(--color-${collection.color})` }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] text-ink">
                          {collection.name}
                        </span>
                        <span className="block text-[11.5px] text-ink-faint">
                          {collection.itemCount} {collection.itemCount === 1 ? "item" : "itens"}
                        </span>
                      </span>
                      {isSelected ? <Check className="size-4 shrink-0 text-ok" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </DialogBody>

        <DialogFooter className="sm:justify-between">
          <div className="flex w-full gap-2">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Nova coleção…"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  createAndSave();
                }
              }}
            />
            <Button
              variant="primary"
              onClick={createAndSave}
              disabled={pending || newName.trim().length === 0}
            >
              {pending ? <Loader2 className="animate-spin" /> : <Plus />}
              Criar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
