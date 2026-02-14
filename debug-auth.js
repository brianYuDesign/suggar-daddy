const http = require('http');

const data = JSON.stringify({
  email: 'test' + Date.now() + '@example.com',
  password: 'Test1234',
  displayName: 'Test User',
  role: 'sugar_baby'
});

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Sending request to:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('Body:', data);

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));

  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log('Response:', body);
    try {
      const json = JSON.parse(body);
      console.log('Parsed:', JSON.stringify(json, null, 2));
    } catch (e) {
      // Already logged raw body
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(data);
req.end();
