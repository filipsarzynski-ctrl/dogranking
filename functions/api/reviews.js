// GET /api/reviews?market=&category=&slug=  → zatwierdzone opinie + agregat
import { json } from './_lib.js';

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const market = (u.searchParams.get('market') || '').toLowerCase();
  const category = u.searchParams.get('category') || '';
  const slug = u.searchParams.get('slug') || '';
  if (!market || !category || !slug) return json({ error: 'bad_params' }, 400);
  if (!env.DB) return json({ count: 0, avg: 0, recommendPct: null, reviews: [] });

  const { results } = await env.DB.prepare(
    "SELECT id, author, rating, recommend, dog_size, title, body, photo_key, created_at " +
    "FROM reviews WHERE market=? AND category=? AND slug=? AND status='approved' " +
    "ORDER BY (photo_key IS NOT NULL) DESC, created_at DESC LIMIT 100"
  ).bind(market, category, slug).all();

  const reviews = (results || []).map(r => ({
    id: r.id, author: r.author, rating: r.rating, recommend: r.recommend,
    dog_size: r.dog_size, title: r.title, body: r.body,
    hasPhoto: !!r.photo_key, created_at: r.created_at
  }));
  const count = reviews.length;
  const avg = count ? reviews.reduce((a, r) => a + r.rating, 0) / count : 0;
  const recVals = reviews.filter(r => r.recommend === 0 || r.recommend === 1);
  const recommendPct = recVals.length
    ? Math.round(recVals.filter(r => r.recommend === 1).length / recVals.length * 100)
    : null;

  return json({ count, avg, recommendPct, reviews }, 200, { 'cache-control': 'public, max-age=60' });
}
