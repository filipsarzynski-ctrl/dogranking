// GET /api/reviews-summary?market=&category=  → { slug: {c: liczba ocen, m: mediana}, ... }
// Tylko zatwierdzone opinie. Mediana liczona z ocen 1-5.
import { json } from './_lib.js';

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const market = (u.searchParams.get('market') || '').toLowerCase();
  const category = u.searchParams.get('category') || '';
  if (!market || !category || !env.DB) return json({});

  const { results } = await env.DB.prepare(
    "SELECT slug, rating FROM reviews WHERE market=? AND category=? AND status='approved'"
  ).bind(market, category).all();

  const by = {};
  (results || []).forEach(r => { (by[r.slug] = by[r.slug] || []).push(r.rating); });

  const out = {};
  for (const slug in by) {
    const a = by[slug].sort((x, y) => x - y);
    const n = a.length, mid = Math.floor(n / 2);
    const med = n % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
    out[slug] = { c: n, m: med };
  }
  return json(out, 200, { 'cache-control': 'public, max-age=120' });
}
