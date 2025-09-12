#!/usr/bin/env python3
"""
Django management command to process Race records and extract Results from their result pages.

This command fetches race result pages and extracts individual runner results,
storing them as Result records with runner information, times, and splits.
"""

import logging
import requests
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from races.models import Race, Result
from races.services import ScrapingService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process Race records and extract Results from their result pages'

    def add_arguments(self, parser):
        parser.add_argument(
            '--race-ids',
            nargs='+',
            type=int,
            help='Specific race IDs to process (space-separated)'
        )
        parser.add_argument(
            '--limit',
            type=int,
            help='Maximum number of races to process in this run'
        )
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Overwrite existing results for races'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be processed without actually processing'
        )

    def handle(self, *args, **options):
        self.verbosity = options.get('verbosity', 1)
        self.dry_run = options.get('dry_run', False)
        self.overwrite = options.get('overwrite', False)
        self.service = ScrapingService()
        
        if self.verbosity >= 1:
            self.stdout.write("Starting race results processing...")
        
        # Determine which races to process
        races_to_process = self._get_races_to_process(options)
        
        if self.dry_run:
            self._show_dry_run_info(races_to_process)
            return
        
        # Process races
        self._process_races(races_to_process)
        
        if self.verbosity >= 1:
            self._show_final_statistics()

    def _get_races_to_process(self, options):
        """Get the list of races to process based on command options"""
        if options.get('race_ids'):
            if self.verbosity >= 2:
                self.stdout.write(f"Processing specific races: {options['race_ids']}")
            races = Race.objects.filter(id__in=options['race_ids'])
        else:
            if self.verbosity >= 2:
                self.stdout.write("Processing all races without results")
            # Get races that don't have results yet (or all if overwrite is True)
            if self.overwrite:
                races = Race.objects.all()
            else:
                races = Race.objects.filter(results__isnull=True).distinct()
        
        # Apply limit if specified
        if options.get('limit'):
            if self.verbosity >= 2:
                self.stdout.write(f"Limited to {options['limit']} races")
            races = races[:options['limit']]
        
        return races

    def _show_dry_run_info(self, races):
        """Show what would be processed in a dry run"""
        self.stdout.write(f"\n=== DRY RUN ===")
        self.stdout.write(f"Would process {races.count()} races:")
        
        for race in races[:10]:  # Show first 10
            result_count = Result.objects.filter(race=race).count()
            results_url = self._build_results_url(race)
            
            self.stdout.write(
                f"  {race.id}: {race.name} "
                f"({result_count} existing results) "
                f"-> {results_url}"
            )
        
        if races.count() > 10:
            self.stdout.write(f"  ... and {races.count() - 10} more races")

    def _process_races(self, races):
        """Process each race to extract results"""
        total_races = races.count()
        processed_count = 0
        success_count = 0
        error_count = 0
        total_results_saved = 0
        
        for race in races:
            processed_count += 1
            
            if self.verbosity >= 2:
                self.stdout.write(
                    f"Processing race {processed_count}/{total_races}: {race.name}"
                )
            
            try:
                # Build the results URL for this race
                results_url = self._build_results_url(race)
                
                if not results_url:
                    if self.verbosity >= 2:
                        self.stdout.write(
                            self.style.WARNING(f"  Skipping: No results URL could be built")
                        )
                    continue
                
                # Fetch the results page
                html_content = self._fetch_results_page(results_url)
                
                if not html_content:
                    if self.verbosity >= 2:
                        self.stdout.write(
                            self.style.WARNING(f"  Skipping: Could not fetch results page")
                        )
                    continue
                
                # Process results
                result_stats = self.service.scrape_and_save_race_results(
                    html_content, 
                    race.id, 
                    overwrite=self.overwrite
                )
                
                success_count += 1
                total_results_saved += result_stats['saved']
                
                if self.verbosity >= 2:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  ✓ Saved {result_stats['saved']} results "
                            f"(scraped: {result_stats['scraped']}, "
                            f"errors: {result_stats['errors']})"
                        )
                    )
                
                # Update race with results URL if not set
                if not race.results_url:
                    race.results_url = results_url
                    race.save()
                
            except Exception as e:
                error_count += 1
                logger.error(f"Error processing race {race.id} '{race.name}': {str(e)}")
                if self.verbosity >= 1:
                    self.stdout.write(
                        self.style.ERROR(f"  ✗ Error processing race '{race.name}': {str(e)}")
                    )
        
        # Show summary
        if self.verbosity >= 1:
            self.stdout.write("\nRace results processing completed!")
            self.stdout.write(f"  Races processed: {success_count}")
            self.stdout.write(f"  Total results saved: {total_results_saved}")
            self.stdout.write(f"  Errors: {error_count}")
            
            if error_count > 0:
                self.stdout.write(
                    self.style.WARNING(f"⚠️  {error_count} errors occurred during processing. Check logs for details.")
                )

    def _build_results_url(self, race):
        """Build the results URL for a race"""
        # Check if race already has a results_url
        if race.results_url:
            return race.results_url
        
        # Try to build URL from event URL
        event_url = race.event.url
        
        if not event_url:
            return None
        
        # Case 1: Event URL already points to results (ends with /urslit/)
        if '/urslit/' in event_url:
            return event_url
        
        # Case 2: Event URL is an event page - need to build results URL
        # For complex events with multiple races, we need to find the specific race ID
        
        # For now, try the simple approach: add /urslit/ to the event URL
        if event_url.endswith('/'):
            results_url = event_url + 'urslit/'
        else:
            results_url = event_url + '/urslit/'
        
        return results_url

    def _fetch_results_page(self, url):
        """Fetch the HTML content of a results page"""
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return response.text
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching results page {url}: {str(e)}")
            return None

    def _show_final_statistics(self):
        """Show final statistics about the processing"""
        total_races = Race.objects.count()
        races_with_results = Race.objects.filter(results__isnull=False).distinct().count()
        total_results = Result.objects.count()
        
        self.stdout.write(f"\nFinal race results statistics:")
        self.stdout.write(f"  Total races: {total_races}")
        self.stdout.write(f"  Races with results: {races_with_results}")
        self.stdout.write(f"  Races without results: {total_races - races_with_results}")
        self.stdout.write(f"  Total results: {total_results}")
        if races_with_results > 0:
            self.stdout.write(f"  Average results per race: {total_results / races_with_results:.1f}")
