# 🌐 Autonomous Crowd Flow Balancing Assistant

## 📌 Problem Statement
Large venues and events often struggle with uneven crowd distribution, leading to severe bottlenecks at specific gates while others remain underutilized. This imbalance creates safety risks, poor visitor experiences, and operational inefficiencies. Manual monitoring is often too slow to prevent sudden congestion spikes.

## 💡 Solution Overview
The **Autonomous Crowd Flow Balancing Assistant** is an AI-powered simulation dashboard designed to mitigate congestion proactively. It monitors crowd density, queue lengths, and flow rates across multiple venue gates. By continuously analyzing these metrics, the system's decision engine automatically detects congestion risks and prescribes actionable balancing strategies before critical thresholds are reached.

## ✨ Key Features
- **Real-time Crowd Analysis:** Monitors dynamic metrics including density, queue lengths, inflow, and outflow rates per gate.
- **Predictive Congestion Detection:** Predicts bottlenecks by tracking net-positive inflow streaks before they escalate to critical levels.
- **AI Decision Assistant:** Employs a deterministic rule-based engine to generate structured alerts, predictions, and crowd redirection actions based on risk classifications.
- **Closed-Loop Simulation:** Demonstrates the impact of AI suggestions by running a feedback loop that applies actions to balance flow and visibly reduces high-density spots in real-time.
- **Visual Venue Map:** Provides a geographical visualization of the event space with dynamic, color-coded markers pulsing according to real-time density levels.

## ⚙️ How it Works
The simulation operates on a continual **Input → Analysis → Decision → Feedback** cycle:
1. **Input:** Simulated radar/camera feeds provide raw density, inflow, and outflow data per gate.
2. **Analysis:** The engine evaluates net-inflow streaks and categorizes gates into SAFE, MODERATE, or HIGH-risk zones.
3. **Decision:** Generates targeted actions (e.g., redirecting foot traffic, deploying staff, adjusting entry pacing).
4. **Feedback (After State):** The system applies these actions, rebalancing the venue. High-risk areas show immediate density reduction, while safe areas absorb redirected traffic.

## 📝 Assumptions
- **Simulated Data:** The system relies on randomized mock data bounds rather than live API integrations or raw camera feeds.
- **Simplified Model:** Crowd pacing, psychological factors, and complex spatial physics are abstracted out for the sake of the dashboard demonstration.
- **Instantaneous Action Impact:** The simulation demonstrates the "After" effect immediately, whereas real-world crowd redirection introduces slight latency (e.g., walk time).

## 🛠 Tech Stack
- **HTML5:** Clean, semantic document structure.
- **CSS3:** Custom properties, CSS Grid/Flexbox layouts, dark-mode styling, and minimal animations (no external CSS frameworks).
- **Vanilla JavaScript (ES6+):** Complete simulation loop, rule-based decision engine, and DOM manipulation without heavy libraries.

## 🚀 Future Improvements
- **Live Data Integration:** Connect to real-world IoT sensors, camera APIs, or entry turnstile databases to ingest live visitor telemetry.
- **Complex Topologies:** Expand the simplified single-connector structure into a multi-node spatial graph with real transit times.
- **Advanced Predictive Models:** Replace the deterministic rule-based logic with a trained Machine Learning model to account for historical traffic patterns and weather context.
- **Mobile Companion App:** Develop an attendee-facing view that automatically notifies visitors of the fastest/safest entry routes.
