// @ts-nocheck
/* Ported verbatim from prototype/src/art.js — the prototype's SVG artwork as markup strings. */
/* ---------- seeded random ---------- */
function rng(seed){ let s=seed>>>0; return function(){ s=(s+0x6d2b79f5)>>>0; let q=s; q=Math.imul(q^(q>>>15),q|1); q^=q+Math.imul(q^(q>>>7),q|61); return ((q^(q>>>14))>>>0)/4294967296; }; }
function f1(n){ return Math.round(n*10)/10; }

/* smooth closed blob through jittered ellipse points (Catmull-Rom -> cubic Bezier) */
function blob(cx,cy,rx,ry,n,jit,seed){
  const r=rng(seed), P=[];
  for(let i=0;i<n;i++){ const a=i/n*Math.PI*2, j=1+(r()*2-1)*jit; P.push([cx+Math.cos(a)*rx*j, cy+Math.sin(a)*ry*j]); }
  let d='M'+f1(P[0][0])+' '+f1(P[0][1]);
  for(let i=0;i<n;i++){
    const p0=P[(i-1+n)%n],p1=P[i],p2=P[(i+1)%n],p3=P[(i+2)%n];
    const c1=[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6], c2=[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6];
    d+='C'+f1(c1[0])+' '+f1(c1[1])+' '+f1(c2[0])+' '+f1(c2[1])+' '+f1(p2[0])+' '+f1(p2[1]);
  }
  return d+'Z';
}

/* ---------- logo ---------- */
function logoSVG(){
  return '<svg viewBox="0 0 48 56" aria-hidden="true"><path d="M24 2.5 43.5 9.2V26c0 13.6-9 22.6-19.5 27.4C13.5 48.6 4.5 39.6 4.5 26V9.2Z" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/>'+
    '<path d="M24 7.6 39 12.8V26c0 10.8-6.8 18-15 22.2C15.8 44 9 36.8 9 26V12.8Z" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.35)" stroke-width="1"/>'+
    '<text x="24" y="33.5" text-anchor="middle" font-family="Plus Jakarta Sans,system-ui,sans-serif" font-weight="800" font-size="15.5" fill="#fff" letter-spacing=".5">CS</text></svg>';
}

/* ---------- hero: Vidhana Soudha at dusk ---------- */
let _hero=null;
function heroArt(){
  if(_hero) return _hero;
  const r=rng(7); let o='';
  o+='<defs>'+
    '<linearGradient id="hsSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#071537"/><stop offset=".34" stop-color="#15295E"/><stop offset=".52" stop-color="#34407C"/><stop offset=".63" stop-color="#8A6480"/><stop offset=".7" stop-color="#DB915F"/><stop offset=".76" stop-color="#F3B56F"/></linearGradient>'+
    '<radialGradient id="hsGlow" cx="200" cy="238" r="210" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFD08A" stop-opacity=".55"/><stop offset="1" stop-color="#FFD08A" stop-opacity="0"/></radialGradient>'+
    '<linearGradient id="hsBld" x1="0" y1="95" x2="0" y2="256" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FBE6BC"/><stop offset=".55" stop-color="#E2B377"/><stop offset="1" stop-color="#B98552"/></linearGradient>'+
    '<linearGradient id="hsDome" x1="176" y1="0" x2="224" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFEFCB"/><stop offset=".6" stop-color="#E8BC7E"/><stop offset="1" stop-color="#C08A52"/></linearGradient>'+
    '<linearGradient id="hsPort" x1="0" y1="176" x2="0" y2="240" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5E3A1F"/><stop offset="1" stop-color="#C8874A"/></linearGradient>'+
    '<linearGradient id="hsGnd" x1="0" y1="250" x2="0" y2="340" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1A3431"/><stop offset=".45" stop-color="#10243A"/><stop offset="1" stop-color="#0A1A3F"/></linearGradient>'+
    '<filter id="hsBlur" x="-10%" y="-200%" width="120%" height="500%"><feGaussianBlur stdDeviation="1.3"/></filter>'+
  '</defs>';
  o+='<rect width="400" height="340" fill="url(#hsSky)"/>';
  for(let i=0;i<34;i++){ o+='<circle cx="'+f1(r()*400)+'" cy="'+f1(r()*120)+'" r="'+f1(.35+r()*.75)+'" fill="#fff" opacity="'+f1(.25+r()*.6)+'"/>'; }
  o+='<ellipse cx="120" cy="150" rx="90" ry="7" fill="#fff" opacity=".05"/><ellipse cx="300" cy="170" rx="110" ry="6" fill="#FFD8B0" opacity=".08"/>';
  o+='<ellipse cx="200" cy="238" rx="230" ry="95" fill="url(#hsGlow)"/>';
  /* distant skyline */
  let x=-8;
  while(x<408){ const w=12+r()*18, h=26+r()*62, y=252-h; o+='<rect x="'+f1(x)+'" y="'+f1(y)+'" width="'+f1(w)+'" height="'+f1(h)+'" fill="#26305E"/>';
    for(let wy=y+5; wy<246; wy+=7){ for(let wx=x+3; wx<x+w-3; wx+=5){ if(r()<.16) o+='<rect x="'+f1(wx)+'" y="'+f1(wy)+'" width="1.8" height="2.4" fill="#F6C77A" opacity=".75"/>'; } }
    x+=w+1+r()*4; }
  /* building */
  const B='url(#hsBld)';
  o+='<rect x="30" y="200" width="340" height="52" fill="'+B+'"/><rect x="27" y="197" width="346" height="4" fill="#FCEBC8"/>';
  o+='<rect x="60" y="186" width="280" height="14" fill="'+B+'"/><rect x="57" y="183.5" width="286" height="3.2" fill="#FCEBC8"/>';
  for(let i=0;i<2;i++){ const yy=i?226:206; for(let wx=37; wx<=140; wx+=10.3){ o+='<rect x="'+f1(wx)+'" y="'+yy+'" width="5" height="10" rx="1.2" fill="#FFD98A" opacity="'+f1(.7+r()*.3)+'"/>'; o+='<rect x="'+f1(400-wx-5)+'" y="'+yy+'" width="5" height="10" rx="1.2" fill="#FFD98A" opacity="'+f1(.7+r()*.3)+'"/>'; } }
  for(let wx=66; wx<=138; wx+=9){ o+='<rect x="'+wx+'" y="189" width="4" height="6" fill="#FFE3A6" opacity=".85"/><rect x="'+(400-wx-4)+'" y="189" width="4" height="6" fill="#FFE3A6" opacity=".85"/>'; }
  function chhatri(cx,base,s){ return '<rect x="'+f1(cx-7*s)+'" y="'+f1(base-9*s)+'" width="'+f1(14*s)+'" height="'+f1(9*s)+'" fill="'+B+'"/><path d="M'+f1(cx-8.5*s)+' '+f1(base-9*s)+'C'+f1(cx-8.5*s)+' '+f1(base-17*s)+' '+f1(cx-4*s)+' '+f1(base-21*s)+' '+cx+' '+f1(base-22*s)+'C'+f1(cx+4*s)+' '+f1(base-21*s)+' '+f1(cx+8.5*s)+' '+f1(base-17*s)+' '+f1(cx+8.5*s)+' '+f1(base-9*s)+'Z" fill="url(#hsDome)"/><rect x="'+f1(cx-.6)+'" y="'+f1(base-27*s)+'" width="1.2" height="'+f1(6*s)+'" fill="#F0CD92"/>'; }
  o+=chhatri(96,184,1)+chhatri(304,184,1)+chhatri(44,197,.85)+chhatri(356,197,.85);
  o+='<rect x="146" y="166" width="108" height="86" fill="'+B+'"/><rect x="142" y="161.5" width="116" height="5" fill="#FFF1D4"/>';
  for(let i=0;i<10;i++){ o+='<rect x="'+f1(146.5+i*11)+'" y="156.5" width="6" height="5" fill="#F7DDAE"/>'; }
  o+='<rect x="152" y="176" width="96" height="64" fill="url(#hsPort)"/><rect x="150" y="170" width="100" height="6" fill="#F4DAAB"/>';
  for(let i=0;i<9;i++){ const cx=156.5+i*10.9; o+='<rect x="'+f1(cx-2.6)+'" y="176" width="5.2" height="64" fill="#F8E4BC"/><rect x="'+f1(cx-3.5)+'" y="175" width="7" height="2.6" fill="#FFF1D4"/>'; }
  o+='<polygon points="150,240 250,240 270,256 130,256" fill="#D8B888"/><path d="M144 245.3H256M138 250.6H262" stroke="#B99468" stroke-width=".8"/>';
  o+='<rect x="178" y="144" width="44" height="22" fill="'+B+'"/>';
  for(let i=0;i<4;i++){ o+='<path d="M'+(183.5+i*9.6)+' 162v-7a2.5 2.5 0 0 1 5 0v7z" fill="#FFD98A"/>'; }
  o+='<rect x="175" y="140.5" width="50" height="4" fill="#FFF1D4"/>';
  o+='<path d="M176.5 141C176.5 122 187 110.5 200 108.5 213 110.5 223.5 122 223.5 141Z" fill="url(#hsDome)"/>';
  o+='<path d="M186 139C187 125 192 116 200 111" stroke="#FFF6DF" stroke-width="1.2" fill="none" opacity=".7"/>';
  o+='<rect x="198.7" y="96" width="2.6" height="13" fill="#EACB93"/><circle cx="200" cy="94.5" r="3.2" fill="#F7DCA2"/>';
  /* trees */
  const tree=function(cx,cy,rad,c){ return '<circle cx="'+cx+'" cy="'+cy+'" r="'+rad+'" fill="'+c+'"/>'; };
  const tl=[[-4,238,20],[14,246,18],[30,254,14],[6,226,14],[384,236,20],[404,246,18],[370,252,14],[392,224,13],[120,258,9],[280,258,9],[92,260,8],[308,260,8]];
  tl.forEach(function(q,i){ o+=tree(q[0],q[1],q[2], i%2?'#0E2331':'#12302F'); });
  o+='<rect x="0" y="252" width="400" height="88" fill="url(#hsGnd)"/>';
  o+='<rect x="0" y="252" width="400" height="5" fill="#2A4A3C" opacity=".6"/>';
  for(let i=0;i<8;i++){ const lx=18+i*52; o+='<rect x="'+lx+'" y="258" width="1.4" height="12" fill="#3B4A63"/><circle cx="'+f1(lx+.7)+'" cy="257.5" r="4.5" fill="#FFD48A" opacity=".22"/><circle cx="'+f1(lx+.7)+'" cy="257.5" r="1.6" fill="#FFE6B0"/>'; }
  o+='<g filter="url(#hsBlur)" opacity=".85"><path d="M-10 296H410" stroke="#FFB45A" stroke-width="1.6" stroke-dasharray="46 10 20 8"/><path d="M-10 302H410" stroke="#FF5A55" stroke-width="1.4" stroke-dasharray="30 14 60 6"/><path d="M-10 299H410" stroke="#FFE2A8" stroke-width=".6" opacity=".6"/></g>';
  _hero=o; return o;
}
function heroSVG(par){ return '<svg viewBox="0 0 400 340" preserveAspectRatio="'+(par||'xMidYMax slice')+'" aria-hidden="true">'+heroArt()+'</svg>'; }

/* ---------- pothole photo ---------- */
let _pot=null;
function potholeSVG(){
  if(_pot) return _pot;
  const r=rng(21); let o='<svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>'+
   '<filter id="phN1" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.6 1.15"/></filter>'+
   '<filter id="phN2" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="9"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 2.2 -1.25"/></filter>'+
   '<radialGradient id="phH" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#1B1D20"/><stop offset=".65" stop-color="#2E3135"/><stop offset="1" stop-color="#565A5F"/></radialGradient>'+
   '<linearGradient id="phW" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2D4252"/><stop offset="1" stop-color="#57717F"/></linearGradient>'+
   '<radialGradient id="phV" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></radialGradient></defs>';
  o+='<rect width="400" height="225" fill="#6A6E73"/><rect width="400" height="225" filter="url(#phN1)" opacity=".45"/><rect width="400" height="225" filter="url(#phN2)" opacity=".35"/>';
  o+='<path d="M-10 36 L410 4" stroke="#E6E1CF" stroke-width="9" stroke-dasharray="54 34" opacity=".75"/>';
  o+='<path d="'+blob(205,132,128,62,14,.16,5)+'" fill="#8B8E91"/>';
  o+='<path d="'+blob(205,134,110,50,14,.14,8)+'" fill="url(#phH)"/>';
  o+='<path d="'+blob(214,142,72,24,10,.18,12)+'" fill="url(#phW)" opacity=".92"/>';
  o+='<ellipse cx="192" cy="136" rx="30" ry="3.5" fill="#fff" opacity=".17"/><ellipse cx="236" cy="147" rx="18" ry="2" fill="#fff" opacity=".12"/>';
  for(let i=0;i<70;i++){ const a=r()*Math.PI*2, d=1.02+r()*.5; o+='<circle cx="'+f1(205+Math.cos(a)*128*d)+'" cy="'+f1(132+Math.sin(a)*62*d)+'" r="'+f1(.8+r()*2.2)+'" fill="'+(r()<.5?'#A3A6A9':'#45484C')+'"/>'; }
  o+='<path d="M76 118l-26-10-20 6M332 150l28 12 24-4M300 88l18-26 30-8M110 170l-18 22" stroke="#3B3E42" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
  o+='<rect width="400" height="225" fill="url(#phV)"/></svg>';
  _pot=o; return o;
}

/* ---------- street camera ---------- */
let _cam=null;
function streetCamSVG(){
  if(_cam) return _cam;
  let o='<svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>'+
   '<linearGradient id="scS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#AFC1D3"/><stop offset="1" stop-color="#E1E8EF"/></linearGradient>'+
   '<radialGradient id="scV" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient></defs>';
  o+='<rect width="400" height="225" fill="url(#scS)"/>';
  o+='<rect x="182" y="100" width="36" height="30" fill="#C4CCD4"/><rect x="190" y="92" width="10" height="38" fill="#B7C0C9"/>';
  o+='<polygon points="0,0 96,46 96,180 0,225" fill="#C8B597"/><polygon points="96,54 150,82 150,152 96,178" fill="#A7B2BE"/><polygon points="150,87 180,100 180,130 150,147" fill="#D1C3AE"/>';
  o+='<polygon points="400,0 304,44 304,182 400,225" fill="#9EAEC1"/><polygon points="304,52 250,80 250,152 304,178" fill="#D8CCB7"/><polygon points="250,86 220,99 220,130 250,147" fill="#B6C1CB"/>';
  [30,62,94,126,158].forEach(function(y){ o+='<path d="M0 '+y+' L96 '+f1(46+y*.6)+'" stroke="#9C8B72" stroke-width="1.2"/><path d="M400 '+y+' L304 '+f1(44+y*.6)+'" stroke="#7F90A4" stroke-width="1.2"/>'; });
  [18,40,62,84].forEach(function(xx){ const y0=xx*.48; o+='<path d="M'+xx+' '+f1(y0)+' L'+xx+' '+f1(225-y0)+'" stroke="#9C8B72" stroke-width="1"/><path d="M'+(400-xx)+' '+f1(y0)+' L'+(400-xx)+' '+f1(225-y0)+'" stroke="#7F90A4" stroke-width="1"/>'; });
  o+='<polygon points="0,196 0,225 34,225 186,130 178,130" fill="#9C978F"/><polygon points="400,196 400,225 366,225 214,130 222,130" fill="#9C978F"/>';
  o+='<polygon points="34,225 366,225 214,130 186,130" fill="#6B7076"/>';
  [.08,.22,.4,.62,.9].forEach(function(q){ const y=130+q*95, w=.8+q*4.5, h=3+q*16; o+='<polygon points="'+f1(200-w/2)+','+f1(y)+' '+f1(200+w/2)+','+f1(y)+' '+f1(200+w/2*1.2)+','+f1(y+h)+' '+f1(200-w/2*1.2)+','+f1(y+h)+'" fill="#ECE8D6"/>'; });
  o+='<rect x="54" y="142" width="4" height="40" fill="#5A4632"/><circle cx="56" cy="136" r="22" fill="#4E7A49"/><circle cx="42" cy="146" r="14" fill="#3F6A3C"/><circle cx="72" cy="144" r="13" fill="#5C8A55"/>';
  o+='<rect x="342" y="140" width="4" height="42" fill="#5A4632"/><circle cx="344" cy="134" r="22" fill="#4A7646"/><circle cx="358" cy="146" r="14" fill="#3C653A"/>';
  o+='<rect x="318" y="84" width="3" height="70" fill="#3A3F46"/><rect x="310" y="80" width="12" height="26" rx="3" fill="#23272D"/><circle cx="316" cy="86" r="2.6" fill="#5A1F1F"/><circle cx="316" cy="93" r="2.6" fill="#5A4A1F"/><circle cx="316" cy="100" r="2.6" fill="#35E07A"/>';
  o+='<rect x="205" y="136" width="18" height="10" rx="3" fill="#B8322E"/><rect x="207" y="133" width="13" height="5" rx="2" fill="#8E2522"/>';
  o+='<rect x="232" y="162" width="56" height="26" rx="7" fill="#F2F3F5"/><path d="M240 164l6-10h30l6 10z" fill="#DADDE2"/><path d="M246 162l4-6h24l4 6z" fill="#445566"/><circle cx="244" cy="189" r="5" fill="#1D1F22"/><circle cx="277" cy="189" r="5" fill="#1D1F22"/><rect x="236" y="172" width="8" height="4" rx="1" fill="#FFB84D"/>';
  o+='<path d="M96 180v-14c0-6 4-10 10-10h18c6 0 9 4 9 10v14z" fill="#2E8B3A"/><path d="M98 158c0-8 5-12 12-12h14c7 0 10 4 10 12z" fill="#F4C542"/><rect x="100" y="158" width="11" height="10" fill="#1F2A2E" opacity=".75"/><circle cx="104" cy="183" r="4.5" fill="#15181B"/><circle cx="128" cy="183" r="4.5" fill="#15181B"/>';
  o+='<rect x="146" y="150" width="18" height="12" rx="3" fill="#2B4E8C"/><circle cx="149" cy="163" r="3" fill="#15181B"/><circle cx="161" cy="163" r="3" fill="#15181B"/>';
  o+='<rect width="400" height="225" fill="url(#scV)"/></svg>';
  _cam=o; return o;
}

/* ---------- officer portrait ---------- */
function officerSVG(){
  return '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="#DCE6F7"/>'+
    '<path d="M6 64c2-13 12-19 26-19s24 6 26 19z" fill="#B49A5E"/><path d="M25 45.5 32 54l7-8.5" fill="#9A824C"/><path d="M12 54l9-3M52 54l-9-3" stroke="#8C7644" stroke-width="2"/>'+
    '<rect x="28" y="37" width="8" height="10" fill="#A56B45"/>'+
    '<ellipse cx="21.6" cy="30.5" rx="2.2" ry="3.2" fill="#A56B45"/><ellipse cx="42.4" cy="30.5" rx="2.2" ry="3.2" fill="#A56B45"/>'+
    '<ellipse cx="32" cy="30" rx="10.2" ry="11.8" fill="#B97A52"/>'+
    '<path d="M26 26.5h4.2M33.8 26.5H38" stroke="#2A1B12" stroke-width="1.3" stroke-linecap="round"/>'+
    '<circle cx="28.2" cy="29.3" r="1.15" fill="#1B1410"/><circle cx="35.8" cy="29.3" r="1.15" fill="#1B1410"/>'+
    '<path d="M32 30v3.2" stroke="#9A5F3D" stroke-width="1" stroke-linecap="round"/>'+
    '<path d="M26.8 35.2c2-1.4 3.6-1.5 5.2-.6 1.6-.9 3.2-.8 5.2.6-1.8.6-3.6.7-5.2.3-1.6.4-3.4.3-5.2-.3z" fill="#24170F"/>'+
    '<path d="M29.5 38.2c1.6.8 3.4.8 5 0" stroke="#8A4E33" stroke-width="1" fill="none" stroke-linecap="round"/>'+
    '<path d="M20.4 22.8C20.4 13.5 26 9.6 32 9.6s11.6 3.9 11.6 13.2z" fill="#B49A5E"/><rect x="20.2" y="20.3" width="23.6" height="3.6" fill="#1F2A44"/>'+
    '<path d="M20 23.6c7.8 3.2 16.2 3.2 24 0v1.6c-7.8 3.6-16.2 3.6-24 0z" fill="#121418"/><circle cx="32" cy="16.4" r="2.7" fill="#E8C34A"/><circle cx="32" cy="16.4" r="1.1" fill="#B8912A"/></svg>';
}

export { heroSVG, potholeSVG, streetCamSVG, officerSVG };
