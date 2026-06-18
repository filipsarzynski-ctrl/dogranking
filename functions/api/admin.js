// Panel moderacji: GET /api/admin?token=...  (lista oczekujących + Akceptuj/Odrzuć)
//                  POST /api/admin            (action=approve|reject, id, token)
import { esc } from './_lib.js';

function forbidden() { return new Response('forbidden', { status: 403 }); }

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const token = u.searchParams.get('token');
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return forbidden();
  if (!env.DB) return new Response('no DB', { status: 503 });

  const status = u.searchParams.get('status') || 'pending';
  const { results } = await env.DB.prepare(
    "SELECT * FROM reviews WHERE status=? ORDER BY created_at ASC LIMIT 200"
  ).bind(status).all();

  const rows = (results || []).map(r => `
    <div class="c">
      <div class="hd"><b>${esc(r.author)}</b> · ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
        · <span class="mut">${esc(r.market)}/${esc(r.category)}/${esc(r.slug)}</span>
        · <span class="mut">${esc(r.created_at)}</span></div>
      ${r.title ? `<div class="t">${esc(r.title)}</div>` : ''}
      <div class="b">${esc(r.body)}</div>
      <div class="mut">${r.recommend === 1 ? 'poleca' : r.recommend === 0 ? 'nie poleca' : ''} ${r.dog_size ? '· ' + esc(r.dog_size) : ''} ${r.email ? '· ' + esc(r.email) : ''}</div>
      ${r.photo_key ? `<div><img src="/api/photo?id=${encodeURIComponent(r.id)}&token=${encodeURIComponent(token)}" alt=""></div>` : ''}
      <form method="POST" action="/api/admin">
        <input type="hidden" name="token" value="${esc(token)}">
        <input type="hidden" name="id" value="${esc(r.id)}">
        <button name="action" value="approve" class="ok">Akceptuj</button>
        <button name="action" value="reject" class="no">Odrzuć</button>
      </form>
    </div>`).join('');

  const html = `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Moderacja opinii — DogRanking</title>
<style>body{font-family:system-ui,sans-serif;background:#F2E8D5;color:#2A1A18;max-width:760px;margin:0 auto;padding:24px}
h1{font-size:1.4rem}.tabs a{margin-right:12px;color:#A8472A}
.c{background:#fff;border:1px solid #E6DAC5;border-radius:14px;padding:16px;margin:14px 0;box-shadow:0 8px 22px -18px rgba(62,14,22,.5)}
.hd{font-size:.9rem}.t{font-weight:700;margin:6px 0 2px}.b{margin:4px 0;white-space:pre-wrap}.mut{color:#8a7c64;font-size:.85rem}
img{max-width:260px;border-radius:10px;margin:8px 0;display:block}
button{border:0;border-radius:99px;padding:9px 18px;font-weight:600;cursor:pointer;margin-right:8px}
.ok{background:#3F5934;color:#fff}.no{background:#A8472A;color:#fff}
.empty{color:#8a7c64;padding:20px 0}</style></head><body>
<h1>Moderacja opinii 🐾</h1>
<div class="tabs"><a href="/api/admin?token=${encodeURIComponent(token)}&status=pending">Oczekujące</a>
<a href="/api/admin?token=${encodeURIComponent(token)}&status=approved">Zatwierdzone</a>
<a href="/api/admin?token=${encodeURIComponent(token)}&status=rejected">Odrzucone</a></div>
${rows || '<p class="empty">Brak opinii w tym statusie.</p>'}
</body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function onRequestPost({ request, env }) {
  const u = new URL(request.url);
  const form = await request.formData();
  const token = form.get('token') || u.searchParams.get('token');
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return forbidden();
  const id = form.get('id');
  const action = form.get('action');
  if (!id) return new Response('bad', { status: 400 });

  if (action === 'approve') {
    await env.DB.prepare("UPDATE reviews SET status='approved', approved_at=? WHERE id=?")
      .bind(new Date().toISOString(), id).run();
  } else if (action === 'reject') {
    const row = await env.DB.prepare("SELECT photo_key FROM reviews WHERE id=?").bind(id).first();
    if (row && row.photo_key && env.PHOTOS) { try { await env.PHOTOS.delete(row.photo_key); } catch (e) {} }
    await env.DB.prepare("UPDATE reviews SET status='rejected', photo_key=NULL WHERE id=?").bind(id).run();
  }
  return Response.redirect(u.origin + '/api/admin?token=' + encodeURIComponent(token), 303);
}
