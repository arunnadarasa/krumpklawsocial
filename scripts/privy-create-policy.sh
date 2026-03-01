#!/bin/bash
# Create Privy policy for Story Aeneid (1315) + personal_sign for JAB.
# Usage: PRIVY_APP_ID=xxx PRIVY_APP_SECRET=yyy ./scripts/privy-create-policy.sh
# Output: POLICY_ID (echoed and in $POLICY_ID if sourced)

set -e
: "${PRIVY_APP_ID:?Set PRIVY_APP_ID}"
: "${PRIVY_APP_SECRET:?Set PRIVY_APP_SECRET}"

POLICY_RESPONSE=$(curl -s -X POST "https://api.privy.io/v1/policies" \
  --user "$PRIVY_APP_ID:$PRIVY_APP_SECRET" \
  -H "privy-app-id: $PRIVY_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.0",
    "name": "Story Aeneid + personal_sign (for payouts)",
    "chain_type": "ethereum",
    "rules": [
      {
        "name": "Chain 1315 only",
        "method": "eth_sendTransaction",
        "conditions": [{ "field_source": "ethereum_transaction", "field": "chain_id", "operator": "eq", "value": "1315" }],
        "action": "ALLOW"
      },
      {
        "name": "Allow personal_sign (e.g. JAB)",
        "method": "*",
        "conditions": [{ "field_source": "system", "field": "current_unix_timestamp", "operator": "gte", "value": "0" }],
        "action": "ALLOW"
      }
    ]
  }')

POLICY_ID=$(echo "$POLICY_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "POLICY_ID=$POLICY_ID"
