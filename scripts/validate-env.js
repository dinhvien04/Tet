#!/usr/bin/env node

/**
 * Validate environment variables before deploy.
 * In non-production, missing optional OAuth/Cloudinary only warn.
 *
 * Usage:
 *   node scripts/validate-env.js
 *   NODE_ENV=production node scripts/validate-env.js
 */

const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'

const alwaysRequired = {
  MONGODB_URI: {
    pattern: /^mongodb(\+srv)?:\/\/.+/,
    description: 'MongoDB connection string',
  },
  NEXTAUTH_SECRET: {
    minLength: 32,
    description: 'NextAuth secret (min 32 characters)',
  },
}

const productionRequired = {
  NEXTAUTH_URL: {
    pattern: /^https:\/\/.+/,
    description: 'Public HTTPS URL of the app',
  },
  CRON_SECRET: {
    minLength: 16,
    description: 'Bearer secret for cron routes',
  },
  CLOUDINARY_CLOUD_NAME: { description: 'Cloudinary cloud name' },
  CLOUDINARY_API_KEY: { description: 'Cloudinary API key' },
  CLOUDINARY_API_SECRET: { minLength: 8, description: 'Cloudinary API secret' },
  MEGALLM_API_KEY: { minLength: 8, description: 'MegaLLM API key' },
  MEGALLM_MODEL: { description: 'MegaLLM model id' },
}

const optional = {
  GOOGLE_CLIENT_ID: { description: 'Google OAuth client id' },
  GOOGLE_CLIENT_SECRET: { description: 'Google OAuth client secret' },
  SYSTEM_ADMIN_EMAILS: { description: 'Comma-separated system admin emails' },
  NEXTAUTH_URL: { description: 'App URL (http://localhost:3000 in dev)' },
  CRON_SECRET: { description: 'Cron secret (optional outside production)' },
  MEGALLM_API_KEY: { description: 'AI key (optional if not testing AI locally)' },
  MEGALLM_MODEL: { description: 'AI model' },
  CLOUDINARY_CLOUD_NAME: { description: 'Cloudinary (optional in local dev)' },
  CLOUDINARY_API_KEY: { description: 'Cloudinary key' },
  CLOUDINARY_API_SECRET: { description: 'Cloudinary secret' },
}

function check(name, config, value) {
  const errors = []
  if (!value) {
    errors.push(`Missing: ${name} (${config.description})`)
    return errors
  }
  if (config.pattern && !config.pattern.test(value)) {
    errors.push(`Invalid format: ${name}`)
  }
  if (config.minLength && value.length < config.minLength) {
    errors.push(`${name} must be at least ${config.minLength} characters`)
  }
  const placeholders = ['your-', 'example', 'placeholder', 'changeme', 'xxxxx']
  if (isProd && placeholders.some((p) => value.toLowerCase().includes(p))) {
    errors.push(`${name} looks like a placeholder`)
  }
  return errors
}

function main() {
  console.log(`\nValidating env (production=${isProd})\n`)
  let failed = false

  const required = { ...alwaysRequired, ...(isProd ? productionRequired : {}) }

  for (const [name, config] of Object.entries(required)) {
    const errors = check(name, config, process.env[name])
    if (errors.length) {
      failed = true
      errors.forEach((e) => console.error('✗', e))
    } else {
      console.log('✓', name)
    }
  }

  if (!isProd) {
    console.log('\nOptional / dev:')
    for (const [name, config] of Object.entries(optional)) {
      if (required[name]) continue
      const value = process.env[name]
      if (!value) {
        console.log('○', name, '— not set')
      } else {
        const errors = check(name, config, value)
        if (errors.length) {
          failed = true
          errors.forEach((e) => console.error('✗', e))
        } else {
          console.log('✓', name)
        }
      }
    }
  }

  if (failed) {
    console.error('\nValidation failed. See .env.example\n')
    process.exit(1)
  }

  console.log('\n✅ Environment OK\n')
  process.exit(0)
}

main()
