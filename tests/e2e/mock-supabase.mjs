// A small stand-in for Supabase Auth and PostgREST, used only by the browser
// tests. It serves fictional fixture data from memory, understands the subset of
// PostgREST filters the app uses, and supports the writes the tests exercise
// (check-in, check-out, daily updates, comments). Not for production use.
import http from 'node:http';

const PORT = Number(process.env.MOCK_SUPABASE_PORT ?? 54321);
const IST_OFFSET = 330 * 60_000;
const DAY = 86_400_000;

export const IDS = {
  admin: '00000000-0000-4000-8000-000000000001',
  asha: '00000000-0000-4000-8000-000000000002',
  dev: '00000000-0000-4000-8000-000000000003',
  neha: '00000000-0000-4000-8000-000000000004',
  team: '10000000-0000-4000-8000-000000000001'
};

let db;
let counter = 0;
const uuid = () => `20000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`;

function seed() {
  counter = 0;
  const now = Date.now();
  const istMidnight = (offset) => {
    const ist = new Date(now + IST_OFFSET);
    return Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET + offset * DAY;
  };
  const keyOf = (offset) => new Date(istMidnight(offset) + IST_OFFSET).toISOString().slice(0, 10);
  let s = 11;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const sha = () => Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(rand() * 16)]).join('');
  const iso = (ms) => new Date(ms).toISOString();
  const base = {
    must_change_password: false, created_at: iso(now - 40 * DAY), updated_at: iso(now), phone: null, location: 'Bengaluru',
    shift_start: '18:30:00', shift_end: '22:30:00', weekday_target_minutes: 240, weekend_target_minutes: 240, status: 'active', college: null
  };
  db = {
    teams: [{ id: IDS.team, name: 'Developers', description: 'Product and client engineering', created_at: iso(now) }],
    profiles: [
      { ...base, id: IDS.admin, email: 'admin@example.com', full_name: 'Ops Admin', app_role: 'admin', member_type: 'employee', job_title: 'Founder', team_id: null, github_username: null, start_date: null, end_date: null },
      { ...base, id: IDS.asha, email: 'asha@example.com', full_name: 'Asha Rao', app_role: 'member', member_type: 'intern', job_title: 'Software Developer Intern', team_id: IDS.team, github_username: 'asha-rao', start_date: keyOf(-25), end_date: keyOf(65), college: 'Example Institute of Technology' },
      { ...base, id: IDS.dev, email: 'dev@example.com', full_name: 'Dev Menon', app_role: 'member', member_type: 'intern', job_title: 'Frontend Developer Intern', team_id: IDS.team, github_username: 'devmenon', start_date: keyOf(-25), end_date: keyOf(65), weekday_target_minutes: 180, weekend_target_minutes: 180 },
      { ...base, id: IDS.neha, email: 'neha@example.com', full_name: 'Neha Iyer', app_role: 'member', member_type: 'intern', job_title: 'Software Developer Intern', team_id: IDS.team, github_username: 'neha-iyer', start_date: keyOf(-10), end_date: keyOf(80) }
    ],
    attendance_sessions: [], daily_updates: [], tasks: [], task_comments: [], commits: [], person_notes: [],
    tracked_repos: [{ id: uuid(), full_name: 'Migsak/example-app', active: true, last_synced_at: iso(now - 3_600_000), last_sync_error: null, created_at: iso(now) }]
  };
  const messages = ['feat: check-in endpoint', 'fix: split sessions at midnight', 'feat: daily update form', 'refactor: task queries', 'style: dashboard spacing', 'test: metrics coverage'];
  for (let d = -27; d <= -1; d += 1) {
    for (const id of [IDS.asha, IDS.dev, IDS.neha]) {
      const p = db.profiles.find((x) => x.id === id);
      if (keyOf(d) < p.start_date || rand() < 0.15) continue;
      const start = istMidnight(d) + (18 + Math.floor(rand() * 2)) * 3_600_000;
      const minutes = (id === IDS.dev ? 120 : 180) + Math.floor(rand() * 120);
      db.attendance_sessions.push({ id: uuid(), user_id: id, check_in: iso(start), check_out: iso(start + minutes * 60_000), note: null, created_at: iso(start) });
      db.daily_updates.push({ id: uuid(), user_id: id, work_date: keyOf(d), done: 'Built the attendance summary and fixed the midnight split.', next_steps: 'Wire the heatmap to live data.', blockers: null, links: ['https://github.com/Migsak/example-app/pull/12'], created_at: iso(start + minutes * 60_000), updated_at: iso(start + minutes * 60_000) });
      const count = Math.floor(rand() * 4);
      for (let i = 0; i < count; i += 1) {
        db.commits.push({ repo: 'Migsak/example-app', sha: sha(), user_id: id, author_login: p.github_username, author_name: p.full_name, author_email: null, message: messages[Math.floor(rand() * messages.length)], url: 'https://github.com/Migsak/example-app/commit/x', committed_at: iso(start + (i + 1) * 1_800_000), created_at: iso(now) });
      }
    }
  }
  // Today: Dev worked earlier and posted; Asha and Neha have not checked in yet.
  db.attendance_sessions.push({ id: uuid(), user_id: IDS.dev, check_in: iso(now - 200 * 60_000), check_out: iso(now - 110 * 60_000), note: null, created_at: iso(now) });
  db.daily_updates.push({ id: uuid(), user_id: IDS.dev, work_date: keyOf(0), done: 'Finished the people table and fixed the mobile menu overlap.', next_steps: null, blockers: null, links: [], created_at: iso(now - 100 * 60_000), updated_at: iso(now - 100 * 60_000) });
  db.commits.push({ repo: 'Migsak/example-app', sha: sha(), user_id: IDS.asha, author_login: 'asha-rao', author_name: 'Asha Rao', author_email: null, message: 'feat: task review flow', url: 'https://github.com/Migsak/example-app/commit/x', committed_at: iso(now - 20 * 60_000), created_at: iso(now) });

  const task = (title, assignee, status, priority, due, extra = {}) => {
    const t = { id: uuid(), title, description: 'Build it end to end with tests.\n\nDone means deployed, reviewed and documented.', assignee_id: assignee, team_id: IDS.team, created_by: IDS.admin, status, priority, due_date: due === null ? null : keyOf(due), submission_url: null, submission_note: null, submitted_at: null, completed_at: status === 'done' ? iso(now - 2 * DAY) : null, created_at: iso(now - 10 * DAY), updated_at: iso(now), ...extra };
    db.tasks.push(t);
    return t;
  };
  task('Task assignment API with role checks', IDS.asha, 'in_progress', 'high', 2);
  const review = task('Attendance heatmap on the dashboard', IDS.asha, 'review', 'medium', 0, { submission_url: 'https://github.com/Migsak/example-app/pull/14', submission_note: 'Ready for review.', submitted_at: iso(now - 3 * 3_600_000) });
  task('Responsive people table', IDS.dev, 'done', 'medium', -3);
  task('Fix mobile navigation overlap', IDS.dev, 'in_progress', 'urgent', -1);
  task('Webhook signature tests', IDS.neha, 'todo', 'medium', 4);
  db.task_comments.push({ id: uuid(), task_id: review.id, author_id: IDS.asha, body: 'Pull request is up.', created_at: iso(now - 3 * 3_600_000) });
  db.person_notes.push({ user_id: IDS.asha, notes: 'Strong on backend work.', updated_at: iso(now) });
}
seed();

function userFromAuth(header) {
  const token = (header ?? '').replace(/^Bearer\s+/i, '');
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'));
    return db.profiles.find((p) => p.id === payload.sub) ?? null;
  } catch {
    return null;
  }
}

const parseList = (v) => v.replace(/^\(|\)$/g, '').split(',').map((x) => x.replace(/^"|"$/g, ''));
const cmp = (a, b) => (a === b ? 0 : a == null ? 1 : b == null ? -1 : a < b ? -1 : 1);

function applyFilter(rows, column, rawExpr) {
  let expr = rawExpr;
  let negate = false;
  if (expr.startsWith('not.')) {
    negate = true;
    expr = expr.slice(4);
  }
  const dot = expr.indexOf('.');
  const op = expr.slice(0, dot);
  const value = expr.slice(dot + 1);
  const test = (row) => {
    const v = row[column];
    switch (op) {
      case 'eq': return String(v) === value;
      case 'neq': return String(v) !== value;
      case 'gte': return v != null && v >= value;
      case 'lte': return v != null && v <= value;
      case 'gt': return v != null && v > value;
      case 'lt': return v != null && v < value;
      case 'is': return value === 'null' ? v == null : String(v) === value;
      case 'in': return parseList(value).includes(String(v));
      case 'ilike': return String(v ?? '').toLowerCase() === value.toLowerCase();
      default: return true;
    }
  };
  return rows.filter((r) => (negate ? !test(r) : test(r)));
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : null;
}

function rpc(name, args, user) {
  const now = new Date().toISOString();
  if (!user) return [401, { message: 'not_authenticated' }];
  if (name === 'check_in') {
    if (db.attendance_sessions.some((s) => s.user_id === user.id && !s.check_out)) return [409, { code: '23505', message: 'already_checked_in' }];
    const row = { id: uuid(), user_id: user.id, check_in: now, check_out: null, note: args?.p_note ?? null, created_at: now };
    db.attendance_sessions.push(row);
    return [200, row];
  }
  if (name === 'check_out') {
    const open = db.attendance_sessions.find((s) => s.user_id === user.id && !s.check_out);
    if (!open) return [404, { code: 'P0002', message: 'not_checked_in' }];
    open.check_out = new Date(Math.max(Date.now(), new Date(open.check_in).getTime() + 60_000)).toISOString();
    return [200, open];
  }
  if (name === 'mark_password_changed') {
    user.must_change_password = false;
    return [200, null];
  }
  if (name === 'member_update_task') {
    const t = db.tasks.find((x) => x.id === args.p_task_id);
    if (!t) return [404, { message: 'task_not_found' }];
    if (t.assignee_id !== user.id && user.app_role !== 'admin') return [403, { code: '42501', message: 'not_allowed' }];
    if (args.p_status === 'done' && user.app_role !== 'admin') return [403, { code: '42501', message: 'only_admin_can_complete' }];
    Object.assign(t, { status: args.p_status, submission_url: args.p_submission_url ?? t.submission_url, submission_note: args.p_submission_note ?? t.submission_note, submitted_at: args.p_status === 'review' ? now : t.submitted_at });
    return [200, t];
  }
  return [404, { message: `unknown rpc ${name}` }];
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const send = (code, body) => {
    res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' });
    res.end(body === undefined ? '' : JSON.stringify(body));
  };
  if (req.method === 'OPTIONS') return send(204);
  if (url.pathname === '/__reset') {
    seed();
    return send(200, { ok: true });
  }
  if (url.pathname === '/__state') return send(200, db);

  const user = userFromAuth(req.headers.authorization);
  if (url.pathname === '/auth/v1/user') {
    if (!user) return send(401, { message: 'invalid token' });
    return send(200, { id: user.id, aud: 'authenticated', role: 'authenticated', email: user.email, app_metadata: {}, user_metadata: {} });
  }
  if (url.pathname.startsWith('/auth/v1/')) return send(200, {});

  const rpcMatch = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
  if (rpcMatch) {
    const [code, body] = rpc(rpcMatch[1], await readBody(req), user);
    return send(code, body);
  }

  const match = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
  if (!match || !db[match[1]]) return send(404, { message: 'not found' });
  const table = db[match[1]];

  if (req.method === 'POST') {
    const body = await readBody(req);
    const items = Array.isArray(body) ? body : [body];
    const conflict = url.searchParams.get('on_conflict')?.split(',');
    const saved = items.map((item) => {
      const existing = conflict ? table.find((r) => conflict.every((k) => r[k] === item[k])) : undefined;
      if (existing) return Object.assign(existing, item, { updated_at: new Date().toISOString() });
      const row = { id: uuid(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...item };
      table.push(row);
      return row;
    });
    return send(201, (req.headers.prefer ?? '').includes('return=representation') ? saved : undefined);
  }
  if (req.method !== 'GET') return send(204);

  let rows = table.slice();
  for (const [key, value] of url.searchParams) {
    if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
    rows = applyFilter(rows, key, value);
  }
  const order = url.searchParams.get('order');
  if (order) {
    const parts = order.split(',').map((p) => p.split('.'));
    rows.sort((a, b) => {
      for (const [col, dir = 'asc'] of parts) {
        const c = cmp(a[col], b[col]);
        if (c) return dir === 'desc' ? -c : c;
      }
      return 0;
    });
  }
  const limit = Number(url.searchParams.get('limit') ?? 0);
  if (limit) rows = rows.slice(0, limit);
  if ((req.headers.accept ?? '').includes('vnd.pgrst.object')) {
    return rows.length === 0 ? send(406, { code: 'PGRST116', message: 'no rows' }) : send(200, rows[0]);
  }
  return send(200, rows);
});

server.listen(PORT, '127.0.0.1', () => console.log(`mock supabase listening on ${PORT}`));
