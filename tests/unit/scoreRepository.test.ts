import { expect, test } from "@playwright/test";
import { getDb } from "@/lib/db";
import { createScoreRepository } from "@/lib/repositories/scoreRepository";

test.describe("createScoreRepository", () => {
  test("topScores selects each player's best score using deterministic ordering", async () => {
    let queryText = "";
    let boundValues: unknown[] = [];

    const fakeDb = ((strings: TemplateStringsArray, ...values: unknown[]) => {
      queryText = strings.join("?");
      boundValues = values;
      return Promise.resolve([]);
    }) as unknown as ReturnType<typeof getDb>;

    await createScoreRepository(fakeDb).topScores(25);

    const normalizedQuery = queryText.replace(/\s+/g, " ").trim();
    expect(normalizedQuery).toMatch(/ROW_NUMBER\s*\(\s*\)\s*OVER/i);
    expect(normalizedQuery).toMatch(/PARTITION BY p\.jugador_id/i);
    expect(normalizedQuery).toMatch(
      /ORDER BY p\.puntuacion DESC\s*,\s*p\.fecha_partida DESC\s*,\s*p\.id DESC/i,
    );
    expect(normalizedQuery).toMatch(/best\.score_rank\s*=\s*1/i);
    expect(normalizedQuery).toMatch(
      /ORDER BY best\.puntuacion DESC\s*,\s*best\.fecha_partida DESC\s*,\s*best\.id DESC/i,
    );
    expect(normalizedQuery).toMatch(/LIMIT\s*\?/i);
    expect(boundValues).toEqual([25]);
  });
});
