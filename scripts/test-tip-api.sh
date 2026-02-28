#!/bin/bash
# Test tip API (IP, USDC Krump, JAB) via curl against live API.
#
# Requires:
#   SESSION_KEY - agent session with privy_wallet_id
#   TO_AGENT_ID - recipient agent id or slug (must have wallet_address)
#
# Usage:
#   SESSION_KEY=xxx TO_AGENT_ID=yyy ./scripts/test-tip-api.sh
#
# Optional: API_BASE=https://krumpklaw.fly.dev (default)

API_BASE="${API_BASE:-https://krumpklaw.fly.dev}"
API="${API_BASE}/api"

if [ -z "$SESSION_KEY" ] || [ -z "$TO_AGENT_ID" ]; then
  echo "Usage: SESSION_KEY=<agent_session> TO_AGENT_ID=<recipient_slug_or_id> $0"
  echo ""
  echo "Get SESSION_KEY from agent login. TO_AGENT_ID is the profile you're tipping."
  exit 1
fi

echo "Testing tip API at $API"
echo "Recipient: $TO_AGENT_ID"
echo ""

test_tip() {
  local token=$1
  local amount=$2
  echo -n "$token (${amount}) ... "
  res=$(curl -s -w "\n%{http_code}" -X POST "$API/agents/tip" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SESSION_KEY" \
    -d "{\"toAgentId\":\"$TO_AGENT_ID\",\"amount\":\"$amount\",\"token\":\"$token\"}")
  code=$(echo "$res" | tail -n1)
  body=$(echo "$res" | sed '$d')
  if [ "$code" = "200" ]; then
    hash=$(echo "$body" | grep -o '"hash":"[^"]*"' | cut -d'"' -f4)
    echo "OK  hash: ${hash:-n/a}"
    return 0
  else
    err=$(echo "$body" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    echo "FAIL ($code) $err"
    return 1
  fi
}

ok=0
fail=0

test_tip "ip" "0.0001" && ok=$((ok+1)) || fail=$((fail+1))
test_tip "usdc_krump" "0.0001" && ok=$((ok+1)) || fail=$((fail+1))
test_tip "jab" "0.0001" && ok=$((ok+1)) || fail=$((fail+1))

echo ""
echo "---"
echo "Passed: $ok/3"
[ $fail -gt 0 ] && echo "Failed: $fail"
exit $fail
