# Autonomous Crowd Flow Balancing System 

**Hack2Skill Final Submission**

This project is an advanced, fully autonomous **Smart Cricket Stadium Manager** powered by **Google Gemini 1.5 Flash**. It provides real-time, proactive crowd management and an immersive, personalized attendee experience using live GPS tracking.

## Key Features

### 1. Agentic AI Attendee Assistant
A floating chat widget powered by Google Gemini that acts as a culturally aware stadium assistant. It knows the live queue lengths at every gate, the weather, and the current match phase (e.g., "1st Innings Powerplay"). Attendees can ask natural language questions like *"Which gate is empty?"* or *"Where can I find Vada Pav?"*, and the AI will guide them intelligently.

### 2. Live GPS Tracking (with Hackathon Offset)
Instead of a static dashboard, attendees log in with their e-Ticket to activate live HTML5 Geolocation tracking. 
* **Hackathon Magic:** Since judges and testers aren't physically at the stadiums, we built a "Hackathon Offset" algorithm. It takes your real-world movements (walking around your room) and proportionally maps them into the stadium bounds on the interactive Leaflet map!

### 3. Proactive Automated Warnings & Heatmaps
The frontend calculates your Euclidean distance to heavily congested gates. If you walk into a dense area:
- Red "heat dots" dynamically spawn around you, simulating the tracking of nearby Bluetooth/WiFi beacons.
- If the local density exceeds a critical threshold, the Agentic AI chatbot will automatically pop open, flash red, and push an unprompted **URGENT** warning with instructions to head to the safest exit!

### 4. Automated Global Rebalancing
The command center dashboard requires zero manual intervention. Every 15 seconds, the backend automatically scans the stadium's telemetry and queries Gemini to predict risks. If a gate becomes overcrowded, it instantly deploys dynamic strategies (e.g., "Offer 20% discount on Biryani at East Gate") to rebalance the crowds.

### 5. Multi-Stadium Support
The application dynamically adjusts its entire backend simulation and frontend map rendering based on the user's ticket:
- Support for **Narendra Modi Stadium** (Ahmedabad)
- Support for **Wankhede Stadium** (Mumbai)

---

## How to Use & Test the Project

1. **Access the Application**: Open the deployed URL provided in the Hack2Skill portal.
2. **Log In**: You will be greeted by a modern login overlay. Enter one of the following mock e-Ticket IDs to load a specific stadium:
   - Type **`MODI-1234`** to load the Narendra Modi Stadium.
   - Type **`WANK-5678`** to load the Wankhede Stadium.
3. **Allow Location**: When prompted by your browser, **Allow** location access. This activates the Live GPS tracker.
4. **Watch the Automation**: You don't need to click anything. Watch the dashboard automatically scan the stadium every 15 seconds, identify risks, and fix them.
5. **Test the Chatbot**: Open the chat widget in the bottom right. Ask it *"Which is the best way in right now?"*.
6. **Trigger Proactive Warnings**: Stand up with your laptop or phone and physically walk around your room! Watch your blue dot move across the stadium. As you walk toward a red, congested gate, the Agentic AI will automatically pop open and warn you to turn around.

---

## Technical Stack
* **Backend**: Python, Flask, Pydantic (Data Validation)
* **AI Engine**: Google Generative AI (`gemini-1.5-flash`)
* **Security**: Flask-Talisman (CSP/HSTS), Flask-Limiter (Rate Limiting)
* **Frontend**: Vanilla JS, HTML5 Geolocation API, Leaflet.js
* **Deployment**: Docker, Google Cloud Run

## Security & Code Quality
This project enforces enterprise-grade security and reliability:
- Strict Pydantic schema validation for all telemetry to prevent data anomalies.
- Heuristic logic fallbacks: If the AI API rate limits or fails, the system seamlessly falls back on hardcoded mathematical heuristics, ensuring 100% uptime.
- PEP-8 compliant formatting and comprehensive docstrings.
