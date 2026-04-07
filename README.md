# 🌐 Autonomous Crowd Flow Balancing Assistant

A lightweight, AI-powered web dashboard with a rule-based decision engine for real-time crowd monitoring and flow balancing.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Gate Monitoring** | Displays density (Low/Medium/High), queue length, inflow & outflow rates per gate |
| **Congestion Detection** | Tracks inflow vs outflow streaks — flags risk after 3 consecutive net-positive ticks |
| **AI Decision Engine** | Rule-based evaluation produces structured alerts, predictions, and actions per gate |
| **Simulate Update** | Button randomises crowd data and runs the full decision engine |
| **Responsive Layout** | Clean 2-column dark-mode design that adapts to mobile |

---

## 📁 Project Structure

```
├── index.html   # Dashboard UI — gate cards + AI Decision Engine panel
├── style.css    # Minimal dark-mode styling with risk-level colors
├── app.js       # Simulation + rule-based decision engine
└── README.md    # Documentation
```

---

## 🚀 Getting Started

```bash
git clone https://github.com/<your-username>/Autonomous-Crowd-Flow-Balancing-System.git
cd Autonomous-Crowd-Flow-Balancing-System
open index.html
```

No build tools, no server, no dependencies.

---

## 🤖 Decision Engine Rules

The AI engine evaluates each gate using these rules:

| Condition | Risk Level | Color |
|---|---|---|
| Density = **High** AND inflow > outflow | 🔴 **HIGH RISK** | Red |
| Density = **Medium** (or High with outflow managing) | 🟡 **MODERATE RISK** | Yellow |
| Density = **Low** | 🟢 **SAFE** | Green |

### Structured Output per Gate

**1. Alert** — Current state with risk level:
> "🔴 Gate C is at 87% density with net inflow of +25/min — HIGH RISK"

**2. Prediction** — Forecasted condition:
> "Gate C likely to be congested in next 2–5 minutes"

**3. Actions** — Context-aware suggestions:
> - Redirect 30% of crowd from Gate C → Gate A
> - Open additional entry lane at Gate A
> - Temporarily slow inflow at Gate C
> - Deploy emergency staff to Gate C

### Congestion Risk Flag

Each gate tracks a **streak counter**:
- `inflow > outflow` → streak increments
- `inflow ≤ outflow` → streak cools down by 1
- **Streak ≥ 3** → ⚠ Congestion Risk flag activates

---

## 🛠 Tech Stack

- **HTML5** — Semantic structure
- **CSS3** — Custom properties, dark theme, responsive grid
- **Vanilla JavaScript** — Zero dependencies

---

## 📐 Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Simulation  │────►│  Decision Engine  │────►│   Renderer     │
│  (per gate)  │     │  classifyRisk()   │     │   (DOM)        │
│              │     │  evaluateGate()   │     │                │
└──────────────┘     └──────────────────┘     └────────────────┘
                              │
                     ┌────────┴────────┐
                     │  Structured     │
                     │  Output:        │
                     │  • Alert        │
                     │  • Prediction   │
                     │  • Actions[]    │
                     └─────────────────┘
```

---

## 📝 License

This project is provided for educational and evaluation purposes.
