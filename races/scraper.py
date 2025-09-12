import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
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
    - Race results with splits and times
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
            
            # Extract overall results URL
            results_url = self._extract_results_url(container)
            
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
                'results_url': results_url,
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

    def _extract_results_url(self, container) -> str:
        """Extract the overall results URL from a race category container"""
        # Look for links with 'cat=overall' parameter
        overall_links = container.find_all('a', href=True)
        
        for link in overall_links:
            href = link.get('href', '')
            if 'cat=overall' in href:
                return href
        
        # If no overall link found, return empty string
        return ''

    def scrape_race_results(self, html_content: str, race_id: int) -> Dict:
        """
        Scrape race results from a Timataka.net results page.
        
        Args:
            html_content: Raw HTML content from a Timataka results page
            race_id: ID of the race in the database
            
        Returns:
            Dictionary with results data and metadata
            
        Raises:
            TimatakaScrapingError: If scraping fails or data is invalid
        """
        try:
            soup = BeautifulSoup(html_content, 'lxml')
            
            # Extract race name from the page
            race_name = self._extract_race_name_from_results(soup)
            
            # Find the results table
            results_table = self._find_results_table(soup)
            if not results_table:
                raise TimatakaScrapingError("No results table found in the HTML")
            
            # Extract column headers to understand the table structure
            headers = self._extract_table_headers(results_table)
            
            # Extract all result rows
            results = self._extract_result_rows(results_table, headers)
            
            return {
                'race_id': race_id,
                'race_name': race_name,
                'results_count': len(results),
                'headers': headers,
                'results': results
            }
            
        except Exception as e:
            logger.error(f"Error scraping race results: {str(e)}")
            raise TimatakaScrapingError(f"Failed to scrape race results: {str(e)}")
    
    def _extract_race_name_from_results(self, soup: BeautifulSoup) -> str:
        """Extract race name from results page"""
        # Try h2 inside ibox-title first
        h2_tag = soup.find('div', class_='ibox-title')
        if h2_tag:
            h2 = h2_tag.find('h2')
            if h2:
                return h2.get_text().strip()
        
        # Fallback to page title
        title_tag = soup.find('title')
        if title_tag:
            title_text = title_tag.get_text().strip()
            if 'TÍMATAKA:' in title_text:
                return title_text.split('TÍMATAKA:')[-1].strip()
            return title_text
        
        return "Unknown Race"
    
    def _find_results_table(self, soup: BeautifulSoup) -> Optional[BeautifulSoup]:
        """Find the main results table in the page"""
        # Look for table with class 'table table-striped'
        table = soup.find('table', class_='table table-striped')
        return table
    
    def _extract_table_headers(self, table: BeautifulSoup) -> List[str]:
        """Extract and normalize table headers"""
        headers = []
        thead = table.find('thead')
        if thead:
            header_row = thead.find('tr')
            if header_row:
                for th in header_row.find_all('th'):
                    header_text = th.get_text().strip().lower()
                    # Map common headers to standardized names
                    if header_text in ['rank', 'place']:
                        headers.append('rank')
                    elif header_text in ['bib', 'number']:
                        headers.append('bib')
                    elif header_text in ['name', 'participant']:
                        headers.append('name')
                    elif header_text in ['year', 'birth year']:
                        headers.append('year')
                    elif header_text in ['club', 'team']:
                        headers.append('club')
                    elif header_text in ['split', 'splits']:
                        headers.append('split')
                    elif header_text in ['time', 'finish time']:
                        headers.append('time')
                    elif header_text in ['behind', 'time behind']:
                        headers.append('behind')
                    elif header_text in ['chiptime', 'chip time']:
                        headers.append('chiptime')
                    else:
                        headers.append(header_text if header_text else 'unknown')
        return headers
    
    def _extract_result_rows(self, table: BeautifulSoup, headers: List[str]) -> List[Dict]:
        """Extract all result rows from the table"""
        results = []
        tbody = table.find('tbody')
        if not tbody:
            return results
        
        for row in tbody.find_all('tr'):
            cells = row.find_all('td')
            if len(cells) < len(headers):
                continue  # Skip incomplete rows
            
            result_data = {}
            
            for i, header in enumerate(headers):
                if i < len(cells):
                    cell_text = cells[i].get_text().strip()
                    
                    if header == 'rank':
                        result_data['rank'] = self._parse_rank(cell_text)
                    elif header == 'bib':
                        result_data['bib'] = cell_text
                    elif header == 'name':
                        result_data['name'] = cell_text
                    elif header == 'year':
                        result_data['year'] = self._parse_year(cell_text)
                    elif header == 'club':
                        result_data['club'] = cell_text
                    elif header == 'split':
                        result_data['splits'] = self._parse_splits(cells[i])
                    elif header == 'time':
                        result_data['finish_time'] = self._parse_time(cell_text)
                    elif header == 'behind':
                        result_data['time_behind'] = self._parse_time_behind(cell_text)
                    elif header == 'chiptime':
                        result_data['chip_time'] = self._parse_time(cell_text)
                    else:
                        result_data[header] = cell_text
            
            if result_data.get('name') and result_data.get('finish_time'):
                results.append(result_data)
        
        return results
    
    def _parse_rank(self, text: str) -> Optional[int]:
        """Parse rank/place number"""
        if not text or text == '':
            return None
        try:
            return int(text.strip())
        except ValueError:
            return None
    
    def _parse_year(self, text: str) -> Optional[int]:
        """Parse birth year"""
        if not text or text == '':
            return None
        try:
            year = int(text.strip())
            if 1900 <= year <= 2020:
                return year
        except ValueError:
            pass
        return None
    
    def _parse_time(self, text: str) -> Optional[timedelta]:
        """Parse time string to timedelta"""
        if not text or text.strip() == '':
            return None
        
        # Clean the text
        time_str = text.strip()
        
        # Handle format like "03:11:35" (hours:minutes:seconds)
        time_pattern = r'(\d{1,2}):(\d{2}):(\d{2})'
        match = re.search(time_pattern, time_str)
        
        if match:
            hours = int(match.group(1))
            minutes = int(match.group(2))
            seconds = int(match.group(3))
            return timedelta(hours=hours, minutes=minutes, seconds=seconds)
        
        return None
    
    def _parse_time_behind(self, text: str) -> Optional[timedelta]:
        """Parse time behind (like '+45:47' or '+01:02:51')"""
        if not text or text.strip() == '' or text.strip() == '+':
            return None
        
        # Remove the '+' sign and parse
        time_str = text.strip().lstrip('+')
        
        # Handle format like "45:47" (minutes:seconds) or "01:02:51" (hours:minutes:seconds)
        if time_str.count(':') == 1:
            # Format: MM:SS
            parts = time_str.split(':')
            if len(parts) == 2:
                try:
                    minutes = int(parts[0])
                    seconds = int(parts[1])
                    return timedelta(minutes=minutes, seconds=seconds)
                except ValueError:
                    pass
        elif time_str.count(':') == 2:
            # Format: HH:MM:SS
            return self._parse_time(time_str)
        
        return None
    
    def _parse_splits(self, cell_element) -> List[Dict[str, str]]:
        """Parse split times from HTML cell element into structured data"""
        splits = []
        
        # Get the HTML content of the cell
        cell_html = str(cell_element)
        
        if not cell_html or cell_html.strip() == '':
            return splits
        
        # Split by <br> tags to get individual split lines
        split_lines = []
        
        # Handle different br tag formats
        split_patterns = [r'<br\s*/?>', r'<br>', r'</br>']
        split_text = cell_html
        
        for pattern in split_patterns:
            split_text = re.sub(pattern, '\n', split_text, flags=re.IGNORECASE)
        
        # Remove HTML tags and get lines
        clean_text = BeautifulSoup(split_text, 'html.parser').get_text()
        lines = clean_text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Parse format like "00:58:05 (Hafravatn)"
            pattern = r'(\d{1,2}:\d{2}:\d{2})\s*\(([^)]+)\)'
            match = re.search(pattern, line)
            
            if match:
                time_str = match.group(1)
                location = match.group(2).strip()
                
                time_delta = self._parse_time(time_str)
                if time_delta:
                    splits.append({
                        'time': time_delta,
                        'location': location
                    })
        
        return splits
