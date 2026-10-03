/* ================= pages A: helpers, home, sos, services, track ================= */
const SKEYS=['police','ambulance','fire','civic'];
const TILE_IC={police:'police', ambulance:'ambulance', fire:'fire', civic:'bin'};
const UNITS={ambulance:'AMB-14', police:'Hoysala-22', fire:'FT-07', civic:'GV-31', crew:'RC-5'};
const SVC_SUB={police:'Karnataka State Police', ambulance:'Nearest hospitals & ambulances', fire:'Fire & Emergency Services', civic:'Garbage, roads & streetlights'};

function badge(){ const n=unread(); return n?'<span class="badge">'+(n>9?'9+':n)+'</span>':''; }
function mhead(title, sub, act){
  return '<header class="phead m-only"><button class="back" data-act="back" aria-label="Back">'+ic('back')+'</button>'+
    '<div class="tt"><h1>'+esc(title)+'</h1>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div>'+(act||'')+'</header>';
}
function headAct(act, icon, label){ return '<button class="act" data-act="'+act+'" aria-label="'+esc(label)+'" title="'+esc(label)+'">'+ic(icon)+'</button>'; }
function secH(title, right){ return '<div class="sec-h"><h2>'+esc(title)+'</h2>'+(right||'')+'</div>'; }
function shortArea(){ return String(S.area).replace(/,\s*Bengaluru$/,''); }
function okc(b, s){ return '<div class="okc"><span class="dot">'+ic('check','sm')+'</span><div><b>'+esc(b)+'</b><span>'+esc(s)+'</span></div></div>'; }
function dpage(inner, cls){ return '<div class="dpage'+(cls?' '+cls:'')+'">'+inner+'</div>'; }

/* ---------- home ---------- */
function onetapCard(){
  return '<button class="card onetap" data-go="sos"><span class="sq">'+ic('siren','lg')+'</span><div class="grow"><div class="t">'+esc(t('oneTap'))+'</div>'+
    '<div class="s">'+esc(t('police'))+' · '+esc(t('ambulance'))+' · '+esc(t('fire'))+' · '+esc(t('civic'))+'</div></div>'+ic('chev','chev')+'</button>';
}
function svc4(){
  return '<div class="card svc4">'+SKEYS.map(function(k){
    return '<button data-go="service:'+k+'"><span class="ib t-'+k+'">'+ic(TILE_IC[k])+'</span>'+esc(t(k))+'</button>';
  }).join('')+'</div>';
}
function activeRows(){
  return SKEYS.filter(simActive).map(function(k){
    return '<button class="row" data-go="service:'+k+'"><span class="ib t-'+k+'">'+ic(TILE_IC[k])+'</span><div class="grow"><div class="t">'+esc(SIMDEF[k].vehicle)+'</div>'+
      '<div class="s" data-bind="st:'+k+'">'+esc(bindText('st',k))+'</div></div><b data-bind="eta:'+k+'">'+esc(bindText('eta',k))+'</b>'+ic('chev','chev')+'</button>';
  }).join('');
}
function pHome(p, D){
  if(!D){
    const act=activeRows();
    let h='<section class="hero"><div class="hero-art">'+heroSVG()+'</div><div class="hero-shade"></div>'+
      '<div class="hero-brand"><div class="brand-row">'+logoSVG()+'<div class="brand-name">CITY SHIELD</div></div><div class="brand-tag">'+esc(t('tagline'))+'</div></div>'+
      '<button class="hero-bell" data-go="notifications" aria-label="'+esc(t('notifications'))+'">'+ic('bell')+badge()+'</button>'+
      '<div class="hero-greet"><div class="g1">'+esc(greet())+'</div><h1>'+esc(S.user.first)+'</h1><div class="loc">'+ic('pin','sm')+esc(S.user.city)+'</div></div></section>';
    h+='<div class="home-body">'+onetapCard()+svc4();
    if(act) h+='<div class="card act-card"><div class="card-h"><h2>'+esc(t('liveTracking'))+'</h2><span class="map-live" style="position:static;box-shadow:none;background:var(--red-soft);color:var(--red)"><i></i>LIVE</span></div>'+act+'</div>';
    h+='</div>';
    return {t:t('home'), html:h, cls:'v-navy', tab:'home', side:'home'};
  }
  let h='<section class="dhero"><div class="dhero-art">'+heroSVG('xMidYMid slice')+'</div><div class="dhero-in">'+
    '<div class="g1">'+esc(greet())+'</div><h1>'+esc(S.user.first)+'</h1><div class="loc">'+ic('pin','sm')+esc(S.user.city)+'</div>'+
    '<p class="dhero-p">'+esc(t('police'))+', '+esc(t('ambulance'))+', '+esc(t('fire'))+' and '+esc(CIVIC.short)+' services — one tap away, tracked live.</p>'+
    '<div class="dhero-cta"><button class="btn sos" data-go="sos">'+ic('siren')+esc(t('sosTitle'))+'</button><button class="btn glass" data-go="complaints">'+ic('clipboard')+esc(t('reportC'))+'</button></div></div></section>';
  h+='<div class="dsvc" style="margin-top:22px">'+SKEYS.map(function(k){
    return '<button class="card" data-go="service:'+k+'"><span class="ib t-'+k+'">'+ic(TILE_IC[k])+'</span><div><div class="n">'+esc(t('svc_'+k))+'</div><div class="s">'+esc(SVC_SUB[k])+'</div></div>'+
      '<span class="go">'+esc(t('liveTracking'))+ic('chev','sm')+'</span></button>';
  }).join('')+'</div>';
  const k='ambulance';
  h+='<div class="dcols" style="margin-top:22px"><div class="dcol">'+
    '<div class="card live-card">'+mapHTML({sims:[k], aria:'Ambulance live location', pad:{t:66,r:20,b:24,l:20}})+
    '<div class="lc-in"><div style="display:flex;align-items:center;gap:10px"><span class="ib s-ambulance">'+ic('ambulance')+'</span><div class="grow"><div style="font-weight:800;font-size:15.5px">'+esc(SIMDEF[k].vehicle)+' <span class="chip gray" style="margin-left:4px">'+esc(UNITS[k])+'</span></div>'+
    '<div class="muted" style="font-size:12.5px" data-bind="st:'+k+'">'+esc(bindText('st',k))+'</div></div></div>'+
    '<div class="bar"><i data-bind="bar:'+k+'" style="background:var(--c-amb);width:0"></i></div>'+
    '<div class="card eta" style="box-shadow:none"><div class="col"><div class="lb">'+ic('clock','sm')+esc(t('eta'))+'</div><div class="v" data-bind="eta:'+k+'">'+esc(bindText('eta',k))+'</div></div>'+
    '<div class="col"><div class="lb">'+esc(t('arriving'))+'</div><div class="v" data-bind="arr:'+k+'">'+esc(bindText('arr',k))+'</div></div></div>'+
    '<div class="muted" style="font-size:12.5px">Then to <b style="color:var(--text)">'+esc(hospName())+'</b></div>'+
    '<button class="btn primary" data-go="service:'+k+'" style="margin-top:auto">Open live tracking'+ic('chev','sm')+'</button></div></div>'+
    '</div><div class="dcol">'+
    '<div class="card"><div class="card-h"><h2>'+esc(t('myC'))+'</h2><button class="link" data-go="mycomplaints">'+esc(t('viewAll'))+'</button></div><div class="cmp">'+
      S.complaints.slice(0,3).map(function(c){ return cmpRow(c,'data-go="complaint:'+c.id+'"'); }).join('')+'</div></div>'+
    '<div class="card"><div class="card-h"><h2>'+esc(t('notifications'))+'</h2><button class="link" data-go="notifications">'+esc(t('viewAll'))+'</button></div><div class="ntf">'+
      S.notifications.slice(0,3).map(ntfRow).join('')+'</div></div>'+
    '</div></div>';
  h+=fstrip();
  return {t:t('home'), s:S.user.city+' · '+new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'}), html:dpage(h), side:'home'};
}
function fstrip(){
  const F=[['timer','Faster Response'],['pin','Live Tracking'],['clock','Real-Time Updates'],['clipboard','Easy Reporting'],['users','Connected Services']];
  return '<section class="fstrip" style="margin-top:22px"><div class="brand-row">'+logoSVG()+'<div><b>CITY SHIELD</b><span>'+esc(t('tagline'))+'</span></div></div>'+
    '<div class="fs">'+F.map(function(f){ return '<div>'+ic(f[0])+esc(f[1])+'</div>'; }).join('')+'</div><div class="tag">A safer Bengaluru is in your hands.</div></section>';
}
function hospName(){ for(let i=0;i<HOSPITALS.length;i++){ if(HOSPITALS[i].id===S.hospital) return HOSPITALS[i].name; } return HOSPITALS[0].name; }

/* ---------- SOS ---------- */
function sosInner(){
  return '<h1>'+esc(t('sosTitle'))+'</h1><p class="sub">'+esc(t('tapCall'))+'</p>'+
    '<div class="sos-wrap"><span class="sos-ring"></span><span class="sos-ring r2"></span><button class="sos-btn" data-act="sos" aria-label="Send SOS">'+ic('phone')+'<b>SOS</b></button></div>'+
    '<div class="sos-svc">'+['police','ambulance','fire'].map(function(k){ return '<button data-act="dispatch:'+k+'"><span class="c">'+ic(TILE_IC[k])+'</span>'+esc(t(k))+'</button>'; }).join('')+'</div>'+
    '<button class="dcard" data-act="loc-sheet"><span class="ib">'+ic('pin')+'</span><div class="grow"><div class="t">'+esc(t('yourLoc'))+'</div><div class="s">'+esc(S.area)+'</div></div>'+ic('chev')+'</button>'+
    '<div class="dcard"><span class="ib">'+ic('nav')+'</span><div class="grow"><div class="t">'+esc(t('shareLive'))+'</div><div class="s">'+esc(t('shareLiveSub'))+'</div></div>'+
    '<button class="sw" role="switch" aria-checked="'+S.shareLive+'" data-act="share-live" aria-label="'+esc(t('shareLive'))+'"></button></div>'+
    '<p class="sos-note">Prototype — no real services are contacted. In a real emergency <button class="lnk" data-act="dial:112">call 112</button>.</p>';
}
function helplines(){
  const L=[['112','National emergency','Police · Fire · Ambulance (ERSS)'],['100','Police',''],['101','Fire',''],['108','Ambulance','']];
  return L.map(function(x){ return '<button class="row" data-act="dial:'+x[0]+'"><span class="help-num">'+x[0]+'</span><div class="grow"><div class="t">'+esc(x[1])+'</div>'+(x[2]?'<div class="s">'+esc(x[2])+'</div>':'')+'</div>'+ic('phone','chev')+'</button>'; }).join('');
}
function pSos(p, D){
  if(!D) return {t:t('sosTitle'), html:'<div class="sos-page">'+sosInner()+'</div>', cls:'v-sos', tab:'home', dark:true, side:'sos'};
  const steps=[['3-second safety window','Cancel accidental presses before anything is sent.'],['Nearest units dispatched','Police and ambulance are alerted with your exact location.'],['Live location shared','Responders see you move until they reach you.'],['Tracked end to end','Follow each responder live, with ETA and officer details.']];
  let h='<div class="sos-d"><div class="sos-page">'+sosInner()+'</div><div class="dcol">'+
    '<div class="card"><div class="card-h"><h2>What happens when you press SOS</h2></div><div class="steps" style="padding:8px 18px 18px">'+
    steps.map(function(s,i){ return '<div class="step"><span class="n">'+(i+1)+'</span><div><b>'+esc(s[0])+'</b><p>'+esc(s[1])+'</p></div></div>'; }).join('')+'</div></div>'+
    '<div class="card"><div class="card-h"><h2>Emergency helplines</h2><span class="demo-tag">Opens your phone dialer</span></div>'+helplines()+'</div>'+
    '</div></div>';
  return {t:t('sosTitle'), s:t('tapCall'), html:dpage(h), side:'sos'};
}

/* ---------- services ---------- */
function etaCard(k, noBtn){
  const inner='<div class="col"><div class="lb">'+ic('clock','sm')+esc(t('eta'))+'</div><div class="v" data-bind="eta:'+k+'">'+esc(bindText('eta',k))+'</div></div>'+
    '<div class="col"><div class="lb">'+esc(t('arriving'))+'</div><div class="v" data-bind="arr:'+k+'">'+esc(bindText('arr',k))+'</div></div>';
  return noBtn?'<div class="card eta">'+inner+'</div>':'<button class="card eta" data-act="trip:'+k+'" aria-label="Trip details">'+inner+ic('chev','chev')+'</button>';
}
function hospRow(hh){
  const sel=S.hospital===hh.id, av=hh.avail==='Available';
  return '<button class="row'+(sel?' sel':'')+'" data-act="hosp-sel:'+hh.id+'" aria-pressed="'+sel+'"><span class="ib t-blue">'+ic('hospital')+'</span><div class="grow"><div class="t">'+esc(hh.name)+'</div>'+
    '<div class="s">'+hh.km+' km · '+hh.min+' min</div></div><span class="chip '+(av?'green':'amber')+'">'+esc(av?t('available'):hh.avail)+'</span></button>';
}
function svcDetails(k){
  let h='';
  if(k==='ambulance'){
    h+=secH(t('nearestHosp'),'<button class="link" data-act="hosp-all">'+esc(t('viewAll'))+'</button>');
    h+='<div class="card hosp">'+HOSPITALS.slice(0,3).map(hospRow).join('')+'</div>';
    h+='<button class="btn soft" data-act="call:ambulance">'+ic('phone')+esc(t('callAmb'))+'</button>';
  } else if(k==='police'){
    h+=secH(t('officer'));
    h+='<div class="card officer"><div class="av">'+officerSVG()+'</div><div class="grow"><div class="n">SI Ramesh Kumar</div><div class="s">Karnataka Police · '+esc(UNITS.police)+'</div><div class="s">Contact: 98867 12345</div></div></div>';
    h+='<div class="acts"><button class="act-btn" data-act="call:police">'+ic('phone')+esc(t('callOfficer'))+'</button><button class="act-btn" data-act="video">'+ic('video')+esc(t('videoCall'))+'</button>'+
      '<button class="act-btn" data-act="share-loc">'+ic('nav')+esc(t('shareLoc'))+'</button></div>';
    h+=secH(t('liveFeed'),'<span class="demo-tag">Sample footage</span>');
    h+='<div class="feed">'+streetCamSVG()+'<span class="rec"><i></i>REC</span><span class="feed-meta">CAM 14 · 80 Feet Rd · <span data-clock="1">'+clockNow()+'</span></span></div>';
    h+=okc('Route cleared','Traffic police cleared the route.');
  } else if(k==='fire'){
    h+=secH(t('fireStation'));
    h+='<div class="card"><div class="row"><span class="ib t-fire">'+ic('building')+'</span><div class="grow"><div class="t">Jayanagar Fire Station</div><div class="s">4.5 km · 15 min</div></div><span class="chip green">'+esc(t('available'))+'</span></div></div>';
    h+='<button class="btn soft split" data-act="call:fire">'+ic('phone')+'<span class="grow">'+esc(t('contactFire'))+'</span>'+ic('chev','sm')+'</button>';
  } else if(k==='civic'){
    h+=secH(t('svcDetails'));
    h+='<div class="card"><div class="row"><span class="ib t-civic">'+ic('truck')+'</span><div class="grow"><div class="t">Garbage Collection</div><div class="s">Zone 3 · Koramangala</div></div></div>'+
      '<div class="row"><span class="ib t-civic">'+ic('pin')+'</span><div class="grow"><div class="t">Live Location</div><div class="s" data-bind="st:civic">'+esc(bindText('st','civic'))+'</div></div><button class="pill" data-act="view-map:civic">View on Map</button></div></div>';
    h+=okc('Notification sent to your area','Garbage van is on the way.');
  }
  return h;
}
function clockNow(){ const d=new Date(); const p=function(n){return (n<10?'0':'')+n;}; return p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds()); }
function pService(p, D){
  const k=SVC[p.key]?p.key:'ambulance', d=SIMDEF[k];
  const title=t('svc_'+k);
  if(!D){
    let h=mhead(title, t('liveTracking'), headAct('trip:'+k,'clipboard','Trip details'));
    h+=mapHTML({sims:[k], h:300, aria:d.vehicle+' live location'});
    h+='<div class="svc-body">'+etaCard(k)+svcDetails(k)+'</div>';
    return {t:title, html:h, side:k};
  }
  const st='<div class="card" style="padding:16px 18px"><div style="display:flex;align-items:center;gap:12px"><span class="ib s-'+k+'">'+ic(TILE_IC[k])+'</span><div class="grow">'+
    '<div style="font-weight:800;font-size:15.5px">'+esc(d.vehicle)+' · '+esc(UNITS[k])+'</div><div class="muted" style="font-size:12.5px" data-bind="st:'+k+'">'+esc(bindText('st',k))+'</div></div>'+
    '<button class="pill" data-act="trip:'+k+'">Details</button></div><div class="bar" style="margin-top:14px"><i data-bind="bar:'+k+'" style="background:'+d.color+';width:0"></i></div>'+
    '<div class="prog-l"><span>Dispatched</span><span>En route</span><span>Arrived</span></div></div>';
  const rec='<div class="card"><div class="card-h"><h2>Incident record</h2><span class="chip gray">'+ic('lock','sm')+'Shared with agencies</span></div>'+
    '<div class="kvs"><div><span>Reference</span><b>INC-3184</b></div><div><span>Reported</span><b>City Shield app</b></div><div><span>Location</span><b>'+esc(S.area)+'</b></div>'+
    '<div><span>Visible to</span><b>'+esc(t(k))+' control room · '+(k==='civic'?CIVIC.short+' ward office':'112 ERSS')+'</b></div></div></div>';
  const h='<div class="svc-d">'+mapHTML({sims:[k], aria:d.vehicle+' live location', pad:{t:70,r:60,b:50,l:60}})+
    '<div class="svc-body">'+st+etaCard(k)+svcDetails(k)+rec+'</div></div>';
  return {t:title, s:t('liveTracking')+' · '+S.area, html:dpage(h), side:k};
}

/* ---------- track hub ---------- */
function trackRows(){
  return SKEYS.map(function(k){
    return '<button class="row" data-go="service:'+k+'"><span class="ib t-'+k+'">'+ic(TILE_IC[k])+'</span><div class="grow"><div class="t">'+esc(SIMDEF[k].vehicle)+'</div>'+
      '<div class="s" data-bind="st:'+k+'">'+esc(bindText('st',k))+'</div><div class="bar"><i data-bind="bar:'+k+'" style="background:'+SIMDEF[k].color+';width:0"></i></div></div>'+
      '<div class="v" data-bind="eta:'+k+'">'+esc(bindText('eta',k))+'</div>'+ic('chev','chev')+'</button>';
  }).join('');
}
function openCmpRows(){
  const L=S.complaints.filter(function(c){ return c.status!=='resolved'; });
  if(!L.length) return '<div class="empty">No open complaints.</div>';
  return L.map(function(c){ return cmpRow(c,'data-go="complaint:'+c.id+'"'); }).join('');
}
function pTrack(p, D){
  const body='<div class="card trk">'+trackRows()+'</div>'+secH('Complaints in progress','<button class="link" data-go="mycomplaints">'+esc(t('viewAll'))+'</button>')+'<div class="card cmp">'+openCmpRows()+'</div>';
  const act=SKEYS.filter(simActive);
  if(!D) return {t:t('liveTracking'), html:mhead(t('liveTracking'),'Responders and requests near you')+mapHTML({sims:act, pill:act.length===1, h:260, aria:'Your active responders', pad:{t:58,r:32,b:30,l:32}})+'<div class="pad stack">'+body+'</div>', tab:'track', side:'track'};
  const h='<div class="cmp-d"><div class="card" style="overflow:hidden"><div class="card-h"><h2>Your responders</h2><span class="demo-tag">'+(act.length?act.length+' active':'None active')+'</span></div>'+
    mapHTML({sims:act, pill:false, cls:'trk-map', aria:'Your active responders', pad:{t:56,r:40,b:40,l:40}})+'</div><div class="dcol">'+body.replace('<div class="sec-h">','<div class="sec-h" style="margin:0 2px -8px">')+'</div></div>';
  return {t:t('liveTracking'), s:'Every responder and request, in one place', html:dpage(h), side:'track'};
}
