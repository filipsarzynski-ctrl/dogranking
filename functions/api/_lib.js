// Współdzielone helpery dla Pages Functions (opinie gości)
export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra }
  });
}

// Trim, usuń znaki kontrolne, przytnij do max
export function clean(v, max) {
  if (v == null) return '';
  let s = String(v).replace(/[\x00-\x1F\x7F]/g, ' ').trim();
  if (s.length > max) s = s.slice(0, max);
  return s;
}

export async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyTurnstile(secret, token, ip) {
  if (!secret || !token) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const d = await r.json();
    return !!d.success;
  } catch (e) {
    return false;
  }
}

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
