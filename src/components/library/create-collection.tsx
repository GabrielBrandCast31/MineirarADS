"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";
import { COLLECTION_COLORS } from "@/core/types/library";
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
import { Input, Label, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { createCollectionAction } from "@/server/actions/library";

export function CreateCollectionButton(): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState<string>("brand");
  const [pending, startTransition] = React.useTransition();

  function submit(): void {
    startTransition(async () => {
      const result = await createCollectionAction({ name, description, color });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Coleção "${result.data.name}" criada.`);
      setOpen(false);
      setName("");
      setDescription("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">
          <Plus />
          Nova coleção
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova coleção</DialogTitle>
          <DialogDescription>
            Organize achados por nicho, concorrente, tipo de gancho ou campanha.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="collection-name">Nome</Label>
            <Input
              id="collection-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Odonto — Concorrentes"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="collection-description">Descrição (opcional)</Label>
            <Textarea
              id="collection-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="O que entra nesta coleção?"
            />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {COLLECTION_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setColor(option)}
                  aria-label={`Cor ${option}`}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform",
                    color === option ? "scale-110 border-ink" : "border-transparent",
                  )}
                  style={{ backgroundColor: `var(--color-${option})` }}
                />
              ))}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={pending || name.trim().length === 0}
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            Criar coleção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
