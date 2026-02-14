#!/usr/bin/env node
/**
 * Test backend service dependencies
 */
const net = require('net');

const services = [
  { name: 'PostgreSQL', host: 'localhost', port: 5432 },
  { name: 'Redis', host: 'localhost', port: 6379 },
  { name: 'Kafka', host: 'localhost', port: 9092 },
  { name: 'API Gateway', host: 'localhost', port: 3000 },
  { name: 'Auth Service', host: 'localhost', port: 3002 },
  { name: 'User Service', host: 'localhost', port: 3001 },
];

function testConnection(service) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);

    socket.on('connect', () => {
      socket.destroy();
      resolve({ ...service, status: '✓ Connected' });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ ...service, status: '✗ Timeout' });
    });

    socket.on('error', () => {
      resolve({ ...service, status: '✗ Failed' });
    });

    socket.connect(service.port, service.host);
  });
}

async function main() {
  console.log('Testing backend service connections...\n');

  for (const service of services) {
    const result = await testConnection(service);
    console.log(`${result.status.padEnd(15)} ${result.name} (${result.host}:${result.port})`);
  }

  console.log('\n--- Testing API Endpoints ---\n');

  const http = require('http');

  // Test API Gateway root
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET',
    timeout: 3000,
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log(`✓ API Gateway Root: ${res.statusCode}`);
      console.log(`  Response: ${data.substring(0, 80)}`);
    });
  });

  req.on('error', (e) => {
    console.log(`✗ API Gateway: ${e.message}`);
  });

  req.on('timeout', () => {
    console.log('✗ API Gateway: Request timeout');
    req.destroy();
  });

  req.end();
}

main();
