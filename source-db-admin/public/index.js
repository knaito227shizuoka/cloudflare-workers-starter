const status = document.querySelector('#status');
const content = document.querySelector('#content');
const previous = document.querySelector('#previous');
const next = document.querySelector('#next');
const refresh = document.querySelector('#refresh');
let selected = null;
let offset = 0;
let busy = false;
const limit = 50;

async function api(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error('データを読み込めませんでした。「更新」で再試行してください。');
  return response.json();
}

function setCellValue(cell, value) {
  const text = value === null ? 'NULL'
    : typeof value === 'object' ? JSON.stringify(value) : String(value);
  const content = document.createElement('span');
  content.className = 'cell-value';
  content.textContent = text;
  content.title = text;
  cell.append(content);
}

function renderTable(target, headings, records) {
  target.replaceChildren();
  const head = target.createTHead().insertRow();
  for (const heading of headings) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    setCellValue(cell, heading);
    head.append(cell);
  }
  const body = target.createTBody();
  for (const record of records) {
    const row = body.insertRow();
    for (const value of record) {
      setCellValue(row.insertCell(), value);
    }
  }
}

async function loadRows() {
  if (!selected) return;
  status.textContent = '読み込み中…';
  content.hidden = true;
  previous.disabled = next.disabled = true;
  document.querySelector('#table-name').textContent = selected.table;
  const data = await api(`/api/databases/${encodeURIComponent(selected.db)}/tables/${encodeURIComponent(selected.table)}/rows?limit=${limit}&offset=${offset}`);
  if (offset > 0 && offset >= data.total) {
    offset = Math.max(0, Math.floor((data.total - 1) / limit) * limit);
    return loadRows();
  }
  renderTable(document.querySelector('#columns'), ['名前', '型', 'NOT NULL', 'デフォルト', '主キー'],
    data.columns.map(column => [column.name, column.type, column.notnull, column.dflt_value, column.pk]));
  renderTable(document.querySelector('#rows'), data.columns.map(column => column.name),
    data.rows.map(row => data.columns.map(column => row[column.name])));
  document.querySelector('#page').textContent = data.total
    ? `${offset + 1}–${offset + data.rows.length} / ${data.total}件` : '0件';
  previous.disabled = offset === 0;
  next.disabled = offset + limit >= data.total;
  status.textContent = `全${data.total}件 · 1ページ${limit}件`;
  content.hidden = false;
}

async function loadDatabases() {
  const navigation = document.querySelector('#databases');
  navigation.replaceChildren();
  const { databases } = await api('/api/databases');
  for (const database of databases) {
    const heading = document.createElement('h2');
    heading.textContent = database.label;
    navigation.append(heading);
    const { tables } = await api(`/api/databases/${encodeURIComponent(database.key)}/tables`);
    if (selected?.db === database.key && !tables.includes(selected.table)) {
      selected = null;
      content.hidden = true;
      document.querySelector('#table-name').textContent = 'テーブルを選択してください';
    }
    for (const table of tables) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = table;
      button.className = 'table-button';
      button.setAttribute('aria-pressed', String(selected?.db === database.key && selected.table === table));
      button.addEventListener('click', () => run(async () => {
        selected = { db: database.key, table };
        offset = 0;
        navigation.querySelectorAll('.table-button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        await loadRows();
      }));
      navigation.append(button);
    }
    if (!tables.length) {
      const message = document.createElement('p');
      message.textContent = 'テーブルがありません。アプリを開くとカウンターが作成されます。';
      navigation.append(message);
    }
  }
  if (selected) await loadRows();
  else status.textContent = '左側の一覧からテーブルを選択してください。';
}

async function run(action) {
  if (busy) return;
  busy = true;
  refresh.disabled = true;
  try {
    await action();
  } catch (error) {
    status.textContent = error.message;
    content.hidden = true;
  } finally {
    refresh.disabled = false;
    busy = false;
  }
}

refresh.addEventListener('click', () => run(loadDatabases));
previous.addEventListener('click', () => run(async () => { offset = Math.max(0, offset - limit); await loadRows(); }));
next.addEventListener('click', () => run(async () => { offset += limit; await loadRows(); }));
run(loadDatabases);
