# ERC-7715 Permissions - Client/Server Architecture

This implementation demonstrates how to split ERC-7715 permission management between client and server:
- **Client**: User requests permissions via MetaMask
- **Server**: Backend redeems permissions and executes transactions

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT SIDE                          │
│  (Browser with MetaMask Extension)                      │
├─────────────────────────────────────────────────────────┤
│  1. Create Session Account (via API)                   │
│     - Backend generates unique session account          │
│     - Returns session account address                   │
│                                                         │
│  2. Request Permission (MetaMask popup)                 │
│     - User approves permission request                  │
│     - Permission granted for session account            │
│     - Permissions stored on backend                     │
└─────────────────────────────────────────────────────────┘
                         │
                         │ API Calls
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    SERVER SIDE                          │
│  (Next.js API Routes)                                  │
├─────────────────────────────────────────────────────────┤
│  3. Redeem Permission (Automated)                       │
│     - Reconstructs session account from stored key      │
│     - Uses granted permission context                   │
│     - Executes transaction without user interaction     │
└─────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Session Account Generation: Backend Approach ✅

We chose **Option 2: Generate Session Key Per User on Backend**

**Why?**
- ✅ **Security**: Each user has a unique session account
- ✅ **Scalability**: Isolated permissions per user
- ✅ **Simplicity**: No need to transfer private keys from client
- ✅ **Tracking**: Easy to identify which user made which transaction

**Alternatives Considered:**
1. **Single Server Key**: Simple but insecure (all users share one account)
2. **Client Generation**: More complex, requires secure key transfer

## File Structure

```
app/
├── api/
│   ├── session/
│   │   └── create/
│   │       └── route.ts          # Creates session account per user
│   ├── permissions/
│   │   ├── store/
│   │   │   └── route.ts          # Stores granted permissions
│   │   └── redeem/
│   │       └── route.ts          # Redeems permissions (executes tx)
│   └── utils/
│       └── storage.ts             # Shared in-memory storage
│
└── erc-7715-permissions/
    ├── hooks/
    │   └── usePermissions.ts      # Client-side hook
    └── providers/
        └── SessionAccountProvider.tsx  # Session context
```

## API Routes

### 1. POST `/api/session/create`

Creates a unique session account for the user.

**Request:**
```json
{
  "userAddress": "0x..."
}
```

**Response:**
```json
{
  "sessionAccountAddress": "0x...",
  "message": "Session created successfully"
}
```

### 2. POST `/api/permissions/store`

Stores granted permissions after user approval.

**Request:**
```json
{
  "userAddress": "0x...",
  "permissions": [...],
  "sessionAccountAddress": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Permissions stored successfully"
}
```

### 3. POST `/api/permissions/redeem`

Redeems permission and executes transaction on behalf of user.

**Request:**
```json
{
  "userAddress": "0x...",
  "amount": "0.0001",  // Optional, defaults to 0.0000001
  "recipient": "0x..."  // Optional, defaults to session account
}
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "userOperationHash": "0x...",
  "message": "Permission redeemed successfully"
}
```

## Usage

### Client-Side Hook

```typescript
import { usePermissions } from "~/app/erc-7715-permissions/hooks/usePermissions";

function MyComponent() {
  const {
    sessionAccountAddress,
    grantedPermissions,
    isLoading,
    error,
    txHash,
    requestPermission,
    redeemPermission,
  } = usePermissions();

  // Step 1: Request permission (triggers MetaMask popup)
  const handleRequestPermission = async () => {
    await requestPermission();
  };

  // Step 2: Redeem permission (server-side execution)
  const handleRedeem = async () => {
    await redeemPermission("0.0001", "0xRecipientAddress");
  };

  return (
    <div>
      <button onClick={handleRequestPermission} disabled={isLoading}>
        Request Permission
      </button>
      
      {grantedPermissions && (
        <button onClick={handleRedeem} disabled={isLoading}>
          Execute Transaction
        </button>
      )}
      
      {txHash && <p>Transaction: {txHash}</p>}
    </div>
  );
}
```

## Permission Details

The current implementation grants:
- **Type**: Native token periodic spending
- **Amount**: 0.001 ETH per day
- **Duration**: 30 days
- **Chain**: Sepolia testnet

## Security Considerations (Production)

⚠️ **Current Implementation**: In-memory storage (for demo only)

**For Production, you MUST:**

1. **Database Storage**
   - Store session private keys encrypted in database
   - Use proper encryption (AES-256-GCM or similar)
   - Store encryption keys in secure vault (AWS KMS, HashiCorp Vault)

2. **Authentication**
   - Verify user owns the wallet address
   - Implement proper session management
   - Use signed messages for authentication

3. **Rate Limiting**
   - Limit redemption requests per user
   - Implement cooldown periods
   - Monitor for abuse patterns

4. **Audit Logging**
   - Log all permission grants
   - Log all redemptions
   - Track transaction history per user

5. **Key Rotation**
   - Implement session key expiration
   - Allow users to revoke permissions
   - Rotate encryption keys periodically

## Environment Variables

```bash
# Required
NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_api_key

# Production (recommended)
DATABASE_URL=your_database_url
ENCRYPTION_KEY=your_encryption_key
```

## Testing

1. **Connect Wallet**: Connect MetaMask to Sepolia
2. **Upgrade Account**: Ensure your MetaMask account is upgraded to smart account
3. **Request Permission**: Click "Request Permissions" button
4. **Approve in MetaMask**: Review and approve the permission request
5. **Redeem Permission**: Click "Transfer ETH" button
6. **Verify**: Check transaction on Etherscan

## Benefits of This Architecture

✅ **Automated Transactions**: Server can execute transactions without user interaction  
✅ **Better UX**: User approves once, then transactions happen automatically  
✅ **Scheduled Operations**: Server can execute transactions on a schedule  
✅ **Gasless Transactions**: Can use paymaster for gas abstraction  
✅ **Scalable**: Each user has isolated permissions  

## Use Cases

- 💰 Subscription payments
- 📊 Automated trading/DCA strategies
- 🎁 Recurring donations
- 🎮 Game actions while user is offline
- 🔄 Batch operations triggered by backend logic

## Troubleshooting

### "Session not found"
- Ensure you've called `createSession()` or `requestPermission()` first
- Check that the wallet address matches

### "Permissions not found"
- User must approve permissions via MetaMask first
- Check that permissions were stored successfully

### "Pimlico API key not configured"
- Set `NEXT_PUBLIC_PIMLICO_API_KEY` in `.env.local`
- Restart the dev server

### "Account not upgraded to smart account"
- Follow [MetaMask guide](https://support.metamask.io/configure/accounts/switch-to-or-revert-from-a-smart-account/) to upgrade

## Next Steps

1. **Add Database**: Replace in-memory storage with PostgreSQL/MongoDB
2. **Add Encryption**: Encrypt private keys before storage
3. **Add Authentication**: Implement proper user authentication
4. **Add Monitoring**: Set up logging and alerting
5. **Add Tests**: Write unit and integration tests
6. **Deploy**: Deploy to production with proper security measures

## Resources

- [ERC-7715 Specification](https://eips.ethereum.org/EIPS/eip-7715)
- [MetaMask Smart Accounts Kit](https://docs.metamask.io/wallet/reference/smart-accounts/)
- [Pimlico Documentation](https://docs.pimlico.io/)
