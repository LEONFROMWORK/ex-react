// Quick test to check server status
const http = require('http');

function testEndpoint(url, callback) {
  http.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      callback(null, {
        status: res.statusCode,
        data: data.substring(0, 200) // First 200 chars
      });
    });
  }).on('error', (err) => {
    callback(err, null);
  });
}

console.log('Testing server endpoints...\n');

// Test health endpoint
testEndpoint('http://localhost:3000/api/health', (err, result) => {
  if (err) {
    console.log('Health Check: Server not running ❌');
    console.log('Please run: npm run dev');
  } else {
    console.log('Health Check:', result.status === 200 ? '✅' : '❌');
    if (result.data) {
      try {
        const health = JSON.parse(result.data);
        console.log('  Database:', health.services.database);
        console.log('  Redis:', health.services.redis);
        console.log('  Cache:', health.services.cache);
      } catch (e) {
        console.log('  Response:', result.data);
      }
    }
  }
  
  // Test home page
  testEndpoint('http://localhost:3000', (err, result) => {
    if (!err) {
      console.log('\nHome Page:', result.status === 200 ? '✅' : '❌');
    }
    
    // Test test page
    testEndpoint('http://localhost:3000/test', (err, result) => {
      if (!err) {
        console.log('Test Page:', result.status === 200 ? '✅' : '❌');
      }
      
      console.log('\n📝 Summary:');
      console.log('If all tests show ✅, the server is working correctly.');
      console.log('Visit http://localhost:3000/test to run interactive tests.');
    });
  });
});