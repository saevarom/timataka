import React from 'react';
import { useQuery } from 'react-query';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  DirectionsRun as RaceIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { fetchEvents, fetchRacesByEvent } from '../services/api';

function EventDetailPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();

  // Fetch all events to get the current event details
  const { data: events } = useQuery(
    ['events'],
    fetchEvents,
    {
      refetchOnWindowFocus: false,
      staleTime: 300000, // 5 minutes
    }
  );

  // Fetch races for this specific event
  const {
    data: races,
    isLoading: racesLoading,
    error: racesError
  } = useQuery(
    ['races', eventId],
    () => fetchRacesByEvent(eventId),
    {
      refetchOnWindowFocus: false,
      staleTime: 300000, // 5 minutes
      enabled: !!eventId // Only run the query if we have an eventId
    }
  );

  // Find the current event from the events list
  const event = events?.find(e => e.id === eventId) || { name: 'Event Details', date: '' };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        {/* Header with back button */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton 
            onClick={() => navigate('/events')} 
            sx={{ mr: 2 }}
            aria-label="Go back to events"
          >
            <BackIcon />
          </IconButton>
          
          <Box>
            <Typography variant="h5" component="h1">
              {event.name}
            </Typography>
            {event.date && (
              <Typography variant="subtitle1" color="text.secondary">
                <EventIcon sx={{ fontSize: '1rem', mr: 0.5, verticalAlign: 'text-bottom' }} />
                {event.date}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Error message */}
        {racesError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load races: {racesError.message}
            {racesError.response?.status === 404 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  This event might not be available from timataka.net. You can:
                </Typography>
                <ul>
                  <li>Try again later</li>
                  <li>Switch to mock data using the toggle button at the top</li>
                  <li>Run diagnostic tool: <code>./timataka-diagnostics.sh</code></li>
                </ul>
              </Box>
            )}
          </Alert>
        )}

        {/* Loading indicator */}
        {racesLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Races list */}
        {!racesLoading && races && races.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mb: 2 }}>
              <RaceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Races
            </Typography>

            <Grid container spacing={2}>
              {races.map((race) => (
                <Grid item xs={12} sm={6} md={4} key={race.id}>
                  <Card elevation={2}>
                    <CardActionArea component={RouterLink} to={`/race/${race.id}`}>
                      <CardContent>
                        <Typography variant="h6" component="div">
                          {race.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          View results
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* No races message */}
        {!racesLoading && (!races || races.length === 0) && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="info" sx={{ mb: 3, mx: 'auto', maxWidth: '600px' }}>
              <Typography variant="body1" gutterBottom>
                No races found for this event.
              </Typography>
              <Typography variant="body2">
                If you are using real data from timataka.net, this event might not have any races available.
                You might want to try toggling back to mock data to see example data.
              </Typography>
            </Alert>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
                sx={{ mr: 1 }}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                component={RouterLink}
                to="/events"
                sx={{ ml: 1 }}
              >
                Back to Events
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default EventDetailPage;
