#!/bin/bash
# Create a single Privy wallet with the given policy.
# Usage: PRIVY_APP_ID=xxx PRIVY_APP_SECRET=yyy POLICY_ID=zzz ./scripts/privy-create-wallet.sh
# Output: WALLET_ID, WALLET_ADDRESS (for linking to your app)

set -e
: "${PRIVY_APP_ID:?Set PRIVY_APP_ID}"
: "${PRIVY_APP_SECRET:?Set PRIVY_APP_SECRET}"
: "${POLICY_ID:?Set POLICY_ID}"

WALLET_RESPONSE=$(curl -s -X POST "https://api.privy.io/v1/wallets" \
  --user "$PRIVY_APP_ID:$PRIVY_APP_SECRET" \
  -H "privy-app-id: $PRIVY_APP_ID" \
  -H "Content-Type: application/json" \
  -d "{\"chain_type\": \"ethereum\", \"policy_ids\": [\"$POLICY_ID\"]}")

WALLET_ID=$(echo "$WALLET_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
WALLET_ADDRESS=$(echo "$WALLET_RESPONSE" | grep -o '"address":"[^"]*' | head -1 | cut -d'"' -f4)
echo "WALLET_ID=$WALLET_ID"
echo "WALLET_ADDRESS=$WALLET_ADDRESS"
