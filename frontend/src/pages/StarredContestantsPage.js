import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from 'react-query';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Chip,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import {
  Star as StarIcon,
  PersonRemove as PersonRemoveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { fetchContestantDetails } from '../services/api';

function StarredContestantsPage() {
  const navigate = useNavigate();
  const [starredContestants, setStarredContestants] = useState([]);
  
  // Load starred contestants from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('starredContestants');
    if (stored) {
      setStarredContestants(JSON.parse(stored));
    }
  }, []);
  
  // Fetch details for all starred contestants
  const starredResults = useQueries(
    starredContestants.map(contestant => {
      return {
        queryKey: ['contestant', contestant.id],
        queryFn: () => fetchContestantDetails(contestant.id),
        refetchInterval: 30000, // Refetch every 30 seconds for live updates
      };
    })
  );
  
  // Remove a contestant from starred list
  const removeContestant = (id) => {
    const newStarred = starredContestants.filter(c => c.id !== id);
    setStarredContestants(newStarred);
    localStorage.setItem('starredContestants', JSON.stringify(newStarred));
  };
  
  // View contestant details
  const viewContestantDetails = (id) => {
    navigate(`/contestant/${id}`);
  };
  
  // Check if all queries are still loading
  const isLoading = starredResults.some(result => result.isLoading);
  
  // Get contestant status text
  const getStatusText = (contestant) => {
    if (!contestant) return 'No data';
    if (contestant.finalTime) return 'Finished';
    if (contestant.timeSplits && contestant.timeSplits.length > 0) return 'In progress';
    return 'Not started';
  };
  
  // Get contestant's latest checkpoint
  const getLatestCheckpoint = (contestant) => {
    if (!contestant || !contestant.timeSplits || contestant.timeSplits.length === 0) {
      return 'No checkpoints';
    }
    const latest = contestant.timeSplits[contestant.timeSplits.length - 1];
    return `${latest.checkpoint}: ${latest.time}`;
  };
  
  // Force refresh all data
  const refreshAll = () => {
    starredResults.forEach(result => result.refetch());
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            Starred Contestants
          </Typography>
          <Button 
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={refreshAll}
          >
            Refresh All
          </Button>
        </Box>
        
        {starredContestants.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            You haven't starred any contestants yet. Browse race results and click the star icon to add contestants here.
          </Alert>
        ) : isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {starredResults.map((result, index) => {
              const contestantId = starredContestants[index]?.id;
              const contestant = result.data || starredContestants[index];
              
              return (
                <Grid item xs={12} sm={6} md={4} key={contestantId}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative'
                    }}
                  >
                    <IconButton
                      size="small"
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                      onClick={() => removeContestant(contestantId)}
                      color="primary"
                    >
                      <PersonRemoveIcon fontSize="small" />
                    </IconButton>
                    
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <StarIcon color="primary" fontSize="small" sx={{ mr: 1 }} />
                        <Typography variant="h6" noWrap>
                          {contestant.name || 'Unknown contestant'}
                        </Typography>
                      </Box>
                      
                      {contestant.bib && (
                        <Chip 
                          label={`Bib: ${contestant.bib}`} 
                          size="small" 
                          sx={{ mb: 1 }} 
                        />
                      )}
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Status:
                        </Typography>
                        <Typography variant="body1">
                          {getStatusText(result.data)}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Latest checkpoint:
                        </Typography>
                        <Typography variant="body1">
                          {getLatestCheckpoint(result.data)}
                        </Typography>
                      </Box>
                      
                      {result.error && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          Failed to load data
                        </Alert>
                      )}
                    </CardContent>
                    
                    <CardActions>
                      <Button 
                        size="small" 
                        fullWidth
                        variant="contained"
                        onClick={() => viewContestantDetails(contestantId)}
                      >
                        View Details
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Paper>
    </Container>
  );
}

export default StarredContestantsPage;
