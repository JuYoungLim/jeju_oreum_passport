import { landscape, HEIGHT_LEVELS, getHeightLevel } from './landscape.js';

const examples = [
  { height: 60, title: '가볍게 만나는 작은 언덕', description: '넓고 부드러운 곡선으로 낮은 봉우리를 표현해요.', subtitle: '낮고 완만한 실루엣' },
  { height: 140, title: '조금 더 올라 만나는 풍경', description: '적당히 솟은 봉우리로 중간 높이를 표현해요.', subtitle: '균형 있게 솟은 실루엣' },
  { height: 240, title: '길게 솟아오른 봉우리', description: '위로 길게 뻗은 형태로 높은 오름을 표현해요.', subtitle: '길고 높게 솟은 실루엣' }
];
document.querySelector('#height-examples').innerHTML = examples.map((sample, index) => {
  const key = getHeightLevel(sample.height), level = HEIGHT_LEVELS[key];
  return `<article class="height-example" data-level="${key}"><div class="example-art">${landscape(1,false,key)}<span class="example-index">0${index+1}</span><span class="example-level">${level.label}</span></div><div class="example-body"><div class="example-height"><span>${sample.subtitle}</span><strong>${sample.height}<small>m</small></strong></div><h3>${sample.title}</h3><p>${sample.description}</p><div class="example-bottom"><span>${level.range}</span><span class="height-bars" aria-label="높이 ${index+1}단계">${[0,1,2].map(i=>`<i class="${i<=index?'on':''}"></i>`).join('')}</span></div></div></article>`;
}).join('');

const range = document.querySelector('#height-range'), number = document.querySelector('#height-number');
function update(height) {
  const key = getHeightLevel(height), level = HEIGHT_LEVELS[key];
  range.value=height; number.value=height;
  document.querySelector('#live-landscape').innerHTML=landscape(1,false,key);
  const badge=document.querySelector('#live-level'); badge.textContent=level.label; badge.dataset.level=key;
  document.querySelector('#live-caption').textContent=`샘플 높이 ${height}m · ${level.label} · ${level.range}`;
  document.querySelectorAll('[data-height]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.height)===height)));
  document.querySelector('#height-input-error').textContent='';
}
range.addEventListener('input',()=>update(Number(range.value)));
number.addEventListener('input',()=>{
  if(number.value==='' || !number.validity.valid) { document.querySelector('#height-input-error').textContent='0~300 사이의 정수를 입력해 주세요.'; return; }
  update(Number(number.value));
});
document.querySelectorAll('[data-height]').forEach(button=>button.addEventListener('click',()=>update(Number(button.dataset.height))));
update(140);
