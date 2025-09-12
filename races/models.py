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
    gender = models.CharField(max_length=1, choices=[('M', 'Male'), ('F', 'Female')], blank=True)
    nationality = models.CharField(max_length=3, default='ISL', help_text="ISO 3166-1 alpha-3 country code")
    
    # Time results
    finish_time = models.DurationField(help_text="Total race time")
    gun_time = models.DurationField(null=True, blank=True, help_text="Time from gun start")
    chip_time = models.DurationField(null=True, blank=True, help_text="Chip/net time")
    time_behind = models.DurationField(null=True, blank=True, help_text="Time behind winner")
    
    # Placement
    overall_place = models.IntegerField(validators=[MinValueValidator(1)])
    gender_place = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1)])
    age_group_place = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1)])
    
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
        ordering = ['overall_place']
        unique_together = ['race', 'overall_place']
        indexes = [
            models.Index(fields=['race', 'overall_place']),
            models.Index(fields=['participant_name']),
            models.Index(fields=['finish_time']),
        ]
    
    def __str__(self):
        if self.runner:
            return f"{self.runner.name} - {self.race.name} (#{self.overall_place})"
        return f"{self.participant_name} - {self.race.name} (#{self.overall_place})"


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
