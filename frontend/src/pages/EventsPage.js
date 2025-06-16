import React from 'react';
import { useQuery } from 'react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { Event as EventIcon, DirectionsRun as RaceIcon } from '@mui/icons-material';
import { fetchEvents } from '../services/api';
import { formatDate } from '../utils/helpers';

function EventsPage() {
  // Fetch events
  const { data: events, isLoading, error } = useQuery(
    ['events'],
    fetchEvents,
    {
      refetchOnWindowFocus: false,
      staleTime: 300000, // 5 minutes
    }
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="h1" gutterBottom>
            <EventIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Running Events
          </Typography>
        </Box>

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load events: {error.message}
          </Alert>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Events grid */}
        {!isLoading && events && events.length > 0 && (
          <Grid container spacing={3}>
            {events.map((event) => (
              <Grid item xs={12} sm={6} md={4} key={event.id}>
                <Card elevation={2}>
                  <CardActionArea component={RouterLink} to={`/events/${event.id}`}>
                    <CardContent>
                      <Typography variant="h6" component="div" gutterBottom noWrap>
                        {event.name}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                        <Chip 
                          label={event.date ? formatDate(event.date) : 'No date provided'} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* No events message */}
        {!isLoading && (!events || events.length === 0) && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No events found.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              Refresh
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default EventsPage;
