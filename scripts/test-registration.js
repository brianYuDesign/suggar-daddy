#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testRegistration() {
  console.log('🧪 Testing User Registration API\n');
  
  const testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'Test123456!',
    role: 'sugar_daddy',
    displayName: 'Test User'
  };
  
  console.log('Request:', JSON.stringify(testUser, null, 2));
  
  try {
    const response = await axios.post(`${API_BASE}/auth/register`, testUser, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    console.log('\n✅ Registration successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.log('\n❌ Registration failed!');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('No response received');
      console.log('Error:', error.message);
    } else {
      console.log('Error:', error.message);
    }
    
    throw error;
  }
}

// Run test
testRegistration()
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch(() => {
    console.log('\n❌ Tests failed!');
    process.exit(1);
  });
