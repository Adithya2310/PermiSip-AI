# Troubleshooting Guide

## Issue: "Permissions not found. Please request permissions first."

This error means the permissions weren't stored properly or the storage was cleared.

### Solution:

The storage has been fixed to use a **global singleton pattern** that persists across API route calls.

### How to Test:

1. **Restart your dev server** (important after the storage fix):
   ```bash
   # Stop the server (Ctrl+C)
   yarn start
   ```

2. **Check stored permissions** (debug endpoint):
   ```bash
   # In a new terminal or browser
   curl http://localhost:3000/api/permissions/debug
   ```

3. **Follow the flow**:
   - Go to http://localhost:3000/erc-7715-permissions
   - Connect wallet
   - Click "Request Permissions"
   - Approve in MetaMask
   - Check debug endpoint again (should show 1 permission)
   - Click "Transfer ETH"

### Debug Steps:

#### 1. Check if permissions are being stored:
```bash
curl http://localhost:3000/api/permissions/debug
```

Should return:
```json
{
  "count": 1,
  "permissions": [
    {
      "userAddress": "0x...",
      "sessionAccountAddress": "0x...",
      "createdAt": "2024-...",
      "hasContext": true
    }
  ]
}
```

#### 2. Check server logs:
Look for these messages in your terminal:
- `[Storage] Stored permissions for 0x...`
- `[Storage] Getting permissions for 0x...`
- `[Storage] Total stored permissions: 1`

#### 3. Verify the flow:
1. Request permissions → Should see "Stored permissions" log
2. Check debug endpoint → Should show count: 1
3. Redeem permissions → Should see "Getting permissions" log with "Found"

### Common Issues:

#### Issue: Count is 0 after requesting permissions
**Cause**: Permissions not being stored
**Fix**: Check browser console for errors in the store API call

#### Issue: Hot reload clears storage
**Cause**: In development, hot reload can reset the global state
**Fix**: The global singleton pattern should prevent this, but if it happens, just request permissions again

#### Issue: Different user address
**Cause**: The user address from wallet doesn't match what's stored
**Fix**: Make sure you're using the same wallet address that requested permissions

### What Changed:

The storage now uses `globalThis` to persist across API route calls:

```typescript
// Before (didn't work across routes)
const permissionsStore = new Map();

// After (works across routes)
const permissionsStore = globalThis.permissionsStore ?? new Map();
globalThis.permissionsStore = permissionsStore;
```

This ensures the same Map instance is used by all API routes.
