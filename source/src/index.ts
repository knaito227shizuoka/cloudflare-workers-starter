function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/health') {
      if (request.method !== 'GET') {
        return json({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
      }
      try {
        await env.DB.prepare('SELECT 1').first();
        return json({ status: 'ok' });
      } catch (error) {
        console.error('Health check database error:', error);
        return json({ status: 'error' }, 503);
      }
    }
    if (pathname !== '/api/count') {
      return json({ error: 'not_found' }, 404);
    }
    if (request.method !== 'GET' && request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405, { Allow: 'GET, POST' });
    }
    // ブラウザから別オリジンのフォーム等でカウントを変更させない。
    const origin = request.headers.get('Origin');
    if (request.method === 'POST' && origin && origin !== new URL(request.url).origin) {
      return json({ error: 'forbidden' }, 403);
    }
    try {
      if (request.method === 'POST') {
        // 1つのSQLで加算し、同時リクエストでも更新が失われないようにする。
        const row = await env.DB.prepare(`UPDATE counters
          SET value = value + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE id = 1
          RETURNING value`).first<{ value: number }>();
        if (!row) throw new Error('Counter update returned no row');
        return json({ count: row.value });
      }
      const row = await env.DB.prepare('SELECT value FROM counters WHERE id = 1')
        .first<{ value: number }>();
      return json({ count: row?.value ?? 0 });
    } catch (error) {
      console.error('Counter database error:', error);
      return json({ error: 'カウントを取得・保存できませんでした。もう一度お試しください。' }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
