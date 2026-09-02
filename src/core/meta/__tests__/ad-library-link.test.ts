import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAdLibraryLink } from "../ad-library-link";

test("lê o ID da página em view_all_page_id", () => {
  const parsed = parseAdLibraryLink(
    "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&view_all_page_id=102938475610&search_type=page",
  );
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.link, { kind: "page", pageId: "102938475610", country: "BR" });
});

test("lê o ID da página na forma search_page_ids", () => {
  const json = parseAdLibraryLink(
    'https://www.facebook.com/ads/library/?search_page_ids=["102938475610"]&country=PT',
  );
  assert.ok(json.ok);
  assert.deepEqual(json.link, { kind: "page", pageId: "102938475610", country: "PT" });

  const indexed = parseAdLibraryLink(
    "https://facebook.com/ads/library/?search_page_ids[0]=102938475610",
  );
  assert.ok(indexed.ok);
  assert.equal(indexed.link.kind === "page" && indexed.link.pageId, "102938475610");
});

test("aceita o ID cru e URL sem protocolo", () => {
  const bare = parseAdLibraryLink("  102938475610 ");
  assert.ok(bare.ok);
  assert.deepEqual(bare.link, { kind: "page", pageId: "102938475610", country: null });

  const noScheme = parseAdLibraryLink("web.facebook.com/ads/library/?view_all_page_id=999888777");
  assert.ok(noScheme.ok);
  assert.equal(noScheme.link.kind === "page" && noScheme.link.pageId, "999888777");
});

test("link de um anúncio isolado é reconhecido como anúncio", () => {
  const parsed = parseAdLibraryLink("https://www.facebook.com/ads/library/?id=123456789012345");
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.link, {
    kind: "ad",
    adArchiveId: "123456789012345",
    country: null,
  });
});

test("país inválido ou ALL não vira filtro", () => {
  for (const country of ["ALL", "ZZ", ""]) {
    const parsed = parseAdLibraryLink(
      `https://www.facebook.com/ads/library/?country=${country}&view_all_page_id=102938475610`,
    );
    assert.ok(parsed.ok);
    assert.equal(parsed.link.country, null, `country=${country}`);
  }
});

test("perfil comum do Facebook é recusado com instrução", () => {
  const parsed = parseAdLibraryLink("https://www.facebook.com/clinicaexemplo");
  assert.equal(parsed.ok, false);
  assert.equal(parsed.ok === false && parsed.problem, "not_ad_library");
  assert.match(parsed.ok === false ? parsed.message : "", /Transparência da página/);
});

test("busca por palavra-chave é recusada como tal", () => {
  const parsed = parseAdLibraryLink(
    "https://www.facebook.com/ads/library/?q=implante%20dentario&country=BR",
  );
  assert.equal(parsed.ok, false);
  assert.equal(parsed.ok === false && parsed.problem, "keyword_search");
});

test("recusa entrada vazia, host de fora e biblioteca sem página", () => {
  const empty = parseAdLibraryLink("   ");
  assert.equal(empty.ok === false && empty.problem, "empty");

  const foreign = parseAdLibraryLink("https://tiktok.com/ads/library/?view_all_page_id=123456");
  assert.equal(foreign.ok === false && foreign.problem, "not_facebook");

  const noPage = parseAdLibraryLink("https://www.facebook.com/ads/library/?country=BR");
  assert.equal(noPage.ok === false && noPage.problem, "missing_page_id");
});
