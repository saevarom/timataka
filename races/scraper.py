import re
from datetime import datetime
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
from dateutil.parser import parse as parse_date
import logging

logger = logging.getLogger(__name__)


class TimatakaScrapingError(Exception):
    """Custom exception for Timataka scraping errors"""
    pass


class TimatakaScraper:
    """
    Scraper for Timataka.net race pages.
    
    Extracts race information from HTML content including:
    - Main race name and date
    - Multiple race distances/categories
    - Start times for each race
    """
    
    def __init__(self):
        self.race_type_mapping = {
            'marathon': 'marathon',
            'hálf marathon': 'half_marathon',
            'half marathon': 'half_marathon',
            '10k': '10k',
            '5k': '5k',
            'km': 'other',  # fallback for various km distances
            'tindur': 'trail',  # Icelandic mountain running
            'tindar': 'trail',
        }
    
    def scrape_race_data(self, html_content: str, source_url: str = "") -> List[Dict]:
        """
        Scrape race data from Timataka.net HTML content.
        
        Args:
            html_content: Raw HTML content from a Timataka page
            source_url: Original URL for reference
            
        Returns:
            List of race dictionaries with extracted data
            
        Raises:
            TimatakaScrapingError: If scraping fails or data is invalid
        """
        try:
            soup = BeautifulSoup(html_content, 'lxml')
            
            # Extract main race information
            main_race_name = self._extract_main_race_name(soup)
            base_location = self._extract_location_from_name(main_race_name)
            
            # Extract individual race categories/distances
            race_categories = self._extract_race_categories(soup, main_race_name, base_location, source_url)
            
            if not race_categories:
                raise TimatakaScrapingError("No race categories found in the HTML")
            
            return race_categories
            
        except Exception as e:
            logger.error(f"Error scraping race data: {str(e)}")
            raise TimatakaScrapingError(f"Failed to scrape race data: {str(e)}")
    
    def _extract_main_race_name(self, soup: BeautifulSoup) -> str:
        """Extract the main race name from the page title or header"""
        # Try title tag first
        title_tag = soup.find('title')
        if title_tag:
            title_text = title_tag.get_text().strip()
            # Remove "TÍMATAKA: " prefix if present
            if 'TÍMATAKA:' in title_text:
                return title_text.split('TÍMATAKA:')[-1].strip()
            return title_text
        
        # Try h2 header
        h2_tag = soup.find('h2')
        if h2_tag:
            return h2_tag.get_text().strip()
        
        # Fallback to h1
        h1_tag = soup.find('h1')
        if h1_tag:
            return h1_tag.get_text().strip()
        
        return "Unknown Race"
    
    def _extract_location_from_name(self, race_name: str) -> str:
        """Extract location from race name (Icelandic place names)"""
        # Common Icelandic location patterns
        icelandic_locations = [
            'Reykjavík', 'Reykjavik', 'Mosfellsbær', 'Mosfellsbaer', 
            'Kópavogur', 'Kopavogur', 'Hafnarfjörður', 'Hafnarfjordur',
            'Garðabær', 'Gardabaer', 'Akureyri', 'Selfoss', 'Keflavík',
            'Vestmannaeyjar', 'Ísafjörður', 'Egilsstaðir'
        ]
        
        race_name_lower = race_name.lower()
        for location in icelandic_locations:
            if location.lower() in race_name_lower:
                return location
        
        # Extract from name patterns like "Tindahlaup Mosfellsbæjar"
        if 'mosfellsbæjar' in race_name_lower or 'mosfellsbaer' in race_name_lower:
            return 'Mosfellsbær'
        
        return "Iceland"  # Default fallback
    
    def _extract_race_categories(self, soup: BeautifulSoup, main_race_name: str, 
                                base_location: str, source_url: str) -> List[Dict]:
        """Extract individual race categories/distances from the page"""
        race_categories = []
        
        # Find all race category containers (typically in col-md-3 divs)
        category_containers = soup.find_all('div', class_='col-md-3')
        
        for container in category_containers:
            # Skip if this doesn't contain race information
            h4_tag = container.find('h4')
            if not h4_tag:
                continue
            
            race_info = self._parse_race_category_container(
                container, main_race_name, base_location, source_url
            )
            
            if race_info:
                race_categories.append(race_info)
        
        return race_categories
    
    def _parse_race_category_container(self, container, main_race_name: str, 
                                     base_location: str, source_url: str) -> Optional[Dict]:
        """Parse a single race category container"""
        try:
            # Extract race name and distance from h4 tag
            h4_tag = container.find('h4')
            if not h4_tag:
                return None
            
            race_text = h4_tag.get_text().strip()
            
            # Extract distance information
            distance_km, race_description = self._parse_race_distance(race_text)
            
            # Extract date and time
            date_info = self._extract_date_time(container)
            
            # Determine race type based on distance and description
            race_type = self._determine_race_type(race_description, distance_km)
            
            # Build the race name
            race_name = f"{main_race_name} - {race_description}"
            
            race_data = {
                'name': race_name,
                'description': f"{race_description} as part of {main_race_name}",
                'race_type': race_type,
                'date': date_info['date'],
                'location': base_location,
                'distance_km': distance_km,
                'elevation_gain_m': 0,  # Not available in this format
                'max_participants': None,
                'registration_url': '',
                'official_website': '',
                'organizer': 'Tímataka',
                'entry_fee': None,
                'currency': 'ISK',
                'source_url': source_url,
                'start_time': date_info.get('time', ''),
            }
            
            return race_data
            
        except Exception as e:
            logger.warning(f"Error parsing race category container: {str(e)}")
            return None
    
    def _parse_race_distance(self, race_text: str) -> tuple[float, str]:
        """
        Parse distance from race text like '7 tindar (37 km)' or '3 tindar (19 km)'
        
        Returns:
            tuple: (distance_in_km, description)
        """
        # Pattern to match distance in parentheses
        km_pattern = r'\((\d+(?:\.\d+)?)\s*km\)'
        km_match = re.search(km_pattern, race_text, re.IGNORECASE)
        
        if km_match:
            distance_km = float(km_match.group(1))
            # Remove the km part to get description
            description = re.sub(km_pattern, '', race_text).strip()
            return distance_km, description
        
        # If no km found, try to infer from common patterns
        if 'marathon' in race_text.lower():
            if 'hálf' in race_text.lower() or 'half' in race_text.lower():
                return 21.0975, race_text
            else:
                return 42.195, race_text
        
        # For "tindar" (mountain peaks), make reasonable estimates
        if 'tindar' in race_text.lower() or 'tindur' in race_text.lower():
            # Extract number of peaks
            peak_match = re.search(r'(\d+)\s*tind', race_text.lower())
            if peak_match:
                peaks = int(peak_match.group(1))
                # Rough estimate: each peak adds ~5km
                estimated_distance = peaks * 5.0
                return estimated_distance, race_text
        
        # Fallback: try to find any number that might be distance
        number_match = re.search(r'(\d+(?:\.\d+)?)', race_text)
        if number_match:
            return float(number_match.group(1)), race_text
        
        return 10.0, race_text  # Default fallback
    
    def _extract_date_time(self, container) -> Dict[str, str]:
        """Extract date and time information from container"""
        # Look for date/time in stats-label class
        stats_label = container.find('small', class_='stats-label')
        if not stats_label:
            return {'date': '2025-01-01', 'time': '09:00'}
        
        date_text = stats_label.get_text().strip()
        
        try:
            # Parse date format like "30.08.2025 09:00"
            if re.match(r'\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}', date_text):
                date_part, time_part = date_text.split(' ', 1)
                day, month, year = date_part.split('.')
                
                # Convert to ISO format
                date_iso = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                return {'date': date_iso, 'time': time_part}
            
            # Try to parse with dateutil as fallback
            parsed_date = parse_date(date_text, dayfirst=True)
            return {
                'date': parsed_date.strftime('%Y-%m-%d'),
                'time': parsed_date.strftime('%H:%M')
            }
            
        except Exception as e:
            logger.warning(f"Could not parse date '{date_text}': {str(e)}")
            return {'date': '2025-01-01', 'time': '09:00'}
    
    def _determine_race_type(self, description: str, distance_km: float) -> str:
        """Determine race type based on description and distance"""
        description_lower = description.lower()
        
        # Check description first
        for pattern, race_type in self.race_type_mapping.items():
            if pattern in description_lower:
                return race_type
        
        # Determine by distance
        if distance_km >= 40:
            return 'marathon'
        elif distance_km >= 20:
            return 'half_marathon'
        elif distance_km >= 15:
            return 'other'
        elif distance_km >= 9:
            return '10k'
        elif distance_km >= 4:
            return '5k'
        else:
            return 'other'
