#!/bin/bash
# 1) Create policy  2) Create wallet with that policy.
# Usage: PRIVY_APP_ID=xxx PRIVY_APP_SECRET=yyy ./scripts/privy-setup-agent-wallet.sh
# Then link WALLET_ID and WALLET_ADDRESS to your app (e.g. PUT /agents/profile).

set -e
: "${PRIVY_APP_ID:?Set PRIVY_APP_ID}"
: "${PRIVY_APP_SECRET:?Set PRIVY_APP_SECRET}"

# Step 1 — Policy
POLICY_RESPONSE=$(curl -s -X POST "https://api.privy.io/v1/policies" \
  --user "$PRIVY_APP_ID:$PRIVY_APP_SECRET" \
  -H "privy-app-id: $PRIVY_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.0",
    "name": "Story Aeneid + personal_sign",
    "chain_type": "ethereum",
    "rules": [
      {"name": "Chain 1315","method": "eth_sendTransaction","conditions": [{"field_source": "ethereum_transaction","field": "chain_id","operator": "eq","value": "1315"}],"action": "ALLOW"},
      {"name": "Allow personal_sign","method": "*","conditions": [{"field_source": "system","field": "current_unix_timestamp","operator": "gte","value": "0"}],"action": "ALLOW"}
    ]
  }')
POLICY_ID=$(echo "$POLICY_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "POLICY_ID=$POLICY_ID"

# Step 2 — Wallet
WALLET_RESPONSE=$(curl -s -X POST "https://api.privy.io/v1/wallets" \
  --user "$PRIVY_APP_ID:$PRIVY_APP_SECRET" \
  -H "privy-app-id: $PRIVY_APP_ID" \
  -H "Content-Type: application/json" \
  -d "{\"chain_type\": \"ethereum\", \"policy_ids\": [\"$POLICY_ID\"]}")
WALLET_ID=$(echo "$WALLET_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
WALLET_ADDRESS=$(echo "$WALLET_RESPONSE" | grep -o '"address":"[^"]*' | head -1 | cut -d'"' -f4)
echo "WALLET_ID=$WALLET_ID"
echo "WALLET_ADDRESS=$WALLET_ADDRESS"
echo ""
echo "Link to your app: PUT /agents/profile (or your link endpoint) with:"
echo "  wallet_address=$WALLET_ADDRESS"
echo "  privy_wallet_id=$WALLET_ID"
echo "  payout_token=ip (or usdc_krump | jab)"
