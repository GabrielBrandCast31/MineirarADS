"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function AdvertiserSearch({ initial }: { initial: string }): React.ReactElement {
  const router = useRouter();
  const [term, setTerm] = React.useState(initial);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const query = term.trim();
        router.push(query ? `/advertisers?q=${encodeURIComponent(query)}` : "/advertisers");
      }}
      className="relative w-full sm:w-64"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
      <Input
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Buscar por nome da página"
        className="pl-9"
        aria-label="Buscar anunciante"
      />
    </form>
  );
}
