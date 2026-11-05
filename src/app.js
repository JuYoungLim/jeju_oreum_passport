import { STORAGE_KEY, restoreRecords, filterRecords } from './state.js';
import { landscape } from './landscape.js';
import { notebookRequest, createNotebookUI } from './notebook.js';

const main = document.querySelector('main');
const heart = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
const pin = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
const mountain = '<svg viewBox="0 0 40 32" aria-hidden="true"><path d="m3 27 13-21 12 21M21 27l8-13 9 13"/></svg>';
let records = [], catalog = [], timer;
const notebookUI = createNotebookUI({ onUpdated: book => { records = restoreRecords(catalog, JSON.stringify(book.records)); render(); }, notify: message => toast(message) });
let previousRoute = '';
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp = (small = false) => `<span class="stamp ${small ? 'stamp-small' : ''}" aria-label="방문 완료"><span>JEJU OREUM</span>${mountain}<strong>방문 완료</strong><span>잘 다녀왔어요</span></span>`;

function toast(message) {
  const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(timer); timer = setTimeout(() => el.classList.remove('show'), 3200);
}
function route() {
  const [path, query] = (location.hash.slice(1) || '/').split('?');
  const params = new URLSearchParams(query);
  let id = null;
  if (path.startsWith('/oreum/')) { try { id = decodeURIComponent(path.slice(7)); } catch { id = '__invalid__'; } }
  return { id,
    region: params.get('region') || '전체', view: ['favorites','visited'].includes(params.get('view')) ? params.get('view') : 'all' };
}
function listUrl(region, view) {
  const params = new URLSearchParams();
  if (region !== '전체') params.set('region',region);
  if (view !== 'all') params.set('view',view);
  return '#/' + (params.size ? '?' + params : '');
}
function card(item) {
  const i = records.indexOf(item);
  return `<article class="card ${item.visited ? 'is-visited' : ''}">
    <div class="card-art"><a href="#/oreum/${item.id}" tabindex="-1" aria-hidden="true">${landscape(i)}</a><span class="area-tag">${escapeHtml(item.district)}</span>
    <button class="heart ${item.favorite ? 'selected' : ''}" data-action="favorite" data-id="${item.id}" aria-label="${escapeHtml(item.name)} 찜하기" aria-pressed="${item.favorite}">${heart}</button>${item.visited ? stamp(true) : ''}</div>
    <div class="card-body"><span class="card-location">${pin}${escapeHtml(item.region)} · ${escapeHtml(item.district)}</span><h3><a href="#/oreum/${item.id}">${escapeHtml(item.name)}<span aria-hidden="true">↗</span></a></h3><p>${escapeHtml(item.tagline)}</p><div class="card-bottom"><span>${escapeHtml(item.keyword)}</span><span class="visit-state ${item.visited ? 'done' : ''}">${item.visited ? '✓ 다녀온 오름' : '아직 만나지 않은 풍경'}</span></div></div>
  </article>`;
}
function listPage({region,view}) {
  const visited = records.filter(x => x.visited).length;
  const selected = filterRecords(records, region, view);
  return `<section class="hero"><div class="hero-copy"><span class="eyebrow"><i></i> 나만의 제주 오름 수첩</span><h1>하나씩 오르다 보면,<br>어느새 <em>나만의 제주.</em></h1><p>마음에 드는 오름은 찜하고,<br>다녀온 풍경에는 나만의 도장을 남겨요.</p><a class="primary hero-button" href="#collection">첫 번째 오름 만나기 <span>↗</span></a><span class="hero-footnote">천천히 걸어도 좋아요. 오름은 늘 그 자리에.</span></div><div class="hero-art">${landscape(1,true)}<span class="art-label">A LITTLE WALK, A LITTLE JEJU.</span><div class="postmark">제주에서<br><strong>보내는 하루</strong><span>33° N · 126° E</span></div></div></section>
  <section class="passport" aria-label="나의 탐방 현황"><div class="passport-icon">${mountain}</div><div class="passport-copy"><span class="eyebrow">MY OREUM PASSPORT</span><h2>${visited === 0 ? '나의 첫 도장을 기다리는 중' : visited === 10 ? '열 곳의 풍경을 모두 만났어요!' : `${visited}개의 풍경이 내 수첩 속으로`}</h2><p>${visited === 0 ? '작은 시작이 멋진 여행이 될 거예요.' : '다음 오름에서는 어떤 풍경을 만나게 될까요?'}</p></div><div class="passport-progress"><div><span>나의 오름 발자국</span><strong>${visited}<small> / 10</small></strong></div><progress max="10" value="${visited}" aria-label="방문한 오름 ${visited}곳, 전체 10곳"></progress></div><div class="mini-count"><strong>${records.filter(x=>x.favorite).length}</strong><span>찜한 오름</span></div></section>
  <section id="collection" class="collection"><div class="section-heading"><div><span class="eyebrow">FIND YOUR NEXT OREUM</span><h2>${view === 'favorites' ? '마음에 담아둔 오름' : view === 'visited' ? '도장으로 남긴 나의 제주' : '다음엔, 어떤 오름에 오를까요?'}</h2></div><span class="section-note">제주 곳곳의 오름 10곳을 모았어요.</span></div>
  <div class="filters"><div class="region-tabs" aria-label="지역 필터">${['전체','제주시','서귀포시'].map(r=>`<a href="${listUrl(r,view)}" ${r===region ? 'aria-current="true"' : ''}>${r}${r==='전체' ? '<span>10</span>' : ''}</a>`).join('')}</div><label class="view-select">보기 <select id="view-filter" aria-label="찜 및 방문 여부 필터"><option value="all" ${view==='all'?'selected':''}>모든 오름</option><option value="favorites" ${view==='favorites'?'selected':''}>찜한 오름</option><option value="visited" ${view==='visited'?'selected':''}>방문한 오름</option></select></label></div>
  <div class="results-label"><span>총 <strong>${selected.length}</strong>개의 오름</span><span>한 걸음, 한 장의 기억</span></div><div class="grid">${selected.length ? selected.map(card).join('') : `<div class="empty">${mountain}<h3>${view==='favorites'?'아직 찜한 오름이 없어요':view==='visited'?'아직 찍은 도장이 없어요':'이 지역에는 등록된 오름이 없어요'}</h3><p>오름을 둘러보고 마음에 드는 풍경을 만나보세요.</p><a href="#/" class="primary">전체 오름 둘러보기 ↗</a></div>`}</div></section>
  <aside class="travel-note"><span>✳</span><p><strong>오름을 오래도록, 아름답게.</strong> 지정된 탐방로를 걷고, 가져온 것은 다시 가져가요. 방문 전 공식 안내에서 출입 정보를 확인해 주세요.</p></aside>`;
}
function detailPage(id) {
  const item = records.find(x => x.id === id);
  if (!item) return '<section class="empty"><h1>오름을 찾을 수 없어요</h1><a class="primary" href="#/">목록으로 돌아가기</a></section>';
  return `<section class="detail"><a class="back-link" href="${sessionStorageSafe()}">← 오름 목록으로</a><div class="detail-layout"><div class="detail-art">${landscape(records.indexOf(item),true)}${item.visited ? stamp() : ''}<span class="art-label">JEJU OREUM CLUB · ${String(records.indexOf(item)+1).padStart(2,'0')}</span></div><div class="detail-copy"><span class="eyebrow">${escapeHtml(item.region)} · ${escapeHtml(item.district)}</span><h1>${escapeHtml(item.name)}</h1><p class="detail-tagline">${escapeHtml(item.tagline)}</p><div class="detail-divider"></div><h2>이 오름의 이야기</h2><p class="description">${escapeHtml(item.description)}</p><dl><dt>${pin} 위치</dt><dd>${escapeHtml(item.location)}</dd><dt>풍경 키워드</dt><dd>${escapeHtml(item.keyword)}</dd></dl><div class="detail-actions"><button class="favorite-button ${item.favorite?'selected':''}" data-action="favorite" data-id="${id}" aria-pressed="${item.favorite}">${heart}${item.favorite?'찜했어요':'찜하기'}</button><button class="primary visit-button ${item.visited?'visited-button':''}" data-action="visited" data-id="${id}" aria-pressed="${item.visited}">${item.visited?'✓ 방문 완료 · 도장 취소':'도장 찍기 · 방문 완료'}</button></div><p class="save-note">기록은 나의 수첩에 자동으로 저장돼요.</p><a class="source-link" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.sourceName)}에서 원문 보기 ↗</a><p class="source-note">공식 안내를 바탕으로 짧게 요약했어요.<br>출입 가능 여부와 탐방 안내는 방문 전에 확인해 주세요.</p></div></div></section>`;
}
function sessionStorageSafe() { try { const value=sessionStorage.getItem('oreum.lastList') || '#/'; return value.startsWith('#/') ? escapeHtml(value) : '#/'; } catch { return '#/'; } }
function render() {
  const current = route();
  if (!current.id) { try { sessionStorage.setItem('oreum.lastList',location.hash || '#/'); } catch {} }
  main.innerHTML = `<div class="notebook-strip"><span><i></i> 나만의 수첩 · ${notebookUI.notebook?.id.slice(0, 8) || '연결 중'}</span><button type="button" id="notebook-open">복구 코드 · 수첩 불러오기 ↗</button></div>` + (current.id ? detailPage(current.id) : listPage(current));
  document.querySelectorAll('[data-nav]').forEach(el => { if (!current.id && el.dataset.nav===current.view) el.setAttribute('aria-current','page'); else el.removeAttribute('aria-current'); });
  document.querySelector('#nav-favorites').textContent = records.filter(x=>x.favorite).length;
  document.querySelector('#nav-visited').textContent = records.filter(x=>x.visited).length;
  const item = records.find(x=>x.id===current.id);
  document.title = item ? `${item.name} · 오름오름` : '오름오름 · 나의 제주 오름 수첩';
  if (previousRoute !== location.hash) { window.scrollTo(0,0); previousRoute=location.hash; }
}
document.addEventListener('click',async event=>{
  if(event.target.closest('#notebook-open')) return notebookUI.show();
  const button = event.target.closest('[data-action]'); if (!button) return;
  const {id,action} = button.dataset;
  const item = records.find(x=>x.id===id); if(!item) return;
  button.disabled = true;
  try {
    await notebookUI.change(id,action,!item[action]);
    const updated=records.find(x=>x.id===id);
    toast(action==='favorite' ? (updated.favorite ? updated.name+'을 마음에 담았어요.' : '찜을 해제했어요.') : (updated.visited ? updated.name+' 도장 꾹! 잘 다녀왔어요.' : '방문 도장을 취소했어요.'));
  } catch(error) { toast(error.message); }
  finally { button.disabled=false; document.querySelector('[data-action="'+action+'"][data-id="'+id+'"]')?.focus({preventScroll:true}); }
});
document.addEventListener('change',event=>{ if(event.target.id==='view-filter') location.hash=listUrl(route().region,event.target.value); });
window.addEventListener('hashchange',()=>{ if(location.hash==='#collection') document.querySelector('#collection')?.scrollIntoView({behavior:'smooth'}); else { render(); main.focus({preventScroll:true}); } });
async function init() {
  try {
    const response=await fetch('/data/oreums.json'); if(!response.ok) throw new Error('오름 목록을 불러오지 못했어요.');
    catalog=await response.json();
    let result, created=false;
    try { result=await notebookRequest(); }
    catch(error) {
      if(error.status!==401) throw error;
      let raw=null; try { raw=localStorage.getItem(STORAGE_KEY); } catch {}
      const initial=restoreRecords(catalog,raw).map(({id,favorite,visited})=>({id,favorite,visited}));
      result=await notebookRequest('', 'POST', {records:initial}); created=true;
    }
    notebookUI.apply(result.notebook);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    if(created) notebookUI.show(true);
  } catch(error) {
    main.innerHTML='<section class="empty"><h1>수첩을 연결하지 못했어요</h1><p>'+escapeHtml(error.message)+'</p><button class="primary" id="retry">다시 연결하기</button></section>';
    document.querySelector('#retry').onclick=init;
  }
}
init();
