/**
 * Round 3/4 consistency audit / limited apply.
 *
 * Uses Mongoose model collection names (not hard-coded guesses).
 *
 * Usage:
 *   node scripts/migration-round3.js --mode=audit
 *   node scripts/migration-round3.js --mode=audit --strict
 *   MIGRATION_CONFIRM=<dbname> node scripts/migration-round3.js --mode=apply --confirm=<dbname>
 */

const path = require('path')
// Load ts compiled paths via relative requires of compiled models is hard;
// use mongoose models after dynamic import of built dist is unavailable —
// connect and use collection names from mongoose model registration.

async function main() {
  const mongoose = require('mongoose')
  const args = process.argv.slice(2)
  const mode =
    args.find((a) => a.startsWith('--mode='))?.split('=')[1] || 'audit'
  const confirm =
    args.find((a) => a.startsWith('--confirm='))?.split('=')[1] || ''
  const strict = args.includes('--strict')

  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI is required')
    process.exit(1)
  }
  const lower = uri.toLowerCase()
  if (lower.includes('mongodb.net') && !process.env.ALLOW_PROD_MIGRATION) {
    console.error('Refusing Atlas URI without ALLOW_PROD_MIGRATION=1')
    process.exit(1)
  }

  await mongoose.connect(uri)

  // Register models
  require(path.join(__dirname, '../lib/models/User.ts'))
  // Use .js paths won't work — register schemas inline for script stability
  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }))
  const FamilyMember =
    mongoose.models.FamilyMember ||
    mongoose.model('FamilyMember', new mongoose.Schema({}, { strict: false }))
  const BauCuaRound =
    mongoose.models.BauCuaRound ||
    mongoose.model('BauCuaRound', new mongoose.Schema({}, { strict: false }))
  const BauCuaSettlement =
    mongoose.models.BauCuaSettlement ||
    mongoose.model('BauCuaSettlement', new mongoose.Schema({}, { strict: false }))
  const BauCuaFamilyState =
    mongoose.models.BauCuaFamilyState ||
    mongoose.model('BauCuaFamilyState', new mongoose.Schema({}, { strict: false }))
  const BauCuaWallet =
    mongoose.models.BauCuaWallet ||
    mongoose.model('BauCuaWallet', new mongoose.Schema({}, { strict: false }))
  const Photo =
    mongoose.models.Photo ||
    mongoose.model('Photo', new mongoose.Schema({}, { strict: false }))
  const RateLimit =
    mongoose.models.RateLimit ||
    mongoose.model('RateLimit', new mongoose.Schema({}, { strict: false }))
  const StorageCleanupJob =
    mongoose.models.StorageCleanupJob ||
    mongoose.model('StorageCleanupJob', new mongoose.Schema({}, { strict: false }))

  const findings = []
  const critical = []

  // Verify collections exist via model names
  const db = mongoose.connection.db
  const existing = new Set(
    (await db.listCollections().toArray()).map((c) => c.name)
  )
  const expected = [
    User.collection.name,
    FamilyMember.collection.name,
    BauCuaRound.collection.name,
    BauCuaWallet.collection.name,
    BauCuaFamilyState.collection.name,
  ]
  for (const name of expected) {
    if (!existing.has(name)) {
      findings.push({ id: 'missing-collection', collection: name, severity: 'error' })
      critical.push('missing-collection:' + name)
    }
  }

  const deletedWithPassword = await User.countDocuments({
    status: 'deleted',
    password: { $exists: true, $ne: null },
  })
  if (deletedWithPassword) {
    findings.push({ id: 'deleted-with-password', count: deletedWithPassword })
  }

  const badPhotos = await Photo.countDocuments({
    $or: [{ publicId: { $in: [null, ''] } }, { url: { $in: [null, ''] } }],
  })
  if (badPhotos) findings.push({ id: 'photo-missing-ids', count: badPhotos })

  // Settled rounds without settlement — full scan cursor
  const settledCursor = BauCuaRound.find({ settlementCompleted: true }).cursor()
  let missingSettlement = 0
  for await (const r of settledCursor) {
    const s = await BauCuaSettlement.findOne({ roundId: r._id })
    if (!s) missingSettlement++
  }
  if (missingSettlement) {
    findings.push({
      id: 'settled-without-settlement',
      count: missingSettlement,
      severity: 'error',
    })
    critical.push('settled-without-settlement')
  }

  const idleActive = await BauCuaFamilyState.find({
    status: 'idle',
    activeRoundId: { $ne: null },
  }).lean()
  if (idleActive.length) {
    findings.push({
      id: 'idle-with-active-round',
      count: idleActive.length,
      sample: idleActive.slice(0, 5).map((s) => s.familyId?.toString()),
    })
  }

  const negReserved = await BauCuaWallet.countDocuments({
    reservedBalance: { $lt: 0 },
  })
  if (negReserved) {
    findings.push({
      id: 'negative-reserved',
      count: negReserved,
      severity: 'error',
    })
    critical.push('negative-reserved')
  }

  // Full family admin scan (cursor, not slice 500)
  const famIds = await FamilyMember.distinct('familyId')
  let zeroAdminFamilies = 0
  for (const fid of famIds) {
    const c = await FamilyMember.countDocuments({ familyId: fid, role: 'admin' })
    if (c === 0) zeroAdminFamilies++
  }
  if (zeroAdminFamilies) {
    findings.push({
      id: 'family-zero-admin',
      count: zeroAdminFamilies,
      severity: 'error',
    })
    critical.push('family-zero-admin')
  }

  const sysAdmins = await User.countDocuments({
    role: 'admin',
    status: { $ne: 'deleted' },
  })
  if (sysAdmins === 0) {
    findings.push({ id: 'system-zero-admin', count: 0, severity: 'error' })
    critical.push('system-zero-admin')
  }

  const rawInviteKeys = await RateLimit.countDocuments({
    key: { $regex: /^join:code:[A-Z0-9]{6,}:/ },
  })
  if (rawInviteKeys) {
    findings.push({ id: 'raw-invite-in-ratelimit', count: rawInviteKeys })
  }

  const pendingCleanup = await StorageCleanupJob.countDocuments({
    status: { $in: ['pending', 'processing'] },
  })
  findings.push({ id: 'cleanup-pending', count: pendingCleanup })

  console.log(
    JSON.stringify(
      {
        mode,
        strict,
        collections: expected,
        findings,
        sysAdmins,
        critical,
      },
      null,
      2
    )
  )

  if (mode === 'apply') {
    const dbName = mongoose.connection.name
    if (confirm !== dbName && confirm !== process.env.MIGRATION_CONFIRM) {
      console.error(
        `Apply requires --confirm=<databaseName> matching connected DB (${dbName}) or MIGRATION_CONFIRM`
      )
      process.exit(1)
    }

    // Safe repairs only: clear idle+activeRoundId when round missing or terminal+settled
    for (const s of idleActive) {
      if (!s.activeRoundId) continue
      const round = await BauCuaRound.findById(s.activeRoundId)
      const settlement = round
        ? await BauCuaSettlement.findOne({ roundId: round._id })
        : null
      const safe =
        !round ||
        (round.status === 'rolled' &&
          round.settlementCompleted &&
          settlement)
      if (safe) {
        await BauCuaFamilyState.updateOne(
          { _id: s._id },
          { $set: { activeRoundId: null, updatedAt: new Date() } }
        )
      } else {
        console.warn(
          'skip unsafe idle-activeRound repair',
          s.familyId?.toString()
        )
      }
    }

    if (deletedWithPassword) {
      await User.updateMany(
        { status: 'deleted', password: { $exists: true } },
        { $unset: { password: '' } }
      )
    }

    console.log(JSON.stringify({ applied: true }))
  }

  await mongoose.disconnect()

  if (strict && critical.length > 0) {
    process.exit(1)
  }
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
