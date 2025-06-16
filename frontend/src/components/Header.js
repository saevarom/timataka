import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  InputBase, 
  IconButton, 
  Box,
  Chip,
  Tooltip,
  alpha
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Search as SearchIcon, 
  Star as StarIcon, 
  Storage as StorageIcon, 
  Cloud as CloudIcon 
} from '@mui/icons-material';
import { fetchDataSourceInfo } from '../services/api';

// Styled components
const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
    },
  },
}));

function Header() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dataSource, setDataSource] = useState({ loading: true, info: null });
  const navigate = useNavigate();
  
  // Fetch data source information
  useEffect(() => {
    const getDataSourceInfo = async () => {
      try {
        const info = await fetchDataSourceInfo();
        setDataSource({ loading: false, info });
      } catch (error) {
        console.error('Error getting data source info:', error);
        setDataSource({ 
          loading: false, 
          info: { using_mock_data: true, data_source: 'unknown' } 
        });
      }
    };
    
    getDataSourceInfo();
  }, []);
  
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/races?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };
  
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography
          variant="h6"
          noWrap
          component={Link}
          to="/"
          sx={{ display: { xs: 'none', sm: 'block' }, textDecoration: 'none', color: 'white' }}
        >
          Timataka Results
        </Typography>
        
        {!dataSource.loading && dataSource.info && (
          <Tooltip title={`Data source: ${dataSource.info.data_source}`}>
            <Chip
              size="small"
              icon={dataSource.info.using_mock_data ? <StorageIcon /> : <CloudIcon />}
              label={dataSource.info.using_mock_data ? "MOCK DATA" : "REAL DATA"}
              color={dataSource.info.using_mock_data ? "default" : "success"}
              sx={{ 
                ml: 2, 
                bgcolor: dataSource.info.using_mock_data ? 'rgba(255,255,255,0.15)' : 'rgba(76,175,80,0.25)',
                '& .MuiChip-label': { 
                  fontWeight: 'bold', 
                  fontSize: '0.7rem'
                },
                display: { xs: 'none', md: 'flex' }
              }}
            />
          </Tooltip>
        )}
        
        <Box sx={{ flexGrow: 1 }} />
        
        <form onSubmit={handleSearch}>
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Search contestants…"
              inputProps={{ 'aria-label': 'search' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Search>
        </form>
        
        <Box sx={{ display: { xs: 'flex' } }}>
          <Button
            component={Link}
            to="/events"
            color="inherit"
          >
            Events
          </Button>
          <Button
            component={Link}
            to="/races"
            color="inherit"
          >
            Races
          </Button>
          <Button
            component={Link}
            to="/starred"
            color="inherit"
            startIcon={<StarIcon />}
          >
            Starred
          </Button>
          <Button
            component={Link}
            to="/tutorial"
            color="inherit"
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.1)', 
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } 
            }}
          >
            New Features
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
