/* ================= pages B: complaints, account, notifications, help, about, command, sheets ================= */
IC.nodes='<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 7.5v4.5M12 12l-5.2 5M12 12l5.2 5"/>';

function cmpRow(c, attr, sel){
  const k=catOf(c.cat);
  return '<button class="row'+(sel?' sel':'')+'" '+attr+'><span class="ib '+k.tone+'">'+ic(k.icon)+'</span><div class="grow"><div class="t">'+esc(c.title)+'</div>'+
    '<div class="meta">'+statusChip(c.status)+'<span class="time">'+esc(c.when)+'</span></div></div>'+ic('chev','chev')+'</button>';
}
const NTF_TONE={ambulance:'s-ambulance', police:'s-police', fire:'s-fire', civic:'s-civic', amber:'s-amber'};
function ntfRow(n){
  return '<button class="row'+(n.read?'':' unread')+'" data-act="ntf-open:'+n.id+'"><span class="ib round '+(NTF_TONE[n.svc]||'s-police')+'">'+ic(n.icon)+'</span>'+
    '<div class="grow"><div class="t">'+esc(n.title)+'</div><div class="s">'+esc(n.body)+'</div></div><span class="when">'+esc(n.when)+'</span></button>';
}
function findC(id){ for(let i=0;i<S.complaints.length;i++){ if(S.complaints[i].id===id) return S.complaints[i]; } return null; }
function photoHTML(c){
  if(c.photo) return '<img src="'+c.photo+'" alt="Photo attached to complaint '+esc(c.id)+'">';
  if(c.cat==='pothole') return potholeSVG();
  if(c.cat==='signal') return streetCamSVG();
  const k=catOf(c.cat);
  return '<div class="ph-empty"><span class="ib round '+k.tone+'">'+ic(k.icon,'lg')+'</span><span>No photo attached</span></div>';
}
function tlHTML(tl){
  return '<ol class="tl">'+tl.map(function(x){
    return '<li class="'+x.st+'"><span class="d">'+(x.st==='done'?ic('check'):'')+'</span><div class="t">'+esc(x.t)+'</div><div class="s">'+esc(x.s)+'</div></li>';
  }).join('')+'</ol>';
}
function cmpBody(c){
  const k=catOf(c.cat);
  return '<div class="photo">'+photoHTML(c)+'</div>'+
    '<div><div class="cd-id">'+esc(c.id)+' · '+esc(k.title)+'</div><h2 class="cd-t">'+esc(c.title)+'</h2></div>'+
    '<div class="kv">'+ic('pin')+'<div><div class="k">'+esc(t('location'))+'</div><div class="v">'+esc(c.loc)+'</div></div></div>'+
    '<div class="kv">'+ic('activity')+'<div><div class="k">'+esc(t('status'))+'</div><div class="v" style="margin-top:4px">'+statusChip(c.status)+'</div></div></div>'+
    '<div class="kv">'+ic('building')+'<div><div class="k">Routed to</div><div class="v">'+esc(k.agency)+'</div></div></div>'+
    (c.desc?'<p class="cd-desc">'+esc(c.desc)+'</p>':'')+
    '<div class="card" style="padding:16px">'+tlHTML(c.tl)+'</div>'+
    '<button class="btn outline" data-act="track-map:'+c.id+'">'+ic('external')+esc(t('trackMap'))+'</button>';
}
function catGrid(){
  return '<div class="cat-grid">'+CATS.map(function(k){
    return '<button class="cat" data-go="report:'+k.key+'"><span class="ib '+k.tone+'">'+ic(k.icon)+'</span><span class="t">'+esc(k.title)+'</span><span class="s">'+esc(k.sub)+'</span></button>';
  }).join('')+'</div>';
}
function cmpFiltered(){
  const f=S.cFilter||'all';
  return S.complaints.filter(function(c){ return f==='all'||(f==='resolved'?c.status==='resolved':c.status!=='resolved'); });
}
function cmpFilterPills(){
  const F=[['all','All'],['open',t('inProgress')],['resolved',t('resolved')]], cur=S.cFilter||'all';
  return '<div class="seg">'+F.map(function(f){ return '<button class="pill solid'+(cur===f[0]?' on':'')+'" data-act="cmp-filter:'+f[0]+'" aria-pressed="'+(cur===f[0])+'">'+esc(f[1])+'</button>'; }).join('')+'</div>';
}

/* ---------- complaints ---------- */
function pComplaints(p, D){
  if(!D){
    let h=mhead(t('reportC'))+'<div class="pad stack">'+catGrid()+
      secH(t('myC'),'<button class="link" data-go="mycomplaints">'+esc(t('viewAll'))+'</button>')+
      '<div class="card cmp">'+S.complaints.slice(0,3).map(function(c){ return cmpRow(c,'data-go="complaint:'+c.id+'"'); }).join('')+'</div></div>';
    return {t:t('complaints'), html:h, tab:'complaints', side:'complaints'};
  }
  const L=cmpFiltered();
  if(!S.cSel||!findC(S.cSel)) S.cSel=S.complaints[0]&&S.complaints[0].id;
  const sel=findC(S.cSel);
  let h='<div class="cmp-d"><div class="dcol">'+
    '<div class="card"><div class="card-h"><h2>'+esc(t('reportC'))+'</h2><span class="demo-tag">Auto-routed to the right agency</span></div><div style="padding:8px 18px 18px">'+catGrid()+'</div></div>'+
    '<div class="card"><div class="card-h"><h2>'+esc(t('myC'))+'</h2><span class="demo-tag">'+S.complaints.length+' total</span></div>'+cmpFilterPills()+
    '<div class="cmp" style="margin-top:6px">'+(L.length?L.map(function(c){ return cmpRow(c,'data-act="cmp-sel:'+c.id+'"',c.id===S.cSel); }).join(''):'<div class="empty">Nothing here yet.</div>')+'</div></div>'+
    '</div><div class="detail">'+(sel?'<div class="card"><div class="card-h"><h2>'+esc(t('cDetails'))+'</h2><button class="link" data-go="complaint:'+sel.id+'">Open'+'</button></div><div class="pad stack" style="padding-top:8px">'+cmpBody(sel)+'</div></div>':'')+'</div></div>';
  return {t:t('complaints'), s:'Report civic issues and follow them to resolution', html:dpage(h), side:'complaints'};
}
function pComplaint(p, D){
  const c=findC(p.id)||S.complaints[0];
  if(!D) return {t:t('cDetails'), html:mhead(t('cDetails'))+'<div class="pad stack">'+cmpBody(c)+'</div>', side:'complaints'};
  const k=catOf(c.cat);
  const mapCfg={sims:c.status==='resolved'||c.status==='submitted'?[]:['crew'], issue:{pt:ISSUE_PT, state:c.status==='resolved'?'resolved':'open'}, live:c.status!=='resolved', aria:'Complaint location', h:360, pad:{t:60,r:40,b:40,l:40}};
  const h='<div class="dcols"><div class="dcol"><div class="card" style="overflow:hidden"><div class="photo photo-d">'+photoHTML(c)+'</div>'+
    '<div class="pad stack"><div><div class="cd-id">'+esc(c.id)+' · '+esc(k.title)+'</div><h2 class="cd-t">'+esc(c.title)+'</h2></div>'+(c.desc?'<p class="cd-desc">'+esc(c.desc)+'</p>':'')+'</div></div>'+
    '<div class="card" style="overflow:hidden"><div class="card-h"><h2>'+esc(t('trackMap'))+'</h2>'+(c.status==='resolved'?'<span class="chip green">'+esc(t('resolved'))+'</span>':'<span class="chip blue" data-bind="lab:crew">'+esc(bindText('lab','crew'))+'</span>')+'</div>'+mapHTML(mapCfg)+'</div></div>'+
    '<div class="dcol"><div class="card pad stack">'+
    '<div class="kv">'+ic('pin')+'<div><div class="k">'+esc(t('location'))+'</div><div class="v">'+esc(c.loc)+'</div></div></div>'+
    '<div class="kv">'+ic('activity')+'<div><div class="k">'+esc(t('status'))+'</div><div class="v" style="margin-top:4px">'+statusChip(c.status)+'</div></div></div>'+
    '<div class="kv">'+ic('building')+'<div><div class="k">Routed to</div><div class="v">'+esc(k.agency)+'</div></div></div>'+
    '<div class="kv">'+ic('clock')+'<div><div class="k">Reported</div><div class="v">'+esc(c.when)+'</div></div></div></div>'+
    '<div class="card" style="padding:18px"><h2 style="font-size:15.5px;font-weight:800;margin-bottom:14px">Progress</h2>'+tlHTML(c.tl)+'</div></div></div>';
  return {t:t('cDetails'), s:c.id+' · '+c.loc, html:dpage(h), side:'complaints'};
}
function pMyComplaints(p, D){
  const L=cmpFiltered();
  const list='<div class="card cmp">'+(L.length?L.map(function(c){ return cmpRow(c,'data-go="complaint:'+c.id+'"'); }).join(''):'<div class="empty">Nothing here yet.</div>')+'</div>';
  const body=cmpFilterPills().replace('class="seg"','class="seg" style="padding:0 0 2px"')+list+'<button class="btn primary" data-go="complaints">'+ic('plus')+esc(t('reportC'))+'</button>';
  if(!D) return {t:t('myC'), html:mhead(t('myC'),S.complaints.length+' complaints')+'<div class="pad stack">'+body+'</div>', side:'complaints'};
  return {t:t('myC'), s:S.complaints.length+' complaints filed from this account', html:dpage('<div class="narrow stack">'+body+'</div>'), side:'complaints'};
}

/* ---------- report form ---------- */
function newDraft(cat){ return {cat:catOf(cat||'pothole').key, title:'', loc:S.area, desc:'', photo:null}; }
function reportForm(){
  const d=S.draft||(S.draft=newDraft('pothole')), k=catOf(d.cat);
  const ph={pothole:'e.g. Pothole on 80 Feet Road', signal:'e.g. Signal not working at Sony World Junction', water:'e.g. Water logging on 1st Main Road', light:'e.g. Street light out on 6th Cross',
    civic:'e.g. Garbage not collected on 6th Cross', other:'e.g. Fallen tree branch on footpath'}[d.cat];
  return '<div class="field"><span class="lbl">Category</span><div class="pick" role="radiogroup" aria-label="Category">'+CATS.map(function(c){
      return '<button class="pill'+(c.key===d.cat?' on':'')+'" role="radio" aria-checked="'+(c.key===d.cat)+'" data-act="draft-cat:'+c.key+'">'+ic(c.icon,'sm')+esc(c.title)+'</button>'; }).join('')+'</div></div>'+
    '<div class="field"><span class="lbl">Photo <span class="faint" style="font-weight:600">(optional)</span></span>'+
      (d.photo?'<div class="drop has"><img src="'+d.photo+'" alt="Attached photo"><button class="rm" data-act="photo-rm" aria-label="Remove photo">'+ic('x','sm')+'</button></div>':
      '<label class="drop">'+ic('camera','xl')+'<span>Add a photo of the issue</span><span class="faint" style="font-size:12px;font-weight:500">Camera or gallery · helps the crew find it</span><input type="file" accept="image/*" class="sr" data-inp="photo"></label>')+'</div>'+
    '<div class="field"><label for="f-title">Title</label><input id="f-title" class="inp" data-draft="title" maxlength="80" autocomplete="off" placeholder="'+esc(ph)+'" value="'+esc(d.title)+'"></div>'+
    '<div class="field"><label for="f-loc">'+esc(t('location'))+'</label><div class="inp-ic">'+ic('pin')+'<input id="f-loc" class="inp" data-draft="loc" autocomplete="off" value="'+esc(d.loc)+'"></div>'+
      '<button class="link" style="align-self:flex-start;display:flex;align-items:center;gap:6px" data-act="draft-loc">'+ic('locate','sm')+'Use my current location</button></div>'+
    '<div class="field"><label for="f-desc">Description <span class="faint" style="font-weight:600">(optional)</span></label><textarea id="f-desc" class="inp" data-draft="desc" maxlength="500" placeholder="What is the problem? Any landmark nearby?">'+esc(d.desc)+'</textarea></div>'+
    '<div class="route-note">'+ic('shieldCheck','sm')+'<span>Will be routed automatically to <b>'+esc(k.agency)+'</b></span></div>'+
    '<button class="btn primary" data-act="report-submit">'+ic('send')+'Submit Complaint</button>';
}
function pReport(p, D){
  const k=catOf((S.draft||{}).cat||p.key);
  if(!D) return {t:t('reportC'), html:mhead(t('reportC'),k.title+' · '+k.sub)+'<div class="pad stack">'+reportForm()+'</div>', side:'complaints'};
  const steps=[['Submitted','You get a complaint ID instantly.'],['Auto-routed','Sent to '+k.agency+' based on category and location.'],['Crew assigned','Track the crew live on the map.'],['Resolved','You are notified with a closing photo.']];
  const h='<div class="dcols"><div class="card pad stack" style="padding:22px">'+reportForm()+'</div><div class="dcol">'+
    '<div class="card"><div class="card-h"><h2>What happens next</h2></div><div class="steps" style="padding:8px 18px 18px">'+
    steps.map(function(s,i){ return '<div class="step"><span class="n">'+(i+1)+'</span><div><b>'+esc(s[0])+'</b><p>'+esc(s[1])+'</p></div></div>'; }).join('')+'</div></div>'+
    '<div class="card"><div class="card-h"><h2>'+esc(t('myC'))+'</h2><button class="link" data-go="mycomplaints">'+esc(t('viewAll'))+'</button></div><div class="cmp">'+
    S.complaints.slice(0,3).map(function(c){ return cmpRow(c,'data-go="complaint:'+c.id+'"'); }).join('')+'</div></div></div></div>';
  return {t:t('reportC'), s:k.title+' · '+k.sub, html:dpage(h), side:'complaints'};
}

/* ---------- profile / settings ---------- */
function menuRow(icon, label, attr, sub){
  return '<button class="row" '+attr+'>'+ic(icon)+'<div class="grow"><div class="t" style="font-weight:600">'+esc(label)+'</div>'+(sub?'<div class="s">'+esc(sub)+'</div>':'')+'</div>'+ic('chev','chev')+'</button>';
}
function profCard(){
  return '<div class="card prof"><span class="av">'+esc(initials(S.user.name))+'</span><div class="grow" style="min-width:0"><div class="n">'+esc(S.user.name)+'</div><div class="s">'+esc(S.user.phone)+'</div><div class="s">'+esc(S.user.city)+'</div></div>'+
    '<button class="edit" data-act="profile-edit" aria-label="Edit profile">'+ic('edit')+'</button></div>';
}
function profMenu(){
  return '<div class="card menu">'+menuRow('clipboard',t('myC'),'data-go="mycomplaints"')+menuRow('pin',t('saved'),'data-go="places"')+menuRow('help',t('help'),'data-go="help"')+
    menuRow('info',t('about'),'data-go="about"')+menuRow('settings',t('settings'),'data-go="prefs"')+'</div>';
}
function pProfile(p, D){
  const govt='<div class="card menu">'+menuRow('grid','Command Centre','data-go="command"','Government view · sample data')+'</div>';
  if(!D) return {t:t('profile'), html:mhead(t('profile'))+'<div class="pad stack">'+profCard()+profMenu()+govt+'</div>', tab:'more', side:'profile'};
  const res=S.complaints.filter(function(c){return c.status==='resolved';}).length;
  const stats='<div class="kpis" style="grid-template-columns:repeat(3,1fr)">'+
    [['clipboard','Complaints filed',S.complaints.length],['checkC','Resolved',res],['pin','Saved places',S.places.length]].map(function(x){
      return '<div class="card kpi"><div class="l">'+ic(x[0],'sm')+esc(x[1])+'</div><div class="v">'+x[2]+'</div></div>'; }).join('')+'</div>';
  const h='<div class="twocol"><div class="dcol">'+profCard()+govt+'</div><div class="dcol">'+stats+profMenu()+'</div></div>';
  return {t:t('profile'), s:S.user.name+' · '+S.user.phone, html:dpage(h), side:'profile'};
}
function prefsBody(){
  const langs='<div class="card lang" role="radiogroup" aria-label="'+esc(t('appLang'))+'">'+LANGS.map(function(L){
    const on=S.lang===L.code;
    return '<button class="row'+(on?' on':'')+'" role="radio" aria-checked="'+on+'" data-act="lang:'+L.code+'"><span class="radio'+(on?' on':'')+'"></span><div class="grow"><div class="t" lang="'+L.code+'">'+
      esc(L.code==='en'?'English':L.native+' ('+L.name+')')+'</div></div></button>';
  }).join('')+'</div>';
  const P=[['emergency','siren',t('emAlerts')],['service','bell',t('svcUpdates')],['complaint','clipboard',t('cUpdates')]];
  const ntf='<div class="card">'+P.map(function(x){
    return '<div class="row"><span class="ib round t-blue" style="width:34px;height:34px">'+ic(x[1],'sm')+'</span><div class="grow"><div class="t" style="font-weight:600">'+esc(x[2])+'</div></div>'+
      '<button class="sw" role="switch" aria-checked="'+(!!S.prefs[x[0]])+'" aria-label="'+esc(x[2])+'" data-act="pref:'+x[0]+'"></button></div>';
  }).join('')+'</div>';
  const TH=[['light','sun','Light'],['dark','moon','Dark'],['system','settings','System']];
  const theme='<div class="card"><div class="seg" style="padding:12px 14px">'+TH.map(function(x){
    return '<button class="pill solid'+(S.theme===x[0]?' on':'')+'" aria-pressed="'+(S.theme===x[0])+'" data-act="theme:'+x[0]+'">'+ic(x[1],'sm')+esc(x[2])+'</button>'; }).join('')+'</div></div>';
  const more='<div class="card menu">'+menuRow('locate',t('locAccess'),'data-act="loc-access"','Required for live tracking and nearby services')+
    menuRow('refresh','Reset demo data','data-act="reset-demo"','Restores the sample complaints, places and alerts')+'</div>';
  return secH(t('appLang'))+langs+secH(t('notifications'))+ntf+secH('Appearance')+theme+secH(t('settings'))+more;
}
function pPrefs(p, D){
  if(!D) return {t:t('langPrefs'), html:mhead(t('langPrefs'))+'<div class="pad stack">'+prefsBody()+'</div>', side:'prefs'};
  return {t:t('langPrefs'), s:'Language, alerts, appearance and location', html:dpage('<div class="narrow stack">'+prefsBody()+'</div>'), side:'prefs'};
}

/* ---------- saved places ---------- */
function placesBody(){
  const tabs=[['home',t('home')],['work','Work'],['frequent','Frequent Places']], cur=S.placeTab||'home';
  const L=S.places.filter(function(x){ return cur==='home'||x.type===cur; });
  return '<div class="card" style="padding:10px"><div class="seg" style="padding:0" role="tablist">'+tabs.map(function(x){
      return '<button class="pill navy'+(cur===x[0]?' on':'')+'" role="tab" aria-selected="'+(cur===x[0])+'" data-act="place-tab:'+x[0]+'">'+esc(x[1])+'</button>'; }).join('')+'</div></div>'+
    '<div class="card">'+(L.length?L.map(function(x){
      const here=S.area===x.addr;
      return '<button class="row" data-act="place-open:'+x.id+'"><span class="ib t-blue">'+ic(x.icon)+'</span><div class="grow"><div class="t">'+esc(x.name)+(here?' <span class="chip green" style="margin-left:6px">Current</span>':'')+'</div><div class="s">'+esc(x.addr)+'</div></div>'+ic('chev','chev')+'</button>';
    }).join(''):'<div class="empty">No places in this list yet.</div>')+'</div>'+
    '<button class="btn navy" data-act="place-add">'+ic('plus')+esc(t('addLoc'))+'</button>';
}
function pPlaces(p, D){
  if(!D) return {t:t('saved'), html:mhead(t('saved'))+'<div class="pad stack">'+placesBody()+'</div>', side:'places'};
  return {t:t('saved'), s:'Used to share your location instantly in an emergency', html:dpage('<div class="narrow stack">'+placesBody()+'</div>'), side:'places'};
}

/* ---------- notifications ---------- */
function ntfBody(){
  const F=[['all','All'],['emergency','Emergency'],['service','Service'],['complaint','Complaint']], cur=S.ntfFilter||'all';
  const L=S.notifications.filter(function(n){ return cur==='all'||n.kind===cur; });
  return '<div class="seg" style="padding:0 0 2px">'+F.map(function(f){ return '<button class="pill solid'+(cur===f[0]?' on':'')+'" aria-pressed="'+(cur===f[0])+'" data-act="ntf-filter:'+f[0]+'">'+esc(f[1])+'</button>'; }).join('')+'</div>'+
    '<div class="card ntf">'+(L.length?L.map(ntfRow).join(''):'<div class="empty"><span class="ib round t-gray">'+ic('bell')+'</span>No notifications here.</div>')+'</div>';
}
function pNotifications(p, D){
  const act='<button class="act" data-act="ntf-read-all" aria-label="Mark all as read" title="Mark all as read">'+ic('check')+'</button>';
  if(!D) return {t:t('notifications'), html:mhead(t('notifications'),unread()?unread()+' unread':'',act)+'<div class="pad stack">'+ntfBody()+'</div>', side:'notifications'};
  const h='<div class="narrow stack"><div style="display:flex;justify-content:flex-end"><button class="pill" data-act="ntf-read-all">'+ic('check','sm')+'Mark all as read</button></div>'+ntfBody()+'</div>';
  return {t:t('notifications'), s:unread()?unread()+' unread':'You are all caught up', html:dpage(h), side:'notifications'};
}

/* ---------- help / about ---------- */
function helpBody(){
  const extra=[['1098','Child helpline','Children in distress'],['1930','Cyber crime helpline','Online fraud and cyber crime']];
  const FAQ=[
    ['What happens when I press SOS?','You get a 3-second window to cancel. After that, your location is shared and the nearest ambulance and police unit are alerted. You can track both live.'],
    ['Does City Shield replace 112?','No. City Shield works alongside 112 and the existing control rooms. 112 is always one tap away in the app.'],
    ['Who handles my complaint?','Each category is routed to the responsible agency — for example potholes and garbage go to '+CIVIC.long+' ('+CIVIC.short+'), traffic signals to Bengaluru Traffic Police.'],
    ['Is my location shared all the time?','Only while an emergency or a tracked request is active, and only if Share Live Location is on.'],
    ['Why do I see "Simulated" on maps?','This is a prototype. Responder positions and timings are simulated for demonstration.']
  ];
  return secH('Emergency helplines','<span class="demo-tag">Opens your dialer</span>')+'<div class="card">'+helplines()+extra.map(function(x){
      return '<button class="row" data-act="dial:'+x[0]+'"><span class="help-num">'+x[0]+'</span><div class="grow"><div class="t">'+esc(x[1])+'</div><div class="s">'+esc(x[2])+'</div></div>'+ic('phone','chev')+'</button>'; }).join('')+'</div>'+
    secH('Frequently asked')+'<div class="card">'+FAQ.map(function(f){ return '<details class="faq"><summary>'+esc(f[0])+ic('chev','sm')+'</summary><p>'+esc(f[1])+'</p></details>'; }).join('')+'</div>'+
    '<div class="card menu">'+menuRow('send','Send feedback','data-act="feedback"','Tell us what to improve')+'</div>';
}
function pHelp(p, D){
  if(!D) return {t:t('help'), html:mhead(t('help'))+'<div class="pad stack">'+helpBody()+'</div>', side:'profile'};
  return {t:t('help'), s:'Helplines and answers', html:dpage('<div class="narrow stack">'+helpBody()+'</div>'), side:'profile'};
}
function aboutBody(){
  const AG=[['police','Karnataka State Police','Law & order, Hoysala patrols, traffic'],['ambulance','Emergency ambulance (108)','Ambulance dispatch & hospitals'],
    ['fire','Karnataka State Fire & Emergency Services','Fire and rescue'],['civic',CIVIC.long+' ('+CIVIC.short+')','Roads, garbage, drains, street lights']];
  const F=[['timer','Faster response','One tap alerts the nearest units.'],['pin','Live tracking','See responders move towards you.'],['clock','Real-time updates','Every step is notified.'],
    ['clipboard','Easy reporting','Photo + location, routed automatically.'],['nodes','Connected services','One incident record shared by every agency.']];
  return '<div class="about-hero">'+logoSVG()+'<div><b>CITY SHIELD</b><span>'+esc(t('tagline'))+'</span></div></div>'+
    '<div class="card" style="padding:16px"><p class="muted" style="font-size:14px">City Shield brings emergency response and civic complaints for Bengaluru into one app — so citizens get help faster and agencies share one live picture of the city.</p>'+
    '<div class="steps" style="margin-top:16px">'+F.map(function(f){ return '<div class="step"><span class="n">'+ic(f[0],'sm')+'</span><div><b>'+esc(f[1])+'</b><p>'+esc(f[2])+'</p></div></div>'; }).join('')+'</div></div>'+
    secH('Built to connect')+'<div class="card">'+AG.map(function(a){ return '<div class="row"><span class="ib t-'+a[0]+'">'+ic(TILE_IC[a[0]])+'</span><div class="grow"><div class="t">'+esc(a[1])+'</div><div class="s">'+esc(a[2])+'</div></div></div>'; }).join('')+'</div>'+
    '<div class="notice">'+ic('info','sm')+'<span><b>Prototype.</b> Responder positions, officer details, camera feed and command-centre figures are simulated for demonstration. Integrations with agency systems are proposed, not live.</span></div>'+
    '<p class="faint" style="text-align:center;font-size:12px">Version 0.9 · Prototype · September 2026</p>';
}
function pAbout(p, D){
  if(!D) return {t:t('about'), html:mhead(t('about'))+'<div class="pad stack">'+aboutBody()+'</div>', side:'profile'};
  return {t:t('about'), s:t('tagline'), html:dpage('<div class="narrow stack">'+aboutBody()+'</div>'), side:'profile'};
}

/* ---------- command centre (government view, sample data) ---------- */
function pCommand(p, D){
  const open=INCIDENTS.filter(function(n){return n.st!=='Resolved';}).length;
  const K=[['alert','Active incidents',String(open),'Live across Koramangala zone',''],['timer','Avg. emergency response','7m 42s','18% faster than last month','up'],
    ['checkC','Complaints resolved today','126','of 171 received','up'],['users','Units on duty','312','Police · Ambulance · Fire · '+CIVIC.short,'']];
  const kpis='<div class="kpis">'+K.map(function(x){ return '<div class="card kpi"><div class="l">'+ic(x[0],'sm')+esc(x[1])+'</div><div class="v">'+esc(x[2])+'</div><div class="d'+(x[4]?' '+x[4]:'')+' faint">'+esc(x[3])+'</div></div>'; }).join('')+'</div>';
  const legend='<div class="legend"><span><i style="background:#E5383B"></i>Medical</span><span><i style="background:#2F5BD3"></i>Police</span><span><i style="background:#EA4A24"></i>Fire</span><span><i style="background:#149452"></i>'+esc(CIVIC.short)+' civic</span><span><i style="background:#1F5BE0"></i>Flooding</span><span><i style="background:#8793A8"></i>Resolved</span></div>';
  const map='<div class="card" style="overflow:hidden">'+mapHTML({sims:['cc1','cc2','cc3','cc4'], incidents:true, pill:false, cls:'cc-map', bbox:[-200,-240,1220,940], pad:{t:50,r:16,b:30,l:16}, aria:'City incident map', h:D?null:340})+legend+'</div>';
  const feed='<div class="card inc"><div class="card-h"><h2>Incident feed</h2><span class="map-live" style="position:static;box-shadow:none;background:var(--red-soft);color:var(--red)"><i></i>LIVE</span></div>'+
    INCIDENTS.map(function(n){
      const stc=n.st==='Resolved'?'green':(n.st==='Assigned'?'amber':'blue');
      return '<div class="row"><span class="ib round" style="width:34px;height:34px;background:'+n.color+'1F;color:'+n.color+'">'+ic('alert','sm')+'</span><div class="grow"><div class="t">'+esc(n.title)+'</div><div class="s">'+esc(n.place)+' · '+esc(n.id)+'</div>'+
        '<div class="tags">'+n.tags.map(function(g){ return '<span class="chip gray">'+esc(g)+'</span>'; }).join('')+'<span class="chip '+stc+'">'+esc(n.st)+'</span></div></div><span class="when faint" style="font-size:11.5px;white-space:nowrap">'+esc(n.ago)+'</span></div>';
    }).join('')+'</div>';
  const W=[['Koramangala',142],['HSR Layout',118],['BTM Layout',96],['Ejipura',71],['Jakkasandra',55],['Adugodi',43]];
  const wards='<div class="card wards" style="padding-bottom:12px"><div class="card-h"><h2>Complaints this week by area</h2></div>'+W.map(function(w){
      return '<div class="w"><span>'+esc(w[0])+'</span><div class="bar" style="margin:0"><i style="width:'+Math.round(w[1]/142*100)+'%;background:var(--blue)"></i></div><b>'+w[1]+'</b></div>'; }).join('')+'</div>';
  const note='<div class="notice">'+ic('info','sm')+'<span><b>Sample data.</b> This view shows how agencies would share one live picture of the city. Figures and incidents are illustrative.</span></div>';
  if(!D) return {t:'Command Centre', html:mhead('Command Centre','Government view · sample data')+'<div class="pad stack">'+note+kpis.replace('class="kpis"','class="kpis kpis-m"')+map+feed+wards+'</div>', side:'command'};
  const h=note+'<div style="height:18px"></div>'+kpis+'<div class="cc-grid"><div class="dcol">'+map+wards+'</div><div class="dcol">'+feed+'</div></div>';
  return {t:'Command Centre', s:'Government view · all agencies · sample data', html:dpage(h), side:'command'};
}

const PAGES={home:pHome, sos:pSos, service:pService, track:pTrack, complaints:pComplaints, complaint:pComplaint, report:pReport, mycomplaints:pMyComplaints,
  profile:pProfile, prefs:pPrefs, places:pPlaces, notifications:pNotifications, help:pHelp, about:pAbout, command:pCommand};

/* ================= sheets ================= */
function sheetWrap(title, body, wide){
  return '<div class="sheet'+(wide?' wide':'')+'" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="grab"></div><div class="sh"><h3>'+esc(title)+'</h3>'+
    '<button class="x" data-act="sheet-close" aria-label="Close">'+ic('x','sm')+'</button></div>'+body+'</div>';
}
function shHosp(){
  return sheetWrap(t('nearestHosp'), '<p class="muted" style="font-size:13px;margin:-6px 0 12px">Choose where the ambulance should take the patient.</p><div class="card hosp">'+HOSPITALS.map(hospRow).join('')+'</div>'+
    '<p class="faint" style="font-size:12px;margin-top:10px">Bed availability shown is sample data.</p>');
}
function shTrip(k){
  const d=SIMDEF[k];
  const rows=[['Unit',UNITS[k]],['Dispatched from',d.origin.name],['Destination',S.area],['Distance left','<span data-bind="km:'+k+'">'+esc(bindText('km',k))+'</span>'],
    [t('eta'),'<span data-bind="eta:'+k+'">'+esc(bindText('eta',k))+'</span>'],[t('arriving'),'<span data-bind="arr:'+k+'">'+esc(bindText('arr',k))+'</span>']];
  if(k==='ambulance') rows.splice(3,0,['Hospital',esc(hospName())]);
  return sheetWrap(d.vehicle+' · '+t('liveTracking'),
    '<div class="card" style="padding:4px 0">'+rows.map(function(r){ return '<div class="row"><div class="s" style="margin:0;flex:none;white-space:nowrap">'+esc(r[0])+'</div><b style="flex:1;min-width:0;text-align:right">'+(r[0]==='Unit'||r[0]==='Dispatched from'||r[0]==='Destination'?esc(r[1]):r[1])+'</b></div>'; }).join('')+'</div>'+
    '<div class="bar" style="margin:14px 2px 4px"><i data-bind="bar:'+k+'" style="background:'+d.color+';width:0"></i></div>'+
    '<div class="sheet-btns"><button class="btn soft" data-act="call:'+k+'">'+ic('phone')+'Call</button><button class="btn ghost" data-act="restart:'+k+'">'+ic('refresh')+'Replay demo</button></div>'+
    '<p class="faint" style="font-size:12px;margin-top:10px">Simulated trip · runs at demo speed.</p>');
}
function shLoc(){
  const pl=S.places.map(function(x){ const on=S.area===x.addr; return '<button class="row" data-act="set-area:'+x.id+'"><span class="ib t-blue">'+ic(x.icon)+'</span><div class="grow"><div class="t">'+esc(x.name)+'</div><div class="s">'+esc(x.addr)+'</div></div>'+(on?'<span class="chip green">Current</span>':'')+'</button>'; }).join('');
  return sheetWrap(t('yourLoc'), mapHTML({sims:[], live:false, h:200, aria:'Your location', pad:{t:40,r:20,b:20,l:20}})+
    '<div class="kv" style="margin-top:14px">'+ic('pin')+'<div><div class="v">'+esc(S.area)+'</div><div class="k" style="margin-top:2px">GPS accuracy ±12 m · simulated in this prototype</div></div></div>'+
    secH('Use a saved place')+'<div class="card">'+pl+'</div>');
}
function shLocAccess(){
  return sheetWrap(t('locAccess'), '<div class="okc" style="margin-bottom:14px"><span class="dot">'+ic('check','sm')+'</span><div><b>Allowed while using the app</b><span>Precise location is on</span></div></div>'+
    '<p class="muted" style="font-size:13.5px">City Shield uses your location only to send responders to you, show nearby hospitals and tag complaints. It is never shared with anyone else.</p>'+
    '<div class="sheet-btns"><button class="btn primary" data-act="sheet-close">Done</button></div>');
}
let PLACE_TYPE='frequent';
function shAddPlace(){
  PLACE_TYPE='frequent';
  const T=[['home','Home'],['work','Work'],['frequent','Frequent']];
  return sheetWrap(t('addLoc'), '<div class="stack"><div class="field"><label for="p-name">Name</label><input id="p-name" class="inp" maxlength="40" placeholder="e.g. Office, Gym, College"></div>'+
    '<div class="field"><label for="p-addr">Address</label><input id="p-addr" class="inp" maxlength="120" placeholder="e.g. HSR Layout Sector 2, Bengaluru"></div>'+
    '<div class="field"><span class="lbl">Type</span><div class="pick" id="p-type">'+T.map(function(x){ return '<button class="pill'+(x[0]===PLACE_TYPE?' on':'')+'" data-act="ptype:'+x[0]+'">'+esc(x[1])+'</button>'; }).join('')+'</div></div>'+
    '<p class="form-err" id="p-err" role="alert"></p><button class="btn navy" data-act="place-save">'+ic('check')+'Save location</button></div>');
}
function shPlace(id){
  const x=S.places.filter(function(q){return q.id===id;})[0]; if(!x) return '';
  return sheetWrap(x.name, '<div class="kv" style="margin-bottom:14px">'+ic('pin')+'<div><div class="v">'+esc(x.addr)+'</div><div class="k" style="margin-top:2px">'+esc({home:'Home',work:'Work',frequent:'Frequent place'}[x.type])+'</div></div></div>'+
    '<div class="card menu">'+menuRow('locate','Use as my current location','data-act="set-area:'+x.id+'"')+menuRow('send','Share this place','data-act="place-share:'+x.id+'"')+
    '<button class="row" data-act="place-del:'+x.id+'" style="color:var(--red)">'+ic('bin')+'<div class="grow"><div class="t" style="font-weight:600">Remove</div></div></button></div>');
}
function shProfile(){
  return sheetWrap('Edit profile', '<div class="stack"><div class="field"><label for="u-name">Full name</label><input id="u-name" class="inp" maxlength="40" value="'+esc(S.user.name)+'"></div>'+
    '<div class="field"><label for="u-phone">Mobile number</label><input id="u-phone" class="inp" inputmode="tel" maxlength="20" value="'+esc(S.user.phone)+'"></div>'+
    '<p class="form-err" id="u-err" role="alert"></p><button class="btn primary" data-act="profile-save">'+ic('check')+'Save</button></div>');
}
function shDial(num){
  const N={'112':'National emergency (Police · Fire · Ambulance)','100':'Police','101':'Fire','108':'Ambulance','1098':'Child helpline','1930':'Cyber crime helpline'};
  return sheetWrap('Call '+num+'?', '<p class="muted" style="font-size:14px">'+esc(N[num]||'Helpline')+'. This will place a <b>real phone call</b> from your device.</p>'+
    '<div class="sheet-btns"><a class="btn danger" href="tel:'+esc(num)+'" data-act="sheet-close-soft">'+ic('phone')+'Call '+esc(num)+'</a><button class="btn ghost" data-act="sheet-close">Cancel</button></div>');
}
function shCmpMap(id){
  const c=findC(id)||S.complaints[0], res=c.status==='resolved', sub=c.status==='submitted';
  const cfg={sims:res||sub?[]:['crew'], issue:{pt:ISSUE_PT, state:res?'resolved':'open'}, live:!res, aria:'Complaint location', h:DESK?null:320, pad:{t:60,r:30,b:30,l:30}};
  const st=res?'<span class="chip green">'+esc(t('resolved'))+'</span>':(sub?'<span class="chip amber">Awaiting assignment</span>':'<span class="chip blue" data-bind="lab:crew">'+esc(bindText('lab','crew'))+'</span>');
  return sheetWrap(c.title, mapHTML(cfg)+'<div class="kv" style="margin-top:14px">'+ic('pin')+'<div><div class="v">'+esc(c.loc)+'</div><div class="k" style="margin-top:4px">'+st+'</div></div></div>', true);
}
function shSvcMap(k){
  const d=SIMDEF[k];
  return sheetWrap(d.vehicle+' · '+t('liveTracking'), mapHTML({sims:[k], aria:d.vehicle+' live location', h:DESK?null:320})+
    '<div class="kv" style="margin-top:14px">'+ic('pin')+'<div><div class="v" data-bind="lab:'+k+'">'+esc(bindText('lab',k))+'</div><div class="k" style="margin-top:2px">'+esc(t('arriving'))+' <span data-bind="arr:'+k+'">'+esc(bindText('arr',k))+'</span></div></div></div>', true);
}
