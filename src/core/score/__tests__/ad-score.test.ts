import assert from "node:assert/strict";
import { test } from "node:test";
import { computeAdScore, EMPTY_SCORE_INPUT, computeOfferScore } from "../ad-score";
import { FACTOR_WEIGHTS } from "../factors";

test("pesos dos fatores somam 1", () => {
  const sum = Object.values(FACTOR_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `soma foi ${sum}`);
});

test("score fica no intervalo 0..100", () => {
  const min = computeAdScore(EMPTY_SCORE_INPUT);
  assert.ok(min.value >= 0 && min.value <= 100);

  const max = computeAdScore({
    activeDays: 400,
    isActive: true,
    creativeCount: 12,
    bodyVariationCount: 6,
    distinctFormats: 3,
    distinctAspectRatios: 4,
    platformCount: 4,
    relatedAdsCount: 20,
    offerActiveDays: 400,
    offerActiveAds: 10,
    daysSinceLastSeen: 0,
    monitoringObservations: 30,
  });
  assert.ok(max.value <= 100);
  assert.ok(max.value >= 90, `esperado >=90, obtido ${max.value}`);
});

test("mais tempo ativo nunca reduz o score, mantido o resto igual", () => {
  const base = { ...EMPTY_SCORE_INPUT, isActive: true, activeDays: 10 };
  const longer = { ...base, activeDays: 120 };
  assert.ok(computeAdScore(longer).value > computeAdScore(base).value);
});

test("anúncio encerrado pontua menos que idêntico ativo", () => {
  const active = { ...EMPTY_SCORE_INPUT, activeDays: 60, isActive: true };
  const ended = { ...active, isActive: false, daysSinceLastSeen: 20 };
  assert.ok(computeAdScore(ended).value < computeAdScore(active).value);
});

test("cálculo é determinístico", () => {
  const input = { ...EMPTY_SCORE_INPUT, activeDays: 73, isActive: true, creativeCount: 8 };
  const now = new Date("2026-01-01T00:00:00.000Z");
  assert.equal(computeAdScore(input, now).value, computeAdScore(input, now).value);
});

test("explicação cita o valor e o fator dominante", () => {
  const score = computeAdScore({
    ...EMPTY_SCORE_INPUT,
    activeDays: 126,
    isActive: true,
    creativeCount: 14,
    relatedAdsCount: 6,
  });
  assert.match(score.explanation, new RegExp(`${score.value}/100`));
  assert.match(score.explanation, /126 dias|peças relacionadas/);
});

test("score da oferta pondera por tempo ativo e ganha bônus de volume", () => {
  const single = computeOfferScore([{ value: 70, activeDays: 100 }]);
  const many = computeOfferScore([
    { value: 70, activeDays: 100 },
    { value: 70, activeDays: 100 },
    { value: 70, activeDays: 100 },
  ]);
  assert.ok(many > single);
  assert.ok(many <= 100);
  assert.equal(computeOfferScore([]), 0);
});
