# Quick Setup Guide

## 1. Create .env.local file

Copy the `.env.example` file to `.env.local`:

```bash
cp .env.example .env.local
```

## 2. Configure Environment Variables

Edit `.env.local` and add your values:

```bash
# Your session private key (already set for testing)
SESSION_PRIVATE_KEY=0x059a136d4cfc8b8e7d7e56da641ed01bf59b6d6d5700d46f982b43265370e8e8

# Your Pimlico API key (get from https://dashboard.pimlico.io/)
NEXT_PUBLIC_PIMLICO_API_KEY=your_actual_pimlico_key
```

## 3. Restart the Dev Server

After creating `.env.local`, restart your dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
yarn start
```

## 4. Test the Flow

1. Navigate to: http://localhost:3000/erc-7715-permissions
2. Connect your MetaMask wallet (Sepolia testnet)
3. Make sure your account is upgraded to a smart account
4. Click "Request Permissions"
5. Approve in MetaMask
6. Click "Transfer ETH" - this will execute on the server!

## Troubleshooting

### "SESSION_PRIVATE_KEY not configured"
- Make sure you created `.env.local` file
- Restart the dev server after creating the file

### "Pimlico API key not configured"
- Add your Pimlico API key to `.env.local`
- Get one from: https://dashboard.pimlico.io/

### "Permissions not found"
- Make sure you clicked "Request Permissions" first
- Approved the permission in MetaMask

## What Changed

We simplified the implementation to use a **single private key** for all users:

- ✅ No more per-user session generation
- ✅ Private key stored in `.env.local`
- ✅ Simpler for testing
- ⚠️ Not recommended for production (all users share same session account)

## Next Steps for Production

When you're ready to scale:
1. Generate unique session accounts per user
2. Store private keys encrypted in database
3. Add proper authentication
4. Implement rate limiting
