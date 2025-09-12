from django.contrib import admin
from .models import Race, Result, Split


@admin.register(Race)
class RaceAdmin(admin.ModelAdmin):
    list_display = ['name', 'date', 'race_type', 'location', 'distance_km']
    list_filter = ['race_type', 'date', 'location']
    search_fields = ['name', 'location', 'organizer']
    date_hierarchy = 'date'
    ordering = ['-date']


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ['participant_name', 'race', 'overall_place', 'finish_time', 'status']
    list_filter = ['race', 'gender', 'status', 'race__date']
    search_fields = ['participant_name', 'club']
    ordering = ['race', 'overall_place']


@admin.register(Split)
class SplitAdmin(admin.ModelAdmin):
    list_display = ['result', 'distance_km', 'split_time', 'cumulative_time']
    list_filter = ['distance_km']
    ordering = ['result', 'distance_km']
