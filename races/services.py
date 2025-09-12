from typing import List, Dict, Optional
import logging
from datetime import datetime
from django.db import transaction
from .scraper import TimatakaScraper, TimatakaScrapingError
from .models import Race, Runner, Result, Split

logger = logging.getLogger(__name__)


class ScrapingService:
    """
    Service class for handling race data scraping operations.
    
    This service provides high-level methods for scraping race data
    and integrating it with the database.
    """
    
    def __init__(self):
        self.scraper = TimatakaScraper()
    
    def scrape_and_save_race_results(self, html_content: str, race_id: int, 
                                   overwrite: bool = False) -> Dict[str, int]:
        """
        Scrape race results from HTML content and save to database.
        
        Args:
            html_content: Raw HTML content from Timataka results page
            race_id: ID of the race in database
            overwrite: Whether to overwrite existing results
            
        Returns:
            Dict with counts: {'scraped': X, 'saved': Y, 'skipped': Z, 'errors': W}
        """
        result = {
            'scraped': 0,
            'saved': 0,
            'skipped': 0,
            'updated': 0,
            'errors': 0
        }
        
        try:
            # Get the race
            race = Race.objects.get(id=race_id)
            
            # Scrape results data
            results_data = self.scraper.scrape_race_results(html_content, race_id)
            result['scraped'] = results_data['results_count']
            
            # Check if results already exist
            existing_results = Result.objects.filter(race=race).count()
            if existing_results > 0 and not overwrite:
                logger.info(f"Results for race '{race.name}' already exist, skipping")
                result['skipped'] = result['scraped']
                return result
            
            # Save results with transaction
            with transaction.atomic():
                if overwrite and existing_results > 0:
                    # Delete existing results
                    Result.objects.filter(race=race).delete()
                    logger.info(f"Deleted {existing_results} existing results for race '{race.name}'")
                
                # Save each result
                for result_data in results_data['results']:
                    try:
                        self._save_result_to_db(result_data, race)
                        result['saved'] += 1
                    except Exception as e:
                        logger.error(f"Error saving result for '{result_data.get('name', 'Unknown')}': {str(e)}")
                        result['errors'] += 1
            
            return result
            
        except Race.DoesNotExist:
            raise TimatakaScrapingError(f"Race with ID {race_id} not found")
        except TimatakaScrapingError as e:
            logger.error(f"Scraping failed: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in results scraping: {str(e)}")
            raise TimatakaScrapingError(f"Service error: {str(e)}")
    
    def _save_result_to_db(self, result_data: Dict, race: Race) -> Result:
        """Save a single result to database"""
        # Get or create runner
        runner = self._get_or_create_runner(
            result_data['name'], 
            result_data.get('year')
        )
        
        # Create result
        result = Result.objects.create(
            race=race,
            runner=runner,
            bib_number=result_data.get('bib', ''),
            club=result_data.get('club', ''),
            finish_time=result_data['finish_time'],
            chip_time=result_data.get('chip_time'),
            time_behind=result_data.get('time_behind'),
            overall_place=result_data.get('rank', 0),
            status='finished'
        )
        
        # Save splits if they exist
        splits_data = result_data.get('splits', [])
        for split_data in splits_data:
            Split.objects.create(
                result=result,
                split_name=split_data['location'],
                split_time=split_data['time']
            )
        
        return result
    
    def _get_or_create_runner(self, name: str, birth_year: Optional[int]) -> Runner:
        """Get or create a runner by name and birth year"""
        # Try to find existing runner by name and birth year
        if birth_year:
            runner, created = Runner.objects.get_or_create(
                name=name,
                birth_year=birth_year,
                defaults={'nationality': 'ISL'}
            )
        else:
            # Try to find by name only
            existing_runners = Runner.objects.filter(name=name)
            if existing_runners.exists():
                # If multiple runners with same name, prefer one with birth year
                runner_with_year = existing_runners.filter(birth_year__isnull=False).first()
                if runner_with_year:
                    return runner_with_year
                else:
                    return existing_runners.first()
            else:
                # Create new runner without birth year
                runner = Runner.objects.create(
                    name=name,
                    birth_year=birth_year,
                    nationality='ISL'
                )
                created = True
        
        if created:
            logger.info(f"Created new runner: {runner}")
        
        return runner
    
    def scrape_and_save_races(self, html_content: str, source_url: str = "", 
                              overwrite: bool = False) -> Dict[str, int]:
        """
        Scrape races from HTML content and save to database.
        
        Args:
            html_content: Raw HTML content from Timataka page
            source_url: Original URL for reference
            overwrite: Whether to overwrite existing races
            
        Returns:
            Dict with counts: {'scraped': X, 'saved': Y, 'skipped': Z, 'errors': W}
        """
        result = {
            'scraped': 0,
            'saved': 0,
            'skipped': 0,
            'updated': 0,
            'errors': 0
        }
        
        try:
            # Scrape race data
            races_data = self.scraper.scrape_race_data(html_content, source_url)
            result['scraped'] = len(races_data)
            
            # Save each race to database
            for race_data in races_data:
                try:
                    save_result = self._save_race_to_db(race_data, overwrite)
                    if save_result == 'saved':
                        result['saved'] += 1
                    elif save_result == 'skipped':
                        result['skipped'] += 1
                    elif save_result == 'updated':
                        result['updated'] += 1
                        
                except Exception as e:
                    logger.error(f"Error saving race '{race_data.get('name', 'Unknown')}': {str(e)}")
                    result['errors'] += 1
            
            return result
            
        except TimatakaScrapingError as e:
            logger.error(f"Scraping failed: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in scraping service: {str(e)}")
            raise TimatakaScrapingError(f"Service error: {str(e)}")
    
    def scrape_races_only(self, html_content: str, source_url: str = "") -> List[Dict]:
        """
        Scrape races from HTML content without saving to database.
        
        Args:
            html_content: Raw HTML content from Timataka page
            source_url: Original URL for reference
            
        Returns:
            List of race dictionaries
        """
        return self.scraper.scrape_race_data(html_content, source_url)
    
    def _save_race_to_db(self, race_data: Dict, overwrite: bool = False) -> str:
        """
        Save a single race to database.
        
        Args:
            race_data: Race data dictionary
            overwrite: Whether to overwrite existing races
            
        Returns:
            String indicating result: 'saved', 'skipped', or 'updated'
        """
        # Remove fields that don't belong in the Race model
        race_data_for_db = race_data.copy()
        race_data_for_db.pop('start_time', None)
        
        # Check if race already exists
        existing_race = Race.objects.filter(
            name=race_data_for_db['name'],
            date=race_data_for_db['date']
        ).first()
        
        if existing_race:
            if overwrite:
                # Update existing race
                for field, value in race_data_for_db.items():
                    setattr(existing_race, field, value)
                existing_race.save()
                logger.info(f"Updated existing race: {existing_race.name}")
                return 'updated'
            else:
                logger.info(f"Race '{race_data_for_db['name']}' already exists, skipping")
                return 'skipped'
        else:
            # Create new race
            race = Race.objects.create(**race_data_for_db)
            logger.info(f"Created new race: {race.name}")
            return 'saved'
    
    def discover_and_save_races(self, overwrite: bool = False) -> Dict[str, int]:
        """
        Discover races from timataka.net homepage and save new ones to database.
        
        Args:
            overwrite: Whether to update existing races (currently not used for discovery)
            
        Returns:
            Dict with counts: {'discovered': X, 'new': Y, 'existing': Z, 'errors': W}
        """
        result = {
            'discovered': 0,
            'new': 0,
            'existing': 0,
            'errors': 0
        }
        
        try:
            # Discover races from homepage
            discovered_races = self.scraper.discover_races_from_homepage()
            result['discovered'] = len(discovered_races)
            
            logger.info(f"Discovered {len(discovered_races)} races from timataka.net")
            
            # Process each discovered race
            for race_info in discovered_races:
                try:
                    # Check if race already exists (by URL)
                    existing_race = Race.objects.filter(source_url=race_info['url']).first()
                    
                    if existing_race:
                        result['existing'] += 1
                        logger.debug(f"Race already exists: {race_info['name']}")
                        continue
                    
                    # Create new race record
                    with transaction.atomic():
                        race = self._create_race_from_discovery(race_info)
                        result['new'] += 1
                        logger.info(f"Saved new race: {race.name} ({race.date})")
                        
                except Exception as e:
                    logger.error(f"Error processing discovered race '{race_info.get('name', 'Unknown')}': {str(e)}")
                    result['errors'] += 1
            
            return result
            
        except TimatakaScrapingError as e:
            logger.error(f"Race discovery failed: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in race discovery: {str(e)}")
            raise TimatakaScrapingError(f"Service error: {str(e)}")
    
    def _create_race_from_discovery(self, race_info: Dict) -> Race:
        """Create a Race object from discovered race information"""
        # Extract basic information
        name = race_info['name']
        race_date = race_info['date']
        source_url = race_info['url']
        
        # Set default values for required fields
        race_type = 'other'  # Default, will be updated when race page is scraped
        location = 'Iceland'  # Default location
        distance_km = 0.0  # Default, will be updated when race page is scraped
        
        # Try to extract some information from the name
        if race_date is None:
            # If no date was extracted, use a placeholder far in the future
            race_date = datetime(2099, 12, 31).date()
        elif hasattr(race_date, 'date'):
            race_date = race_date.date()
        
        # Create and save the race
        race = Race.objects.create(
            name=name,
            description=f"Race discovered from timataka.net - {name}",
            race_type=race_type,
            date=race_date,
            location=location,
            distance_km=distance_km,
            elevation_gain_m=0,
            organizer='Tímataka',
            currency='ISK',
            source_url=source_url,
        )
        
        return race

    def validate_html_content(self, html_content: str) -> bool:
        """
        Validate if HTML content appears to be from a Timataka page.
        
        Args:
            html_content: Raw HTML content
            
        Returns:
            True if content appears valid for scraping
        """
        try:
            # Basic validation - check for Timataka indicators
            html_lower = html_content.lower()
            
            timataka_indicators = [
                'timataka.net',
                'tímataka',
                'ibox-content',
                'stats-label'
            ]
            
            return any(indicator in html_lower for indicator in timataka_indicators)
            
        except Exception as e:
            logger.warning(f"Error validating HTML content: {str(e)}")
            return False
    
    def get_supported_race_types(self) -> List[str]:
        """Get list of supported race types for scraping."""
        return list(self.scraper.race_type_mapping.values())
