import React from 'react';
import { Typography, Paper, Container, Grid, Button } from '@mui/material';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ 
        p: 4, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0.95)), url("https://images.unsplash.com/photo-1452626038306-9aae5e071dd1?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <Typography variant="h4" gutterBottom color="primary" sx={{ fontWeight: 'bold' }}>
          Welcome to Timataka Results
        </Typography>
        <Typography variant="body1" paragraph align="center" sx={{ maxWidth: '600px', mb: 3 }}>
          Get better insights into race results from timataka.net with our improved interface.
          Track your favorite contestants, get live updates, and quickly search through results.
        </Typography>
        
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <Paper
              elevation={4}
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                borderTop: '4px solid #3f51b5',
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)'
                }
              }}
            >
              <Typography variant="h5" gutterBottom color="primary">
                Browse Races
              </Typography>
              <Typography variant="body2" paragraph align="center">
                View all available races and search through results to find 
                specific contestants and their performance.
              </Typography>
              <Button 
                variant="contained" 
                component={Link} 
                to="/races"
                sx={{ mt: 'auto' }}
              >
                View Races
              </Button>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper
              elevation={4}
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                borderTop: '4px solid #f50057',
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)'
                }
              }}
            >
              <Typography variant="h5" gutterBottom color="secondary">
                Starred Contestants
              </Typography>
              <Typography variant="body2" paragraph align="center">
                View your starred contestants and get live updates on their
                progress. Updates refresh automatically every 30 seconds.
              </Typography>
              <Button 
                variant="contained" 
                component={Link} 
                to="/starred"
                color="secondary"
                sx={{ mt: 'auto' }}
              >
                View Starred
              </Button>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper
              elevation={4}
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                borderTop: '4px solid #4caf50',
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)'
                }
              }}
            >
              <Typography variant="h5" gutterBottom sx={{ color: '#4caf50' }}>
                Search
              </Typography>
              <Typography variant="body2" paragraph align="center">
                Search for contestants by name with support for Icelandic 
                characters. Find contestants across all available races.
              </Typography>
              <Button 
                variant="contained" 
                component={Link} 
                to="/races?search="
                sx={{ mt: 'auto', bgcolor: '#4caf50' }}
              >
                Search
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ borderBottom: '2px solid #f0f0f0', pb: 1 }}>
          Application Features
        </Typography>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="primary">Real-time Updates</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Get automatic updates on contestant progress through time splits every 30 seconds
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="primary">Star System</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Star your favorite contestants to keep track of them across multiple races
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="primary">Responsive Design</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Optimized for both desktop and mobile viewing with adaptive table layouts
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="primary">Advanced Search</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Powerful search with support for Icelandic characters and name matching
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}

export default HomePage;
