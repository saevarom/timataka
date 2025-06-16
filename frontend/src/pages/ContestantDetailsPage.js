import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Container,
  Paper,
  Typography,
  Box,
  Divider,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  AccessTime as AccessTimeIcon,
  Timeline as TimelineIcon,
  DoneAll as DoneAllIcon
} from '@mui/icons-material';
import { fetchContestantDetails } from '../services/api';

function ContestantDetailsPage() {
  const { id } = useParams();
  
  const [starredContestants, setStarredContestants] = useState(() => {
    const stored = localStorage.getItem('starredContestants');
    return stored ? JSON.parse(stored) : [];
  });
  
  // Fetch contestant details
  const { data: contestant, isLoading, error } = useQuery(
    ['contestant', id],
    () => fetchContestantDetails(id),
    {
      refetchInterval: 30000, // Refetch every 30 seconds for live updates
    }
  );
  
  // Check if the contestant is starred
  const isStarred = () => {
    return starredContestants.some(c => c.id === id);
  };
  
  // Toggle star status
  const toggleStar = () => {
    if (!contestant) return;
    
    setStarredContestants(prev => {
      if (isStarred()) {
        return prev.filter(c => c.id !== id);
      } else {
        // Only store minimal info in localStorage
        const contestantToStar = {
          id: contestant.id,
          name: contestant.name,
          bib: contestant.bib
        };
        return [...prev, contestantToStar];
      }
    });
  };
  
  // Save starred contestants to localStorage
  useEffect(() => {
    localStorage.setItem('starredContestants', JSON.stringify(starredContestants));
  }, [starredContestants]);
  
  // Get contestant's progress percentage
  const getProgressPercentage = () => {
    if (!contestant || !contestant.timeSplits || contestant.timeSplits.length === 0) {
      return 0;
    }
    
    return (contestant.timeSplits.length / contestant.totalCheckpoints) * 100;
  };
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          Failed to load contestant details: {error.message}
        </Alert>
      </Container>
    );
  }
  
  if (!contestant) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">
          Contestant details not found.
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        {/* Contestant header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4">
              {contestant.name}
              <IconButton
                onClick={toggleStar}
                color="primary"
                sx={{ ml: 1 }}
              >
                {isStarred() ? <StarIcon /> : <StarBorderIcon />}
              </IconButton>
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              {contestant.bib && (
                <Chip label={`Bib: ${contestant.bib}`} size="small" />
              )}
              {contestant.category && (
                <Chip label={contestant.category} size="small" />
              )}
              {contestant.team && (
                <Chip label={contestant.team} size="small" />
              )}
            </Box>
          </Box>
          
          {contestant.finalTime && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h5">{contestant.finalTime}</Typography>
              <Typography variant="body2" color="text.secondary">
                Final Time
              </Typography>
              {contestant.position && (
                <Chip 
                  label={`Position: ${contestant.position}`} 
                  color="primary" 
                  sx={{ mt: 1 }} 
                />
              )}
            </Box>
          )}
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Race status */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
              <AccessTimeIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h6">Status</Typography>
              <Typography variant="body1">
                {contestant.status || (contestant.finalTime ? 'Finished' : 'In progress')}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
              <TimelineIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h6">Progress</Typography>
              <Typography variant="body1">
                {`${contestant.timeSplits?.length || 0} of ${contestant.totalCheckpoints || '?'} checkpoints`}
              </Typography>
              <Box sx={{ width: '100%', bgcolor: 'grey.300', height: 10, mt: 1, borderRadius: 5 }}>
                <Box
                  sx={{
                    width: `${getProgressPercentage()}%`,
                    bgcolor: 'primary.main',
                    height: '100%',
                    borderRadius: 5
                  }}
                />
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
              <DoneAllIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h6">Last Update</Typography>
              <Typography variant="body1">
                {contestant.lastUpdate || 'No data'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
        
        {/* Time splits */}
        <Typography variant="h6" gutterBottom>
          Time Splits
        </Typography>
        
        {(!contestant.timeSplits || contestant.timeSplits.length === 0) ? (
          <Alert severity="info">No time split data available yet.</Alert>
        ) : (
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Checkpoint</TableCell>
                  <TableCell>Distance</TableCell>
                  <TableCell>Split Time</TableCell>
                  <TableCell>Overall Time</TableCell>
                  <TableCell>Position</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contestant.timeSplits.map((split, index) => (
                  <TableRow key={index}>
                    <TableCell>{split.checkpoint}</TableCell>
                    <TableCell>{split.distance || 'N/A'}</TableCell>
                    <TableCell>{split.splitTime || 'N/A'}</TableCell>
                    <TableCell>{split.time}</TableCell>
                    <TableCell>{split.position}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
}

export default ContestantDetailsPage;
