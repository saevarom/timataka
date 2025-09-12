from ninja import Schema
from datetime import date, datetime, timedelta
from typing import Optional, List
from decimal import Decimal


class RaceSchema(Schema):
    id: int
    name: str
    description: Optional[str] = None
    race_type: str
    date: date
    location: str
    distance_km: float
    elevation_gain_m: int = 0
    max_participants: Optional[int] = None
    registration_url: Optional[str] = None
    official_website: Optional[str] = None
    organizer: Optional[str] = None
    entry_fee: Optional[Decimal] = None
    currency: str = "ISK"
    created_at: datetime
    updated_at: datetime


class RaceCreateSchema(Schema):
    name: str
    description: Optional[str] = None
    race_type: str
    date: date
    location: str
    distance_km: float
    elevation_gain_m: int = 0
    max_participants: Optional[int] = None
    registration_url: Optional[str] = None
    official_website: Optional[str] = None
    organizer: Optional[str] = None
    entry_fee: Optional[Decimal] = None
    currency: str = "ISK"
    source_url: Optional[str] = None


class ResultSchema(Schema):
    id: int
    race_id: int
    bib_number: Optional[str] = None
    participant_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    nationality: str = "ISL"
    club: Optional[str] = None
    finish_time: timedelta
    gun_time: Optional[timedelta] = None
    overall_place: int
    gender_place: Optional[int] = None
    age_group_place: Optional[int] = None
    status: str = "finished"
    created_at: datetime
    updated_at: datetime


class ResultCreateSchema(Schema):
    bib_number: Optional[str] = None
    participant_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    nationality: str = "ISL"
    club: Optional[str] = None
    finish_time: timedelta
    gun_time: Optional[timedelta] = None
    overall_place: int
    gender_place: Optional[int] = None
    age_group_place: Optional[int] = None
    status: str = "finished"


class SplitSchema(Schema):
    id: int
    result_id: int
    distance_km: float
    split_time: timedelta
    cumulative_time: timedelta


class SplitCreateSchema(Schema):
    distance_km: float
    split_time: timedelta
    cumulative_time: timedelta


class RaceListFilterSchema(Schema):
    race_type: Optional[str] = None
    location: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    distance_min: Optional[float] = None
    distance_max: Optional[float] = None


class PaginationSchema(Schema):
    count: int
    next: Optional[str] = None
    previous: Optional[str] = None
    results: List[dict]
