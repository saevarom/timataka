// Test script to check real data from timataka.net
const axios = require('axios');
const cheerio = require('cheerio');

// Configure axios with timeouts
axios.defaults.timeout = 10000; // 10 seconds timeout

const BASE_URL = 'https://timataka.net';

async function testRealData() {
  console.log('Testing real data from timataka.net');
  console.log('================================');

  try {
    // Test connection to timataka.net
    console.log('\nTesting connection to timataka.net...');
    const response = await axios.get(BASE_URL);
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content length: ${response.data.length} bytes`);

    // Check if the HTML contains expected elements
    const $ = cheerio.load(response.data);
    console.log(`Page title: ${$('title').text()}`);
    console.log(`Found ${$('a').length} links on the page`);

    // Check for races
    console.log('\nLooking for race links...');
    const raceLinks = $('a').filter((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text();
      return href && 
        (href.includes('/urslit/') || 
         text.includes('Marathon') || 
         text.includes('Run') ||
         text.includes('race'));
    });

    if (raceLinks.length > 0) {
      console.log(`Found ${raceLinks.length} potential race links:`);
      raceLinks.each((i, el) => {
        if (i < 5) { // Show first 5 only
          console.log(`- ${$(el).text().trim()} (${$(el).attr('href')})`);
        }
      });

      // Try to access a race page
      const firstRaceLink = $(raceLinks[0]).attr('href');
      const fullRaceUrl = firstRaceLink.startsWith('http') ? firstRaceLink : `${BASE_URL}${firstRaceLink}`;
      
      console.log(`\nAccessing race page: ${fullRaceUrl}`);
      const raceResponse = await axios.get(fullRaceUrl);
      console.log(`Status: ${raceResponse.status} ${raceResponse.statusText}`);
      console.log(`Content length: ${raceResponse.data.length} bytes`);
      
      const $race = cheerio.load(raceResponse.data);
      console.log(`Page title: ${$race('title').text()}`);
      
      // Look for results table
      const resultsTables = $race('table');
      console.log(`Found ${resultsTables.length} tables on the page`);
      
      if (resultsTables.length > 0) {
        const firstTable = resultsTables.first();
        const rows = $race('tr', firstTable);
        console.log(`Found ${rows.length} rows in the first table`);
        
        if (rows.length > 1) {
          const firstRow = $race('tr', firstTable).eq(1); // Skip header
          const columns = $race('td', firstRow);
          console.log(`First row has ${columns.length} columns`);
          
          if (columns.length > 0) {
            console.log('First row content:');
            columns.each((i, el) => {
              console.log(`- Column ${i+1}: ${$race(el).text().trim()}`);
            });
          }
        }
      } else {
        console.log('No result tables found.');
      }
    } else {
      console.log('No race links found on the homepage.');
    }
    
  } catch (error) {
    console.error('Error testing real data:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status} ${error.response.statusText}`);
    }
  }
}

// Run the test
testRealData();
