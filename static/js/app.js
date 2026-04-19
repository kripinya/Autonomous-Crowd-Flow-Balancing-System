// ===== VENUE CONFIGURATION ===== //
const STADIUM_CENTER = [23.0917, 72.5975]; // Narendra Modi Stadium, Ahmedabad
const gateCoords = {
  a: { name: 'North Gate', coords: [23.0930, 72.5975] },
  b: { name: 'South Gate', coords: [23.0900, 72.5975] },
  c: { name: 'East Gate', coords: [23.0917, 72.6000] },
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
  document.getElementById('simulate-btn').setAttribute('aria-expanded', 'true');
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

async function sendMessage() {
  const query = chatInput.value.trim();
  if (!query) return;

  // Append user message
  const userDiv = document.createElement('div');
  userDiv.className = 'message user';
  userDiv.innerText = query;
  chatMessages.appendChild(userDiv);
  chatInput.value = '';
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Append loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message bot loading';
  loadingDiv.innerText = 'Thinking...';
  chatMessages.appendChild(loadingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query })
    });
    
    const data = await response.json();
    loadingDiv.remove();

    if (response.ok && data.reply) {
      const botDiv = document.createElement('div');
      botDiv.className = 'message bot';
      botDiv.innerText = data.reply;
      chatMessages.appendChild(botDiv);
    } else {
      throw new Error(data.error || 'Server error');
    }
  } catch (error) {
    loadingDiv.remove();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message bot';
    errorDiv.innerText = 'Oops! I am having trouble connecting to the network right now.';
    chatMessages.appendChild(errorDiv);
    console.error("Chat Error:", error);
  }
  
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendChatBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});
