// ===== VENUE CONFIGURATION ===== //
const STADIUM_CENTER = [51.556020, -0.279610];
const gateCoords = {
  a: { name: 'North Gate', coords: [51.55734, -0.27964] },
  b: { name: 'South Gate', coords: [51.55462, -0.27958] },
  c: { name: 'East Gate', coords: [51.55610, -0.27645] },
};

let map;
let mapCircles = {};

// ===== FRONTEND RENDERING CLIENT ===== //

// Update the badge header
function renderContext(ctxText) {
  document.getElementById('weather-phase-badge').innerHTML = ctxText;
}

// Color logic for SVG Map
function getZoneColor(level) {
  if (level === 'High') return '#dc2626'; // var(--danger)
  if (level === 'Medium') return '#d97706'; // var(--warning)
  return '#059669'; // var(--safe)
}

// Initialize Leaflet Map
function initMap() {
  // Dark/Carto styled free map tiles
  map = L.map('venue-map', {
    zoomControl: false,
    attributionControl: false
  }).setView(STADIUM_CENTER, 16);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(map);

  // Init map circles for gates
  for (const id of ['a', 'b', 'c']) {
    mapCircles[id] = L.circle(gateCoords[id].coords, {
      color: getZoneColor('Low'),
      fillColor: getZoneColor('Low'),
      fillOpacity: 0.6,
      radius: 40
    }).addTo(map);
    
    // Add textual Tooltips
    mapCircles[id].bindTooltip(gateCoords[id].name, {
      permanent: true, 
      direction: "center",
      className: "map-label"
    });
  }
}

// Update the Leaflet map zones based on backend data
function updateMap(stateMap) {
  if (!map) return;
  for (const id of ['a', 'b', 'c']) {
    const state = stateMap[id];
    const circle = mapCircles[id];
    const color = getZoneColor(state.level);
    
    const dynamicRadius = 25 + (state.density * 1.5);
    
    circle.setStyle({
      fillColor: color,
      color: color
    });
    circle.setRadius(dynamicRadius);
  }
}

// Render the simple Action Feed
function renderFeed(decisions, afterState) {
  const responseArea = document.getElementById('ai-response-area');
  const alertCard = document.getElementById('primary-alert');
  const alertReason = document.getElementById('alert-reason');
  const planList = document.getElementById('simple-actions-list');
  const resultSummary = document.getElementById('result-summary');
  
  responseArea.style.display = 'block';
  document.querySelector('.simple-instruction').style.display = 'none';
  planList.innerHTML = '';

  let highestRisk = 'SAFE';
  let primaryAlertText = '';
  
  // Find highest risk issue
  decisions.forEach(d => {
    if (d.risk === 'HIGH') {
      highestRisk = 'HIGH';
      primaryAlertText = d.prediction;
    } else if (d.risk === 'MODERATE' && highestRisk !== 'HIGH') {
      highestRisk = 'MODERATE';
      primaryAlertText = d.prediction;
    }
    
    // Add targeted actions to checklist based on risk
    if (d.risk !== 'SAFE') {
      d.actions.forEach(action => {
        const li = document.createElement('li');
        li.innerHTML = `&bull; ${action.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}`;
        planList.appendChild(li);
      });
    }
  });

  // Provide a safe fallback if no danger found
  if (highestRisk === 'SAFE') {
     const safeLi = document.createElement('li');
     safeLi.innerHTML = `&bull; Keep monitoring standard checkpoints.`;
     planList.appendChild(safeLi);
  }

  // Set the big alert card at the top
  if (highestRisk === 'HIGH') {
    alertCard.style.display = 'block';
    alertCard.className = 'alert-card danger';
    alertCard.style.background = 'var(--danger-bg)';
    alertCard.style.borderColor = 'var(--danger)';
    alertCard.style.color = '#7f1d1d';
    alertCard.querySelector('h3').innerText = 'Danger: Overcrowding Detected!';
    alertReason.innerText = primaryAlertText;
  } else if (highestRisk === 'MODERATE') {
    alertCard.style.display = 'block';
    alertCard.className = 'alert-card warning';
    alertCard.style.background = 'var(--warning-bg)';
    alertCard.style.borderColor = 'var(--warning)';
    alertCard.style.color = '#b45309';
    alertCard.querySelector('h3').innerText = 'Careful: Getting Busy';
    alertReason.innerText = primaryAlertText;
  } else {
    alertCard.style.display = 'block';
    alertCard.className = 'alert-card safe';
    alertCard.style.background = 'var(--safe-bg)';
    alertCard.style.borderColor = 'var(--safe)';
    alertCard.style.color = '#14532d';
    alertCard.querySelector('h3').innerText = 'All Clear';
    alertReason.innerText = 'Stadium levels look totally fine right now.';
  }

  // Set result card
  let allSafe = true;
  for (const id of ['a', 'b', 'c']) {
    if (afterState[id].level !== 'Low') allSafe = false;
  }

  if (allSafe) {
    resultSummary.innerText = `Everything will run smoothly!`;
  } else {
    resultSummary.innerText = `Major crowding will drop significantly, keeping everyone safe.`;
  }
}

// ===== BACKEND TRIGGER ===== //

async function loadInitialState() {
  try {
    const res = await fetch('/api/state');
    const data = await res.json();
    renderContext(data.context);
    updateMap(data.state);
  } catch (err) { console.error("Error loading state:", err); }
}

async function triggerSimulation() {
  const btn = document.getElementById('simulate-btn');
  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = 'Scanning Stadium...';

  try {
    const res = await fetch('/api/simulate');
    const data = await res.json();

    // 1. Instantly update map to BEFORE state to show issues
    renderContext(data.context);
    updateMap(data.before);

    // 2. Wait 800ms for dramatic effect, then show the plan
    setTimeout(() => {
      renderFeed(data.decisions, data.after);
      btn.innerHTML = 'Fixing Situation...';
      
      // 3. Wait another 1.5 seconds, then magically update the map to SAFE
      setTimeout(() => {
        updateMap(data.after);
        btn.disabled = false;
        btn.innerHTML = 'Scan Complete! Run Again?';
      }, 1500);

    }, 800);

  } catch (err) {
    console.error("Simulation failed:", err);
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ===== INIT ===== //
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadInitialState();
  document.getElementById('simulate-btn').addEventListener('click', triggerSimulation);
});
