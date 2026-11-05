// Original vector landscapes: illustrative impressions, not location photographs.
export const HEIGHT_LEVELS = {
  low: { label: '낮음', range: '100m 미만', peakY: 244, shoulder: 272, color: '#63835e' },
  medium: { label: '중간', range: '100~199m', peakY: 158, shoulder: 212, color: '#b38a45' },
  high: { label: '높음', range: '200m 이상', peakY: 62, shoulder: 170, color: '#ae7054' }
};

export function getHeightLevel(height) {
  if (!Number.isFinite(height) || height < 0) throw new RangeError('Height must be a nonnegative number');
  return height < 100 ? 'low' : height < 200 ? 'medium' : 'high';
}

export function landscape(seed = 0, hero = false, heightLevel = null) {
  const palettes = [
    ['#e9eee0','#e7c889','#b1b88c','#738b59','#3c6548'],
    ['#e1ece8','#f4dbac','#a4bd9b','#759969','#466c50'],
    ['#eee9df','#edc998','#c7b78a','#a29465','#5e7453'],
    ['#e3e9e8','#e8d7ab','#abc1ae','#6c937b','#335e50'],
    ['#f1e8d9','#e6b877','#c4b381','#8d966a','#566c4e']
  ];
  const [sky,sun,back,mid,front] = palettes[seed % palettes.length];
  const peak = 200 + (seed % 4) * 63;
  if (heightLevel) {
    const level = HEIGHT_LEVELS[heightLevel];
    if (!level) throw new RangeError('Unknown height level');
    const y = level.peakY;
    // Fixed baseline and viewBox make all three height classes comparable.
    return `<svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" data-height-level="${heightLevel}">
      <rect width="800" height="400" fill="${sky}"/><circle cx="650" cy="75" r="28" fill="${sun}"/>
      <path d="M0 314Q120 267 240 302T520 295T800 290V400H0Z" fill="${back}" opacity=".55"/>
      <path d="M40 355C155 355 210 ${level.shoulder} 330 ${y+18}Q380 ${y-18} 420 ${y}C500 ${y+30} 585 355 760 355Z" fill="${mid}"/>
      <path d="M380 ${y-1}C440 ${y+15} 475 300 630 355H760C585 355 500 ${y+30} 420 ${y}Q400 ${y-8} 380 ${y-1}Z" fill="${front}" opacity=".5"/>
      <path d="M481 355C351 329 471 ${y+92} 390 ${y+8}" fill="none" stroke="#f6eccf" stroke-width="7" stroke-linecap="round" opacity=".8"/>
      <path d="M0 355H800V400H0Z" fill="${front}"/>
      <path d="M28 355H772" stroke="#f4edda" stroke-opacity=".4" stroke-dasharray="5 8"/>
      <g fill="none" stroke="${sky}" stroke-opacity=".25" stroke-width="1.4">${[105,178,610,696].map(x=>`<path d="M${x} 385v-16m0 9 5-6m-5 9-5-5"/>`).join('')}</g>
      <path d="M94 80q8-8 16 0q8-8 16 0" stroke="${front}" stroke-opacity=".5" fill="none" stroke-width="2"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="800" height="400" fill="${sky}"/><circle cx="${hero ? 610 : 590-seed*11}" cy="90" r="${hero ? 40 : 27}" fill="${sun}"/>
    <path d="M0 242Q120 176 246 230T500 212T800 206V400H0Z" fill="${back}"/>
    <path d="M-50 357Q110 310 ${peak} 150Q${peak+35} 110 ${peak+90} 178Q500 355 850 237V400H-50Z" fill="${mid}"/>
    <path d="M-30 385Q160 239 375 311T830 280V420H-30Z" fill="${front}"/>
    <path d="M405 420Q280 352 ${peak+20} 179" fill="none" stroke="#eee4c5" stroke-opacity=".65" stroke-width="${hero ? 9 : 6}"/>
    <g fill="none" stroke="${sky}" stroke-opacity=".22" stroke-width="1.4">${Array.from({length:18},(_,i)=>{const x=(i*97+seed*19)%800,y=330+(i*13)%70;return `<path d="M${x} ${y}l-3-17m3 9 6-10m-6 13-7-7"/>`;}).join('')}</g>
    <path d="M95 80q8-8 16 0q8-8 16 0M142 61q6-6 12 0q6-6 12 0" stroke="${front}" stroke-opacity=".45" fill="none" stroke-width="2"/>
  </svg>`;
}
