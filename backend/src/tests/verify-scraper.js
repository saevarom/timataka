// Test script to verify birth year extraction from timataka.net pages
const { scrapeRaceResults, scrapeContestantDetails, getEvents } = require('../services/scraper');

// Override mock data usage for this test
process.env.USE_MOCK_DATA = 'false';
console.log('Running test script in real scraping mode (USE_MOCK_DATA=false)');
console.log('This script will verify that birth years can be extracted from timataka.net');
console.log('----------------------------------------------------------------------');

// Test functions
async function testBirthYearExtraction() {
  console.log('Testing birth year extraction from race results...');
  
  try {
    // Get some events
    const events = await getEvents(3);
    console.log(`Found ${events.length} events`);
    
    for (const event of events) {
      console.log(`\nEvent: ${event.name} (${event.id})`);
      
      // Get race results for the first race of each event
      const raceResults = await scrapeRaceResults(event.id);
      console.log(`Found ${raceResults.length} contestants`);
      
      // Check how many contestants have birth years
      const withBirthYear = raceResults.filter(c => c.birthYear);
      console.log(`Contestants with birth year: ${withBirthYear.length} (${Math.round(withBirthYear.length / raceResults.length * 100)}%)`);
      
      if (withBirthYear.length > 0) {
        // Show some sample contestants with birth years
        console.log('\nSample contestants with birth years:');
        withBirthYear.slice(0, 3).forEach(contestant => {
          console.log(`- ${contestant.name} (${contestant.birthYear}), Category: ${contestant.category}`);
        });
      }
      
      // If there's at least one contestant with an ID, test the contestant details
      const contestantWithId = raceResults.find(c => c.id && !c.id.includes('-'));
      if (contestantWithId) {
        console.log(`\nTesting contestant details for ${contestantWithId.name}...`);
        try {
          const details = await scrapeContestantDetails(contestantWithId.id);
          console.log(`Fetched details: ${details.name}, Birth Year: ${details.birthYear || 'Not found'}`);
        } catch (error) {
          console.error(`Error fetching contestant details: ${error.message}`);
        }
      }
    }
    
    console.log('\nBirth year extraction test completed');
  } catch (error) {
    console.error(`Error during testing: ${error.message}`);
  }
}

// Run tests
(async () => {
  console.log('Starting scraper verification tests...');
  await testBirthYearExtraction();
})();
