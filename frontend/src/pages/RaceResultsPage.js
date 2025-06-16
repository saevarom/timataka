import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  IconButton,
  Box,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { fetchRaceResults, searchContestants } from '../services/api';

function RaceResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialSearchTerm = queryParams.get('search') || '';

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [localSearch, setLocalSearch] = useState('');
  const [starredContestants, setStarredContestants] = useState(() => {
    const stored = localStorage.getItem('starredContestants');
    return stored ? JSON.parse(stored) : [];
  });

  // Fetch race results or search for contestants
  const { data, isLoading, error } = useQuery(
    ['raceResults', searchTerm],
    () => searchTerm ? searchContestants(searchTerm) : fetchRaceResults(),
    {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
    }
  );

  // Save starred contestants to localStorage
  useEffect(() => {
    localStorage.setItem('starredContestants', JSON.stringify(starredContestants));
  }, [starredContestants]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(localSearch);
    navigate(`/races?search=${encodeURIComponent(localSearch)}`);
  };

  // Toggle star status for a contestant
  const toggleStar = (contestant) => {
    setStarredContestants(prev => {
      const isStarred = prev.some(c => c.id === contestant.id);
      if (isStarred) {
        return prev.filter(c => c.id !== contestant.id);
      } else {
        return [...prev, contestant];
      }
    });
  };

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Check if a contestant is starred
  const isStarred = (contestantId) => {
    return starredContestants.some(c => c.id === contestantId);
  };

  // Navigate to contestant details
  const viewContestantDetails = (id) => {
    navigate(`/contestant/${id}`);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h5" gutterBottom>
          Race Results
        </Typography>

        {/* Search form */}
        <Box component="form" onSubmit={handleSearch} sx={{ 
          mb: 3, 
          display: 'flex', 
          alignItems: 'center',
          flexDirection: { xs: 'column', sm: 'row' },
          width: '100%'
        }}>
          <TextField
            label="Search contestants"
            variant="outlined"
            size="small"
            fullWidth
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            sx={{ 
              mr: { xs: 0, sm: 1 },
              mb: { xs: 1, sm: 0 },
              width: '100%'
            }}
          />
          <IconButton 
            type="submit" 
            color="primary" 
            aria-label="search"
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          >
            <SearchIcon />
          </IconButton>
        </Box>

        {searchTerm && (
          <Box sx={{ mb: 2 }}>
            <Chip 
              label={`Search results for: ${searchTerm}`} 
              onDelete={() => {
                setSearchTerm('');
                setLocalSearch('');
                navigate('/races');
              }} 
            />
          </Box>
        )}

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load race results: {error.message}
          </Alert>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Results table */}
        {!isLoading && data && (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Position</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Bib</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Category</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) || []).map((contestant) => (
                    <TableRow 
                      key={contestant.id} 
                      hover 
                      onClick={() => viewContestantDetails(contestant.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{contestant.position}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body1">{contestant.name}</Typography>
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ display: { xs: 'block', md: 'none' } }}
                          >
                            {contestant.category}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{contestant.bib}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{contestant.category}</TableCell>
                      <TableCell>{contestant.time}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStar(contestant);
                          }}
                          color="primary"
                        >
                          {isStarred(contestant.id) ? <StarIcon /> : <StarBorderIcon />}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
              component="div"
              count={data.length || 0}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                '.MuiTablePagination-selectLabel': {
                  display: { xs: 'none', sm: 'block' }
                },
                '.MuiTablePagination-displayedRows': {
                  display: { xs: 'none', sm: 'block' }
                }
              }}
            />
          </>
        )}
      </Paper>
    </Container>
  );
}

export default RaceResultsPage;
