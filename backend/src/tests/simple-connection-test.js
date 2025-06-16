// Simple test script for timataka.net connection
const axios = require('axios');
const https = require('https');

// Set timeout and bypass SSL issues
axios.defaults.timeout = 10000;
const agent = new https.Agent({
  rejectUnauthorized: false // Ignore SSL certificate issues
});

async function testSimpleConnection() {
  console.log('Testing connection to timataka.net...');
  
  try {
    // First check DNS resolution
    console.log('Checking DNS resolution...');
    const dns = require('dns');
    dns.lookup('timataka.net', (err, address, family) => {
      console.log(`DNS lookup: ${err ? 'Failed: ' + err.message : 'Success'}`);
      if (!err) console.log(`IP address: ${address}`);
    });
    
    console.log('Attempting connection with axios...');
    const start = Date.now();
    const response = await axios.get('https://timataka.net', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      httpsAgent: agent
    });
    const elapsed = Date.now() - start;
    
    console.log(`Connection successful! Response time: ${elapsed}ms`);
    console.log(`Status code: ${response.status}`);
    console.log(`Content length: ${response.data.length} bytes`);
    console.log(`Contains "timataka": ${response.data.includes('timataka')}`);
    
    // Log the first 150 characters of the response
    console.log(`\nFirst 150 characters of response:\n${response.data.substring(0, 150)}...`);
    
  } catch (error) {
    console.error('Connection failed!');
    console.error(`Error: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
    }
  }
}

testSimpleConnection();
