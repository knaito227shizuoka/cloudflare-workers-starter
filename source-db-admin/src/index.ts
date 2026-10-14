const DATABASES = { DB: { label: 'workers-starter-db' } };

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

async function listTables(db: D1Database) {
  const { results } = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all<{ name: string }>();
  return results.map(({ name }) => name).filter(name => !name.startsWith('sqlite_') && !name.startsWith('_cf_'));
}

function quoteIdentifier(name: string) {
  return `"${name.replaceAll('"', '""')}"`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
    try {
      if (url.pathname === '/api/databases') {
        return json({ databases: Object.entries(DATABASES).map(([key, { label }]) => ({ key, label })) });
      }
      const route = url.pathname.match(/^\/api\/databases\/([^/]+)\/tables(?:\/([^/]+)\/rows)?$/);
      if (!route || route[1] !== 'DB') return json({ error: 'not_found' }, 404);
      const tables = await listTables(env.DB);
      if (!route[2]) return json({ tables });
      const table = decodeURIComponent(route[2]);
      if (!tables.includes(table)) return json({ error: 'not_found' }, 404);
      const limit = url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : 50;
      const offset = url.searchParams.has('offset') ? Number(url.searchParams.get('offset')) : 0;
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200 || !Number.isSafeInteger(offset) || offset < 0) {
        return json({ error: 'invalid_pagination' }, 400);
      }
      const quoted = quoteIdentifier(table);
      const { results: columns } = await env.DB.prepare(`PRAGMA table_info(${quoted})`)
        .all<{ name: string; type: string; notnull: number; dflt_value: unknown; pk: number }>();
      // 複合主キー・WITHOUT ROWIDにも対応し、ページの順序を揃える。
      const primary = columns.filter(column => column.pk).sort((a, b) => a.pk - b.pk);
      const orderBy = (primary.length ? primary : columns).map(column => quoteIdentifier(column.name)).join(', ');
      const [{ results: rows }, total] = await Promise.all([
        env.DB.prepare(`SELECT * FROM ${quoted} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
          .bind(limit, offset).all<Record<string, unknown>>(),
        env.DB.prepare(`SELECT COUNT(*) AS count FROM ${quoted}`).first<{ count: number }>(),
      ]);
      return json({ columns, rows, total: total?.count ?? 0, limit, offset });
    } catch (error) {
      console.error('Database viewer error:', error);
      return json({ error: 'データを読み込めませんでした。' }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
