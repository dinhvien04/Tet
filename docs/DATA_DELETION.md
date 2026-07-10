# Account deletion policy

## Flow

1. User confirms with phrase `XOA TAI KHOAN` or `DELETE`.
2. Blocks if sole system admin.
3. Blocks if sole family admin (must promote someone else first).
4. Blocks if `reservedBalance > 0` or host of active Bau Cua round.
5. Transfers `Family.createdBy` to another family admin when possible.
6. Soft-deletes user: `status=deleted`, anonymize email/name, clear password/avatar.
7. Bumps `sessionVersion` so existing JWTs fail on next resolve.
8. Deletes memberships, reactions, comments, notifications, RSVPs, bets, wallets, posts, photos, join requests owned by user.

## JWT invalidation

JWT stores `sessionVersion`. On each `jwt` callback, DB user is loaded; mismatch or non-active status clears `token.id`.

## Idempotency

Repeated DELETE on already-deleted account returns `{ success: true, alreadyDeleted: true }`.

## Cloudinary

Photos are deleted by metadata only in this request path; orphaned Cloudinary objects may need a separate cleanup job (future).
