#!/usr/bin/env python3
"""
Comprehensive test of the Timataka scraping API
"""
import requests
import json
from pathlib import Path

def test_complete_scraping_workflow():
    """Test the complete scraping workflow"""
    
    print("🎯 Timataka Scraping API - Complete Test")
    print("=" * 60)
    
    # Read sample HTML
    html_file = Path("sample_data/tindahlaup-2025.html")
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    print(f"📄 Sample file: {html_file}")
    print(f"📊 HTML content size: {len(html_content):,} characters")
    print()
    
    # Test 1: Scraping without saving
    print("🧪 Test 1: Scraping without database save")
    print("-" * 40)
    
    payload_no_save = {
        "html_content": html_content,
        "source_url": "https://timataka.net/tindahlaup2025/",
        "save_to_db": False
    }
    
    response = requests.post('http://localhost:8000/api/races/scrape', json=payload_no_save, timeout=30)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ {result['message']}")
        print(f"📈 Scraped: {result['scraped']} races")
        
        if result.get('races'):
            print("\n🏃 Detected races:")
            for i, race in enumerate(result['races'], 1):
                print(f"  {i}. {race['name']}")
                print(f"     🏔️  Type: {race['race_type']} | Distance: {race['distance_km']} km")
                print(f"     📅 Date: {race['date']} | Location: {race['location']}")
        print()
    else:
        print(f"❌ Error: {response.status_code}")
        return False
    
    # Test 2: Scraping with database save
    print("🧪 Test 2: Scraping with database save (overwrite)")
    print("-" * 40)
    
    payload_save = {
        "html_content": html_content,
        "source_url": "https://timataka.net/tindahlaup2025/",
        "save_to_db": True,
        "overwrite_existing": True
    }
    
    response = requests.post('http://localhost:8000/api/races/scrape', json=payload_save, timeout=30)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ {result['message']}")
        print(f"📈 Scraped: {result['scraped']} | Saved: {result['saved']} | Updated: {result['updated']} | Skipped: {result['skipped']}")
        print()
    else:
        print(f"❌ Error: {response.status_code}")
        return False
    
    # Test 3: Verify races in database
    print("🧪 Test 3: Verify races in database")
    print("-" * 40)
    
    response = requests.get('http://localhost:8000/api/races/')
    if response.status_code == 200:
        all_races = response.json()
        tindahlaup_races = [r for r in all_races if 'Tindahlaup' in r.get('name', '')]
        
        print(f"🗄️  Total races in database: {len(all_races)}")
        print(f"🏔️  Tindahlaup races: {len(tindahlaup_races)}")
        
        for race in tindahlaup_races:
            print(f"  • {race['name']} (ID: {race['id']})")
        print()
    else:
        print(f"❌ Error getting races: {response.status_code}")
        return False
    
    # Test 4: Test supported race types
    print("🧪 Test 4: Supported race types")
    print("-" * 40)
    
    response = requests.get('http://localhost:8000/api/races/scrape/supported-types')
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Supported race types:")
        for race_type in result['supported_types']:
            print(f"  • {race_type}")
        print()
    else:
        print(f"❌ Error: {response.status_code}")
        return False
    
    print("🎉 All tests completed successfully!")
    print("=" * 60)
    
    return True

if __name__ == "__main__":
    test_complete_scraping_workflow()
