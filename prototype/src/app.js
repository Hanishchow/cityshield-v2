/* ================= app shell, router, actions ================= */
const MQ=window.matchMedia('(min-width:960px)');
let DESK=MQ.matches, CUR=null;
function $(s,r){ return (r||document).querySelector(s); }

/* ---------- theme / language ---------- */
function applyTheme(){
  document.documentElement.setAttribute('data-theme', S.theme);
  try{ localStorage.setItem('cs-theme', S.theme); }catch{}
}
function applyLang(){ document.documentElement.lang=S.lang==='en'?'en-IN':S.lang+'-IN'; }

/* ---------- router ---------- */
function go(name, arg, opts){
  opts=opts||{};
  if(!PAGES[name]) name='home';
  if(opts.root) S.stack=[];
  else if(!opts.replace){ S.stack.push(S.route); if(S.stack.length>40) S.stack.shift(); }
  S.route={name:name, p:{key:arg, id:arg}};
  if(!opts.replace&&(!opts.root||HDEPTH===0)&&name!=='home') hPush();
  beforeRoute(name, S.route.p, opts);
  closeSheet(true);
  render(true);
}
function back(){
  if(S.stack.length){ S.route=S.stack.pop(); beforeRoute(S.route.name, S.route.p, {back:true}); render(true); }
  else if(S.route.name!=='home'){ S.route={name:'home', p:{}}; beforeRoute('home',{}, {}); render(true); }
}
/* phone / browser back button: mirror in-app navigation into history */
let HDEPTH=0;
function hPush(){ try{ history.pushState({cs:HDEPTH+1},''); HDEPTH++; }catch{} }
window.addEventListener('popstate',function(){
  if(HDEPTH>0) HDEPTH--;
  if($('#ovl').innerHTML){ if(OV.sos){ closeOv(); toast('SOS cancelled — nothing was sent','x','s-police'); } else closeOv(); hPush(); return; }
  if(SHEET){ closeSheet(); hPush(); return; }
  back();
});
function uiBack(){ if(HDEPTH>0){ try{ history.back(); return; }catch{} } back(); }
function beforeRoute(name, p, opts){
  if(name==='service'){ if(SKEYS.indexOf(p.key)<0) p.key='ambulance'; ensureSim(p.key); }
  else if(name==='home'&&DESK) ensureSim('ambulance');
  else if(name==='track'){ ensureSim('ambulance'); ensureSim('civic'); }
  else if(name==='command'){ ['cc1','cc2','cc3','cc4'].forEach(function(k){ ensureSim(k); }); }
  else if(name==='report'&&!opts.back) S.draft=newDraft(p.key);
  else if(name==='complaint'){ const c=findC(p.id); if(c&&(c.status==='progress'||c.status==='assigned')) ensureSim('crew'); S.cSel=p.id; }
  else if(name==='complaints'&&DESK){ const c=findC(S.cSel); if(c&&(c.status==='progress'||c.status==='assigned')) ensureSim('crew'); }
}

/* ---------- render ---------- */
function render(resetScroll){
  const view=$('#view'), keep=view.scrollTop;
  const fn=PAGES[S.route.name]||PAGES.home;
  const R=fn(S.route.p||{}, DESK); CUR=R;
  view.className='view'+(R.cls?' '+R.cls:'')+(R.tab?' has-nav':'');
  view.innerHTML=R.html;
  renderChrome();
  document.title=(S.route.name==='home'?'City Shield · '+t('tagline'):R.t+' · City Shield');
  mountMaps(); updateBinds(); tickClock();
  view.scrollTop=resetScroll?0:keep;
  view.querySelectorAll('.pick').forEach(function(pk){ const on=pk.querySelector('.pill.on'); if(on&&pk.scrollWidth>pk.clientWidth) pk.scrollLeft=Math.max(0,on.offsetLeft-pk.offsetLeft-(pk.clientWidth-on.offsetWidth)/2); });
}
function navI(key, go, icon, label, extra){
  const on=CUR&&CUR.side===key;
  return '<button class="nav-i'+(on?' on':'')+'" data-nav="'+go+'"'+(on?' aria-current="page"':'')+'>'+ic(icon)+'<span>'+esc(label)+'</span>'+(extra||'')+'</button>';
}
function renderChrome(){
  const R=CUR||{}, n=unread();
  /* sidebar */
  const dot=function(k){ return simActive(k)?'<span class="dot" style="background:'+SIMDEF[k].color+'" title="Live"></span>':''; };
  $('#sb').innerHTML='<div class="sb-brand">'+logoSVG()+'<div><b>CITY SHIELD</b><span>'+esc(t('tagline'))+'</span></div></div>'+
    '<button class="sb-sos" data-nav="sos">'+ic('siren','lg')+'<span>'+esc(t('sosTitle'))+'<small>'+esc(t('police'))+' · '+esc(t('ambulance'))+' · '+esc(t('fire'))+'</small></span></button>'+
    navI('home','home','home',t('home'))+
    '<div class="sb-grp">Services</div>'+SKEYS.map(function(k){ return navI(k,'service:'+k,TILE_IC[k],t('svc_'+k),dot(k)); }).join('')+
    '<div class="sb-grp">Civic</div>'+navI('complaints','complaints','clipboard',t('complaints'))+navI('track','track','track',t('liveTracking'))+
      navI('notifications','notifications','bell',t('notifications'),n?'<span class="cnt">'+n+'</span>':'')+
    '<div class="sb-grp">Account</div>'+navI('places','places','pin',t('saved'))+navI('profile','profile','user',t('profile'))+navI('prefs','prefs','globe','Preferences')+
    '<div class="sb-grp">Government</div>'+navI('command','command','grid','Command Centre')+
    '<div class="sb-foot"><button class="sb-112" data-act="dial:112"><span class="ib" style="background:rgba(229,56,59,.2);color:#FF6B6E;width:40px;height:40px">'+ic('phone')+'</span><span><b>112</b><span>All emergencies · opens your phone dialer</span></span></button>'+
    '<div class="sb-tag">A safer Bengaluru<br>is in your hands.</div></div>';
  /* topbar */
  const canBack=S.stack.length>0&&S.route.name!=='home';
  $('#tb').innerHTML=(canBack?'<button class="tb-back" data-act="back" aria-label="Back">'+ic('back')+'</button>':'')+
    '<div class="tb-t"><h1>'+esc(R.t||'')+'</h1>'+(R.s?'<p>'+esc(R.s)+'</p>':'')+'</div>'+
    '<div class="tb-r"><button class="tb-loc" data-act="loc-sheet">'+ic('pin','sm')+esc(shortArea())+'</button>'+
    '<button class="tb-ib" data-nav="notifications" aria-label="'+esc(t('notifications'))+'">'+ic('bell')+badge()+'</button>'+
    '<button class="tb-me" data-nav="profile"><i>'+esc(initials(S.user.name))+'</i><span class="tb-me-t"><b>'+esc(S.user.name)+'</b><span>Citizen</span></span></button></div>';
  /* bottom nav (mobile) */
  const bn=$('#bn');
  if(R.tab){
    const TABS=[['home','home',t('home')],['complaints','clipboard',t('complaints')],['track','track',t('track')],['more','more',t('more')]];
    bn.hidden=false; bn.className='bnav'+(R.dark?' dark':'');
    bn.innerHTML=TABS.map(function(x){ const on=R.tab===x[0]; return '<button class="'+(on?'on':'')+'" data-nav="'+(x[0]==='more'?'profile':x[0])+'"'+(on?' aria-current="page"':'')+'>'+ic(x[1])+'<span>'+esc(x[2])+'</span></button>'; }).join('');
  } else { bn.hidden=true; bn.innerHTML=''; }
}
function refreshBadges(){
  renderChrome();
  document.querySelectorAll('.hero-bell').forEach(function(b){ const old=b.querySelector('.badge'); if(old) old.remove(); b.insertAdjacentHTML('beforeend',badge()); });
}

/* ---------- toasts ---------- */
function toast(msg, icon, tone){
  const box=$('#toasts'); if(!box) return;
  const el=document.createElement('div'); el.className='toast'; el.setAttribute('role','status');
  el.innerHTML='<span class="ib '+(tone||'s-police')+'">'+ic(icon||'check')+'</span><span>'+esc(msg)+'</span>';
  box.appendChild(el); while(box.children.length>3) box.removeChild(box.firstChild);
  setTimeout(function(){ el.style.transition='opacity .3s,transform .3s'; el.style.opacity='0'; el.style.transform='translateY(8px)'; setTimeout(function(){ el.remove(); },320); },3600);
}
function nowStr(){ return fmtTime2(new Date()); }
function addNtf(n){ n.id='n'+Date.now()+Math.floor(Math.random()*1000); n.when=nowStr(); n.read=false; S.notifications.unshift(n); refreshBadges(); }

/* ---------- sheets ---------- */
let SHEET=null, LAST_FOCUS=null;
function openSheet(html, key){
  if(!html) return;
  LAST_FOCUS=document.activeElement;
  $('#layer').innerHTML='<div class="scrim" data-scrim="1">'+html+'</div>'; SHEET=key||'sheet'; document.body.classList.add('has-sheet');
  mountMaps(); updateBinds();
  const f=$('#layer .sheet input, #layer .sheet .x'); if(f) setTimeout(function(){ try{ f.focus({preventScroll:true}); }catch{} },30);
}
function closeSheet(silent){
  if(!SHEET&&!$('#layer').innerHTML) return;
  $('#layer').innerHTML=''; SHEET=null; document.body.classList.remove('has-sheet');
  if(!silent&&LAST_FOCUS&&document.body.contains(LAST_FOCUS)) try{ LAST_FOCUS.focus({preventScroll:true}); }catch{}
  mountMaps();
}

/* ---------- overlays: SOS, calls ---------- */
const OV={sos:null, call:null, callT:0, callStart:0};
function showOv(html){ $('#ovl').innerHTML=html; const b=$('#ovl button'); if(b) try{ b.focus({preventScroll:true}); }catch{} }
function closeOv(){ clearInterval(OV.sos); OV.sos=null; clearInterval(OV.call); OV.call=null; $('#ovl').innerHTML=''; }
function sosStart(){
  if(OV.sos) return;
  let n=3; const C=2*Math.PI*80;
  showOv('<div class="ov" role="alertdialog" aria-label="SOS countdown"><div class="cd"><svg viewBox="0 0 180 180"><circle cx="90" cy="90" r="80" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="10"/>'+
    '<circle class="cd-ring" cx="90" cy="90" r="80" fill="none" stroke="#FF4D4F" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+C.toFixed(1)+'" style="--c:'+C.toFixed(1)+'"/></svg><b id="cd-n">3</b></div>'+
    '<h2>Sending SOS in <span id="cd-s">3</span>…</h2><p>Alerting the nearest '+esc(t('ambulance'))+' and '+esc(t('police'))+' with your live location — '+esc(shortArea())+'.</p>'+
    '<div class="btns"><button class="btn ghost" data-act="sos-cancel">'+ic('x')+'Cancel</button></div></div>');
  if(navigator.vibrate) try{ navigator.vibrate(60); }catch{}
  OV.sos=setInterval(function(){
    n--; const a=$('#cd-n'), b=$('#cd-s');
    if(n<=0){ clearInterval(OV.sos); OV.sos=null; sosFire(); return; }
    if(a) a.textContent=n; if(b) b.textContent=n;
  },1000);
}
function sosFire(){
  ensureSim('ambulance',true); ensureSim('police',true);
  addNtf({kind:'emergency', svc:'police', icon:'siren', title:'SOS sent', body:'Your live location was shared with nearby responders.'});
  addNtf({kind:'emergency', svc:'ambulance', icon:'ambulance', title:'Ambulance Assigned', body:UNITS.ambulance+' is on the way to your location.'});
  addNtf({kind:'emergency', svc:'police', icon:'police', title:'Police Dispatched', body:UNITS.police+' is on the way.'});
  const dc=function(k){ return '<div class="dcard"><span class="ib">'+ic(TILE_IC[k])+'</span><div class="grow"><div class="t">'+esc(SIMDEF[k].vehicle)+' · '+esc(UNITS[k])+'</div><div class="s" data-bind="st:'+k+'">'+esc(bindText('st',k))+'</div></div><b data-bind="eta:'+k+'" style="white-space:nowrap">'+esc(bindText('eta',k))+'</b></div>'; };
  showOv('<div class="ov calm" role="dialog" aria-label="SOS sent"><div class="okbig">'+ic('check')+'</div><h2>Help is on the way</h2>'+
    '<p>SOS sent at '+esc(nowStr())+'. '+(S.shareLive?'Your live location is being shared with responders.':'Your location ('+esc(shortArea())+') was shared with responders.')+'</p>'+
    '<div class="dispatch">'+dc('ambulance')+dc('police')+'</div>'+
    '<div class="btns"><button class="btn primary" data-act="sos-track:ambulance">'+ic('track')+'Track ambulance live</button><button class="btn ghost" data-act="sos-track:police">Track police</button>'+
    '<button class="btn ghost" data-act="ov-close">Close</button></div><p class="ov-note">Prototype demo — no real emergency service was contacted. In a real emergency call 112.</p></div>');
  updateBinds(); refreshBadges();
}
const CALLEE={
  police:{n:'SI Ramesh Kumar', s:'Karnataka Police · 98867 12345', av:'officer'},
  ambulance:{n:'Ambulance crew', s:UNITS.ambulance+' · on the way', av:'ambulance'},
  fire:{n:'Jayanagar Fire Station', s:'Fire & Emergency Services', av:'fire'},
  civic:{n:CIVIC.short+' Ward Office', s:'Zone 3 · Koramangala', av:'bin'}
};
function callStart(k){
  const c=CALLEE[k]||CALLEE.police;
  closeSheet(true);
  showOv('<div class="ov calm" role="dialog" aria-label="Call"><div class="call-av">'+(c.av==='officer'?officerSVG():ic(c.av))+'</div><h2>'+esc(c.n)+'</h2><p id="call-st">Calling…</p><p style="font-size:12.5px;margin-top:2px">'+esc(c.s)+'</p>'+
    '<div class="call-ctl"><button data-act="call-tog" aria-pressed="false" aria-label="Mute">'+ic('micOff')+'</button><button class="end" data-act="ov-close" aria-label="End call">'+ic('phoneOff')+'</button>'+
    '<button data-act="call-tog" aria-pressed="false" aria-label="Speaker">'+ic('speaker')+'</button></div><p class="ov-note">Simulated call · prototype</p></div>');
  callTimer('#call-st');
}
function callTimer(sel){
  OV.callStart=0;
  OV.call=setInterval(function(){
    const el=$(sel); if(!el){ clearInterval(OV.call); return; }
    if(!OV.callStart){ OV.callStart=Date.now(); }
    const s=Math.floor((Date.now()-OV.callStart)/1000);
    if(s<2){ return; }
    const q=s-2; el.textContent='Connected · '+(q/60<10?'0':'')+Math.floor(q/60)+':'+(q%60<10?'0':'')+(q%60);
  },500);
}
function videoStart(){
  const big=officerSVG().replace('<svg ','<svg preserveAspectRatio="xMidYMid slice" ');
  showOv('<div class="vid" role="dialog" aria-label="Video call"><div class="vid-main">'+big+'<div class="vid-top"><div><b>SI Ramesh Kumar</b><span id="vid-st">Connecting video…</span></div><span class="rec" style="position:static"><i></i>LIVE</span></div>'+
    '<div class="vid-self">'+esc(initials(S.user.name))+'</div></div>'+
    '<div class="call-ctl"><button data-act="call-tog" aria-pressed="false" aria-label="Mute">'+ic('micOff')+'</button><button class="end" data-act="ov-close" aria-label="End video call">'+ic('phoneOff')+'</button>'+
    '<button data-act="call-tog" aria-pressed="false" aria-label="Switch camera">'+ic('flip')+'</button></div><p class="vid-note">Simulated video call · prototype</p></div>');
  callTimer('#vid-st');
}

/* ---------- arrivals ---------- */
function onArrive(key){
  const d=SIMDEF[key]; if(!d||d.quiet) return;
  addNtf({kind:key==='civic'?'service':'emergency', svc:key, icon:TILE_IC[key], title:d.arrived, body:UNITS[key]+' reached '+shortArea()+'.'});
  if((key==='civic'&&S.prefs.service)||(key!=='civic'&&S.prefs.emergency)) toast(d.arrived, TILE_IC[key], 's-'+key);
}

/* ---------- complaints ---------- */
function submitReport(){
  const d=S.draft||newDraft('pothole'), k=catOf(d.cat);
  const loc=String(d.loc||'').trim();
  if(!loc){ const i=$('#f-loc'); if(i){ i.focus(); i.classList.add('bad'); } toast('Please add a location','alert','s-ambulance'); return; }
  const id='CS-'+(S.nextId++), when='Today, '+fmtTime(new Date());
  const title=String(d.title||'').trim()||(k.title+' – '+loc.split(',')[0]);
  const c={id:id, cat:k.key, title:title, loc:loc, status:'submitted', when:when, desc:String(d.desc||'').trim(), photo:d.photo,
    tl:[{t:'Complaint Submitted', s:when, st:'done'},{t:'Assigned to '+k.agency, s:'Usually within 1 hour', st:'cur'},{t:'Work in Progress', s:'Pending', st:'todo'}]};
  S.complaints.unshift(c); S.draft=null; S.cSel=id;
  if(S.prefs.complaint) addNtf({kind:'complaint', svc:'amber', icon:'clipboard', title:'Complaint Submitted', body:id+' · '+title, cid:id});
  toast('Complaint '+id+' submitted','check','s-civic');
  go('complaint', id, {replace:true});
  setTimeout(function(){
    if(c.status!=='submitted') return;
    c.status='progress';
    const tm='Today, '+fmtTime(new Date());
    c.tl=[{t:'Complaint Submitted', s:when, st:'done'},{t:'Assigned to '+k.agency, s:tm, st:'done'},{t:'Work in Progress', s:'Crew on the way · expected by Tomorrow, 10:00 AM', st:'cur'}];
    ensureSim('crew',true);
    if(S.prefs.complaint){ addNtf({kind:'complaint', svc:'amber', icon:'clipboard', title:'Complaint Update', body:id+' assigned to '+k.agency+'. A crew is on the way.', cid:id}); toast(id+' assigned to '+k.agency,'clipboard','s-amber'); }
    if(S.route.name==='complaint'||S.route.name==='complaints'||S.route.name==='mycomplaints') render(false);
  },5000);
}
function readPhoto(file){
  if(!file||!String(file.type).startsWith('image/')){ toast('Please choose an image file','alert','s-ambulance'); return; }
  const fr=new FileReader();
  fr.onload=function(){
    const img=new Image();
    img.onload=function(){
      const M=1280, sc=Math.min(1,M/Math.max(img.width,img.height)), cv=document.createElement('canvas');
      cv.width=Math.round(img.width*sc); cv.height=Math.round(img.height*sc);
      cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
      let url; try{ url=cv.toDataURL('image/jpeg',.82); }catch{ url=fr.result; }
      if(S.draft){ S.draft.photo=url; render(false); }
    };
    img.onerror=function(){ toast('Could not read that image','alert','s-ambulance'); };
    img.src=fr.result;
  };
  fr.readAsDataURL(file);
}

/* ---------- actions ---------- */
const ACT={
  back:function(){ uiBack(); },
  sos:function(){ sosStart(); },
  'sos-cancel':function(){ closeOv(); toast('SOS cancelled — nothing was sent','x','s-police'); },
  'sos-track':function(k){ closeOv(); go('service',k||'ambulance'); },
  'ov-close':function(){ closeOv(); },
  dispatch:function(k){
    ensureSim(k,true);
    addNtf({kind:'emergency', svc:k, icon:TILE_IC[k], title:SIMDEF[k].vehicle+' Dispatched', body:UNITS[k]+' is on the way to '+shortArea()+'.'});
    toast(SIMDEF[k].vehicle+' dispatched to your location', TILE_IC[k], 's-'+k);
    go('service',k);
  },
  dial:function(n){ openSheet(shDial(n),'dial'); },
  call:function(k){ callStart(k); },
  video:function(){ videoStart(); },
  'call-tog':function(a,el){ const on=el.getAttribute('aria-pressed')!=='true'; el.setAttribute('aria-pressed',String(on)); el.classList.toggle('on',on); },
  'share-loc':function(){ toast('Live location shared with SI Ramesh Kumar','nav','s-police'); },
  'share-live':function(a,el){ S.shareLive=!S.shareLive; el.setAttribute('aria-checked',String(S.shareLive)); toast(S.shareLive?'Live location sharing on':'Live location sharing off','nav','s-police'); },
  'loc-sheet':function(){ openSheet(shLoc(),'loc'); },
  'set-area':function(id){ const x=S.places.filter(function(q){return q.id===id;})[0]; if(!x) return; S.area=x.addr; closeSheet(true); render(false); toast('Location set to '+x.name,'pin','s-police'); },
  trip:function(k){ openSheet(shTrip(k),'trip'); },
  restart:function(k){ ensureSim(k,true); closeSheet(true); render(false); toast('Demo replayed','refresh','s-police'); },
  'hosp-sel':function(id){ S.hospital=id; const inSheet=!!SHEET; render(false); if(inSheet) openSheet(shHosp(),'hosp'); toast(hospName()+' set as destination','hospital','s-ambulance'); },
  'hosp-all':function(){ openSheet(shHosp(),'hosp'); },
  'view-map':function(k){ openSheet(shSvcMap(k),'map'); },
  'track-map':function(id){ const c=findC(id); if(c&&(c.status==='progress'||c.status==='assigned')) ensureSim('crew'); openSheet(shCmpMap(id),'cmap'); },
  'cmp-sel':function(id){ S.cSel=id; const c=findC(id); if(c&&(c.status==='progress'||c.status==='assigned')) ensureSim('crew'); render(false); },
  'cmp-filter':function(f){ S.cFilter=f; render(false); },
  'draft-cat':function(k){ if(!S.draft) S.draft=newDraft(k); S.draft.cat=k; render(false); },
  'draft-loc':function(){ if(!S.draft) return; S.draft.loc=S.area; const i=$('#f-loc'); if(i) i.value=S.area; toast('Location added from GPS (±12 m)','locate','s-police'); },
  'photo-rm':function(a,el,e){ e.preventDefault(); if(S.draft){ S.draft.photo=null; render(false); } },
  'report-submit':function(){ submitReport(); },
  'ntf-filter':function(f){ S.ntfFilter=f; render(false); },
  'ntf-read-all':function(){ S.notifications.forEach(function(n){ n.read=true; }); render(false); },
  'ntf-open':function(id){
    const n=S.notifications.filter(function(x){return x.id===id;})[0]; if(!n) return; n.read=true;
    if(n.cid&&findC(n.cid)) go('complaint',n.cid);
    else if(n.kind==='complaint') go('complaint','CS-2041');
    else if(SKEYS.indexOf(n.svc)>=0) go('service',n.svc);
    else render(false);
  },
  lang:function(c){ S.lang=c; applyLang(); render(false); toast(c==='en'?'Language: English':'Language changed','globe','s-police'); },
  pref:function(k,el){ S.prefs[k]=!S.prefs[k]; el.setAttribute('aria-checked',String(S.prefs[k])); },
  theme:function(v){ S.theme=v; applyTheme(); render(false); },
  'loc-access':function(){ openSheet(shLocAccess(),'la'); },
  'reset-demo':function(){ const d=seedState(); S.complaints=d.complaints; S.notifications=d.notifications; S.places=d.places; S.sims={}; S.nextId=2042; S.cSel=null; S.draft=null;
    S.area='Koramangala 5th Block, Bengaluru'; S.hospital='manipal'; S.user={name:'Shreyas Jayanna', first:'Shreyas', phone:'+91 90087 76208', city:'Bengaluru, Karnataka'};
    render(false); toast('Demo data restored','refresh','s-police'); },
  'place-tab':function(v){ S.placeTab=v; render(false); },
  'place-open':function(id){ openSheet(shPlace(id),'place'); },
  'place-add':function(){ openSheet(shAddPlace(),'addplace'); },
  ptype:function(v){ PLACE_TYPE=v; document.querySelectorAll('#p-type .pill').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-act')==='ptype:'+v); }); },
  'place-save':function(){
    const nm=($('#p-name')||{}).value||'', ad=($('#p-addr')||{}).value||'', er=$('#p-err');
    if(!nm.trim()||!ad.trim()){ if(er) er.textContent='Please enter a name and an address.'; return; }
    const icon={home:'home',work:'brief',frequent:'pin'}[PLACE_TYPE];
    S.places.push({id:'p'+Date.now(), name:nm.trim(), addr:ad.trim(), type:PLACE_TYPE, icon:icon});
    closeSheet(true); render(false); toast(nm.trim()+' saved','check','s-civic');
  },
  'place-del':function(id){ S.places=S.places.filter(function(x){return x.id!==id;}); closeSheet(true); render(false); toast('Place removed','bin','s-police'); },
  'place-share':function(id){ const x=S.places.filter(function(q){return q.id===id;})[0]; closeSheet(true); if(x) toast(x.name+' shared','send','s-police'); },
  'profile-edit':function(){ openSheet(shProfile(),'profile'); },
  'profile-save':function(){
    const nm=(($('#u-name')||{}).value||'').trim(), ph=(($('#u-phone')||{}).value||'').trim(), er=$('#u-err');
    if(nm.length<2){ if(er) er.textContent='Please enter your name.'; return; }
    if(!/^[+\d][\d\s-]{7,}$/.test(ph)){ if(er) er.textContent='Please enter a valid mobile number.'; return; }
    S.user.name=nm; S.user.first=nm.split(/\s+/)[0]; S.user.phone=ph; closeSheet(true); render(false); toast('Profile updated','check','s-civic');
  },
  feedback:function(){ toast('Thanks! Feedback is collected in the full version.','send','s-police'); },
  'sheet-close':function(){ closeSheet(); },
  'sheet-close-soft':function(){ setTimeout(function(){ closeSheet(true); },300); return true; }
};

document.addEventListener('click',function(e){
  if(e.target.closest('[data-scrim]')&&!e.target.closest('.sheet')){ closeSheet(); return; }
  const a=e.target.closest('[data-act]'), g=e.target.closest('[data-go]'), nv=e.target.closest('[data-nav]');
  const cands=[a,g,nv].filter(Boolean); if(!cands.length) return;
  let el=cands[0]; cands.forEach(function(c){ if(el.contains(c)&&el!==c) el=c; });
  if(el===a){
    const v=a.getAttribute('data-act'), i=v.indexOf(':'), name=i<0?v:v.slice(0,i), arg=i<0?null:v.slice(i+1);
    const fn=ACT[name]; if(!fn) return;
    const keepDefault=fn(arg,a,e);
    if(a.tagName==='A'&&keepDefault!==true) e.preventDefault();
    return;
  }
  const v=el.getAttribute(el===g?'data-go':'data-nav'), i=v.indexOf(':');
  go(i<0?v:v.slice(0,i), i<0?null:v.slice(i+1), {root:el===nv});
});
document.addEventListener('input',function(e){
  const f=e.target.getAttribute&&e.target.getAttribute('data-draft');
  if(f&&S.draft){ S.draft[f]=e.target.value; e.target.classList.remove('bad'); }
});
document.addEventListener('change',function(e){
  if(e.target.getAttribute&&e.target.getAttribute('data-inp')==='photo'&&e.target.files&&e.target.files[0]) readPhoto(e.target.files[0]);
});
document.addEventListener('keydown',function(e){
  if(e.key!=='Escape') return;
  if($('#ovl').innerHTML){ if(OV.sos){ closeOv(); toast('SOS cancelled — nothing was sent','x','s-police'); } else closeOv(); }
  else if(SHEET) closeSheet();
});
function onMQ(){ const d=MQ.matches; if(d===DESK) return; DESK=d; beforeRoute(S.route.name,S.route.p||{},{back:true}); closeSheet(true); render(false); }
if(MQ.addEventListener) MQ.addEventListener('change',onMQ); else if(MQ.addListener) MQ.addListener(onMQ);

function tickClock(){ const c=clockNow(); document.querySelectorAll('[data-clock]').forEach(function(el){ if(el.textContent!==c) el.textContent=c; }); }
setInterval(tickClock,1000);

/* ---------- boot ---------- */
applyTheme(); applyLang();
beforeRoute('home',{}, {});
render(true);
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ Object.keys(MOUNT).forEach(function(id){ const M=MOUNT[id]; if(M&&M.v) M.v.forEach(function(v){ v.lab=null; }); }); });
