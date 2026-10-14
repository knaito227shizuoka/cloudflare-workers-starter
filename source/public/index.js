const count = document.querySelector('#count');
const increment = document.querySelector('#increment');
const status = document.querySelector('#status');
const retry = document.querySelector('#retry');

async function updateCount(method = 'GET') {
  increment.disabled = true;
  retry.hidden = true;
  status.textContent = method === 'POST' ? '保存中…' : '読み込み中…';
  try {
    const response = await fetch('/api/count', { method, cache: 'no-store' });
    if (!response.ok) throw new Error('カウントを取得・保存できませんでした。再読み込みしてください。');
    const data = await response.json();
    if (!Number.isSafeInteger(data.count) || data.count < 0) throw new Error('カウントの応答が不正です。');
    count.textContent = new Intl.NumberFormat('ja-JP').format(data.count);
    status.textContent = 'カウントは自動で保存されます。';
    increment.disabled = false;
  } catch (error) {
    status.textContent = error.message;
    retry.hidden = false;
  }
}

increment.addEventListener('click', () => updateCount('POST'));
retry.addEventListener('click', () => updateCount());
updateCount();
