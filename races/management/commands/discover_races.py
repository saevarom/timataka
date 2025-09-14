from django.core.management.base import BaseCommand, CommandError
from races.services import ScrapingService
from races.scraper import TimatakaScrapingError
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Discover events from timataka.net homepage and save new ones to database. Each event represents a race event page that may contain multiple individual races.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Overwrite existing event data'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be discovered without saving to database'
        )
        parser.add_argument(
            '--force-refresh',
            action='store_true',
            help='Force refresh of cached HTML from web'
        )

    def handle(self, *args, **options):
        overwrite = options['overwrite']
        dry_run = options['dry_run']
        force_refresh = options['force_refresh']
        
        self.stdout.write("Starting event discovery from timataka.net...")
        
        try:
            service = ScrapingService()
            
            if dry_run:
                # Just discover events without saving
                scraper = service.scraper
                discovered_events = scraper.discover_races_from_homepage(force_refresh=force_refresh)
                
                self.stdout.write(
                    self.style.SUCCESS(f"Discovered {len(discovered_events)} events:")
                )
                
                for event_info in discovered_events:
                    date_str = event_info['date'].strftime('%Y-%m-%d') if event_info['date'] else 'No date'
                    self.stdout.write(f"  - {event_info['name']} ({date_str})")
                    self.stdout.write(f"    URL: {event_info['url']}")
                
                return
            
            # Actually discover and save events
            result = service.discover_and_save_events(overwrite=overwrite, force_refresh=force_refresh)
            
            # Display results
            self.stdout.write(
                self.style.SUCCESS(
                    f"Event discovery completed!\n"
                    f"  Discovered: {result['discovered']} events\n"
                    f"  New events saved: {result['new']}\n"
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
            logger.exception("Unexpected error during event discovery")
            raise CommandError(f"Unexpected error: {str(e)}")
