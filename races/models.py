from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Runner(models.Model):
    """Model representing a unique runner/participant"""
    
    name = models.CharField(max_length=200)
    birth_year = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1900), MaxValueValidator(2020)])
    gender = models.CharField(max_length=1, choices=[('M', 'Male'), ('F', 'Female')], blank=True)
    nationality = models.CharField(max_length=3, default='ISL', help_text="ISO 3166-1 alpha-3 country code")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['name', 'birth_year']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['birth_year']),
            models.Index(fields=['name', 'birth_year']),
        ]
    
    def __str__(self):
        if self.birth_year:
            return f"{self.name} ({self.birth_year})"
        return self.name


class Event(models.Model):
    """Model representing a racing event (found on timataka.net homepage)"""
    
    name = models.CharField(max_length=200, help_text="Event name as found on timataka.net homepage")
    date = models.DateField(help_text="Event date parsed from homepage")
    url = models.URLField(unique=True, help_text="URL to the event page on timataka.net")
    
    # Processing status
    STATUS_CHOICES = [
        ('discovered', 'Discovered'),
        ('processed', 'Processed'),
        ('error', 'Error'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='discovered')
    last_processed = models.DateTimeField(null=True, blank=True)
    processing_error = models.TextField(blank=True)
    
    # HTML caching
    cached_html = models.TextField(blank=True, help_text="Cached HTML content from the event page")
    html_fetched_at = models.DateTimeField(null=True, blank=True, help_text="When the HTML was last fetched")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['date']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['status']),
            models.Index(fields=['url']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.date}"


class Race(models.Model):
    """Model representing a running race/competition"""
    
    RACE_TYPES = [
        ('marathon', 'Marathon'),
        ('half_marathon', 'Half Marathon'),
        ('10k', '10K'),
        ('5k', '5K'),
        ('trail', 'Trail Run'),
        ('ultra', 'Ultra Marathon'),
        ('other', 'Other'),
    ]
    
    # Link to the event this race belongs to
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='races', null=True, blank=True)
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    race_type = models.CharField(max_length=20, choices=RACE_TYPES)
    date = models.DateField()
    location = models.CharField(max_length=100)
    distance_km = models.FloatField(validators=[MinValueValidator(0.1)])
    elevation_gain_m = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    max_participants = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1)])
    registration_url = models.URLField(blank=True)
    official_website = models.URLField(blank=True)
    organizer = models.CharField(max_length=200, blank=True)
    entry_fee = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='ISK')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    source_url = models.URLField(blank=True, help_text="URL where this race data was scraped from")
    results_url = models.URLField(blank=True, help_text="URL to the overall race results")
    
    # HTML caching
    cached_html = models.TextField(blank=True, help_text="Cached HTML content from the results page")
    html_fetched_at = models.DateTimeField(null=True, blank=True, help_text="When the HTML was last fetched")
    
    class Meta:
        ordering = ['date']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['race_type']),
            models.Index(fields=['location']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.date}"


class Result(models.Model):
    """Model representing a race result for a participant"""
    
    race = models.ForeignKey(Race, on_delete=models.CASCADE, related_name='results')
    runner = models.ForeignKey(Runner, on_delete=models.CASCADE, related_name='results', null=True, blank=True)
    bib_number = models.CharField(max_length=20, blank=True)
    club = models.CharField(max_length=200, blank=True, help_text="Running club or team")
    
    # Legacy fields for migration
    participant_name = models.CharField(max_length=200, blank=True)
    age = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(5), MaxValueValidator(120)])
    nationality = models.CharField(max_length=3, default='ISL', help_text="ISO 3166-1 alpha-3 country code")
    
    # Time results
    finish_time = models.DurationField(help_text="Total race time")
    gun_time = models.DurationField(null=True, blank=True, help_text="Time from gun start")
    chip_time = models.DurationField(null=True, blank=True, help_text="Chip/net time")
    time_behind = models.DurationField(null=True, blank=True, help_text="Time behind winner")
    
    # Status
    STATUS_CHOICES = [
        ('finished', 'Finished'),
        ('dnf', 'Did Not Finish'),
        ('dns', 'Did Not Start'),
        ('dq', 'Disqualified'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='finished')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['finish_time']
        indexes = [
            models.Index(fields=['race', 'finish_time']),
            models.Index(fields=['participant_name']),
            models.Index(fields=['finish_time']),
        ]
    
    def __str__(self):
        if self.runner:
            return f"{self.runner.name} - {self.race.name} ({self.finish_time})"
        return f"{self.participant_name} - {self.race.name} ({self.finish_time})"


class Split(models.Model):
    """Model representing split times during a race"""
    
    result = models.ForeignKey(Result, on_delete=models.CASCADE, related_name='splits')
    split_name = models.CharField(max_length=100, help_text="Name of the split point (e.g., 'Hafravatn')")
    distance_km = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    split_time = models.DurationField(help_text="Cumulative time from start to this split")
    
    class Meta:
        ordering = ['split_time']
        unique_together = ['result', 'split_name']
    
    def __str__(self):
        return f"{self.result.runner.name} - {self.split_name}: {self.split_time}"
