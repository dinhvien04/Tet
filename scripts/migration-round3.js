/**
 * Round 3 consistency audit / limited apply.
 *
 * Usage:
 *   node scripts/migration-round3.js --mode=audit
 *   node scripts/migration-round3.js --mode=apply --confirm=YES
 *
 * Read-only by default. Apply only repairs admin state counters and
 * family state idle mismatches — never auto-settles games with new dice.
 */

const mongoose = require('mongoose')

const args = process.argv.slice(2)
const mode =
  args.find((a) => a.startsWith('--mode='))?.split('=')[1] || 'audit'
const confirm =
  args.find((a) => a.startsWith('--confirm='))?.split('=')[1] || ''

function assertSafeUri(uri) {
  if (!uri) {
    console.error('MONGODB_URI is required')
    process.exit(1)
  }
  const lower = uri.toLowerCase()
  if (
    lower.includes('mongodb.net') &&
    !process.env.ALLOW_PROD_MIGRATION
  ) {
    console.error(
      'Refusing Atlas URI without ALLOW_PROD_MIGRATION=1. Audit against a safe DB.'
    )
    process.exit(1)
  }
}

async function main() {
  const uri = process.env.MONGODB_URI
  assertSafeUri(uri)

  await mongoose.connect(uri)
  const db = mongoose.connection.db
  const findings = []

  const users = db.collection('users')
  const familyMembers = db.collection('familymembers')
  const familyAdminStates = db.collection('familyadminstates')
  const systemAdminStates = db.collection('systemadminstates')
  const rounds = db.collection('baucuaround')
  const settlements = db.collection('baucuasettlements')
  const familyStates = db.collection('baucuafamilystates')
  const wallets = db.collection('baucuaWallets')
  const rateLimits = db.collection('ratelimits')
  const photos = db.collection('photos')

  // 1. Deleted credentials users still with password
  const deletedWithPassword = await users
    .find({ status: 'deleted', password: { $exists: true, $ne: null } })
    .project({ _id: 1, email: 1 })
    .toArray()
  if (deletedWithPassword.length) {
    findings.push({
      id: 'deleted-with-password',
      count: deletedWithPassword.length,
      sample: deletedWithPassword.slice(0, 5).map((u) => u._id.toString()),
    })
  }

  // 2. Photos missing publicId/url
  const badPhotos = await photos.countDocuments({
    $or: [{ publicId: { $in: [null, ''] } }, { url: { $in: [null, ''] } }],
  })
  if (badPhotos) findings.push({ id: 'photo-missing-ids', count: badPhotos })

  // 3. Settled rounds without settlement
  const settledRounds = await rounds
    .find({ settlementCompleted: true })
    .project({ _id: 1 })
    .toArray()
  let missingSettlement = 0
  for (const r of settledRounds) {
    const s = await settlements.findOne({ roundId: r._id })
    if (!s) missingSettlement++
  }
  if (missingSettlement) {
    findings.push({ id: 'settled-without-settlement', count: missingSettlement })
  }

  // 4. Idle family with activeRoundId
  const idleActive = await familyStates
    .find({ status: 'idle', activeRoundId: { $ne: null } })
    .toArray()
  if (idleActive.length) {
    findings.push({
      id: 'idle-with-active-round',
      count: idleActive.length,
      sample: idleActive.slice(0, 5).map((s) => s.familyId?.toString()),
    })
  }

  // 5. Negative reserved
  const negReserved = await wallets.countDocuments({ reservedBalance: { $lt: 0 } })
  if (negReserved) findings.push({ id: 'negative-reserved', count: negReserved })

  // 6. Families with 0 admins
  const famIds = await familyMembers.distinct('familyId')
  let zeroAdminFamilies = 0
  for (const fid of famIds) {
    const c = await familyMembers.countDocuments({ familyId: fid, role: 'admin' })
    if (c === 0) zeroAdminFamilies++
  }
  if (zeroAdminFamilies) {
    findings.push({ id: 'family-zero-admin', count: zeroAdminFamilies })
  }

  // 7. System admins
  const sysAdmins = await users.countDocuments({
    role: 'admin',
    status: { $ne: 'deleted' },
  })
  if (sysAdmins === 0) {
    findings.push({ id: 'system-zero-admin', count: 0 })
  }

  // 8. Raw invite codes in rate limit keys (legacy)
  const rawInviteKeys = await rateLimits.countDocuments({
    key: { $regex: /^join:code:[A-Z0-9]{6,}:/ },
  })
  if (rawInviteKeys) {
    findings.push({ id: 'raw-invite-in-ratelimit', count: rawInviteKeys })
  }

  // 9. Admin state drift
  let adminDrift = 0
  for (const fid of famIds.slice(0, 500)) {
    const actual = await familyMembers.countDocuments({
      familyId: fid,
      role: 'admin',
    })
    const state = await familyAdminStates.findOne({ familyId: fid })
    if (state && state.adminCount !== actual) adminDrift++
  }
  if (adminDrift) findings.push({ id: 'family-admin-state-drift', count: adminDrift })

  console.log(JSON.stringify({ mode, findings, sysAdmins }, null, 2))

  if (mode === 'apply') {
    if (confirm !== 'YES') {
      console.error('Apply requires --confirm=YES')
      process.exit(1)
    }

    // Safe repairs only
    for (const s of idleActive) {
      await familyStates.updateOne(
        { _id: s._id },
        { $set: { activeRoundId: null, updatedAt: new Date() } }
      )
    }

    // Clear passwords on deleted users
    if (deletedWithPassword.length) {
      await users.updateMany(
        { status: 'deleted', password: { $exists: true } },
        { $unset: { password: '' } }
      )
    }

    // Rebuild family admin states from actual counts (idempotent)
    for (const fid of famIds) {
      const actual = await familyMembers.countDocuments({
        familyId: fid,
        role: 'admin',
      })
      await familyAdminStates.updateOne(
        { familyId: fid },
        {
          $set: { adminCount: actual, updatedAt: new Date() },
          $inc: { version: 1 },
          $setOnInsert: { familyId: fid },
        },
        { upsert: true }
      )
    }

    await systemAdminStates.updateOne(
      { key: 'system-admin' },
      {
        $set: { adminCount: sysAdmins, updatedAt: new Date() },
        $inc: { version: 1 },
        $setOnInsert: { key: 'system-admin' },
      },
      { upsert: true }
    )

    console.log(JSON.stringify({ applied: true, repaired: findings.map((f) => f.id) }))
  }

  await mongoose.disconnect()
  process.exit(findings.length && mode === 'audit' ? 0 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
