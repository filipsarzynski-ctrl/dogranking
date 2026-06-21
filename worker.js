// Worker główny dla dogranking (assets + API opinii).
// Pliki statyczne (dist/) serwuje warstwa "assets" Cloudflare (assets-first).
// Worker uruchamia się tylko dla ścieżek, które nie są plikiem statycznym — czyli /api/*.
import * as reviews from './functions/api/reviews.js';
import * as summary from './functions/api/reviews-summary.js';
import * as submit from './functions/api/submit.js';
import * as photo from './functions/api/photo.js';
import * as admin from './functions/api/admin.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const p = url.pathname.replace(/\/+$/, '') || '/';
    const c = { request, env, ctx };

    if (p === '/api/reviews' && request.method === 'GET') return reviews.onRequestGet(c);
    if (p === '/api/reviews-summary' && request.method === 'GET') return summary.onRequestGet(c);
    if (p === '/api/submit' && request.method === 'POST') return submit.onRequestPost(c);
    if (p === '/api/photo' && request.method === 'GET') return photo.onRequestGet(c);
    if (p === '/api/admin') {
      if (request.method === 'POST') return admin.onRequestPost(c);
      if (request.method === 'GET') return admin.onRequestGet(c);
    }
    if (p.startsWith('/api/')) return new Response('Not found', { status: 404 });

    // pozostałe ścieżki → pliki statyczne (gdyby Worker został wywołany)
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  }
};
