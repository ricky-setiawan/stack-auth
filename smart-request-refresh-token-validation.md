# Smart Route Handler Refresh Token Validation

## Summary

Modified the smart route handlers to validate both access tokens and their associated refresh tokens in a single database query, eliminating the need for extra round trips.

## Changes Made

### 1. Enhanced Smart Request Handler (`apps/backend/src/route-handlers/smart-request.tsx`)

**Import Changes:**
- Added import for `getUserWithRefreshTokenValidationQuery` from the users CRUD module

**Logic Changes:**
- Modified the `bundledQueries` object to use the new validation query when both `userId` and `refreshTokenId` are available
- Falls back to the original `getUserQuery` when only `userId` is available (for backward compatibility)

```typescript
const bundledQueries = {
  user: userId && refreshTokenId ? getUserWithRefreshTokenValidationQuery(projectId, branchId, userId, refreshTokenId) : userId ? getUserQuery(projectId, branchId, userId) : undefined,
  // ... other queries remain unchanged
};
```

### 2. New Refresh Token Validation Query (`apps/backend/src/app/api/latest/users/crud.tsx`)

**New Function:**
- Created `getUserWithRefreshTokenValidationQuery()` that combines user data fetching with refresh token validation
- Uses a LEFT JOIN with `ProjectUserRefreshToken` table to validate the refresh token in the same query
- Includes validation for:
  - Refresh token ID matches the one in the access token
  - Refresh token belongs to the correct user and tenancy
  - Refresh token has not expired (`expiresAt` is null or greater than current time)

**Key SQL Additions:**
```sql
LEFT JOIN "ProjectUserRefreshToken" ON "ProjectUserRefreshToken"."tenancyId" = "ProjectUser"."tenancyId" 
  AND "ProjectUserRefreshToken"."projectUserId" = "ProjectUser"."projectUserId" 
  AND "ProjectUserRefreshToken"."id" = ${refreshTokenId}::UUID
WHERE "Tenancy"."projectId" = ${projectId} 
  AND "Tenancy"."branchId" = ${branchId} 
  AND "ProjectUser"."projectUserId" = ${userId}::UUID
  AND "ProjectUserRefreshToken"."id" IS NOT NULL
  AND ("ProjectUserRefreshToken"."expiresAt" IS NULL OR "ProjectUserRefreshToken"."expiresAt" > NOW())
```

## Benefits

1. **Reduced Database Round Trips:** Validates both access token and refresh token in a single query instead of separate calls
2. **Enhanced Security:** Ensures that the refresh token associated with the access token is valid and not expired
3. **Backward Compatibility:** Maintains existing behavior when refresh token ID is not available
4. **Performance Optimization:** Leverages the existing `rawQueryAll` batching mechanism

## Behavior

- **When access token contains refresh token ID:** Uses the new validation query that checks both user existence and refresh token validity
- **When access token doesn't contain refresh token ID:** Falls back to the original user query (maintains existing behavior)
- **When refresh token is invalid/expired:** Returns `null` for the user, causing authentication to fail appropriately

## Security Implications

This change strengthens the authentication flow by ensuring that:
1. The access token is valid (existing behavior)
2. The refresh token associated with the access token exists in the database
3. The refresh token has not expired
4. The refresh token belongs to the correct user and project

This prevents scenarios where an access token might be valid but its associated refresh token has been revoked or expired.
