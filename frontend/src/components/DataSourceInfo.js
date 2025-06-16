import React, { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Chip,
  Typography,
  Link,
  Collapse,
  IconButton
} from '@mui/material';
import {
  InfoOutlined as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

/**
 * Component that displays information about the current data source
 * and provides tips for troubleshooting.
 */
function DataSourceInfo({ dataSource }) {
  const [expanded, setExpanded] = useState(false);
  const [dataSourceInfo, setDataSourceInfo] = useState({ 
    source: 'unknown', 
    loading: true,
    error: null
  });

  // Fetch data source information from the API
  useEffect(() => {
    const fetchDataSourceInfo = async () => {
      try {
        const response = await fetch('/api/data-source');
        const data = await response.json();
        setDataSourceInfo({
          source: data.source || 'unknown',
          loading: false,
          error: null
        });
      } catch (error) {
        setDataSourceInfo({
          source: 'unknown',
          loading: false,
          error: 'Unable to determine data source'
        });
      }
    };

    fetchDataSourceInfo();
  }, []);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  if (dataSourceInfo.loading) {
    return null; // Don't show anything while loading
  }

  const isRealData = dataSourceInfo.source === 'real';

  return (
    <Box mb={2}>
      <Box display="flex" alignItems="center">
        <Chip 
          icon={<InfoIcon />}
          label={isRealData ? "Using REAL data" : "Using MOCK data"} 
          color={isRealData ? "primary" : "default"}
          size="small"
        />
        <IconButton 
          onClick={toggleExpanded}
          size="small"
          sx={{ ml: 1 }}
          aria-expanded={expanded}
          aria-label="show data source info"
        >
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Alert severity="info" sx={{ mt: 1 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Current Data Source:</strong> {isRealData ? "timataka.net (REAL data)" : "Local mock data"}
          </Typography>
          
          {isRealData && (
            <>
              <Typography variant="body2" gutterBottom>
                When using real data:
              </Typography>
              <ul style={{ marginTop: 0, paddingLeft: '1.5rem' }}>
                <li>Some events or races may not be available</li>
                <li>Data loading may be slower</li>
                <li>If you encounter issues, you can switch to mock data</li>
              </ul>
              <Typography variant="body2">
                For troubleshooting, run: <code>./timataka-diagnostics.sh</code> from the project root
              </Typography>
            </>
          )}

          {!isRealData && (
            <>
              <Typography variant="body2" gutterBottom>
                You're viewing mock data which provides a stable development experience.
              </Typography>
              <Typography variant="body2">
                To use real data, run: <code>./toggle-data-source.sh real && docker compose restart backend</code>
              </Typography>
            </>
          )}
        </Alert>
      </Collapse>
    </Box>
  );
}

export default DataSourceInfo;
