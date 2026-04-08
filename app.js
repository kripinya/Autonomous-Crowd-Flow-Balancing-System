/**
 * Autonomous Crowd Flow Balancing Assistant
 * ------------------------------------------
 * Rule-based AI Decision Engine with feedback loop.
 * Simulates the effect of applying AI actions and
 * shows a Before vs After comparison.
 */

// ===== CONFIGURATION =====
const CONGESTION_THRESHOLD = 3;

// ===== GATE STATE =====
const gates = {
  a: { name: 'Gate A', density: 28, inflow: 15, outflow: 18, queue: 12, streak: 0 },
  b: { name: 'Gate B', density: 55, inflow: 40, outflow: 32, queue: 47, streak: 0 },
  c: { name: 'Gate C', density: 87, inflow: 70, outflow: 45, queue: 134, streak: 0 },
};

// ===== HELPERS =====
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// ===== RISK CLASSIFICATION =====

function getDensityLevel(density) {
  if (density >= 75) return 'High';
  if (density >= 45) return 'Medium';
  return 'Low';
}

/**
 * Rules:
 *   High density AND inflow > outflow  → HIGH
 *   Medium density                     → MODERATE
 *   Low density                        → SAFE
 */
function classifyRisk(gate) {
  const level = getDensityLevel(gate.density);
  if (level === 'High' && gate.inflow > gate.outflow) return 'HIGH';
  if (level === 'High')   return 'MODERATE';
  if (level === 'Medium') return 'MODERATE';
  return 'SAFE';
}

// ===== CONGESTION STREAK =====

function updateCongestionStreak(gate) {
  if (gate.inflow > gate.outflow) {
    gate.streak += 1;
  } else {
    gate.streak = Math.max(0, gate.streak - 1);
  }
}

function isCongestionRisk(gate) {
  return gate.streak >= CONGESTION_THRESHOLD;
}

// ===== DECISION ENGINE =====

function evaluateGate(gate, allGates) {
  const risk  = classifyRisk(gate);
  const net   = gate.inflow - gate.outflow;
  const name  = gate.name;

  const decision = { risk, alert: null, prediction: null, actions: [] };

  const others  = Object.values(allGates).filter(g => g.name !== name);
  const safest  = others.reduce((a, b) => a.density < b.density ? a : b);
  const redirectPct = clamp(Math.round(Math.abs(net) * 0.6), 10, 60);

  if (risk === 'HIGH') {
    decision.alert = `🔴 ${name} at ${gate.density}% density, net inflow +${net}/min — HIGH RISK`;
    decision.prediction = isCongestionRisk(gate)
      ? `${name} likely congested in 2–5 min (streak: ${gate.streak} cycles)`
      : `${name} approaching danger — congestion in ~8 min`;
    decision.actions = [
      `Redirect ${redirectPct}% of crowd from ${name} → ${safest.name}`,
      `Open additional entry lane at ${safest.name}`,
      `Temporarily slow inflow at ${name}`,
      `Deploy emergency staff to ${name}`,
    ];
  } else if (risk === 'MODERATE') {
    decision.alert = `🟡 ${name} at ${gate.density}% density — MODERATE RISK`;
    if (gate.inflow > gate.outflow) {
      decision.prediction = `${name} may escalate in ~15 min (net: +${net}/min)`;
      decision.actions = [
        `Pre-position barriers at ${name}`,
        `Redirect ${redirectPct}% of crowd to ${safest.name}`,
        `Announce ${safest.name} as alternative entry`,
      ];
    } else {
      decision.prediction = `${name} holding steady — outflow managing load`;
      decision.actions = [
        `Continue monitoring ${name}`,
        `Keep ${safest.name} on standby for overflow`,
      ];
    }
  } else {
    decision.alert = `🟢 ${name} at ${gate.density}% density — SAFE`;
    decision.prediction = `${name} stable for 30+ minutes`;
    decision.actions = [
      `${name} can absorb redirected traffic`,
    ];
  }

  return decision;
}

function runDecisionEngine() {
  const decisions = [];
  for (const id of ['a', 'b', 'c']) {
    decisions.push({ id, ...evaluateGate(gates[id], gates) });
  }
  return decisions;
}

// ===== FEEDBACK LOOP =====

/**
 * Captures a snapshot of all gate states.
 */
function captureSnapshot() {
  const snap = {};
  for (const id of ['a', 'b', 'c']) {
    snap[id] = {
      density: gates[id].density,
      inflow:  gates[id].inflow,
      outflow: gates[id].outflow,
      queue:   gates[id].queue,
      level:   getDensityLevel(gates[id].density),
      risk:    classifyRisk(gates[id]),
    };
  }
  return snap;
}

/**
 * Applies the effect of AI actions to improve gate conditions.
 * - HIGH risk gates: reduce density 20-35%, balance flow
 * - MODERATE risk gates: reduce density 10-20%, slight rebalance
 * - SAFE gates: may absorb small increase from redirects
 */
function applyActions(decisions) {
  const highGates = decisions.filter(d => d.risk === 'HIGH');
  const safeGates = decisions.filter(d => d.risk === 'SAFE');

  decisions.forEach(d => {
    const gate = gates[d.id];

    if (d.risk === 'HIGH') {
      // Significant reduction from redirecting + slowing inflow
      const reduction = rand(20, 35);
      gate.density = clamp(gate.density - reduction, 5, 100);
      gate.inflow  = clamp(gate.inflow - rand(15, 30), 5, 90);
      gate.outflow = clamp(gate.outflow + rand(5, 15), 5, 90);
      gate.queue   = clamp(Math.round(gate.density * 1.5) + rand(-5, 5), 0, 250);
      gate.streak  = Math.max(0, gate.streak - 2);

    } else if (d.risk === 'MODERATE') {
      // Moderate improvement from pre-positioning + announcements
      const reduction = rand(10, 20);
      gate.density = clamp(gate.density - reduction, 5, 100);
      gate.inflow  = clamp(gate.inflow - rand(5, 15), 5, 90);
      gate.outflow = clamp(gate.outflow + rand(3, 8), 5, 90);
      gate.queue   = clamp(Math.round(gate.density * 1.5) + rand(-5, 5), 0, 250);
      gate.streak  = Math.max(0, gate.streak - 1);

    } else {
      // Safe gates absorb some redirected traffic
      if (highGates.length > 0) {
        const increase = rand(5, 12);
        gate.density = clamp(gate.density + increase, 0, 100);
        gate.inflow  = clamp(gate.inflow + rand(5, 10), 5, 90);
        gate.queue   = clamp(Math.round(gate.density * 1.5) + rand(-5, 5), 0, 250);
      }
    }
  });
}

// ===== SIMULATION =====

function simulateGate(gate) {
  gate.inflow  = rand(5, 90);
  gate.outflow = rand(5, 90);

  const netFlow = gate.inflow - gate.outflow;
  gate.density  = clamp(gate.density + Math.round(netFlow * 0.3), 0, 100);
  gate.queue    = clamp(Math.round(gate.density * 1.5) + rand(-8, 8), 0, 250);

  updateCongestionStreak(gate);
}

function simulate() {
  // 1. Simulate new raw data
  simulateGate(gates.a);
  simulateGate(gates.b);
  simulateGate(gates.c);

  // 2. Capture BEFORE snapshot
  const before = captureSnapshot();

  // 3. Render gate cards (before state)
  renderGate('a', gates.a);
  renderGate('b', gates.b);
  renderGate('c', gates.c);

  // 4. Run decision engine
  const decisions = runDecisionEngine();
  renderDecisions(decisions);

  // 5. Apply feedback — simulate effect of actions
  applyActions(decisions);

  // 6. Capture AFTER snapshot
  const after = captureSnapshot();

  // 7. Render before vs after comparison
  renderComparison(before, after);

  // 8. Update venue map
  renderMap();
}

// ===== RENDERING — GATE CARDS =====

function renderGate(id, gate) {
  const level = getDensityLevel(gate.density).toLowerCase();

  const badge = document.getElementById(`gate-${id}-badge`);
  badge.textContent = getDensityLevel(gate.density);
  badge.className = `gate-card__badge badge--${level}`;

  const bar = document.getElementById(`gate-${id}-bar`);
  bar.style.width = gate.density + '%';
  bar.className = `bar-fill bar-fill--${level}`;

  document.getElementById(`gate-${id}-queue`).textContent = gate.queue;
  document.getElementById(`gate-${id}-inflow`).textContent = gate.inflow;
  document.getElementById(`gate-${id}-outflow`).textContent = gate.outflow;

  const flag = document.getElementById(`gate-${id}-risk`);
  if (isCongestionRisk(gate)) {
    flag.textContent = '⚠ Congestion Risk';
    flag.className = 'risk-flag risk-flag--active';
  } else {
    flag.textContent = '✓ Normal';
    flag.className = 'risk-flag risk-flag--ok';
  }
}

// ===== RENDERING — AI DECISION PANEL =====

function renderDecisions(decisions) {
  const alertsUl      = document.getElementById('alerts-list');
  const predictionsUl = document.getElementById('predictions-list');
  const actionsUl     = document.getElementById('actions-list');

  alertsUl.innerHTML      = '';
  predictionsUl.innerHTML = '';
  actionsUl.innerHTML     = '';

  decisions.forEach(d => {
    const alertClass = d.risk === 'HIGH' ? 'ai-list__item--danger'
                     : d.risk === 'MODERATE' ? 'ai-list__item--warn'
                     : 'ai-list__item--safe';
    appendLi(alertsUl, d.alert, `ai-list__item ${alertClass}`);
    appendLi(predictionsUl, d.prediction, 'ai-list__item');
    d.actions.forEach(action => {
      appendLi(actionsUl, action, 'ai-list__item ai-list__item--action');
    });
  });
}

// ===== RENDERING — BEFORE vs AFTER =====

function renderComparison(before, after) {
  const container = document.getElementById('comparison-body');
  container.innerHTML = '';

  for (const id of ['a', 'b', 'c']) {
    const b = before[id];
    const a = after[id];

    const improved = a.density < b.density;
    const delta    = b.density - a.density;
    const arrow    = improved ? '↓' : (delta === 0 ? '→' : '↑');
    const changeClass = improved ? 'improved' : (delta === 0 ? 'unchanged' : 'worsened');

    const row = document.createElement('div');
    row.className = 'compare-row';
    row.innerHTML = `
      <div class="compare-gate">${gates[id].name}</div>
      <div class="compare-cell compare-before">
        <span class="compare-badge compare-badge--${b.level.toLowerCase()}">${b.level}</span>
        <span class="compare-val">${b.density}%</span>
      </div>
      <div class="compare-arrow compare-arrow--${changeClass}">${arrow}</div>
      <div class="compare-cell compare-after">
        <span class="compare-badge compare-badge--${a.level.toLowerCase()}">${a.level}</span>
        <span class="compare-val">${a.density}%</span>
      </div>
      <div class="compare-delta compare-delta--${changeClass}">
        ${improved ? `−${delta}%` : delta === 0 ? '0%' : `+${Math.abs(delta)}%`}
      </div>
    `;
    container.appendChild(row);
  }

  // Show the section
  document.getElementById('comparison-section').style.display = 'block';
}

function appendLi(ul, text, className) {
  const li = document.createElement('li');
  li.className = className;
  li.textContent = text;
  ul.appendChild(li);
}

// ===== RENDERING — VENUE MAP =====

function renderMap() {
  for (const id of ['a', 'b', 'c']) {
    const gate = gates[id];
    const marker = document.getElementById(`map-marker-${id}`);
    const pctLabel = document.getElementById(`map-pct-${id}`);
    
    // Determine level: low, medium, high
    const level = getDensityLevel(gate.density).toLowerCase();
    
    // Update marker styling and density text
    marker.className = `map-marker map-marker--${level}`;
    pctLabel.textContent = `${gate.density}%`;
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderMap(); // Initial map render
  document.getElementById('simulate-btn').addEventListener('click', simulate);
});
