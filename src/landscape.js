// Original vector landscapes: illustrative impressions, not location photographs.
export function landscape(seed = 0, hero = false) {
  const palettes = [
    ['#e9eee0','#e7c889','#b1b88c','#738b59','#3c6548'],
    ['#e1ece8','#f4dbac','#a4bd9b','#759969','#466c50'],
    ['#eee9df','#edc998','#c7b78a','#a29465','#5e7453'],
    ['#e3e9e8','#e8d7ab','#abc1ae','#6c937b','#335e50'],
    ['#f1e8d9','#e6b877','#c4b381','#8d966a','#566c4e']
  ];
  const [sky,sun,back,mid,front] = palettes[seed % palettes.length];
  const peak = 200 + (seed % 4) * 63;
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
