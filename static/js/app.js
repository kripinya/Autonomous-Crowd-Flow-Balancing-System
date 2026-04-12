// ===== FRONTEND RENDERING CLIENT ===== //

// Update the badge header
function renderContext(ctxText) {
  document.getElementById('weather-phase-badge').innerHTML = ctxText;
}

// Color logic for SVG Map
function getZoneColor(level) {
  if (level === 'High') return 'var(--danger)';
  if (level === 'Medium') return 'var(--warning)';
  return 'var(--safe)';
}

// Update the SVG zones based on backend data
function updateMap(stateMap) {
  for (const id of ['a', 'b', 'c']) {
    const state = stateMap[id];
    const circle = document.getElementById(`circle-${id}`);
    if (circle) {
      circle.style.fill = getZoneColor(state.level);
      
      // Pulse if dangerous
      if (state.level === 'High') {
        circle.style.animation = 'pulse 1s infinite alternate';
      } else {
        circle.style.animation = 'none';
      }
    }
  }
}

// Add a quick pulse animation dynamically for danger state
if (!document.getElementById('pulse-style')) {
  const style = document.createElement('style');
  style.id = 'pulse-style';
  style.innerHTML = `
    @keyframes pulse {
      0% { transform: scale(1); fill-opacity: 1; }
      100% { transform: scale(1.3); fill-opacity: 0.6; }
    }
  `;
  document.head.appendChild(style);
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
      primaryAlertText = d.prediction; // Contains the friendly explanation
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
    alertCard.style.color = '#991b1b';
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
    alertCard.style.color = '#166534';
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
  loadInitialState();
  document.getElementById('simulate-btn').addEventListener('click', triggerSimulation);
});
