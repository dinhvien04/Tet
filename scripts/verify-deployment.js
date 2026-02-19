#!/usr/bin/env node

/**
 * Deployment Verification Script
 * 
 * This script verifies that the production deployment is working correctly
 * by testing critical endpoints and functionality.
 * 
 * Usage:
 *   node scripts/verify-deployment.js https://your-production-url.vercel.app
 */

const https = require('https');
const http = require('http');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Get production URL from command line argument
const productionUrl = process.argv[2];

if (!productionUrl) {
  logError('Please provide production URL as argument');
  log('Usage: node scripts/verify-deployment.js https://your-production-url.vercel.app', 'cyan');
  process.exit(1);
}

// Parse URL
let baseUrl;
try {
  baseUrl = new URL(productionUrl);
} catch (error) {
  logError(`Invalid URL: ${productionUrl}`);
  process.exit(1);
}

log('\n=== Tết Connect Deployment Verification ===\n', 'cyan');
logInfo(`Testing: ${productionUrl}\n`);

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

// Helper function to make HTTP requests
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000,
    };

    const req = protocol.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Test functions
async function testHomepage() {
  log('\n1. Testing Homepage...', 'yellow');
  
  try {
    const response = await makeRequest('/');
    
    if (response.statusCode === 200) {
      logSuccess('Homepage is accessible (200 OK)');
      results.passed++;
      
      // Check if it's HTML
      if (response.headers['content-type']?.includes('text/html')) {
        logSuccess('Response is HTML');
        results.passed++;
      } else {
        logWarning('Response is not HTML');
        results.warnings++;
      }
      
      // Check for Next.js indicators
      if (response.body.includes('__NEXT_DATA__')) {
        logSuccess('Next.js application detected');
        results.passed++;
      } else {
        logWarning('Next.js indicators not found');
        results.warnings++;
      }
    } else {
      logError(`Homepage returned status ${response.statusCode}`);
      results.failed++;
    }
  } catch (error) {
    logError(`Homepage test failed: ${error.message}`);
    results.failed++;
  }
}

async function testHTTPS() {
  log('\n2. Testing HTTPS...', 'yellow');
  
  if (baseUrl.protocol === 'https:') {
    logSuccess('Using HTTPS');
    results.passed++;
  } else {
    logError('Not using HTTPS - production should use HTTPS');
    results.failed++;
  }
}

async function testAuthEndpoint() {
  log('\n3. Testing Auth Endpoint...', 'yellow');
  
  try {
    const response = await makeRequest('/api/auth/session');
    
    if (response.statusCode === 200) {
      logSuccess('Auth endpoint is accessible');
      results.passed++;
      
      // Try to parse JSON
      try {
        JSON.parse(response.body);
        logSuccess('Auth endpoint returns valid JSON');
        results.passed++;
      } catch {
        logWarning('Auth endpoint response is not valid JSON');
        results.warnings++;
      }
    } else {
      logError(`Auth endpoint returned status ${response.statusCode}`);
      results.failed++;
    }
  } catch (error) {
    logError(`Auth endpoint test failed: ${error.message}`);
    results.failed++;
  }
}

async function testAPIRoutes() {
  log('\n4. Testing API Routes...', 'yellow');
  
  const routes = [
    '/api/families',
    '/api/posts',
    '/api/events',
    '/api/photos',
    '/api/notifications',
  ];
  
  for (const route of routes) {
    try {
      const response = await makeRequest(route);
      
      // These routes should require authentication, so 401 is expected
      if (response.statusCode === 401 || response.statusCode === 403) {
        logSuccess(`${route} - Protected (${response.statusCode})`);
        results.passed++;
      } else if (response.statusCode === 200) {
        logSuccess(`${route} - Accessible (${response.statusCode})`);
        results.passed++;
      } else {
        logWarning(`${route} - Unexpected status ${response.statusCode}`);
        results.warnings++;
      }
    } catch (error) {
      logError(`${route} - Failed: ${error.message}`);
      results.failed++;
    }
  }
}

async function testSecurityHeaders() {
  log('\n5. Testing Security Headers...', 'yellow');
  
  try {
    const response = await makeRequest('/');
    const headers = response.headers;
    
    // Check for security headers
    const securityHeaders = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': ['DENY', 'SAMEORIGIN'],
      'x-xss-protection': '1',
    };
    
    for (const [header, expectedValue] of Object.entries(securityHeaders)) {
      const actualValue = headers[header];
      
      if (actualValue) {
        if (Array.isArray(expectedValue)) {
          if (expectedValue.some(v => actualValue.includes(v))) {
            logSuccess(`${header}: ${actualValue}`);
            results.passed++;
          } else {
            logWarning(`${header}: ${actualValue} (expected one of: ${expectedValue.join(', ')})`);
            results.warnings++;
          }
        } else {
          if (actualValue.includes(expectedValue)) {
            logSuccess(`${header}: ${actualValue}`);
            results.passed++;
          } else {
            logWarning(`${header}: ${actualValue} (expected: ${expectedValue})`);
            results.warnings++;
          }
        }
      } else {
        logWarning(`${header} header not found`);
        results.warnings++;
      }
    }
  } catch (error) {
    logError(`Security headers test failed: ${error.message}`);
    results.failed++;
  }
}

async function testResponseTime() {
  log('\n6. Testing Response Time...', 'yellow');
  
  try {
    const startTime = Date.now();
    await makeRequest('/');
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (responseTime < 1000) {
      logSuccess(`Response time: ${responseTime}ms (excellent)`);
      results.passed++;
    } else if (responseTime < 3000) {
      logSuccess(`Response time: ${responseTime}ms (good)`);
      results.passed++;
    } else {
      logWarning(`Response time: ${responseTime}ms (slow - should be < 3000ms)`);
      results.warnings++;
    }
  } catch (error) {
    logError(`Response time test failed: ${error.message}`);
    results.failed++;
  }
}

async function testStaticAssets() {
  log('\n7. Testing Static Assets...', 'yellow');
  
  const assets = [
    '/favicon.ico',
    '/_next/static/css',
  ];
  
  for (const asset of assets) {
    try {
      const response = await makeRequest(asset);
      
      if (response.statusCode === 200 || response.statusCode === 304) {
        logSuccess(`${asset} - Accessible`);
        results.passed++;
      } else if (response.statusCode === 404) {
        logWarning(`${asset} - Not found (404)`);
        results.warnings++;
      } else {
        logWarning(`${asset} - Status ${response.statusCode}`);
        results.warnings++;
      }
    } catch (error) {
      logWarning(`${asset} - Failed: ${error.message}`);
      results.warnings++;
    }
  }
}

// Run all tests
async function runTests() {
  try {
    await testHomepage();
    await testHTTPS();
    await testAuthEndpoint();
    await testAPIRoutes();
    await testSecurityHeaders();
    await testResponseTime();
    await testStaticAssets();
    
    // Print summary
    log('\n=== Test Summary ===\n', 'cyan');
    logSuccess(`Passed: ${results.passed}`);
    
    if (results.warnings > 0) {
      logWarning(`Warnings: ${results.warnings}`);
    }
    
    if (results.failed > 0) {
      logError(`Failed: ${results.failed}`);
    }
    
    const total = results.passed + results.warnings + results.failed;
    const successRate = ((results.passed / total) * 100).toFixed(1);
    
    log(`\nSuccess Rate: ${successRate}%\n`, 'cyan');
    
    if (results.failed === 0) {
      log('🎉 Deployment verification completed successfully!', 'green');
      log('Your application appears to be working correctly.\n', 'green');
      process.exit(0);
    } else {
      log('⚠️  Some tests failed. Please review the errors above.', 'yellow');
      log('Check the deployment logs and configuration.\n', 'yellow');
      process.exit(1);
    }
  } catch (error) {
    logError(`\nVerification failed with error: ${error.message}`);
    process.exit(1);
  }
}

// Run the tests
runTests();
