"""
Autonomous Crowd Flow Balancing System (Enterprise Edition)
==========================================================

An intelligent system leveraging Google Gemini 1.5 Flash to manage stadium crowd
flows dynamically. Features production-grade security, structured logging, 
validation, LLM-driven decision engines, and GPS tracking support.
"""

import os
import random
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from flask import Flask, render_template, jsonify, request
from flask_talisman import Talisman
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from pydantic import BaseModel, Field, ValidationError
import google.generativeai as genai
from dotenv import load_dotenv

# Load Environment Variables
load_dotenv()

# --- CONFIGURATION & LOGGING ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Google Generative AI
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
model: Optional[genai.GenerativeModel] = None

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    logger.info("Semantic Engine: Google Gemini initialized.")
else:
    logger.warning("Semantic Engine: Missing GOOGLE_API_KEY. Using heuristic fallback.")

# Initialize Google Cloud Services (Logging)
try:
    import google.cloud.logging
    g_client = google.cloud.logging.Client()
    g_client.setup_logging()
except ImportError:
    pass
except Exception as e:
    pass

# --- DATA MODELS ---
class GateState(BaseModel):
    id: str
    name: str
    density: int = Field(ge=0, le=100)
    inflow: int = Field(ge=0)
    outflow: int = Field(ge=0)
    queue: int = Field(ge=0)
    streak: int = Field(ge=0)

class VenueContext(BaseModel):
    phase: str
    weather: str

class AgentQuery(BaseModel):
    query: str
    stadium_id: str
    user_location: Optional[str] = None
    nearby_density: Optional[str] = None

# --- APP INITIALIZATION ---
app = Flask(__name__)

csp = {
    'default-src': '\'self\'',
    'script-src': ['\'self\'', 'https://unpkg.com', '\'unsafe-inline\''],
    'style-src': ['\'self\'', 'https://fonts.googleapis.com', 'https://unpkg.com', '\'unsafe-inline\''],
    'font-src': ['\'self\'', 'https://fonts.gstatic.com'],
    'img-src': ['\'self\'', 'data:', 'https://*.basemaps.cartocdn.com']
}

Talisman(app, content_security_policy=csp, force_https=False, strict_transport_security=True)
limiter = Limiter(get_remote_address, app=app, default_limits=["200 per day", "50 per hour"], storage_uri="memory://")

# --- GLOBAL SIMULATION STATE ---
stadiums_data = {
    'modi': {
        'name': 'Narendra Modi Stadium',
        'context': {
            'phases': ['Toss & Pre-Match', '1st Innings Powerplay', 'Innings Break', 'Post-Match (Egress)'],
            'conditions': ['Clear & Humid', 'Unseasonal Rain', 'Extreme Heat'],
            'phase_idx': 0,
            'weather_idx': 0
        },
        'gates': {
            'a': {'id': 'a', 'name': 'North Gate', 'density': 28, 'inflow': 15, 'outflow': 18, 'queue': 12, 'streak': 0},
            'b': {'id': 'b', 'name': 'South Gate', 'density': 55, 'inflow': 40, 'outflow': 32, 'queue': 47, 'streak': 0},
            'c': {'id': 'c', 'name': 'East Gate', 'density': 87, 'inflow': 70, 'outflow': 45, 'queue': 134, 'streak': 0},
        }
    },
    'wankhede': {
        'name': 'Wankhede Stadium',
        'context': {
            'phases': ['Toss & Pre-Match', '1st Innings Powerplay', 'Innings Break', 'Post-Match (Egress)'],
            'conditions': ['Sea Breeze', 'Humid', 'Clear Night'],
            'phase_idx': 0,
            'weather_idx': 0
        },
        'gates': {
            'a': {'id': 'a', 'name': 'Vinoo Mankad Gate', 'density': 40, 'inflow': 20, 'outflow': 10, 'queue': 25, 'streak': 0},
            'b': {'id': 'b', 'name': 'Garware Pavilion Gate', 'density': 70, 'inflow': 50, 'outflow': 30, 'queue': 85, 'streak': 0},
            'c': {'id': 'c', 'name': 'University Pavilion Gate', 'density': 90, 'inflow': 80, 'outflow': 40, 'queue': 150, 'streak': 0},
        }
    }
}

def get_current_context(stadium_id: str) -> VenueContext:
    s_data = stadiums_data.get(stadium_id, stadiums_data['modi'])
    ctx = s_data['context']
    return VenueContext(
        phase=ctx['phases'][ctx['phase_idx']],
        weather=ctx['conditions'][ctx['weather_idx']]
    )

def clamp(val: int, mn: int, mx: int) -> int:
    return max(mn, min(val, mx))

def evaluate_gate_with_llm(gate_data: Dict[str, Any], context: VenueContext) -> Dict[str, Any]:
    if model:
        try:
            prompt = f"""
            System: You are an expert Stadium Crowd Flow Manager at an Indian cricket stadium.
            Input Data:
            - Gate: {gate_data['name']}
            - Density: {gate_data['density']}% (Capacity: 0-100)
            - Current Phase: {context.phase}
            - Weather: {context.weather}
            - Queue: {gate_data['queue']} people
            - Trend: {'Escalating' if gate_data['inflow'] > gate_data['outflow'] else 'Stable'}
            
            Task: Provide a priority risk status (HIGH, MODERATE, SAFE), a short prediction, 
            and 2-3 actionable, gamified instructions to rebalance the crowd.
            Format your response as valid JSON like this:
            {{"risk": "...", "prediction": "...", "actions": ["...", "..."]}}
            Keep response extremely concise.
            """
            response = model.generate_content(prompt)
            import json
            import re
            match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if match:
                ai_data = json.loads(match.group())
            else:
                ai_data = {}
            return {
                'id': gate_data['id'],
                'risk': ai_data.get('risk', 'SAFE'),
                'prediction': ai_data.get('prediction', 'Analyzing...'),
                'actions': ai_data.get('actions', ['Monitor situation.'])
            }
        except Exception as e:
            logger.error(f"LLM parsing or generation failed: {e}")
            pass

    risk = 'SAFE'
    if gate_data['density'] > 75:
        risk = 'HIGH'
    elif gate_data['density'] > 45:
        risk = 'MODERATE'
    
    actions = ["Continue regular monitoring."]
    if risk == 'HIGH':
        actions = [
            f"Offer 20% discount on Vada Pav and Biryani at other gates.",
            f"Open secondary security checkpoints immediately.",
            f"Dispatch rapid action staff to {gate_data['name']}."
        ]
    elif risk == 'MODERATE':
        actions = [
            f"Prepare secondary checkpoints at {gate_data['name']}.",
            f"Update digital Hindi/English signage to redirect incoming fans."
        ]
    
    return {
        'id': gate_data['id'],
        'risk': risk,
        'prediction': f"{gate_data['name']} is {risk.lower()} risk.",
        'actions': actions
    }

def simulate_step(stadium_id: str) -> None:
    s_data = stadiums_data.get(stadium_id, stadiums_data['modi'])
    ctx_data = s_data['context']
    gates = s_data['gates']

    if random.random() < 0.2:
        ctx_data['weather_idx'] = random.randint(0, 2)
    if random.random() < 0.1:
        ctx_data['phase_idx'] = (ctx_data['phase_idx'] + 1) % 4

    ctx = get_current_context(stadium_id)
    
    for gid, g in gates.items():
        in_mod = 25 if "Pre-Match" in ctx.phase else 0
        in_mod += 35 if "Rain" in ctx.weather and gid == 'c' else 0
        
        g['inflow'] = clamp(random.randint(5, 50) + in_mod, 0, 150)
        g['outflow'] = clamp(random.randint(10, 60), 0, 150)
        
        diff = g['inflow'] - g['outflow']
        g['density'] = clamp(g['density'] + round(diff * 0.2), 0, 100)
        g['queue'] = clamp(round(g['density'] * 1.8) + random.randint(-10, 10), 0, 300)
        
        if g['inflow'] > g['outflow']:
            g['streak'] += 1
        else:
            g['streak'] = max(0, g['streak'] - 1)

def apply_rebalancing(stadium_id: str, decisions: List[Dict[str, Any]]) -> None:
    gates = stadiums_data.get(stadium_id, stadiums_data['modi'])['gates']
    for d in decisions:
        g = gates[d['id']]
        if d['risk'] == 'HIGH':
            g['density'] = clamp(g['density'] - 20, 5, 100)
            g['streak'] = 0
        elif d['risk'] == 'MODERATE':
            g['density'] = clamp(g['density'] - 10, 5, 100)

@app.route('/')
def index() -> str:
    return render_template('index.html')

@app.route('/api/simulate')
@limiter.limit("20 per minute")
def simulate():
    sid = request.args.get('stadium_id', 'modi')
    simulate_step(sid)
    ctx = get_current_context(sid)
    
    gates = stadiums_data.get(sid, stadiums_data['modi'])['gates']
    before = {gid: {**g} for gid, g in gates.items()}
    
    decisions = []
    for gid, g in gates.items():
        try:
            valid_gate = GateState(**g)
            decisions.append(evaluate_gate_with_llm(valid_gate.model_dump(), ctx))
        except ValidationError:
            decisions.append(evaluate_gate_with_llm(g, ctx))
            
    apply_rebalancing(sid, decisions)
    
    return jsonify({
        'context': f"Context: {ctx.phase} — {ctx.weather}",
        'before': snap_states(before),
        'decisions': decisions,
        'after': snap_states(gates)
    })

@app.route('/api/state')
def current_state():
    sid = request.args.get('stadium_id', 'modi')
    ctx = get_current_context(sid)
    gates = stadiums_data.get(sid, stadiums_data['modi'])['gates']
    return jsonify({
        'context': f"Context: {ctx.phase} — {ctx.weather}",
        'state': snap_states(gates)
    })

def snap_states(data_source: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    return {
        gid: {**g, 'level': 'High' if g['density'] > 75 else ('Medium' if g['density'] > 45 else 'Low')} 
        for gid, g in data_source.items()
    }

@app.route('/api/agent', methods=['POST'])
@limiter.limit("30 per minute")
def agent_assistant():
    try:
        data = request.get_json() or {}
        query_data = AgentQuery(**data)
    except ValidationError:
        return jsonify(error="Invalid query format"), 400

    sid = query_data.stadium_id
    ctx = get_current_context(sid)
    gates = stadiums_data.get(sid, stadiums_data['modi'])['gates']
    stadium_name = stadiums_data.get(sid, stadiums_data['modi'])['name']
    gate_info = "\\n".join([f"- {g['name']}: {g['density']}% density, Queue: {g['queue']} people" for g in gates.values()])
    
    # Handle automated proximity warnings
    if getattr(query_data, 'nearby_density', None) and getattr(query_data, 'user_location', None):
        if int(query_data.nearby_density) > 70:
            best_gate = min(gates.values(), key=lambda x: x['density'])
            return jsonify({'reply': f"URGENT: High crowd density detected near your GPS location ({query_data.nearby_density}% local density). Please route immediately towards {best_gate['name']} for safety."})
        elif int(query_data.nearby_density) < 30 and not query_data.query:
            return jsonify({'reply': ''}) # Ignore safe background checks
            
    if model:
        try:
            prompt = f"""
            You are an Agentic AI event assistant at {stadium_name}.
            Current Context: {ctx.phase}, Weather: {ctx.weather}
            Gates:
            {gate_info}
            User GPS Proximity Info: {query_data.nearby_density}% local density.
            Question: "{query_data.query}"
            
            Provide a short, friendly recommendation. If asked about crowds, warn them based on their proximity info and route them to the least crowded gate. Keep it under 3 sentences.
            """
            response = model.generate_content(prompt)
            return jsonify({'reply': response.text.strip()})
        except Exception as e:
            logger.error(f"Agent generation failed: {e}")
            pass
            
    best_gate = min(gates.values(), key=lambda x: x['density'])
    reply = f"Hi there! Based on live crowds, head to {best_gate['name']}."
    if getattr(query_data, 'nearby_density', None) and int(query_data.nearby_density) > 70:
        reply = f"WARNING: Crowds are very heavy around you. Please move to {best_gate['name']} immediately."
        
    return jsonify({'reply': reply})

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify(error="Rate limit exceeded", description=str(e)), 429

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))
