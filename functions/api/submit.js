// POST /api/submit  (multipart) → zapis opinii jako 'pending' + zdjęcie do R2
import { json, clean, sha256, verifyTurnstile } from './_lib.js';

const PHOTO_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ ok: false, error: 'not_configured' }, 503);
    const form = await request.formData();
    const ip = request.headers.get('CF-Connecting-IP') || '';

    // 1. Turnstile (anty-bot)
    const token = form.get('cf-turnstile-response');
    const human = await verifyTurnstile(env.TURNSTILE_SECRET, token, ip);
    if (!human) return json({ ok: false, error: 'captcha' }, 403);

    // 2. Pola
    const market = clean(form.get('market'), 8).toLowerCase();
    const category = clean(form.get('category'), 40);
    const slug = clean(form.get('slug'), 120);
    const author = clean(form.get('author'), 40);
    const email = clean(form.get('email'), 120);
    const title = clean(form.get('title'), 80);
    const body = clean(form.get('body'), 1500);
    const rating = parseInt(form.get('rating'), 10);
    const recRaw = form.get('recommend');
    const recommend = recRaw === '1' ? 1 : (recRaw === '0' ? 0 : null);
    const dogRaw = clean(form.get('dog_size'), 10);
    const dog_size = ['maly', 'sredni', 'duzy'].includes(dogRaw) ? dogRaw : null;
    const consent = form.get('consent');

    if (!market || !category || !slug || !author || !body || !consent) return json({ ok: false, error: 'fields' }, 400);
    if (!(rating >= 1 && rating <= 5)) return json({ ok: false, error: 'rating' }, 400);
    if (body.length < 3) return json({ ok: false, error: 'body_short' }, 400);

    // 3. Rate-limit: max 4 / IP / godzinę (IP tylko jako hash)
    const ipHash = await sha256(ip + '|' + (env.TURNSTILE_SECRET || 'salt'));
    const since = new Date(Date.now() - 3600e3).toISOString();
    const rl = await env.DB.prepare("SELECT COUNT(*) AS c FROM reviews WHERE ip_hash=? AND created_at>?").bind(ipHash, since).first();
    if (rl && rl.c >= 4) return json({ ok: false, error: 'rate' }, 429);

    // 4. Zdjęcie (opcjonalne) → R2
    let photoKey = null;
    const photo = form.get('photo');
    if (photo && typeof photo === 'object' && photo.size > 0) {
      if (photo.size > 5 * 1024 * 1024) return json({ ok: false, error: 'photo_size' }, 400);
      const ext = PHOTO_EXT[photo.type];
      if (!ext) return json({ ok: false, error: 'photo_type' }, 400);
      if (!env.PHOTOS) return json({ ok: false, error: 'no_storage' }, 503);
      photoKey = 'rev/' + crypto.randomUUID() + '.' + ext;
      await env.PHOTOS.put(photoKey, photo.stream(), { httpMetadata: { contentType: photo.type } });
    }

    // 5. Zapis (pending — czeka na moderację)
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB.prepare(
      "INSERT INTO reviews (id,market,category,slug,author,email,rating,recommend,dog_size,title,body,photo_key,status,helpful,ip_hash,created_at) " +
      "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pending',0,?,?)"
    ).bind(id, market, category, slug, author, email || null, rating, recommend, dog_size, title || null, body, photoKey, ipHash, now).run();

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: 'server' }, 500);
  }
}
