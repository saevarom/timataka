from django.core.management.base import BaseCommand, CommandError
from races.services import ScrapingService
from races.scraper import TimatakaScrapingError
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Discover races from timataka.net homepage and save new ones to database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Overwrite existing race data (currently not used for discovery)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be discovered without saving to database'
        )

    def handle(self, *args, **options):
        overwrite = options['overwrite']
        dry_run = options['dry_run']
        
        self.stdout.write("Starting race discovery from timataka.net...")
        
        try:
            service = ScrapingService()
            
            if dry_run:
                # Just discover races without saving
                scraper = service.scraper
                discovered_races = scraper.discover_races_from_homepage()
                
                self.stdout.write(
                    self.style.SUCCESS(f"Discovered {len(discovered_races)} races:")
                )
                
                for race_info in discovered_races:
                    date_str = race_info['date'].strftime('%Y-%m-%d') if race_info['date'] else 'No date'
                    self.stdout.write(f"  - {race_info['name']} ({date_str})")
                    self.stdout.write(f"    URL: {race_info['url']}")
                
                return
            
            # Actually discover and save races
            result = service.discover_and_save_races(overwrite=overwrite)
            
            # Display results
            self.stdout.write(
                self.style.SUCCESS(
                    f"Race discovery completed!\n"
                    f"  Discovered: {result['discovered']} races\n"
                    f"  New races saved: {result['new']}\n"
                    f"  Existing (unchanged): {result['existing']}\n"
                    f"  Updated with better dates: {result['updated']}\n"
                    f"  Errors: {result['errors']}"
                )
            )
            
            if result['errors'] > 0:
                self.stdout.write(
                    self.style.WARNING(
                        f"⚠️  {result['errors']} errors occurred during processing. "
                        "Check logs for details."
                    )
                )
                
        except TimatakaScrapingError as e:
            raise CommandError(f"Scraping failed: {str(e)}")
        except Exception as e:
            logger.exception("Unexpected error during race discovery")
            raise CommandError(f"Unexpected error: {str(e)}")
