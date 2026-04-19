// ===== GLOBAL STATE ===== //
let currentStadiumId = 'modi';
let map;
let mapCircles = {};
let userMarker = null;
let heatMarkers = [];
let localDensity = 0;
let aiWarningInterval = null;

const stadiums = {
  'modi': {
    center: [23.0917, 72.5975],
    gates: {
      a: { name: 'North Gate', coords: [23.0930, 72.5975] },
      b: { name: 'South Gate', coords: [23.0900, 72.5975] },
      c: { name: 'East Gate', coords: [23.0917, 72.6000] },
    }
  },
  'wankhede': {
    center: [18.9388, 72.8258],
    gates: {
      a: { name: 'Vinoo Mankad Gate', coords: [18.9395, 72.8258] },
      b: { name: 'Garware Pavilion Gate', coords: [18.9380, 72.8258] },
      c: { name: 'University Pavilion Gate', coords: [18.9388, 72.8270] },
    }
  }
};

// ===== LOGIN LOGIC ===== //
document.getElementById('login-btn').addEventListener('click', () => {
  const ticketId = document.getElementById('ticket-input').value.trim().toUpperCase();
  const errorMsg = document.getElementById('login-error');
  
  if (ticketId.startsWith('MODI-')) {
    currentStadiumId = 'modi';
  } else if (ticketId.startsWith('WANK-')) {
    currentStadiumId = 'wankhede';
  } else {
    errorMsg.style.display = 'block';
    return;
  }
  
  document.getElementById('login-overlay').style.opacity = '0';
  setTimeout(() => document.getElementById('login-overlay').style.display = 'none', 500);
  
  initMap();
  loadInitialState();
  startGPSTracking();
});

// ===== FRONTEND RENDERING CLIENT ===== //
function renderContext(ctxText) {
  document.getElementById('weather-phase-badge').innerHTML = ctxText;
}

function getZoneColor(level) {
  if (level === 'High') return '#dc2626'; 
  if (level === 'Medium') return '#d97706';
  return '#059669'; 
}

function initMap() {
  if (map) {
    map.remove();
    mapCircles = {};
  }
  
  const std = stadiums[currentStadiumId];
  map = L.map('venue-map', { zoomControl: false, attributionControl: false }).setView(std.center, 16);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

  for (const id of ['a', 'b', 'c']) {
    mapCircles[id] = L.circle(std.gates[id].coords, {
      color: getZoneColor('Low'),
      fillColor: getZoneColor('Low'),
      fillOpacity: 0.6,
      radius: 40
    }).addTo(map);
    
    mapCircles[id].bindTooltip(std.gates[id].name, {
      permanent: true, direction: "center", className: "map-label"
    });
  }
}

function updateMap(stateMap) {
  if (!map) return;
  for (const id of ['a', 'b', 'c']) {
    if(!stateMap[id]) continue;
    const state = stateMap[id];
    const circle = mapCircles[id];
    const color = getZoneColor(state.level);
    const dynamicRadius = 25 + (state.density * 1.5);
    
    circle.setStyle({ fillColor: color, color: color });
    circle.setRadius(dynamicRadius);
  }
}

function renderFeed(decisions, afterState) {
  const responseArea = document.getElementById('ai-response-area');
  const alertCard = document.getElementById('primary-alert');
  const alertReason = document.getElementById('alert-reason');
  const planList = document.getElementById('simple-actions-list');
  const resultSummary = document.getElementById('result-summary');
  
  responseArea.style.display = 'block';
  document.getElementById('simulate-btn').setAttribute('aria-expanded', 'true');
  document.querySelector('.simple-instruction').style.display = 'none';
  planList.innerHTML = '';

  let highestRisk = 'SAFE';
  let primaryAlertText = '';
  
  decisions.forEach(d => {
    if (d.risk === 'HIGH') {
      highestRisk = 'HIGH'; primaryAlertText = d.prediction;
    } else if (d.risk === 'MODERATE' && highestRisk !== 'HIGH') {
      highestRisk = 'MODERATE'; primaryAlertText = d.prediction;
    }
    if (d.risk !== 'SAFE') {
      d.actions.forEach(action => {
        const li = document.createElement('li');
        li.innerHTML = `&bull; ${action.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}`;
        planList.appendChild(li);
      });
    }
  });

  if (highestRisk === 'SAFE') {
     const safeLi = document.createElement('li');
     safeLi.innerHTML = `&bull; Keep monitoring standard checkpoints.`;
     planList.appendChild(safeLi);
  }

  if (highestRisk === 'HIGH') {
    alertCard.style.display = 'block'; alertCard.className = 'alert-card danger';
    alertCard.style.background = 'var(--danger-bg)'; alertCard.style.borderColor = 'var(--danger)';
    alertCard.style.color = '#7f1d1d'; alertCard.querySelector('h3').innerText = 'Danger: Overcrowding Detected!';
    alertReason.innerText = primaryAlertText;
  } else if (highestRisk === 'MODERATE') {
    alertCard.style.display = 'block'; alertCard.className = 'alert-card warning';
    alertCard.style.background = 'var(--warning-bg)'; alertCard.style.borderColor = 'var(--warning)';
    alertCard.style.color = '#b45309'; alertCard.querySelector('h3').innerText = 'Careful: Getting Busy';
    alertReason.innerText = primaryAlertText;
  } else {
    alertCard.style.display = 'block'; alertCard.className = 'alert-card safe';
    alertCard.style.background = 'var(--safe-bg)'; alertCard.style.borderColor = 'var(--safe)';
    alertCard.style.color = '#14532d'; alertCard.querySelector('h3').innerText = 'All Clear';
    alertReason.innerText = 'Stadium levels look totally fine right now.';
  }

  let allSafe = true;
  for (const id of ['a', 'b', 'c']) {
    if (afterState[id] && afterState[id].level !== 'Low') allSafe = false;
  }
  resultSummary.innerText = allSafe ? `Everything will run smoothly!` : `Major crowding will drop significantly, keeping everyone safe.`;
}

// ===== BACKEND TRIGGER ===== //
async function loadInitialState() {
  try {
    const res = await fetch(`/api/state?stadium_id=${currentStadiumId}`);
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
    const res = await fetch(`/api/simulate?stadium_id=${currentStadiumId}`);
    const data = await res.json();
    renderContext(data.context);
    updateMap(data.before);
    setTimeout(() => {
      renderFeed(data.decisions, data.after);
      btn.innerHTML = 'Fixing Situation...';
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

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('simulate-btn').addEventListener('click', triggerSimulation);
});

// ===== AGENTIC AI CHAT WIDGET ===== //
const chatToggleBtn = document.getElementById('chat-toggle-btn');
const closeChatBtn = document.getElementById('close-chat-btn');
const chatWindow = document.getElementById('chat-window');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');
const chatMessages = document.getElementById('chat-messages');

function toggleChat() {
  const isExpanded = chatToggleBtn.getAttribute('aria-expanded') === 'true';
  if (isExpanded) {
    chatWindow.classList.remove('active');
    chatWindow.setAttribute('aria-hidden', 'true');
    chatToggleBtn.setAttribute('aria-expanded', 'false');
  } else {
    chatWindow.classList.add('active');
    chatWindow.setAttribute('aria-hidden', 'false');
    chatToggleBtn.setAttribute('aria-expanded', 'true');
    chatInput.focus();
  }
}

chatToggleBtn.addEventListener('click', toggleChat);
closeChatBtn.addEventListener('click', toggleChat);

async function sendMessage(queryText, isSystemWarning = false) {
  const query = queryText || chatInput.value.trim();
  if (!query && !isSystemWarning) return;

  if (!isSystemWarning) {
    const userDiv = document.createElement('div');
    userDiv.className = 'message user';
    userDiv.innerText = query;
    chatMessages.appendChild(userDiv);
    chatInput.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message bot loading';
  loadingDiv.innerText = 'Thinking...';
  chatMessages.appendChild(loadingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const userLoc = userMarker ? userMarker.getLatLng() : null;
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: query, 
        stadium_id: currentStadiumId,
        user_location: userLoc ? `${userLoc.lat},${userLoc.lng}` : null,
        nearby_density: localDensity.toString()
      })
    });
    
    const data = await response.json();
    loadingDiv.remove();

    if (response.ok && data.reply) {
      if (isSystemWarning) {
        if (!chatWindow.classList.contains('active')) toggleChat();
      }
      const botDiv = document.createElement('div');
      botDiv.className = 'message bot';
      botDiv.innerText = data.reply;
      if (isSystemWarning) botDiv.style.borderLeft = "4px solid var(--danger)";
      chatMessages.appendChild(botDiv);
    } else if (!isSystemWarning) {
      throw new Error(data.error || 'Server error');
    }
  } catch (error) {
    loadingDiv.remove();
    if (!isSystemWarning) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'message bot';
      errorDiv.innerText = 'Oops! I am having trouble connecting right now.';
      chatMessages.appendChild(errorDiv);
    }
  }
  
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendChatBtn.addEventListener('click', () => sendMessage());
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

// ===== GPS TRACKING & PROXIMITY ===== //
function startGPSTracking() {
  if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition(
      (position) => {
        // HACKATHON OFFSET: Map user's real GPS into the stadium bounds
        // Usually longitudes and latitudes are just scaled. We will simply add a small random walk to the stadium center for demo purposes.
        const std = stadiums[currentStadiumId];
        
        // Simulating the user moving around the stadium center based on real GPS updates
        const latOffset = (Math.random() - 0.5) * 0.005;
        const lngOffset = (Math.random() - 0.5) * 0.005;
        const simLat = std.center[0] + latOffset;
        const simLng = std.center[1] + lngOffset;
        
        updateUserLocation(simLat, simLng);
      },
      (error) => {
        console.warn("GPS Denied or Error, simulating location...", error);
        simulateWandering(); // Fallback to wandering if denied
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
  } else {
    simulateWandering();
  }
  
  // Start polling Agent for warnings every 15s
  if(aiWarningInterval) clearInterval(aiWarningInterval);
  aiWarningInterval = setInterval(() => {
    if (localDensity > 70) {
       sendMessage('', true); // Trigger system warning without user query
    }
  }, 15000);
}

function simulateWandering() {
  const std = stadiums[currentStadiumId];
  setInterval(() => {
    const latOffset = (Math.random() - 0.5) * 0.005;
    const lngOffset = (Math.random() - 0.5) * 0.005;
    updateUserLocation(std.center[0] + latOffset, std.center[1] + lngOffset);
  }, 3000);
}

function updateUserLocation(lat, lng) {
  if (!map) return;
  
  const std = stadiums[currentStadiumId];
  
  if (!userMarker) {
    const icon = L.divIcon({
      className: 'user-gps-marker',
      html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);"></div>',
      iconSize: [16, 16]
    });
    userMarker = L.marker([lat, lng], {icon: icon}).addTo(map);
    userMarker.bindTooltip("You Are Here", { permanent: true, direction: "top", className: "map-label" });
  } else {
    userMarker.setLatLng([lat, lng]);
  }
  
  // Calculate proximity to gates to simulate crowd
  let maxProximity = 0;
  for (const id of ['a', 'b', 'c']) {
    const gateCoords = std.gates[id].coords;
    // Calculate simple euclidean distance
    const dist = Math.sqrt(Math.pow(lat - gateCoords[0], 2) + Math.pow(lng - gateCoords[1], 2));
    if (dist < 0.002) {
      maxProximity = Math.max(maxProximity, 100 - (dist * 50000));
    }
  }
  
  localDensity = Math.min(100, Math.max(0, Math.floor(maxProximity + (Math.random() * 20))));
  simulateCrowdHeat(lat, lng, localDensity);
}

function simulateCrowdHeat(lat, lng, density) {
  heatMarkers.forEach(m => map.removeLayer(m));
  heatMarkers = [];
  
  const numDots = Math.floor(density / 5);
  for (let i = 0; i < numDots; i++) {
    const randLat = lat + (Math.random() - 0.5) * 0.001;
    const randLng = lng + (Math.random() - 0.5) * 0.001;
    
    const dot = L.circle([randLat, randLng], {
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.8,
      radius: 2 + Math.random() * 3
    }).addTo(map);
    heatMarkers.push(dot);
  }
}
