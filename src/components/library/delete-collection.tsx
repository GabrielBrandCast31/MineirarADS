"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { deleteCollectionAction } from "@/server/actions/library";

export function DeleteCollectionButton({
  collectionId,
  name,
}: {
  collectionId: string;
  name: string;
}): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function confirm(): void {
    startTransition(async () => {
      const result = await deleteCollectionAction(collectionId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Coleção removida.");
      setOpen(false);
      router.push("/library");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-ink-faint hover:text-bad">
          <Trash2 />
          Excluir
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir “{name}”?</DialogTitle>
          <DialogDescription>
            Os anúncios continuam no catálogo — só a coleção e a organização dela são removidas.
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Excluir coleção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
