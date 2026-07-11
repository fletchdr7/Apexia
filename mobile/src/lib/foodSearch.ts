import type { Nutrients } from '@/types';

/**
 * Food lookup via Open Food Facts (free, open, no API key). Great for branded
 * items like "Snickers bar". Called directly from the app.
 */

export interface FoodSearchResult {
  id: string;
  name: string;
  nutrients: Nutrients;
  basis: 'serving' | '100g';
  servingLabel?: string;
}

function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function searchFoods(query: string, signal?: AbortSignal): Promise<FoodSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const fields = 'code,product_name,brands,serving_size,nutriments';
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=20&fields=${fields}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Apexia/1.0 (personal fitness app)', Accept: 'application/json' },
    signal,
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { products?: Record<string, unknown>[] };

  const out: FoodSearchResult[] = [];
  for (const p of data.products ?? []) {
    const brand = String((p.brands as string) ?? '').split(',')[0]?.trim();
    const productName = String((p.product_name as string) ?? '').trim();
    const name = [brand, productName].filter(Boolean).join(' ').trim();
    if (!name) continue;

    const n = (p.nutriments as Record<string, unknown>) ?? {};
    const sodiumToMg = (g?: number) => (g != null ? Math.round(g * 1000) : undefined);

    const kcalServing = num(n['energy-kcal_serving']);
    let nutrients: Nutrients;
    let basis: 'serving' | '100g';
    let servingLabel: string | undefined;

    if (kcalServing != null) {
      nutrients = {
        calories: kcalServing,
        proteinG: num(n['proteins_serving']) ?? 0,
        carbsG: num(n['carbohydrates_serving']) ?? 0,
        fatG: num(n['fat_serving']) ?? 0,
        fiberG: num(n['fiber_serving']),
        sugarG: num(n['sugars_serving']),
        sodiumMg: sodiumToMg(num(n['sodium_serving'])),
      };
      basis = 'serving';
      servingLabel = (p.serving_size as string) || 'serving';
    } else {
      const kcal100 = num(n['energy-kcal_100g']);
      if (kcal100 == null) continue;
      nutrients = {
        calories: kcal100,
        proteinG: num(n['proteins_100g']) ?? 0,
        carbsG: num(n['carbohydrates_100g']) ?? 0,
        fatG: num(n['fat_100g']) ?? 0,
        fiberG: num(n['fiber_100g']),
        sugarG: num(n['sugars_100g']),
        sodiumMg: sodiumToMg(num(n['sodium_100g'])),
      };
      basis = '100g';
      servingLabel = '100 g';
    }

    out.push({ id: String((p.code as string) ?? name), name, nutrients, basis, servingLabel });
    if (out.length >= 15) break;
  }
  return out;
}
