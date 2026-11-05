export async function notebookRequest(path = '', method = 'GET', body) {
  let response;
  try {
    response = await fetch(`/api/notebook${path}`, { method, credentials: 'same-origin', cache: 'no-store', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  } catch { throw new Error('서버와 연결되지 않았어요. 연결을 확인한 뒤 다시 시도해 주세요.'); }
  const result = await response.json().catch(() => ({ error: '수첩 서버를 실행해 주세요.' }));
  if (!response.ok) throw Object.assign(new Error(result.error || '수첩을 불러오지 못했어요.'), { status: response.status });
  return result;
}

export function createNotebookUI({ onUpdated, notify }) {
  let notebook, busy = false;
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('oreum-notebook') : null;
  const dialog = document.createElement('dialog');
  dialog.className = 'notebook-dialog'; dialog.setAttribute('aria-labelledby', 'notebook-title');
  document.body.append(dialog);
  function apply(value, broadcast = false) { notebook = value; onUpdated(value); if (broadcast) channel?.postMessage('changed'); }
  async function refresh() {
    if (busy || dialog.open) return;
    try { apply((await notebookRequest()).notebook); } catch { /* Keep the visible record; failed writes are reported separately. */ }
  }
  channel?.addEventListener('message', refresh);
  window.addEventListener('focus', refresh);
  dialog.addEventListener('close', () => { dialog.innerHTML = ''; refresh(); });
  const errorText = message => { const el = dialog.querySelector('[role="alert"]'); if (el) el.textContent = message; };
  function setBusy(value) { busy = value; dialog.querySelectorAll('button,input').forEach(el => el.disabled = value); }
  function show(welcome = false) {
    if (busy) return notify('기록을 저장하고 있어요. 잠시만 기다려 주세요.');
    if (!notebook) return notify('수첩을 먼저 불러와 주세요.');
    dialog.innerHTML = `<div class="notebook-dialog-heading"><span class="eyebrow">MY PRIVATE NOTEBOOK</span><button type="button" class="dialog-close" aria-label="수첩 창 닫기">×</button></div><h2 id="notebook-title">${welcome ? '나만의 오름 수첩이 생겼어요' : '나의 오름 수첩'}</h2><p class="notebook-intro">가입 없이 나의 찜과 도장을 따로 보관해요.<br>이 브라우저에서는 자동으로 이어서 열려요.</p><div class="notebook-id">수첩 번호 <strong>${notebook.id.slice(0, 8)}</strong><span>비밀 코드를 대신할 수는 없어요.</span></div><section class="recovery-section"><h3>다른 기기에서도 이어서 보기</h3><p>${notebook.hasRecovery ? '기존 복구 코드는 다시 볼 수 없어요. 새로 발급하면 이전 코드는 사용할 수 없어요.' : '복구 코드를 발급받아 따로 보관해 주세요. 이 코드를 가진 사람은 내 수첩을 열 수 있어요.'}</p><button type="button" class="primary issue-recovery">${notebook.hasRecovery ? '복구 코드 새로 발급하기' : '내 복구 코드 발급받기'}</button><div class="issued-code"></div></section><section class="restore-section"><h3>기존 수첩 불러오기</h3><p>다른 수첩으로 전환하며 기록은 합쳐지지 않아요. 현재 수첩을 다시 열려면 복구 코드를 먼저 보관해 주세요.</p><form id="restore-notebook"><label for="recovery-input">비밀 복구 코드</label><input id="recovery-input" name="code" type="password" required maxlength="64" autocomplete="off" spellcheck="false" placeholder="보관한 복구 코드를 붙여넣으세요"><button type="submit" class="restore-button">기존 수첩 불러오기 →</button></form></section><p class="notebook-error" role="alert"></p><p class="notebook-footnote">쿠키와 복구 코드를 모두 잃으면 수첩을 복구할 수 없어요.<br>복구 코드는 다른 기기에서도 같은 수첩을 여는 열쇠예요.</p>`;
    dialog.querySelector('.dialog-close').onclick = () => { if (!busy) dialog.close(); };
    dialog.oncancel = event => { if (busy) event.preventDefault(); };
    dialog.querySelector('.issue-recovery').onclick = async () => {
      setBusy(true); errorText('');
      try {
        const result = await notebookRequest('/recovery', 'POST', {}); apply(result.notebook, true);
        const box = dialog.querySelector('.issued-code');
        box.innerHTML = '<label for="issued-recovery">이 코드는 창을 닫으면 다시 볼 수 없어요.</label><input id="issued-recovery" type="text" readonly autocomplete="off" spellcheck="false"><button type="button" class="copy-recovery">복구 코드 복사</button><p>안전한 곳에 보관하세요. 링크나 다른 사람에게 공유하지 마세요.</p>';
        box.querySelector('input').value = result.code;
        box.querySelector('.copy-recovery').onclick = async () => {
          try { await navigator.clipboard.writeText(result.code); notify('복구 코드를 복사했어요. 안전한 곳에 보관해 주세요.'); }
          catch { box.querySelector('input').select(); notify('코드를 선택했어요. 직접 복사해 주세요.'); }
        };
        dialog.querySelector('.issue-recovery').hidden = true;
        box.querySelector('input').focus();
      } catch (error) { errorText(error.message); }
      finally { setBusy(false); }
    };
    dialog.querySelector('form').onsubmit = async event => {
      event.preventDefault(); const code = dialog.querySelector('#recovery-input').value.trim();
      if (!/^[\w-]{43}$/.test(code)) return errorText('43자리 복구 코드를 그대로 입력해 주세요.');
      setBusy(true); errorText('');
      try { apply((await notebookRequest('/restore', 'POST', { code })).notebook, true); dialog.close(); notify('기존 수첩을 불러왔어요. 찜과 도장이 이어집니다.'); }
      catch (error) { errorText(error.message); }
      finally { setBusy(false); }
    };
    if (!dialog.open) dialog.showModal();
  }
  return {
    show, apply, get notebook() { return notebook; },
    async change(id, field, value) {
      if (busy) throw new Error('저장 중이에요. 잠시 뒤 다시 눌러 주세요.');
      busy = true;
      try { const result = await notebookRequest('/records', 'PATCH', { id, field, value }); apply(result.notebook, true); }
      finally { busy = false; }
    }
  };
}
