/* ================= Weather icon library (custom SVGs, not emoji) ================= */
function iconFor(code, size=48){
  const s = size;
  const stroke = 'stroke="#eef2f8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  if(code === 0)
    return `<svg viewBox="0 0 48 48" width="${s}" height="${s}"><circle cx="24" cy="24" r="9" fill="#ffd166" class="sun-spin"/><g ${stroke.replace('#eef2f8','#ffd166')}>
      <line x1="24" y1="4" x2="24" y2="9"/><line x1="24" y1="39" x2="24" y2="44"/>
      <line x1="4" y1="24" x2="9" y2="24"/><line x1="39" y1="24" x2="44" y2="24"/>
      <line x1="9.5" y1="9.5" x2="13" y2="13"/><line x1="35" y1="35" x2="38.5" y2="38.5"/>
      <line x1="38.5" y1="9.5" x2="35" y2="13"/><line x1="13" y1="35" x2="9.5" y2="38.5"/>
      </g></svg>`;
  if(code === 1 || code === 2)
    return `<svg viewBox="0 0 48 48" width="${s}" height="${s}"><circle cx="18" cy="18" r="7" fill="#ffd166"/><path d="M14 30a8 8 0 0 1 1-16 10 10 0 0 1 19 3 7 7 0 0 1-2 13H14Z" fill="#dbe4f0" opacity="0.9"/></svg>`;
  if(code === 3)
    return `<svg viewBox="0 0 48 48" width="${s}" height="${s}"><path d="M12 32a9 9 0 0 1 1.2-17.9A11 11 0 0 1 34 12a8 8 0 0 1-1 20H12Z" fill="#c3cede"/></svg>`;
  if([45,48].includes(code))
    return `<svg viewBox="0 0 48 48" width="${s}" height="${s}"><path d="M12 20a9 9 0 0 1 1.2-13.9A11 11 0 0 1 34 10a8 8 0 0 1-1 14H12Z" fill="#aab6c8"/><line x1="8" y1="30" x2="40" y2="30" ${stroke} opacity="0.6"/><line x1="8" y1="36" x2="40" y2="36" ${stroke} opacity="0.6"/></svg>`;
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))
    return `<svg viewBox="0 0 48 48" width="${s}" height="${s}"><path d="M12 24a9 9 0 0 1 1.2-13.9A11 11 0 0 1 34 12a8 8 0 0 1-1 18H12Z" fill="#c3cede"/>
      <g stroke="#4ddcff" stroke-width="2" stroke-linecap="round" class="rain-drop"><line x1="16" y1="34" x2="14" y2="41"/><line x1="24" y1="34" x2="22" y2="41"/><line x1="32" y1="34" x2="30" y2="41"/></g></svg>`;
  if([71,73,75,77,85,86].includes(code))
    return `<svg viewBox="0 0 48 48" width="${s}" height="${s}"><path d="M12 24a9 9 0 0 1 1.2-13.9A11 11 0 0 1 34 12a8 8 0 0 1-1 18H12Z" fill="#c3cede"/>
      <g fill="#eef2f8" class="rain-drop"><circle cx="16" cy="37" r="1.6"/><circle cx="24" cy="40" r="1.6"/><circle cx="32" cy="37" r="1.6"/></g></svg>`;
  if([95,96,99].includes(code))
    return `<svg viewBox="0 0 48 48" width="${s}" height="${s}"><path d="M12 22a9 9 0 0 1 1.2-13.9A11 11 0 0 1 34 10a8 8 0 0 1-1 16H12Z" fill="#8f9db6"/><polygon points="25,26 18,36 23,36 20,44 30,32 25,32" fill="#ffd166"/></svg>`;
  return `<svg viewBox="0 0 48 48" width="${s}" height="${s}"><circle cx="24" cy="24" r="10" fill="#c3cede"/></svg>`;
}

function descFor(code){
  const map = {
    0:'Clear sky', 1:'Mostly clear', 2:'Partly cloudy', 3:'Overcast',
    45:'Foggy', 48:'Icy fog',
    51:'Light drizzle', 53:'Drizzle', 55:'Dense drizzle',
    56:'Freezing drizzle', 57:'Freezing drizzle',
    61:'Light rain', 63:'Rain', 65:'Heavy rain',
    66:'Freezing rain', 67:'Freezing rain',
    71:'Light snow', 73:'Snow', 75:'Heavy snow', 77:'Snow grains',
    80:'Light showers', 81:'Showers', 82:'Violent showers',
    85:'Snow showers', 86:'Heavy snow showers',
    95:'Thunderstorm', 96:'Thunderstorm + hail', 99:'Severe thunderstorm'
  };
  return map[code] || 'Unsettled weather';
}

/* ================= DOM refs ================= */
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const suggestionsBox = document.getElementById('suggestions');
const loadingMsg = document.getElementById('loadingMsg');
const errorMsg = document.getElementById('errorMsg');
const emptyMsg = document.getElementById('emptyMsg');
const heroCard = document.getElementById('heroCard');
const cBtn = document.getElementById('cBtn');
const fBtn = document.getElementById('fBtn');

let debounceTimer = null;
let activeIndex = -1;
let lastData = null;      // cached forecast payload, kept for unit toggle re-render
let lastMeta = null;      // { name, region }
let unit = 'C';

/* ================= Suggestions positioning (fixes the earlier stacking bug) =================
   The dropdown lives at the end of <body> with position:fixed, so it always
   paints above the weather card no matter what stacking context that card
   creates. We just have to keep its coordinates synced to the input. */
function positionSuggestions(){
  const rect = cityInput.getBoundingClientRect();
  suggestionsBox.style.left = rect.left + 'px';
  suggestionsBox.style.top = (rect.bottom + 8) + 'px';
  suggestionsBox.style.width = rect.width + 'px';
}

function openSuggestions(){
  positionSuggestions();
  suggestionsBox.classList.add('show');
  cityInput.setAttribute('aria-expanded', 'true');
}

function closeSuggestions(){
  suggestionsBox.classList.remove('show');
  cityInput.setAttribute('aria-expanded', 'false');
  activeIndex = -1;
}

window.addEventListener('resize', () => { if(suggestionsBox.classList.contains('show')) positionSuggestions(); });
window.addEventListener('scroll', () => { if(suggestionsBox.classList.contains('show')) positionSuggestions(); }, true);

/* ================= Geocoding: search-as-you-type ================= */
cityInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const q = cityInput.value.trim();
  if(q.length < 2){ closeSuggestions(); return; }
  debounceTimer = setTimeout(() => fetchSuggestions(q), 300);
});

async function fetchSuggestions(q){
  try{
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
    const data = await res.json();
    const results = data.results || [];
    if(results.length === 0){ closeSuggestions(); return; }
    suggestionsBox.innerHTML = results.map(r => {
      const region = [r.admin1, r.country].filter(Boolean).join(', ');
      return `<div class="suggestion-item" data-lat="${r.latitude}" data-lon="${r.longitude}" data-name="${r.name}" data-region="${region}">
        <span>${r.name}</span><span>${region}</span>
      </div>`;
    }).join('');
    openSuggestions();
  }catch(e){ closeSuggestions(); }
}

suggestionsBox.addEventListener('click', (e) => {
  const item = e.target.closest('.suggestion-item');
  if(!item) return;
  const {lat, lon, name, region} = item.dataset;
  cityInput.value = name;
  closeSuggestions();
  loadWeather(parseFloat(lat), parseFloat(lon), name, region);
});

document.addEventListener('click', (e) => {
  if(!e.target.closest('.search-row') && !e.target.closest('#suggestions')) closeSuggestions();
});

/* keyboard navigation for the dropdown */
cityInput.addEventListener('keydown', (e) => {
  const items = Array.from(suggestionsBox.querySelectorAll('.suggestion-item'));
  if(e.key === 'Enter'){
    if(suggestionsBox.classList.contains('show') && activeIndex >= 0 && items[activeIndex]){
      items[activeIndex].click();
    }else{
      searchCity();
    }
    return;
  }
  if(!suggestionsBox.classList.contains('show') || items.length === 0) return;
  if(e.key === 'ArrowDown'){ e.preventDefault(); activeIndex = (activeIndex + 1) % items.length; }
  else if(e.key === 'ArrowUp'){ e.preventDefault(); activeIndex = (activeIndex - 1 + items.length) % items.length; }
  else if(e.key === 'Escape'){ closeSuggestions(); return; }
  else return;
  items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
  items[activeIndex].scrollIntoView({ block:'nearest' });
});

/* ================= Search button ================= */
searchBtn.addEventListener('click', () => searchCity());

async function searchCity(){
  const q = cityInput.value.trim();
  if(!q) return;
  closeSuggestions();
  setState('loading');
  try{
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`);
    const data = await res.json();
    if(!data.results || data.results.length === 0){ setState('error'); return; }
    const r = data.results[0];
    const region = [r.admin1, r.country].filter(Boolean).join(', ');
    loadWeather(r.latitude, r.longitude, r.name, region);
  }catch(e){ setState('error'); }
}

function setState(state){
  loadingMsg.classList.remove('show');
  errorMsg.classList.remove('show');
  emptyMsg.classList.remove('show');
  heroCard.classList.remove('show');
  if(state === 'loading') loadingMsg.classList.add('show');
  if(state === 'error') errorMsg.classList.add('show');
  if(state === 'empty') emptyMsg.classList.add('show');
  if(state === 'result') heroCard.classList.add('show');
}

/* ================= Fetch + render weather ================= */
async function loadWeather(lat, lon, name, region){
  setState('loading');
  try{
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&hourly=temperature_2m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=auto&forecast_days=7`;
    const res = await fetch(url);
    const data = await res.json();
    lastData = data;
    lastMeta = { name, region };
    renderWeather();
    setState('result');
  }catch(e){
    setState('error');
  }
}

function toF(c){ return c * 9/5 + 32; }
function fmtTemp(c){ return Math.round(unit === 'C' ? c : toF(c)); }

function renderWeather(){
  if(!lastData) return;
  const data = lastData;
  const { name, region } = lastMeta;
  const cur = data.current;
  const code = cur.weather_code;

  document.getElementById('hLocation').textContent = region || 'Current location';
  document.getElementById('hCity').textContent = name;
  document.getElementById('hDate').textContent = new Date().toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });
  document.getElementById('hTemp').textContent = fmtTemp(cur.temperature_2m);
  document.getElementById('hUnit').textContent = unit === 'C' ? '°C' : '°F';
  document.getElementById('hDesc').textContent = descFor(code);
  document.getElementById('hFeels').textContent = fmtTemp(cur.apparent_temperature) + '°';
  document.getElementById('hHumidity').textContent = Math.round(cur.relative_humidity_2m) + '%';
  document.getElementById('hWind').textContent = Math.round(cur.wind_speed_10m) + ' km/h';
  document.getElementById('hIcon').innerHTML = iconFor(code, 170);

  const nowISO = data.current.time;
  const idx = data.hourly.time.findIndex(t => t >= nowISO);
  const startIdx = idx === -1 ? 0 : idx;
  const hourlyHtml = [];
  for(let i = startIdx; i < startIdx + 24 && i < data.hourly.time.length; i++){
    const t = new Date(data.hourly.time[i]);
    const label = i === startIdx ? 'Now' : t.toLocaleTimeString(undefined, { hour:'numeric' });
    hourlyHtml.push(`<div class="hour-card">
      <div class="h-time">${label}</div>
      ${iconFor(data.hourly.weather_code[i], 28)}
      <div class="h-temp">${fmtTemp(data.hourly.temperature_2m[i])}°</div>
    </div>`);
  }
  document.getElementById('hourlyScroll').innerHTML = hourlyHtml.join('');

  // Each forecast day is a Bootstrap .row so the columns reflow at the
  // `sm` breakpoint (rain % hides, name/temps columns narrow) instead of
  // relying on a fixed CSS grid template that only worked on wide screens.
  const dailyHtml = data.daily.time.map((dateStr, i) => {
    const d = new Date(dateStr + 'T12:00:00');
    const dayName = i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday:'short' });
    const dCode = data.daily.weather_code[i];
    const max = fmtTemp(data.daily.temperature_2m_max[i]);
    const min = fmtTemp(data.daily.temperature_2m_min[i]);
    const rain = data.daily.precipitation_probability_max[i];
    return `<div class="day-row row align-items-center g-2 mx-0">
      <div class="col-3 col-sm-2 d-name">${dayName}</div>
      <div class="col-6 col-sm-6 d-weather">${iconFor(dCode, 26)}<span class="d-desc">${descFor(dCode)}</span></div>
      <div class="col-sm-2 d-none d-sm-block d-rain text-end">${rain != null ? rain + '%' : ''}</div>
      <div class="col-3 col-sm-2 d-temps text-end">${max}°<span>${min}°</span></div>
    </div>`;
  }).join('');
  document.getElementById('dailyList').innerHTML = dailyHtml;
}

cBtn.addEventListener('click', () => {
  if(unit === 'C') return;
  unit = 'C';
  cBtn.classList.add('active'); fBtn.classList.remove('active');
  renderWeather();
});
fBtn.addEventListener('click', () => {
  if(unit === 'F') return;
  unit = 'F';
  fBtn.classList.add('active'); cBtn.classList.remove('active');
  renderWeather();
});

setState('empty');
