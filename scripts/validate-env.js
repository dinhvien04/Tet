#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 * 
 * Validates that all required environment variables are set
 * and have valid formats before deployment.
 * 
 * Usage:
 *   node scripts/validate-env.js
 *   NODE_ENV=production node scripts/validate-env.js
 */

const requiredVars = {
  // MongoDB
  MONGODB_URI: {
    required: true,
    pattern: /^mongodb(\+srv)?:\/\/.+/,
    description: 'MongoDB connection string',
    example: 'mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority'
  },
  
  // NextAuth
  NEXTAUTH_URL: {
    required: true,
    pattern: /^https?:\/\/.+/,
    description: 'NextAuth base URL',
    example: 'https://your-domain.com'
  },
  NEXTAUTH_SECRET: {
    required: true,
    minLength: 32,
    description: 'NextAuth secret (min 32 characters)',
    example: 'Generate with: openssl rand -base64 32'
  },
  
  // Google OAuth
  GOOGLE_CLIENT_ID: {
    required: true,
    pattern: /^.+\.apps\.googleusercontent\.com$/,
    description: 'Google OAuth Client ID',
    example: 'xxxxx.apps.googleusercontent.com'
  },
  GOOGLE_CLIENT_SECRET: {
    required: true,
    minLength: 20,
    description: 'Google OAuth Client Secret',
    example: 'GOCSPX-xxxxx'
  },
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: {
    required: true,
    description: 'Cloudinary cloud name',
    example: 'your-cloud-name'
  },
  CLOUDINARY_API_KEY: {
    required: true,
    pattern: /^\d+$/,
    description: 'Cloudinary API key (numeric)',
    example: '123456789012345'
  },
  CLOUDINARY_API_SECRET: {
    required: true,
    minLength: 20,
    description: 'Cloudinary API secret',
    example: 'xxxxx'
  },
  
  // Gemini AI
  GEMINI_API_KEY: {
    required: true,
    minLength: 20,
    description: 'Gemini AI API key',
    example: 'AIzaSyXXXXX'
  },
  
  // Cron Security
  CRON_SECRET: {
    required: true,
    minLength: 32,
    description: 'Cron job authentication secret',
    example: 'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  }
};

const optionalVars = {
  // Analytics (optional)
  NEXT_PUBLIC_GA_ID: {
    pattern: /^G-[A-Z0-9]+$/,
    description: 'Google Analytics ID',
    example: 'G-XXXXXXXXXX'
  },
  SENTRY_DSN: {
    pattern: /^https:\/\/.+@.+\.ingest\.sentry\.io\/.+$/,
    description: 'Sentry DSN for error tracking',
    example: 'https://xxx@xxx.ingest.sentry.io/xxx'
  }
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateVariable(name, config, value) {
  const errors = [];
  const warnings = [];
  
  // Check if required
  if (config.required && !value) {
    errors.push(`Missing required variable: ${name}`);
    return { valid: false, errors, warnings };
  }
  
  // Skip validation if optional and not set
  if (!config.required && !value) {
    return { valid: true, errors, warnings };
  }
  
  // Check pattern
  if (config.pattern && !config.pattern.test(value)) {
    errors.push(`Invalid format for ${name}`);
  }
  
  // Check minimum length
  if (config.minLength && value.length < config.minLength) {
    errors.push(`${name} must be at least ${config.minLength} characters`);
  }
  
  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    // Check for placeholder values
    const placeholders = ['your-', 'example', 'test', 'localhost', 'placeholder'];
    if (placeholders.some(p => value.toLowerCase().includes(p))) {
      warnings.push(`${name} appears to contain a placeholder value`);
    }
    
    // Check NEXTAUTH_URL uses HTTPS
    if (name === 'NEXTAUTH_URL' && !value.startsWith('https://')) {
      errors.push('NEXTAUTH_URL must use HTTPS in production');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function main() {
  log('\n🔍 Validating Environment Variables\n', 'cyan');
  log('='.repeat(60), 'blue');
  
  const environment = process.env.NODE_ENV || 'development';
  log(`\nEnvironment: ${environment}\n`, 'yellow');
  
  let hasErrors = false;
  let hasWarnings = false;
  const results = [];
  
  // Validate required variables
  log('Required Variables:', 'cyan');
  log('-'.repeat(60), 'blue');
  
  for (const [name, config] of Object.entries(requiredVars)) {
    const value = process.env[name];
    const result = validateVariable(name, config, value);
    
    results.push({ name, ...result, required: true });
    
    if (result.valid && value) {
      log(`✓ ${name}`, 'green');
    } else if (!value) {
      log(`✗ ${name} - NOT SET`, 'red');
      log(`  Description: ${config.description}`, 'yellow');
      log(`  Example: ${config.example}`, 'yellow');
      hasErrors = true;
    } else {
      log(`✗ ${name} - INVALID`, 'red');
      result.errors.forEach(err => log(`  ${err}`, 'red'));
      hasErrors = true;
    }
    
    if (result.warnings.length > 0) {
      result.warnings.forEach(warn => log(`  ⚠ ${warn}`, 'yellow'));
      hasWarnings = true;
    }
  }
  
  // Validate optional variables
  log('\n\nOptional Variables:', 'cyan');
  log('-'.repeat(60), 'blue');
  
  for (const [name, config] of Object.entries(optionalVars)) {
    const value = process.env[name];
    const result = validateVariable(name, { ...config, required: false }, value);
    
    results.push({ name, ...result, required: false });
    
    if (value) {
      if (result.valid) {
        log(`✓ ${name}`, 'green');
      } else {
        log(`✗ ${name} - INVALID`, 'red');
        result.errors.forEach(err => log(`  ${err}`, 'red'));
        hasErrors = true;
      }
      
      if (result.warnings.length > 0) {
        result.warnings.forEach(warn => log(`  ⚠ ${warn}`, 'yellow'));
        hasWarnings = true;
      }
    } else {
      log(`○ ${name} - Not set (optional)`, 'yellow');
    }
  }
  
  // Summary
  log('\n' + '='.repeat(60), 'blue');
  log('\n📊 Summary:\n', 'cyan');
  
  const totalRequired = Object.keys(requiredVars).length;
  const setRequired = results.filter(r => r.required && process.env[r.name]).length;
  const validRequired = results.filter(r => r.required && r.valid && process.env[r.name]).length;
  
  log(`Required variables: ${validRequired}/${totalRequired} valid`, 
    validRequired === totalRequired ? 'green' : 'red');
  
  const totalOptional = Object.keys(optionalVars).length;
  const setOptional = results.filter(r => !r.required && process.env[r.name]).length;
  
  log(`Optional variables: ${setOptional}/${totalOptional} set`, 'yellow');
  
  if (hasErrors) {
    log('\n❌ Validation failed! Please fix the errors above.', 'red');
    log('\n💡 Tips:', 'cyan');
    log('  - Check .env.production.example for reference', 'yellow');
    log('  - Run: node scripts/generate-secrets.js to generate secrets', 'yellow');
    log('  - Ensure all values are properly configured', 'yellow');
    process.exit(1);
  } else if (hasWarnings) {
    log('\n⚠️  Validation passed with warnings.', 'yellow');
    log('Please review the warnings above before deploying to production.', 'yellow');
    process.exit(0);
  } else {
    log('\n✅ All environment variables are valid!', 'green');
    log('You are ready to deploy to production.', 'green');
    process.exit(0);
  }
}

// Run validation
try {
  main();
} catch (error) {
  log(`\n❌ Error during validation: ${error.message}`, 'red');
  process.exit(1);
}
