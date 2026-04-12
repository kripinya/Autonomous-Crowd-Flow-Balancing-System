"""
Unit tests for the Autonomous Crowd Flow Balancing System API.
Validates the AI prediction logic and status classifications.
"""
import pytest
from app import app, get_density_level, classify_risk

@pytest.fixture
def client():
    """Fixture providing a Flask testing client."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_index_page(client) -> None:
    """Test that the index page loads securely and successfully."""
    response = client.get('/')
    assert response.status_code == 200
    assert b"Smart Event Manager" in response.data

def test_api_state(client) -> None:
    """Test that the initial state API returns valid JSON state definitions."""
    response = client.get('/api/state')
    assert response.status_code == 200
    data = response.get_json()
    assert 'state' in data
    assert 'a' in data['state']
    assert data['state']['a']['name'] == 'North Gate'

def test_api_simulate(client) -> None:
    """Test the core AI evaluation simulation endpoint."""
    response = client.get('/api/simulate')
    assert response.status_code == 200
    data = response.get_json()
    assert 'decisions' in data
    assert 'before' in data
    assert 'after' in data
    # Ensure feedback loop logic altered states
    assert data['before'] != data['after'] or data['decisions']

def test_density_level() -> None:
    """Validate pure functional density boundary logic."""
    assert get_density_level(80) == 'High'
    assert get_density_level(50) == 'Medium'
    assert get_density_level(20) == 'Low'

def test_classify_risk() -> None:
    """Validate risk classification matrix logic."""
    gate_danger = {'density': 80, 'inflow': 50, 'outflow': 20}
    assert classify_risk(gate_danger) == 'HIGH'

    gate_stable = {'density': 30, 'inflow': 10, 'outflow': 20}
    assert classify_risk(gate_stable) == 'SAFE'
