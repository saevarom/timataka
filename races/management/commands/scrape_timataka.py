import os
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from races.scraper import TimatakaScraper, TimatakaScrapingError
from races.models import Race
import json


class Command(BaseCommand):
    help = 'Scrape race data from a Timataka.net HTML file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file', 
            type=str, 
            help='Path to HTML file to scrape (relative to project root)',
            default='sample_data/tindahlaup-2025.html'
        )
        parser.add_argument(
            '--save', 
            action='store_true',
            help='Save scraped races to database'
        )
        parser.add_argument(
            '--output',
            type=str,
            help='Output scraped data to JSON file',
        )

    def handle(self, *args, **options):
        file_path = options['file']
        
        # Make path absolute if relative
        if not os.path.isabs(file_path):
            file_path = os.path.join(settings.BASE_DIR, file_path)
        
        # Check if file exists
        if not os.path.exists(file_path):
            raise CommandError(f'HTML file "{file_path}" does not exist.')
        
        # Read HTML content
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
        except Exception as e:
            raise CommandError(f'Error reading file: {str(e)}')
        
        # Initialize scraper
        scraper = TimatakaScraper()
        
        # Scrape data
        try:
            self.stdout.write(f'Scraping race data from: {file_path}')
            source_url = f"file://{file_path}"
            races_data = scraper.scrape_race_data(html_content, source_url)
            
            self.stdout.write(self.style.SUCCESS(f'Successfully scraped {len(races_data)} race(s)'))
            
            # Display scraped data
            for i, race_data in enumerate(races_data, 1):
                self.stdout.write(f'\n--- Race {i} ---')
                self.stdout.write(f'Name: {race_data["name"]}')
                self.stdout.write(f'Date: {race_data["date"]}')
                self.stdout.write(f'Distance: {race_data["distance_km"]} km')
                self.stdout.write(f'Type: {race_data["race_type"]}')
                self.stdout.write(f'Location: {race_data["location"]}')
                if race_data.get('start_time'):
                    self.stdout.write(f'Start Time: {race_data["start_time"]}')
            
            # Save to database if requested
            if options['save']:
                self.stdout.write('\nSaving races to database...')
                saved_count = 0
                for race_data in races_data:
                    try:
                        # Remove start_time from race_data since it's not in the model
                        race_data_for_db = race_data.copy()
                        race_data_for_db.pop('start_time', None)
                        
                        # Check if race already exists
                        existing_race = Race.objects.filter(
                            name=race_data_for_db['name'],
                            date=race_data_for_db['date']
                        ).first()
                        
                        if existing_race:
                            self.stdout.write(f'Race "{race_data_for_db["name"]}" already exists, skipping.')
                        else:
                            race = Race.objects.create(**race_data_for_db)
                            saved_count += 1
                            self.stdout.write(f'Saved race: {race.name}')
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(f'Error saving race "{race_data["name"]}": {str(e)}')
                        )
                
                self.stdout.write(self.style.SUCCESS(f'Saved {saved_count} new race(s) to database'))
            
            # Output to JSON file if requested
            if options['output']:
                try:
                    with open(options['output'], 'w', encoding='utf-8') as f:
                        json.dump(races_data, f, indent=2, ensure_ascii=False, default=str)
                    self.stdout.write(self.style.SUCCESS(f'Scraped data saved to: {options["output"]}'))
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'Error saving to JSON: {str(e)}'))
            
        except TimatakaScrapingError as e:
            raise CommandError(f'Scraping failed: {str(e)}')
        except Exception as e:
            raise CommandError(f'Unexpected error: {str(e)}')
