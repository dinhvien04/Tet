#!/usr/bin/env node

/**
 * Generate Secure Secrets for Production Deployment
 * 
 * This script generates cryptographically secure random secrets
 * for use in production environment variables.
 * 
 * Usage:
 *   node scripts/generate-secrets.js
 */

const crypto = require('crypto');

console.log('\n🔐 Generating Secure Secrets for Tết Connect\n');
console.log('=' .repeat(60));

// Generate NEXTAUTH_SECRET (32 bytes, base64)
const nextAuthSecret = crypto.randomBytes(32).toString('base64');
console.log('\n📝 NEXTAUTH_SECRET:');
console.log(nextAuthSecret);
console.log('\nUse this for NextAuth authentication');

// Generate CRON_SECRET (32 bytes, hex)
const cronSecret = crypto.randomBytes(32).toString('hex');
console.log('\n📝 CRON_SECRET:');
console.log(cronSecret);
console.log('\nUse this to secure cron job endpoints');

// Generate alternative formats
console.log('\n' + '='.repeat(60));
console.log('\n💡 Alternative Secret Formats:\n');

// UUID format
const uuid = crypto.randomUUID();
console.log('UUID format:');
console.log(uuid);

// Base64 URL-safe
const urlSafeSecret = crypto.randomBytes(32).toString('base64url');
console.log('\nBase64 URL-safe:');
console.log(urlSafeSecret);

// Hex format (64 characters)
const hexSecret = crypto.randomBytes(32).toString('hex');
console.log('\nHex format (64 chars):');
console.log(hexSecret);

// Instructions
console.log('\n' + '='.repeat(60));
console.log('\n📋 Instructions:\n');
console.log('1. Copy the generated secrets above');
console.log('2. Add them to your Vercel environment variables');
console.log('3. Never commit these secrets to Git');
console.log('4. Store them securely (password manager)');
console.log('5. Use different secrets for dev/staging/production');

console.log('\n⚠️  Security Notes:\n');
console.log('- These secrets are cryptographically secure');
console.log('- Each secret is unique and randomly generated');
console.log('- Minimum length: 32 bytes (256 bits)');
console.log('- Suitable for production use');

console.log('\n' + '='.repeat(60));
console.log('\n✅ Secrets generated successfully!\n');

// Optional: Save to file (commented out for security)
// const fs = require('fs');
// const secretsFile = '.env.secrets';
// const content = `
// # Generated secrets - DO NOT COMMIT
// NEXTAUTH_SECRET=${nextAuthSecret}
// CRON_SECRET=${cronSecret}
// `;
// fs.writeFileSync(secretsFile, content);
// console.log(`Secrets saved to ${secretsFile}`);
