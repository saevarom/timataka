from django.contrib import admin
from .models import Race, Result, Split, Runner


@admin.register(Runner)
class RunnerAdmin(admin.ModelAdmin):
    list_display = ['name', 'birth_year', 'gender', 'nationality']
    list_filter = ['gender', 'nationality', 'birth_year']
    search_fields = ['name']
    ordering = ['name']


@admin.register(Race)
class RaceAdmin(admin.ModelAdmin):
    list_display = ['name', 'date', 'race_type', 'location', 'distance_km']
    list_filter = ['race_type', 'date', 'location']
    search_fields = ['name', 'location', 'organizer']
    date_hierarchy = 'date'
    ordering = ['-date']


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ['get_participant_name', 'race', 'overall_place', 'finish_time', 'status']
    list_filter = ['race', 'status', 'race__date']
    search_fields = ['runner__name', 'participant_name', 'club']
    ordering = ['race', 'overall_place']
    
    def get_participant_name(self, obj):
        return obj.runner.name if obj.runner else obj.participant_name
    get_participant_name.short_description = 'Participant Name'


@admin.register(Split)
class SplitAdmin(admin.ModelAdmin):
    list_display = ['result', 'split_name', 'split_time']
    list_filter = ['split_name']
    ordering = ['result', 'split_time']
