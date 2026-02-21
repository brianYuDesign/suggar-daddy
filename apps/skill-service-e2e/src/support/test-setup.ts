/* eslint-disable */
import axios from 'axios';

module.exports = async function () {
  // Configure axios for tests to use.
  // Try multiple environment variables for flexibility
  const host = process.env.API_HOST ?? process.env.HOST ?? 'localhost';
  const port = process.env.API_PORT ?? process.env.PORT ?? '3000';
  const baseURL = `http://${host}:${port}`;
  
  console.log(`[E2E Setup] Configuring axios with baseURL: ${baseURL}`);
  axios.defaults.baseURL = baseURL;
};
