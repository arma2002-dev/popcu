# Security Specification & Payload TDD

## 1. Data Invariants
1. **Strict Ownership**: Every document in `/users/{userId}/workspace/{workspaceId}` and `/users/{userId}/posters/{posterId}` can only be read, listed, created, updated, or deleted when `request.auth != null`, `request.auth.token.email_verified == true`, and `request.auth.uid == userId == data.userId`.
2. **Workspace Singleton ID**: `workspaceId` in `/users/{userId}/workspace/{workspaceId}` must equal `'current'` and match `isValidId(workspaceId)`.
3. **Immutable Ownership & Creation Time**: `userId` and `createdAt` cannot change after document creation.
4. **Server Timestamp Integrity**: `createdAt` must equal `request.time` on create; `updatedAt` must equal `request.time` on both create and update.
5. **Strict Bounds & Enumerations**: All string fields have exact `maxLength` guards matching `firebase-blueprint.json`, `productFontSize` is an `int` or `float` within `[20, 56]`, `theme` is `'cu-top'` or `'cu-bottom'`, and `source` is `'ai-scan'`, `'manual'`, or `'sample'`.

## 2. The "Dirty Dozen" Payloads (Expected: `PERMISSION_DENIED`)
1. **Unauthenticated Write**: Create `/users/u1/posters/p1` with `auth == null`.
2. **Unverified Email Write**: Create `/users/u1/posters/p1` with `auth.uid == 'u1'` and `auth.token.email_verified == false`.
3. **Cross-User Read/List**: User `u2` attempts `get` or `list` on `/users/u1/posters`.
4. **Identity Spoofing on Create**: User `u1` creates `/users/u1/posters/p1` with `data.userId = 'u2'`.
5. **Owner Mutation on Update**: User `u1` updates `/users/u1/posters/p1` changing `userId` to `'u2'`.
6. **Ghost Field / Shadow Update**: User `u1` includes `isAdmin: true` in create or update payload.
7. **ID Poisoning**: Create `/users/u1/posters/bad$id..with/spaces` or a >128-char ID.
8. **Invalid Workspace ID**: Create `/users/u1/workspace/other_id` (`workspaceId != 'current'`).
9. **Client-Spoofed Timestamp**: Create or update with `updatedAt` set to a client-supplied past timestamp instead of `request.time`.
10. **Immutable `createdAt` Tampering**: Update `/users/u1/posters/p1` modifying `createdAt`.
11. **Type/Value Poisoning (`theme` / `productFontSize`)**: Update `theme: 'invalid-theme'` or `productFontSize: 999`.
12. **Denial-of-Wallet Oversized String**: Create or update `productName` with 500 chars (`> 150`) or `productImageUrl` > `120000` chars.
