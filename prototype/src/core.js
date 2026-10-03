/* ---------- icons (24x24 stroke) ---------- */
const IC = {
  home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  clipboard:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  track:'<circle cx="12" cy="6" r="3"/><path d="M12 9v4"/><path d="M8.5 14.5C5.2 15.1 3 16.4 3 18c0 2.2 4 4 9 4s9-1.8 9-4c0-1.6-2.2-2.9-5.5-3.5"/>',
  more:'<circle cx="12" cy="12" r="10"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
  phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  phoneOff:'<path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><path d="M22 2 2 22"/>',
  video:'<path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  nav:'<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
  police:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m12 7.5 1.2 2.5 2.7.3-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.3z"/>',
  ambulance:'<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M6 8v4M4 10h4"/>',
  fire:'<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  bin:'<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/>',
  back:'<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  chev:'<path d="m9 18 6-6-6-6"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  checkC:'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  help:'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  edit:'<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  brief:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  gym:'<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  heartHome:'<path d="M3 10.5 12 3l9 7.5V21H3z"/><path d="M12 17.5s-3.2-1.9-3.2-3.9a1.7 1.7 0 0 1 3.2-.8 1.7 1.7 0 0 1 3.2.8c0 2-3.2 3.9-3.2 3.9z"/>',
  signal:'<rect x="7" y="2" width="10" height="20" rx="4"/><circle cx="12" cy="7" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="17" r="1.6"/>',
  drop:'<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  bulb:'<path d="M9 18h6M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>',
  dots:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  car:'<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  hospital:'<path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16"/><path d="M2 21h20"/><path d="M12 7v6M9 10h6"/><path d="M10 21v-4h4v4"/>',
  truck:'<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  camera:'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  globe:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  activity:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  grid:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  external:'<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  timer:'<path d="M10 2h4"/><path d="m12 14 3-3"/><circle cx="12" cy="14" r="8"/>',
  siren:'<path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1z"/><path d="M21 12h1M18.5 4.5 18 5M2 12h1M12 2v1M4.93 4.93l.71.71"/>',
  mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
  micOff:'<path d="m2 2 20 20"/><path d="M18.89 13.23A7 7 0 0 0 19 12v-2M5 10v2a7 7 0 0 0 12 5M15 9.34V5a3 3 0 0 0-5.68-1.33M9 9v3a3 3 0 0 0 5.12 2.12M12 19v3"/>',
  speaker:'<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  flip:'<path d="M20 7h-9M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  send:'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  layers:'<path d="m12 2 10 5-10 5L2 7l10-5z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>',
  locate:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  minus:'<path d="M5 12h14"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  alert:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  building:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  shieldCheck:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>'
};
function ic(name, cls){ return '<svg class="ic'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" aria-hidden="true">'+(IC[name]||'')+'</svg>'; }

/* ---------- escaping ---------- */
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

/* ---------- civic body (BBMP was replaced by GBA on 2 Sept 2025) ---------- */
const CIVIC = { short:'GBA', long:'Greater Bengaluru Authority' };

/* ---------- i18n ---------- */
const LANGS = [
  {code:'en', name:'English', native:'English'},
  {code:'kn', name:'Kannada', native:'ಕನ್ನಡ'},
  {code:'hi', name:'Hindi', native:'हिंदी'},
  {code:'ta', name:'Tamil', native:'தமிழ்'},
  {code:'te', name:'Telugu', native:'తెలుగు'}
];
const T = {
  en:{home:'Home',complaints:'Complaints',track:'Track',more:'More',police:'Police',ambulance:'Ambulance',fire:'Fire',civic:CIVIC.short,
    oneTap:'One Tap Emergency',gm:'Good Morning,',ga:'Good Afternoon,',ge:'Good Evening,',sosTitle:'Emergency SOS',tapCall:'Tap to call for immediate help',
    yourLoc:'Your Location',shareLive:'Share Live Location',shareLiveSub:'Helps responders reach you faster',liveTracking:'Live Tracking',
    nearestHosp:'Nearest Hospitals',viewAll:'View All',callAmb:'Call Ambulance',available:'Available',reportC:'Report a Complaint',myC:'My Complaints',
    appLang:'App Language',notifications:'Notifications',saved:'Saved Locations',help:'Help & Support',about:'About City Shield',settings:'Settings',profile:'Profile',
    eta:'ETA',arriving:'Arriving',officer:'Officer Details',callOfficer:'Call Officer',videoCall:'Video Call',shareLoc:'Share Location',liveFeed:'Live Feed',
    fireStation:'Fire Station',contactFire:'Contact Fire Station',svcDetails:'Service Details',cDetails:'Complaint Details',trackMap:'Track on Map',
    status:'Status',location:'Location',inProgress:'In Progress',resolved:'Resolved',addLoc:'Add New Location',emAlerts:'Emergency Alerts',svcUpdates:'Service Updates',
    cUpdates:'Complaint Updates',locAccess:'Location Access',tagline:'Safer Cities. Stronger Communities.',svc_police:'Police Service',svc_ambulance:'Ambulance Service',
    svc_fire:'Fire Service',svc_civic:CIVIC.short+' Service',langPrefs:'Language & Preferences'},
  kn:{home:'ಮುಖಪುಟ',complaints:'ದೂರುಗಳು',track:'ಟ್ರ್ಯಾಕ್',more:'ಇನ್ನಷ್ಟು',police:'ಪೊಲೀಸ್',ambulance:'ಆಂಬ್ಯುಲೆನ್ಸ್',fire:'ಅಗ್ನಿಶಾಮಕ',civic:'ಜಿಬಿಎ',
    oneTap:'ಒಂದೇ ಟ್ಯಾಪ್‌ನಲ್ಲಿ ತುರ್ತು ಸಹಾಯ',gm:'ಶುಭೋದಯ,',ga:'ಶುಭ ಮಧ್ಯಾಹ್ನ,',ge:'ಶುಭ ಸಂಜೆ,',sosTitle:'ತುರ್ತು SOS',tapCall:'ತಕ್ಷಣದ ಸಹಾಯಕ್ಕಾಗಿ ಟ್ಯಾಪ್ ಮಾಡಿ',
    yourLoc:'ನಿಮ್ಮ ಸ್ಥಳ',shareLive:'ಲೈವ್ ಸ್ಥಳ ಹಂಚಿಕೊಳ್ಳಿ',shareLiveSub:'ಸಹಾಯಕರು ನಿಮ್ಮನ್ನು ಬೇಗ ತಲುಪಲು ನೆರವಾಗುತ್ತದೆ',liveTracking:'ಲೈವ್ ಟ್ರ್ಯಾಕಿಂಗ್',
    nearestHosp:'ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗಳು',viewAll:'ಎಲ್ಲವನ್ನೂ ನೋಡಿ',callAmb:'ಆಂಬ್ಯುಲೆನ್ಸ್‌ಗೆ ಕರೆ ಮಾಡಿ',available:'ಲಭ್ಯವಿದೆ',reportC:'ದೂರು ನೀಡಿ',myC:'ನನ್ನ ದೂರುಗಳು',
    appLang:'ಅಪ್ಲಿಕೇಶನ್ ಭಾಷೆ',notifications:'ಅಧಿಸೂಚನೆಗಳು',saved:'ಉಳಿಸಿದ ಸ್ಥಳಗಳು',help:'ಸಹಾಯ ಮತ್ತು ಬೆಂಬಲ',about:'ಸಿಟಿ ಶೀಲ್ಡ್ ಬಗ್ಗೆ',settings:'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',profile:'ಪ್ರೊಫೈಲ್',
    arriving:'ಆಗಮನ',officer:'ಅಧಿಕಾರಿಯ ವಿವರಗಳು',callOfficer:'ಅಧಿಕಾರಿಗೆ ಕರೆ',videoCall:'ವೀಡಿಯೊ ಕರೆ',shareLoc:'ಸ್ಥಳ ಹಂಚಿಕೊಳ್ಳಿ',liveFeed:'ಲೈವ್ ದೃಶ್ಯ',
    fireStation:'ಅಗ್ನಿಶಾಮಕ ಠಾಣೆ',contactFire:'ಅಗ್ನಿಶಾಮಕ ಠಾಣೆ ಸಂಪರ್ಕಿಸಿ',svcDetails:'ಸೇವೆಯ ವಿವರಗಳು',cDetails:'ದೂರಿನ ವಿವರಗಳು',trackMap:'ನಕ್ಷೆಯಲ್ಲಿ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ',
    status:'ಸ್ಥಿತಿ',location:'ಸ್ಥಳ',inProgress:'ಪ್ರಗತಿಯಲ್ಲಿದೆ',resolved:'ಪರಿಹರಿಸಲಾಗಿದೆ',addLoc:'ಹೊಸ ಸ್ಥಳ ಸೇರಿಸಿ',emAlerts:'ತುರ್ತು ಎಚ್ಚರಿಕೆಗಳು',svcUpdates:'ಸೇವಾ ಅಪ್‌ಡೇಟ್‌ಗಳು',
    cUpdates:'ದೂರು ಅಪ್‌ಡೇಟ್‌ಗಳು',locAccess:'ಸ್ಥಳ ಪ್ರವೇಶ',tagline:'ಸುರಕ್ಷಿತ ನಗರಗಳು. ಬಲಿಷ್ಠ ಸಮುದಾಯಗಳು.',svc_police:'ಪೊಲೀಸ್ ಸೇವೆ',svc_ambulance:'ಆಂಬ್ಯುಲೆನ್ಸ್ ಸೇವೆ',
    svc_fire:'ಅಗ್ನಿಶಾಮಕ ಸೇವೆ',svc_civic:'ಜಿಬಿಎ ಸೇವೆ',langPrefs:'ಭಾಷೆ ಮತ್ತು ಆದ್ಯತೆಗಳು'},
  hi:{home:'होम',complaints:'शिकायतें',track:'ट्रैक',more:'और',police:'पुलिस',ambulance:'एम्बुलेंस',fire:'अग्निशमन',civic:'जीबीए',
    oneTap:'एक टैप में आपातकालीन सहायता',gm:'सुप्रभात,',ga:'शुभ दोपहर,',ge:'शुभ संध्या,',sosTitle:'आपातकालीन SOS',tapCall:'तुरंत मदद के लिए टैप करें',
    yourLoc:'आपका स्थान',shareLive:'लाइव लोकेशन साझा करें',shareLiveSub:'सहायता दल को आप तक जल्दी पहुँचने में मदद करता है',liveTracking:'लाइव ट्रैकिंग',
    nearestHosp:'नज़दीकी अस्पताल',viewAll:'सभी देखें',callAmb:'एम्बुलेंस को कॉल करें',available:'उपलब्ध',reportC:'शिकायत दर्ज करें',myC:'मेरी शिकायतें',
    appLang:'ऐप की भाषा',notifications:'सूचनाएँ',saved:'सहेजे गए स्थान',help:'सहायता और समर्थन',about:'सिटी शील्ड के बारे में',settings:'सेटिंग्स',profile:'प्रोफ़ाइल',
    arriving:'पहुँचने का समय',officer:'अधिकारी का विवरण',callOfficer:'अधिकारी को कॉल करें',videoCall:'वीडियो कॉल',shareLoc:'लोकेशन साझा करें',liveFeed:'लाइव फ़ीड',
    fireStation:'फायर स्टेशन',contactFire:'फायर स्टेशन से संपर्क करें',svcDetails:'सेवा विवरण',cDetails:'शिकायत का विवरण',trackMap:'मैप पर ट्रैक करें',
    status:'स्थिति',location:'स्थान',inProgress:'प्रगति पर',resolved:'हल हो गई',addLoc:'नया स्थान जोड़ें',emAlerts:'आपातकालीन अलर्ट',svcUpdates:'सेवा अपडेट',
    cUpdates:'शिकायत अपडेट',locAccess:'लोकेशन एक्सेस',tagline:'सुरक्षित शहर. मज़बूत समुदाय.',svc_police:'पुलिस सेवा',svc_ambulance:'एम्बुलेंस सेवा',
    svc_fire:'अग्निशमन सेवा',svc_civic:'जीबीए सेवा',langPrefs:'भाषा और प्राथमिकताएँ'},
  ta:{home:'முகப்பு',complaints:'புகார்கள்',track:'கண்காணிப்பு',more:'மேலும்',police:'காவல்துறை',ambulance:'ஆம்புலன்ஸ்',fire:'தீயணைப்பு',civic:'ஜிபிஏ',
    oneTap:'ஒரே தட்டில் அவசர உதவி',gm:'காலை வணக்கம்,',ga:'மதிய வணக்கம்,',ge:'மாலை வணக்கம்,',sosTitle:'அவசர SOS',tapCall:'உடனடி உதவிக்கு தட்டவும்',
    yourLoc:'உங்கள் இருப்பிடம்',shareLive:'நேரடி இருப்பிடத்தைப் பகிரவும்',shareLiveSub:'உதவியாளர்கள் உங்களை விரைவில் அடைய உதவும்',liveTracking:'நேரடி கண்காணிப்பு',
    nearestHosp:'அருகிலுள்ள மருத்துவமனைகள்',viewAll:'அனைத்தும் காண்க',callAmb:'ஆம்புலன்ஸை அழைக்கவும்',available:'கிடைக்கிறது',reportC:'புகார் அளிக்கவும்',myC:'எனது புகார்கள்',
    appLang:'செயலி மொழி',notifications:'அறிவிப்புகள்',saved:'சேமித்த இடங்கள்',help:'உதவி & ஆதரவு',about:'சிட்டி ஷீல்ட் பற்றி',settings:'அமைப்புகள்',profile:'சுயவிவரம்',
    arriving:'வருகை',officer:'அதிகாரி விவரங்கள்',callOfficer:'அதிகாரியை அழைக்கவும்',videoCall:'வீடியோ அழைப்பு',shareLoc:'இருப்பிடத்தைப் பகிர்',liveFeed:'நேரடி காட்சி',
    fireStation:'தீயணைப்பு நிலையம்',contactFire:'தீயணைப்பு நிலையத்தைத் தொடர்புகொள்ளவும்',svcDetails:'சேவை விவரங்கள்',cDetails:'புகார் விவரங்கள்',trackMap:'வரைபடத்தில் கண்காணிக்கவும்',
    status:'நிலை',location:'இடம்',inProgress:'நடைபெறுகிறது',resolved:'தீர்க்கப்பட்டது',addLoc:'புதிய இடத்தைச் சேர்க்கவும்',emAlerts:'அவசர எச்சரிக்கைகள்',svcUpdates:'சேவை புதுப்பிப்புகள்',
    cUpdates:'புகார் புதுப்பிப்புகள்',locAccess:'இருப்பிட அணுகல்',tagline:'பாதுகாப்பான நகரங்கள். வலுவான சமூகங்கள்.',svc_police:'காவல் சேவை',svc_ambulance:'ஆம்புலன்ஸ் சேவை',
    svc_fire:'தீயணைப்பு சேவை',svc_civic:'ஜிபிஏ சேவை',langPrefs:'மொழி & விருப்பங்கள்'},
  te:{home:'హోమ్',complaints:'ఫిర్యాదులు',track:'ట్రాక్',more:'మరిన్ని',police:'పోలీస్',ambulance:'అంబులెన్స్',fire:'అగ్నిమాపక',civic:'జీబీఏ',
    oneTap:'ఒక్క ట్యాప్‌తో అత్యవసర సహాయం',gm:'శుభోదయం,',ga:'శుభ మధ్యాహ్నం,',ge:'శుభ సాయంత్రం,',sosTitle:'అత్యవసర SOS',tapCall:'తక్షణ సహాయం కోసం ట్యాప్ చేయండి',
    yourLoc:'మీ స్థానం',shareLive:'లైవ్ లొకేషన్ షేర్ చేయండి',shareLiveSub:'సహాయకులు మిమ్మల్ని త్వరగా చేరుకోవడానికి సహాయపడుతుంది',liveTracking:'లైవ్ ట్రాకింగ్',
    nearestHosp:'సమీప ఆసుపత్రులు',viewAll:'అన్నీ చూడండి',callAmb:'అంబులెన్స్‌కు కాల్ చేయండి',available:'అందుబాటులో ఉంది',reportC:'ఫిర్యాదు చేయండి',myC:'నా ఫిర్యాదులు',
    appLang:'యాప్ భాష',notifications:'నోటిఫికేషన్లు',saved:'సేవ్ చేసిన స్థలాలు',help:'సహాయం & మద్దతు',about:'సిటీ షీల్డ్ గురించి',settings:'సెట్టింగ్‌లు',profile:'ప్రొఫైల్',
    arriving:'చేరుకునే సమయం',officer:'అధికారి వివరాలు',callOfficer:'అధికారికి కాల్ చేయండి',videoCall:'వీడియో కాల్',shareLoc:'లొకేషన్ షేర్ చేయండి',liveFeed:'లైవ్ ఫీడ్',
    fireStation:'అగ్నిమాపక కేంద్రం',contactFire:'అగ్నిమాపక కేంద్రాన్ని సంప్రదించండి',svcDetails:'సేవా వివరాలు',cDetails:'ఫిర్యాదు వివరాలు',trackMap:'మ్యాప్‌లో ట్రాక్ చేయండి',
    status:'స్థితి',location:'స్థానం',inProgress:'పురోగతిలో ఉంది',resolved:'పరిష్కరించబడింది',addLoc:'కొత్త స్థలాన్ని జోడించండి',emAlerts:'అత్యవసర హెచ్చరికలు',svcUpdates:'సేవా అప్‌డేట్‌లు',
    cUpdates:'ఫిర్యాదు అప్‌డేట్‌లు',locAccess:'లొకేషన్ యాక్సెస్',tagline:'సురక్షిత నగరాలు. బలమైన సమాజాలు.',svc_police:'పోలీస్ సేవ',svc_ambulance:'అంబులెన్స్ సేవ',
    svc_fire:'అగ్నిమాపక సేవ',svc_civic:'జీబీఏ సేవ',langPrefs:'భాష & ప్రాధాన్యతలు'}
};
function t(k){ const L=T[S.lang]||T.en; return (L[k]!=null?L[k]:(T.en[k]!=null?T.en[k]:k)); }

/* ---------- services ---------- */
const SVC = {
  ambulance:{key:'ambulance', icon:'ambulance', color:'#E5383B', pill:'#0F2250', vehicle:'Ambulance', km:2.4, eta:8, dur:95,
    route:[[120,90],[250,90],[250,180],[520,180],[520,350],[650,350]], origin:{name:'Ambulance base', icon:'hospital'},
    label:function(km){return 'Ambulance '+km+' km away';}, arrived:'Ambulance has arrived'},
  police:{key:'police', icon:'car', color:'#2F5BD3', pill:'#2F5BD3', vehicle:'Police', km:1.2, eta:5, dur:70,
    route:[[900,90],[900,270],[780,270],[780,350],[650,350]], origin:{name:'Koramangala Police Station', icon:'police'},
    label:function(km){return 'Police is '+km+' km away';}, arrived:'Police has arrived'},
  fire:{key:'fire', icon:'truck', color:'#E5383B', pill:'#E5383B', vehicle:'Fire Truck', km:3.1, eta:11, dur:115,
    route:[[120,630],[250,630],[250,450],[520,450],[520,350],[650,350]], origin:{name:'Jayanagar Fire Station', icon:'fire'},
    label:function(km){return 'Fire Truck '+km+' km away';}, arrived:'Fire truck has arrived'},
  civic:{key:'civic', icon:'truck', color:'#149452', pill:'#149452', vehicle:'Garbage Van', km:1.5, eta:5, dur:80,
    route:[[900,540],[780,540],[780,450],[650,450],[650,350]], origin:{name:CIVIC.short+' Ward Depot', icon:'bin'},
    label:function(km){return 'Garbage Van '+km+' km away';}, arrived:'Garbage van has reached your area'}
};
const USER_PT = [650,350];

/* ---------- complaint categories ---------- */
const CATS = [
  {key:'pothole', icon:'car', title:'Pothole', sub:'Road Issue', tone:'t-blue', agency:CIVIC.short+' Roads'},
  {key:'signal', icon:'signal', title:'Traffic Signal', sub:'Not Working', tone:'t-ambulance', agency:'Bengaluru Traffic Police'},
  {key:'water', icon:'drop', title:'Water Logging', sub:'Flooding', tone:'t-blue', agency:CIVIC.short+' Storm Water Drains'},
  {key:'light', icon:'bulb', title:'Street Light', sub:'Not Working', tone:'t-gray', agency:CIVIC.short+' Electrical'},
  {key:'civic', icon:'bin', title:CIVIC.short+' Issue', sub:'Garbage / Cleanliness', tone:'t-civic', agency:CIVIC.short+' Solid Waste'},
  {key:'other', icon:'dots', title:'Other', sub:'General', tone:'t-gray', agency:'City Shield Desk'}
];
function catOf(k){ for(var i=0;i<CATS.length;i++){ if(CATS[i].key===k) return CATS[i]; } return CATS[5]; }

const HOSPITALS = [
  {id:'manipal', name:'Manipal Hospital', km:1.2, min:12, avail:'Available'},
  {id:'fortis', name:'Fortis Hospital', km:3.8, min:18, avail:'Available'},
  {id:'columbia', name:'Columbia Asia', km:5.6, min:25, avail:'Available'},
  {id:'stjohns', name:"St. John's Medical College Hospital", km:4.1, min:16, avail:'Limited beds'},
  {id:'sakra', name:'Sakra World Hospital', km:6.4, min:24, avail:'Available'}
];

function seedState(){
  return {
    complaints:[
      {id:'CS-2041', cat:'pothole', title:'Pothole on 80 Feet Road', loc:'Koramangala 5th Block, Bengaluru', status:'progress', when:'Today, 9:12 AM',
        desc:'Deep pothole near the signal. Two-wheelers are swerving into the next lane to avoid it.', photo:null, art:'pothole',
        tl:[{t:'Complaint Submitted', s:'Today, 9:12 AM', st:'done'},{t:'Assigned to '+CIVIC.short, s:'Today, 10:05 AM', st:'done'},{t:'Work in Progress', s:'Expected by Tomorrow, 10:00 AM', st:'cur'}]},
      {id:'CS-2033', cat:'signal', title:'Traffic Signal Issue', loc:'Sony World Junction, Koramangala', status:'resolved', when:'Yesterday, 6:40 PM',
        desc:'Signal stuck on red for all directions during evening peak.', photo:null, art:'street',
        tl:[{t:'Complaint Submitted', s:'Yesterday, 6:40 PM', st:'done'},{t:'Assigned to Traffic Police', s:'Yesterday, 6:52 PM', st:'done'},{t:'Resolved', s:'Yesterday, 8:15 PM', st:'done'}]},
      {id:'CS-2029', cat:'civic', title:'Garbage Collection', loc:'Zone 3, Koramangala', status:'progress', when:'Yesterday, 4:20 PM',
        desc:'Garbage not collected on 6th Cross for two days.', photo:null,
        tl:[{t:'Complaint Submitted', s:'Yesterday, 4:20 PM', st:'done'},{t:'Assigned to '+CIVIC.short, s:'Yesterday, 5:02 PM', st:'done'},{t:'Pickup scheduled', s:'Today, garbage van on the way', st:'cur'}]}
    ],
    notifications:[
      {id:'n1', kind:'emergency', svc:'ambulance', icon:'ambulance', title:'Ambulance Assigned', body:'Ambulance is on the way to your location', when:'10:12 AM', read:false},
      {id:'n2', kind:'emergency', svc:'police', icon:'police', title:'Police Updated', body:'Route cleared. You can proceed safely.', when:'09:48 AM', read:false},
      {id:'n3', kind:'service', svc:'civic', icon:'bin', title:CIVIC.short+' Notification', body:'Garbage van is 1.5 km away from your area', when:'09:32 AM', read:false},
      {id:'n4', kind:'complaint', svc:'amber', icon:'clipboard', title:'Complaint Update', body:'Your pothole complaint is now in progress.', when:'08:14 AM', read:true},
      {id:'n5', kind:'emergency', svc:'fire', icon:'fire', title:'Fire Service Alert', body:'Fire truck is en route to the location.', when:'07:50 AM', read:true}
    ],
    places:[
      {id:'p1', name:'Home', addr:'Koramangala 5th Block, Bengaluru', type:'home', icon:'home'},
      {id:'p2', name:'Work', addr:'Indiranagar, Bengaluru', type:'work', icon:'brief'},
      {id:'p3', name:'Gym', addr:'Indiranagar, Bengaluru', type:'frequent', icon:'gym'},
      {id:'p4', name:'Parents Home', addr:'RR Nagar, Bengaluru', type:'frequent', icon:'heartHome'}
    ]
  };
}

/* ---------- global state ---------- */
const S = {
  route:{name:'home', p:{}}, stack:[], lang:'en', theme:'light',
  prefs:{emergency:true, service:true, complaint:true}, shareLive:true,
  user:{name:'Shreyas Jayanna', first:'Shreyas', phone:'+91 90087 76208', city:'Bengaluru, Karnataka'},
  area:'Koramangala 5th Block, Bengaluru',
  hospital:'manipal', ntfFilter:'all', placeTab:'home', cSel:null, sims:{}, nextId:2042
};
(function(){ const d=seedState(); S.complaints=d.complaints; S.notifications=d.notifications; S.places=d.places; })();
try{ const th=localStorage.getItem('cs-theme'); if(th==='light'||th==='dark'||th==='system') S.theme=th; }catch{}

function initials(n){ return String(n||'').trim().split(/\s+/).slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase(); }
function fmtTime2(d){ const s=fmtTime(d); return s.length<8?'0'+s:s; }
function fmtTime(d){ let h=d.getHours(), m=d.getMinutes(); const ap=h>=12?'PM':'AM'; h=h%12||12; return h+':'+(m<10?'0':'')+m+' '+ap; }
function greet(){ const h=new Date().getHours(); return h<12?t('gm'):(h<17?t('ga'):t('ge')); }
function unread(){ let n=0; S.notifications.forEach(function(x){ if(!x.read) n++; }); return n; }
function statusChip(st){
  if(st==='resolved') return '<span class="chip green">'+esc(t('resolved'))+'</span>';
  if(st==='progress') return '<span class="chip blue">'+esc(t('inProgress'))+'</span>';
  if(st==='assigned') return '<span class="chip blue">Assigned</span>';
  return '<span class="chip amber">Submitted</span>';
}
