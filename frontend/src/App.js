import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Container, Paper, Typography, Button } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import RaceResultsPage from './pages/RaceResultsPage';
import ContestantDetailsPage from './pages/ContestantDetailsPage';
import StarredContestantsPage from './pages/StarredContestantsPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import './App.css';

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#f50057',
    },
    mode: 'light',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/races" element={<RaceResultsPage />} />
            <Route path="/race/:raceId" element={<RaceResultsPage />} />
            <Route path="/contestant/:id" element={<ContestantDetailsPage />} />
            <Route path="/starred" element={<StarredContestantsPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:eventId" element={<EventDetailPage />} />
            <Route path="/tutorial" element={
              <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h4" gutterBottom>New Features Tutorial</Typography>
                  <Typography paragraph>
                    Check out our new features that enhance your experience with Timataka results:
                  </Typography>
                  <Typography variant="h6" gutterBottom>1. Event Organization</Typography>
                  <Typography paragraph>
                    Events now organize related races together, making it easier to find and compare results 
                    from the same competition. Access events from the header menu or homepage.
                  </Typography>
                  
                  <Typography variant="h6" gutterBottom>2. Birth Year Display</Typography>
                  <Typography paragraph>
                    Birth years now appear next to contestant names, helping to differentiate 
                    between runners with the same name. Look for birth years in parentheses: "John Smith (1985)"
                  </Typography>
                  
                  <Typography variant="h6" gutterBottom>3. Birth Year Search</Typography>
                  <Typography paragraph>
                    You can now search using birth years to find specific runners. Simply include the year 
                    in your search: "John Smith 1985" or "John Smith (1985)"
                  </Typography>
                  
                  <Button variant="contained" component={Link} to="/events" sx={{ mr: 2 }}>
                    Try Browsing Events
                  </Button>
                  <Button variant="contained" component={Link} to="/races?search=1985" color="secondary">
                    Try Birth Year Search
                  </Button>
                </Paper>
              </Container>
            } />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
