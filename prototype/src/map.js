/* ================= map + live simulation engine ================= */
const MX=[-290,-160,-10,120,250,380,520,650,780,900,1030,1160,1300];
const MY=[-210,-120,0,90,180,270,350,450,540,630,720,810,900];
const ART_X=[-160,520,1160], ART_Y=[180,720], SEC_X=[250,780,-10], SEC_Y=[350,540,-120];
const RW={a:10,s:7,m:4.5};
const PARKS=[[380,270,520,350],[-10,450,120,540],[250,540,380,630],[780,90,900,180],[1160,810,1300,900],[-290,-120,-160,0]];
const LAKE={cx:1035,cy:447,rx:118,ry:80};
const MLABELS=[
  {t:'KORAMANGALA',x:715,y:405},{t:'EJIPURA',x:715,y:135},{t:'ADUGODI',x:185,y:135},{t:'JAKKASANDRA',x:840,y:495},
  {t:'HSR LAYOUT',x:965,y:675},{t:'MADIWALA',x:185,y:765},{t:'Agara Lake',x:1035,y:452,w:1},
  {t:'80 Feet Rd',x:520,y:610,r:1},{t:'Inner Ring Rd',x:1160,y:420,r:1},{t:'Sarjapur Rd',x:1095,y:540,r:0}
];
const ISSUE_PT=[520,300];

/* simulation definitions: the 4 services + complaint crew + command-centre loops */
const SIMDEF = Object.assign({}, SVC, {
  crew:{key:'crew', icon:'truck', color:'#E8870B', pill:'#B8620A', vehicle:'Repair crew', km:0.9, eta:6, dur:90,
    route:[[250,630],[250,450],[380,450],[380,350],[520,350],[520,300]], origin:{name:CIVIC.short+' Roads depot', icon:'building'},
    label:function(km){return 'Repair crew '+km+' km away';}, arrived:'Repair crew is on site', dest:ISSUE_PT, destKind:'issue', quiet:true},
  cc1:{key:'cc1', icon:'ambulance', color:'#E5383B', km:3, eta:9, dur:46, loop:true, quiet:true, route:[[-160,-210],[-160,180],[520,180]]},
  cc2:{key:'cc2', icon:'car', color:'#2F5BD3', km:3, eta:9, dur:38, loop:true, quiet:true, route:[[1160,90],[1160,630],[900,630]]},
  cc3:{key:'cc3', icon:'truck', color:'#EA4A24', km:3, eta:9, dur:52, loop:true, quiet:true, route:[[520,900],[520,720],[900,720],[900,630]]},
  cc4:{key:'cc4', icon:'truck', color:'#149452', km:3, eta:9, dur:60, loop:true, quiet:true, route:[[-160,900],[-160,540],[250,540],[250,270]]}
});
/* command-centre incidents (sample data) */
const INCIDENTS=[
  {id:'INC-3187', title:'Road accident', place:'Sony World Junction, Koramangala', pt:[520,180], color:'#E5383B', tags:['Ambulance','Traffic Police'], st:'Responding', ago:'2 min ago'},
  {id:'INC-3186', title:'Fire alarm – commercial building', place:'HSR Layout, Sector 1', pt:[900,630], color:'#EA4A24', tags:['Fire','Police'], st:'En route', ago:'6 min ago'},
  {id:'INC-3184', title:'Medical emergency', place:'Koramangala 5th Block', pt:[650,350], color:'#E5383B', tags:['Ambulance'], st:'En route', ago:'9 min ago'},
  {id:'INC-3181', title:'Garbage pile-up', place:'Adugodi Main Road', pt:[250,270], color:'#149452', tags:[CIVIC.short+' Solid Waste'], st:'Assigned', ago:'21 min ago'},
  {id:'INC-3179', title:'Water logging', place:'Ejipura Main Road', pt:[780,90], color:'#1F5BE0', tags:[CIVIC.short+' Storm Water Drains'], st:'Assigned', ago:'34 min ago'},
  {id:'INC-3172', title:'Traffic signal failure', place:'Madiwala Junction', pt:[-10,720], color:'#2F5BD3', tags:['Traffic Police'], st:'Resolved', ago:'1 hr ago'}
];

function f2(n){ return Math.round(n*100)/100; }
function rclass(v,axis){ const A=axis==='x'?ART_X:ART_Y, B=axis==='x'?SEC_X:SEC_Y; return A.indexOf(v)>=0?'a':(B.indexOf(v)>=0?'s':'m'); }
function isPark(x0,y0){ for(let i=0;i<PARKS.length;i++){ if(PARKS[i][0]===x0&&PARKS[i][1]===y0) return true; } return false; }

/* base city map for a viewBox (units), k = units per px */
function baseMap(vb,k,avoid){
  let o='<rect class="m-land" x="'+f2(vb.x-5)+'" y="'+f2(vb.y-5)+'" width="'+f2(vb.w+10)+'" height="'+f2(vb.h+10)+'"/>';
  const gap=2.2*k, rx=f2(2.4*k);
  let blocks='', parks='';
  for(let i=0;i<MX.length-1;i++){
    const xa=MX[i], xb=MX[i+1];
    if(xb<vb.x-20||xa>vb.x+vb.w+20) continue;
    for(let j=0;j<MY.length-1;j++){
      const ya=MY[j], yb=MY[j+1];
      if(yb<vb.y-20||ya>vb.y+vb.h+20) continue;
      const L=xa+(RW[rclass(xa,'x')]/2)*k+gap, R=xb-(RW[rclass(xb,'x')]/2)*k-gap;
      const T=ya+(RW[rclass(ya,'y')]/2)*k+gap, B=yb-(RW[rclass(yb,'y')]/2)*k-gap;
      if(R-L<4||B-T<4) continue;
      if(isPark(xa,ya)){
        parks+='<rect class="m-park" x="'+f2(L)+'" y="'+f2(T)+'" width="'+f2(R-L)+'" height="'+f2(B-T)+'" rx="'+f2(5*k)+'"/>';
        const r=rng(i*131+j*17+5);
        for(let q=0;q<7;q++){ parks+='<circle class="m-tree" cx="'+f2(L+10*k+r()*(R-L-20*k))+'" cy="'+f2(T+10*k+r()*(B-T-20*k))+'" r="'+f2((4+r()*4)*k)+'"/>'; }
        continue;
      }
      const r=rng(i*977+j*131+3), q=r();
      const W=R-L, H=B-T, ag=2.6*k;
      if(q<0.38){ blocks+=rr(L,T,W,H,rx); }
      else if(q<0.78){
        if(W>=H){ const c=L+W*(0.35+r()*0.3); blocks+=rr(L,T,c-L-ag/2,H,rx)+rr(c+ag/2,T,R-c-ag/2,H,rx); }
        else { const c=T+H*(0.35+r()*0.3); blocks+=rr(L,T,W,c-T-ag/2,rx)+rr(L,c+ag/2,W,B-c-ag/2,rx); }
      } else {
        const cx=L+W*(0.4+r()*0.2), cy=T+H*(0.4+r()*0.2);
        blocks+=rr(L,T,cx-L-ag/2,cy-T-ag/2,rx)+rr(cx+ag/2,T,R-cx-ag/2,cy-T-ag/2,rx)+rr(L,cy+ag/2,cx-L-ag/2,B-cy-ag/2,rx)+rr(cx+ag/2,cy+ag/2,R-cx-ag/2,B-cy-ag/2,rx);
      }
    }
  }
  o+=parks+'<g class="m-blk">'+blocks+'</g>';
  const X0=-400,X1=1400,Y0=-300,Y1=1000;
  function lines(cls){ let d=''; MX.forEach(function(x){ if(rclass(x,'x')===cls) d+='M'+x+' '+Y0+'V'+Y1; }); MY.forEach(function(y){ if(rclass(y,'y')===cls) d+='M'+X0+' '+y+'H'+X1; }); return d; }
  o+='<path class="m-road" stroke-width="'+f2(RW.m*k)+'" d="'+lines('m')+'"/>';
  const ds=lines('s');
  o+='<path class="m-cas" stroke-width="'+f2((RW.s+2)*k)+'" d="'+ds+'"/><path class="m-road" stroke-width="'+f2(RW.s*k)+'" d="'+ds+'"/>';
  o+='<path class="m-water" d="'+blob(LAKE.cx,LAKE.cy,LAKE.rx,LAKE.ry,9,0.1,21)+'"/>';
  const da=lines('a');
  o+='<path class="m-cas" stroke-width="'+f2((RW.a+2.4)*k)+'" d="'+da+'"/><path class="m-road m-art" stroke-width="'+f2(RW.a*k)+'" d="'+da+'"/>';
  MLABELS.forEach(function(l){
    const fp=l.w?11:(l.r!=null?9.5:10), fs=f2(fp*k);
    const tw=l.t.length*fp*(l.w||l.r!=null?0.6:0.74)*k, th=fp*1.2*k;
    const hw=(l.r===1?th:tw)/2, hh=(l.r===1?tw:th)/2, m=6*k;
    if(l.x-hw<vb.x+m||l.x+hw>vb.x+vb.w-m||l.y-hh<vb.y+m||l.y+hh>vb.y+vb.h-m) return;
    if(avoid&&avoid.some(function(a){ return l.x+hw>a[0]-26*k&&l.x-hw<a[0]+26*k&&l.y+hh>a[1]-46*k&&l.y-hh<a[1]+14*k; })) return;
    const tr=l.r===1?' transform="rotate(-90 '+l.x+' '+l.y+')"':'';
    o+='<text class="m-lbl'+(l.w?' m-wl':'')+(l.r!=null?' m-rl':'')+'" x="'+l.x+'" y="'+l.y+'" font-size="'+fs+'" stroke-width="'+f2(3*k)+'" text-anchor="middle" dominant-baseline="middle"'+tr+'>'+esc(l.t)+'</text>';
  });
  return o;
}
function rr(x,y,w,h,rx){ if(w<2||h<2) return ''; return '<rect x="'+f2(x)+'" y="'+f2(y)+'" width="'+f2(w)+'" height="'+f2(h)+'" rx="'+rx+'"/>'; }

/* ---------- geometry ---------- */
function polyInfo(pts){ const cum=[0]; for(let i=1;i<pts.length;i++){ cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1])); } return {pts:pts, cum:cum, L:cum[cum.length-1]}; }
function pointAt(pi,d){
  const c=pi.cum, P=pi.pts; if(d<=0) return P[0].slice(); if(d>=pi.L) return P[P.length-1].slice();
  for(let i=1;i<c.length;i++){ if(d<=c[i]){ const u=(d-c[i-1])/(c[i]-c[i-1]||1); return [P[i-1][0]+(P[i][0]-P[i-1][0])*u, P[i-1][1]+(P[i][1]-P[i-1][1])*u]; } }
  return P[P.length-1].slice();
}

/* ---------- sims ---------- */
function ensureSim(key, force){
  const def=SIMDEF[key]; if(!def) return;
  const s=S.sims[key], now=performance.now();
  if(!s || force || (s.done && now-s.arrivedAt>4000)){
    S.sims[key]={start:now, dur:def.dur*1000, clock:Date.now(), done:false, arrivedAt:0};
  }
}
function simState(key){
  const s=S.sims[key], def=SIMDEF[key]; if(!s||!def) return null;
  let t=(performance.now()-s.start)/s.dur;
  if(def.loop) t=t-Math.floor(t);
  t=Math.max(0,Math.min(1,t));
  const p=def.loop?t:(0.3*t+0.7*t*t*(3-2*t));
  return {t:t, p:p, km:Math.max(0,Math.round(def.km*(1-p)*10)/10), eta:Math.max(1,Math.ceil(def.eta*(1-t))), done:!def.loop&&t>=1,
    arr:fmtTime(new Date(s.clock+def.eta*60000))};
}
function simActive(key){ const st=simState(key); return !!(st&&!st.done); }

/* ---------- map registry / mount ---------- */
const MAPREG={}, MOUNT={}; let MID=0, RO=null;
function mapHTML(cfg){
  const id='m'+(++MID); MAPREG[id]=cfg;
  return '<div class="map'+(cfg.cls?' '+cfg.cls:'')+'" data-mid="'+id+'" role="img" aria-label="'+esc(cfg.aria||'Live map')+'"'+(cfg.h?' style="height:'+cfg.h+'px"':'')+'>'+
    (cfg.live===false?'':'<span class="map-live"><i></i>LIVE</span>')+'<span class="map-sim">Simulated</span></div>';
}
function mapBBox(cfg){
  if(cfg.bbox) return cfg.bbox;
  let pts=[];
  (cfg.sims||[]).forEach(function(k){ const d=SIMDEF[k]; pts=pts.concat(d.route); pts.push(d.dest||USER_PT); });
  if(cfg.issue) pts.push(cfg.issue.pt);
  if(!pts.length) pts=[[USER_PT[0]-160,USER_PT[1]-120],[USER_PT[0]+160,USER_PT[1]+120]];
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  pts.forEach(function(p){ x0=Math.min(x0,p[0]); y0=Math.min(y0,p[1]); x1=Math.max(x1,p[0]); y1=Math.max(y1,p[1]); });
  const m=cfg.margin!=null?cfg.margin:30;
  return [x0-m,y0-m,x1+m,y1+m];
}
function mountMaps(){
  for(const id in MAPREG){
    const el=document.querySelector('[data-mid="'+id+'"]');
    if(!el){ delete MAPREG[id]; delete MOUNT[id]; continue; }
    if(!MOUNT[id]||MOUNT[id].el!==el){ buildMap(id,el); if(RO) RO.observe(el); }
  }
}
if(typeof ResizeObserver!=='undefined'){
  RO=new ResizeObserver(function(ents){
    ents.forEach(function(en){
      const el=en.target, id=el.getAttribute('data-mid'), M=MOUNT[id]; if(!M||!MAPREG[id]) return;
      const w=el.clientWidth,h=el.clientHeight;
      if(Math.abs(w-(M.w||0))<2&&Math.abs(h-(M.h||0))<2) return;
      clearTimeout(M.to); M.to=setTimeout(function(){ if(MAPREG[id]&&document.body.contains(el)) buildMap(id,el); },90);
    });
  });
}
function buildMap(id,el){
  const cfg=MAPREG[id]; const w=el.clientWidth, h=el.clientHeight;
  const old=el.querySelector('svg.mapsvg'); if(old) old.remove();
  if(w<24||h<24){ MOUNT[id]={el:el,w:0,h:0,v:[]}; return; }
  const hasPill=cfg.pill!==false&&(cfg.sims||[]).length>0&&!cfg.incidents;
  const bb=mapBBox(cfg), pad=Object.assign({t:hasPill?66:34,r:22,b:26,l:22},cfg.pad||{});
  const bw=Math.max(bb[2]-bb[0],80), bh=Math.max(bb[3]-bb[1],80);
  const aw=Math.max(40,w-pad.l-pad.r), ah=Math.max(40,h-pad.t-pad.b);
  let s=Math.min(aw/bw, ah/bh); s=Math.min(s, cfg.maxScale||1.5);
  const k=1/s;
  const vb={w:w*k, h:h*k};
  vb.x=bb[0]-pad.l*k-(aw*k-bw)/2; vb.y=bb[1]-pad.t*k-(ah*k-bh)/2;
  const P=function(v){ return f2(v*k); };
  let o='<svg class="mapsvg" viewBox="'+f2(vb.x)+' '+f2(vb.y)+' '+f2(vb.w)+' '+f2(vb.h)+'" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
  o+='<defs><filter id="sh'+id+'" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="'+P(1.6)+'" stdDeviation="'+P(2.4)+'" flood-color="#0A1A3F" flood-opacity=".32"/></filter></defs>';
  const avoid=[]; if(cfg.issue) avoid.push(cfg.issue.pt); else if(!cfg.incidents) avoid.push(USER_PT);
  o+=baseMap(vb,k,avoid);
  /* incidents (command centre) */
  if(cfg.incidents){
    INCIDENTS.forEach(function(n){
      const done=n.st==='Resolved';
      o+='<g transform="translate('+n.pt[0]+' '+n.pt[1]+')">'+(done?'':'<circle class="pulse" r="'+P(12)+'" fill="'+n.color+'" opacity=".4"/>')+
        '<circle r="'+P(8)+'" fill="'+(done?'#8793A8':n.color)+'" stroke="#fff" stroke-width="'+P(2.5)+'" filter="url(#sh'+id+')"/></g>';
    });
  }
  const sims=cfg.sims||[], vs=[];
  sims.forEach(function(key){
    const d=SIMDEF[key], pi=polyInfo(d.route), dp='M'+d.route.map(function(p){return p[0]+' '+p[1];}).join('L');
    const thin=!!cfg.incidents;
    o+='<path d="'+dp+'" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="'+P(thin?6:9)+'" stroke-linejoin="round" stroke-linecap="round"/>';
    o+='<path d="'+dp+'" fill="none" stroke="'+d.color+'" stroke-opacity=".28" stroke-width="'+P(thin?3.5:5)+'" stroke-linejoin="round" stroke-linecap="round"/>';
    o+='<path data-rem="'+key+'" d="'+dp+'" fill="none" stroke="'+d.color+'" stroke-width="'+P(thin?3.5:5)+'" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="0 0 '+f2(pi.L)+'"/>';
    if(!thin){
      const o0=d.route[0];
      o+='<g transform="translate('+o0[0]+' '+o0[1]+')"><rect x="'+P(-13)+'" y="'+P(-13)+'" width="'+P(26)+'" height="'+P(26)+'" rx="'+P(8)+'" fill="#fff" stroke="'+d.color+'" stroke-width="'+P(1.5)+'" filter="url(#sh'+id+')"/>'+
        '<g transform="scale('+f2(k*0.62)+') translate(-12 -12)" stroke="'+d.color+'" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'+IC[d.origin.icon]+'</g></g>';
    }
    vs.push({key:key, pi:pi, thin:thin});
  });
  /* destination */
  if(cfg.issue){
    const ip=cfg.issue.pt, ok=cfg.issue.state==='resolved', col=ok?'#149452':'#E5383B';
    o+='<g transform="translate('+ip[0]+' '+ip[1]+')">'+(ok?'':'<circle class="pulse" r="'+P(14)+'" fill="'+col+'" opacity=".35"/>')+
      '<path d="M0 0C'+P(-2)+' '+P(-6)+' '+P(-12)+' '+P(-11)+' '+P(-12)+' '+P(-21)+'A'+P(12)+' '+P(12)+' 0 1 1 '+P(12)+' '+P(-21)+'C'+P(12)+' '+P(-11)+' '+P(2)+' '+P(-6)+' 0 0Z" fill="'+col+'" stroke="#fff" stroke-width="'+P(2)+'" filter="url(#sh'+id+')"/>'+
      '<g transform="translate(0 '+P(-21)+') scale('+f2(k*0.55)+') translate(-12 -12)" stroke="#fff" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">'+(ok?IC.check:IC.alert)+'</g></g>';
  } else if(!cfg.incidents){
    const up=USER_PT;
    o+='<g transform="translate('+up[0]+' '+up[1]+')"><circle class="pulse" r="'+P(14)+'" fill="#1F5BE0" opacity=".35"/>'+
      '<circle r="'+P(5)+'" fill="#1F5BE0" stroke="#fff" stroke-width="'+P(2)+'"/>'+
      '<path d="M0 '+P(-6)+'C'+P(-2)+' '+P(-11)+' '+P(-12)+' '+P(-16)+' '+P(-12)+' '+P(-26)+'A'+P(12)+' '+P(12)+' 0 1 1 '+P(12)+' '+P(-26)+'C'+P(12)+' '+P(-16)+' '+P(2)+' '+P(-11)+' 0 '+P(-6)+'Z" fill="#0F2250" stroke="#fff" stroke-width="'+P(2)+'" filter="url(#sh'+id+')"/>'+
      '<circle cy="'+P(-26)+'" r="'+P(4.4)+'" fill="#fff"/></g>';
  }
  /* vehicles (drawn last) */
  vs.forEach(function(v){
    const d=SIMDEF[v.key], R=v.thin?12:17;
    o+='<g data-veh="'+v.key+'"><circle r="'+P(R)+'" fill="'+d.color+'" stroke="#fff" stroke-width="'+P(v.thin?2.5:3)+'" filter="url(#sh'+id+')"/>'+
      '<g transform="scale('+f2(k*(v.thin?0.6:0.8))+') translate(-12 -12)" stroke="#fff" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+IC[d.icon]+'</g></g>';
    if(cfg.pill!==false&&!v.thin){
      o+='<g data-pill="'+v.key+'"><rect rx="'+P(13)+'" height="'+P(26)+'" fill="'+d.pill+'" filter="url(#sh'+id+')"/><text font-size="'+P(12)+'" font-weight="700" fill="#fff" dominant-baseline="central" style="font-family:var(--font)"></text></g>';
    }
  });
  o+='</svg>';
  el.insertAdjacentHTML('afterbegin',o);
  const svg=el.querySelector('svg.mapsvg');
  const M={el:el, w:w, h:h, k:k, vb:vb, cfg:cfg, v:[]};
  vs.forEach(function(v){
    const g=svg.querySelector('[data-pill="'+v.key+'"]');
    M.v.push({key:v.key, pi:v.pi, veh:svg.querySelector('[data-veh="'+v.key+'"]'), rem:svg.querySelector('[data-rem="'+v.key+'"]'),
      pill:g, pr:g?g.querySelector('rect'):null, pt:g?g.querySelector('text'):null, lab:null, pw:0});
  });
  MOUNT[id]=M;
  drawMap(M,true);
}
function drawMap(M,force){
  M.v.forEach(function(v){
    const st=simState(v.key), d=SIMDEF[v.key];
    const p=st?st.p:0, dist=p*v.pi.L, pos=pointAt(v.pi,dist);
    v.veh.setAttribute('transform','translate('+f2(pos[0])+' '+f2(pos[1])+')');
    v.rem.setAttribute('stroke-dasharray','0 '+f2(dist)+' '+f2(v.pi.L+1));
    if(v.pill){
      const done=st&&st.done, lab=!st?d.label(d.km):(done?d.arrived:d.label(st.km));
      if(lab!==v.lab||force){
        v.lab=lab; v.pt.textContent=lab;
        v.pr.setAttribute('fill',done?'#149452':d.pill);
        let tw=0; try{ tw=v.pt.getComputedTextLength(); }catch{}
        if(!tw) tw=lab.length*6.6*M.k;
        v.pw=tw+22*M.k;
        v.pr.setAttribute('width',f2(v.pw));
      }
      const k=M.k, vb=M.vb, ph=26*k;
      let px=pos[0]-v.pw/2, py=pos[1]-24*k-ph;
      if(py<vb.y+36*k) py=pos[1]+24*k;
      px=Math.max(vb.x+8*k, Math.min(vb.x+vb.w-8*k-v.pw, px));
      v.pr.setAttribute('x',f2(px)); v.pr.setAttribute('y',f2(py));
      v.pt.setAttribute('x',f2(px+11*k)); v.pt.setAttribute('y',f2(py+ph/2));
    }
  });
}

/* ---------- live bindings ---------- */
function bindText(kind,key){
  const st=simState(key), d=SIMDEF[key];
  switch(kind){
    case 'eta': return !st?'—':(st.done?'Arrived':st.eta+' min');
    case 'km': return !st?'—':(st.done?'0 km':st.km+' km');
    case 'lab': return !st?d.label(d.km):(st.done?d.arrived:d.label(st.km));
    case 'arr': return !st?'—':st.arr;
    case 'st': return !st?'Not active · tap to track live':(st.done?'Arrived':'En route · '+st.km+' km away');
  }
  return '';
}
function updateBinds(root){
  (root||document).querySelectorAll('[data-bind]').forEach(function(el){
    const b=el.getAttribute('data-bind').split(':'), kind=b[0], key=b[1];
    if(kind==='bar'){ const st=simState(key); el.style.width=(st?(st.done?100:Math.round(st.p*100)):0)+'%'; return; }
    if(kind==='done'){ const st=simState(key); el.classList.toggle('done',!!(st&&st.done)); return; }
    const tx=bindText(kind,key); if(el.textContent!==tx) el.textContent=tx;
    if(kind==='eta'){ const st=simState(key); el.classList.toggle('done',!!(st&&st.done)); }
  });
}
let _lastBind=0;
function simTick(now){
  for(const id in MOUNT){ const M=MOUNT[id]; if(M.v&&M.v.length&&document.body.contains(M.el)) drawMap(M,false); }
  if(now-_lastBind>250){
    _lastBind=now;
    for(const key in S.sims){
      const s=S.sims[key], d=SIMDEF[key]; if(!s||!d||d.loop||s.done) continue;
      if(performance.now()-s.start>=s.dur){ s.done=true; s.arrivedAt=performance.now(); if(!d.quiet&&typeof onArrive==='function') onArrive(key); }
    }
    updateBinds();
  }
  requestAnimationFrame(simTick);
}
requestAnimationFrame(simTick);
