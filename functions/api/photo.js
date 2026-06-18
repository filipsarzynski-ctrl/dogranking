// GET /api/photo?id=<reviewId>  → zdjęcie z R2 (tylko zatwierdzone; admin z tokenem widzi też pending)
export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const id = u.searchParams.get('id');
  const token = u.searchParams.get('token');
  if (!id || !env.DB || !env.PHOTOS) return new Response('not found', { status: 404 });

  const row = await env.DB.prepare("SELECT photo_key, status FROM reviews WHERE id=?").bind(id).first();
  if (!row || !row.photo_key) return new Response('not found', { status: 404 });

  const isAdmin = token && env.ADMIN_TOKEN && token === env.ADMIN_TOKEN;
  if (row.status !== 'approved' && !isAdmin) return new Response('not found', { status: 404 });

  const obj = await env.PHOTOS.get(row.photo_key);
  if (!obj) return new Response('gone', { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('etag', obj.httpEtag);
  h.set('cache-control', row.status === 'approved' ? 'public, max-age=86400' : 'no-store');
  return new Response(obj.body, { headers: h });
}
