#!/usr/bin/env python3
"""
Prideda DataForSEO MCP į Claude Code settings.json
Naudojimas: python3 setup-dataforseo.py EMAIL SLAPTAZODIS

Paskyrą sukurk: https://app.dataforseo.com/register
Raktus gauk: Settings → API Access
"""

import json
from pathlib import Path
import sys
import subprocess

def check_server_installed():
    result = subprocess.run(['which', 'dataforseo-mcp-server'],
                          capture_output=True, text=True)
    if result.returncode != 0:
        print("❌ dataforseo-mcp-server neinstaliuotas")
        print("   Paleisk: npm install -g dataforseo-mcp-server")
        sys.exit(1)
    print(f"✅ dataforseo-mcp-server rasta: {result.stdout.strip()}")

def add_to_settings(login, password):
    # Kelias per Path.home(), kad veiktu ir WSL'e. Prikaltas /Users/... kelias
    # ten mestu FileNotFoundError.
    settings_path = str(Path.home() / '.claude' / 'settings.json')

    with open(settings_path, 'r') as f:
        settings = json.load(f)

    if 'mcpServers' not in settings:
        settings['mcpServers'] = {}

    settings['mcpServers']['dataforseo'] = {
        "command": "dataforseo-mcp-server",
        "env": {
            "DATAFORSEO_LOGIN": login,
            "DATAFORSEO_PASSWORD": password
        }
    }

    with open(settings_path, 'w') as f:
        json.dump(settings, f, indent=2, ensure_ascii=False)

    print(f"✅ DataForSEO MCP pridėtas į settings.json")
    print(f"   Login: {login}")
    print(f"   Password: {'*' * len(password)}")
    print()
    print("🔄 Perkrauk Claude Code kad įsigaliotų:")
    print("   Uždaryti ir atidaryti Claude Code")
    print("   arba: /mcp restart (jei veikia)")
    print()
    print("🧪 Patikrink ar veikia:")
    print("   /seo-lt revmotors.lt")
    print("   arba tiesiog paklausk: 'kokia revmotors.lt pozicija paieškoje?'")

def test_connection(login, password):
    """Patikrina ar API raktai teisingi."""
    import urllib.request
    import base64

    creds = base64.b64encode(f"{login}:{password}".encode()).decode()
    req = urllib.request.Request(
        'https://api.dataforseo.com/v3/serp/google/organic/live/advanced',
        data=json.dumps([{
            "keyword": "test",
            "location_code": 2440,  # Lithuania
            "language_code": "lt",
            "device": "desktop",
            "os": "windows",
            "depth": 1
        }]).encode(),
        headers={
            'Authorization': f'Basic {creds}',
            'Content-Type': 'application/json'
        },
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read())
            if data.get('status_code') == 20000:
                print("✅ API raktai teisingi - ryšys su DataForSEO veikia!")
                return True
            else:
                print(f"⚠️  API atsakė: {data.get('status_message')}")
                return False
    except Exception as e:
        print(f"❌ Klaida tikrinant ryšį: {e}")
        return False

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Naudojimas: python3 setup-dataforseo.py EMAIL SLAPTAZODIS")
        print()
        print("1. Sukurk paskyrą: https://app.dataforseo.com/register")
        print("2. Eik į Settings → API Access")
        print("3. Nukopijuok Login ir Password")
        print("4. Paleisk: python3 setup-dataforseo.py tavo@email.com slaptazodis")
        sys.exit(1)

    login = sys.argv[1]
    password = sys.argv[2]

    print("🔧 DataForSEO MCP konfigūravimas...")
    print()

    check_server_installed()

    print("🔌 Tikrinamas ryšys su DataForSEO API...")
    test_connection(login, password)

    print()
    add_to_settings(login, password)
