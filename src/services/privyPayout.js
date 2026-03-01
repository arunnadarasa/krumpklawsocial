/**
 * Privy battle payout service
 * When an agent loses a battle, transfer 0.0001 to the winner.
 * Winner chooses token: ip (native), usdc_krump (ERC20), or jab (EVVM principal).
 * Chain: Story Aeneid Testnet (1315) - https://aeneid.storyrpc.io
 */

const { AbiCoder, JsonRpcProvider, Contract, keccak256, getAddress } = require('ethers');

const CHAIN_CAIP2 = 'eip155:1315';
const RPC_URL = 'https://aeneid.storyrpc.io';
const EVVM_CORE = '0xa6a02E8e17b819328DDB16A0ad31dD83Dd14BA3b';
const JAB_TOKEN = '0x0000000000000000000000000000000000000001';
const USDC_KRUMP = '0x41c1bd92AcdfD245213Fd367a2e4A9C45db9cf77';
const EVVM_ID = 1140n;

// 0.0001 in each token's units
const AMOUNT_IP_WEI = '100000000000000';      // 18 decimals
const AMOUNT_USDC_RAW = '100';                 // 6 decimals (0.0001 USDC)
const AMOUNT_JAB_RAW = '100000000000000';     // 18 decimals

const EVVM_CORE_ABI = [
  'function getNextCurrentSyncNonce(address user) view returns (uint256)',
  'function pay(address from, address to_address, string to_identity, address token, uint256 amount, uint256 priorityFee, address senderExecutor, uint256 nonce, bool isAsyncExec, bytes signature) external',
];

/**
 * Call Privy wallet RPC (eth_sendTransaction, personal_sign).
 * Note: Privy wallet RPC does not support eth_accounts; use agent's stored wallet_address for JAB.
 */
async function privyRpc(walletId, appId, appSecret, method, params, options = {}) {
  const auth = Buffer.from(`${appId}:${appSecret}`).toString('base64');
  // personal_sign does not accept caip2/chain_type (Privy returns "Unrecognized key(s): 'caip2'")
  const isChainSpecific = method === 'eth_sendTransaction' || method === 'eth_sendRawTransaction' || method === 'eth_signTransaction';
  const body = isChainSpecific
    ? { method, caip2: CHAIN_CAIP2, chain_type: 'ethereum', params }
    : { method, params };
  if (options.sponsor !== false && (method === 'eth_sendTransaction' || method === 'eth_sendRawTransaction')) {
    body.sponsor = true;
  }
  const res = await fetch(`https://api.privy.io/v1/wallets/${walletId}/rpc`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'privy-app-id': appId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = data.error?.message || data.message || res.statusText;
    const errDetail = data.error?.code != null ? ` code=${data.error.code}` : '';
    const errExtra = typeof data.error?.details === 'string' ? ` details=${data.error.details}` : (data.error?.details ? ` details=${JSON.stringify(data.error.details)}` : '');
    console.warn('[KrumpPayout] Privy API error status=%s%s %s%s', res.status, errDetail, errMsg, errExtra);
    console.warn('[KrumpPayout] Privy error body (method=%s): %s', method, JSON.stringify(data));
    if (data.error?.code === 'policy_violation' && method === 'personal_sign') {
      console.warn('[KrumpPayout] JAB requires wallet policy to allow personal_sign. Add an ALLOW rule for method personal_sign to the wallet policy (see docs/PRIVY-WALLET-GUIDE.md).');
    }
    throw new Error(errMsg + errDetail + errExtra);
  }
  return data?.data;
}

/** Parse amount to raw units. IP/JAB: 18 decimals. USDC: 6 decimals. */
function parseAmount(value, token) {
  const n = parseFloat(String(value).replace(/,/g, ''));
  if (Number.isNaN(n) || n <= 0) return null;
  if (token === 'usdc_krump') return String(Math.round(n * 1e6));
  return String(Math.round(n * 1e18));
}

/** Decimal string to hex (0x-prefixed) for eth_sendTransaction value. */
function toHexWei(decimalWei) {
  const n = BigInt(decimalWei);
  return '0x' + n.toString(16);
}

/**
 * Transfer IP (native token) via Privy.
 * Privy/eth_sendTransaction expect value in hex (Ethereum JSON-RPC convention).
 */
async function transferIp(walletId, toAddress, amountWei, appId, appSecret) {
  const valueWei = amountWei || AMOUNT_IP_WEI;
  const value = toHexWei(valueWei);
  const result = await privyRpc(walletId, appId, appSecret, 'eth_sendTransaction', {
    transaction: { to: toAddress, value }
  }, { sponsor: false });
  return { success: true, hash: result?.hash || result?.user_operation_hash };
}

/**
 * Transfer USDC Krump (ERC20) via Privy.
 */
async function transferUsdcKrump(walletId, toAddress, amountRaw, appId, appSecret) {
  const amount = amountRaw || AMOUNT_USDC_RAW;
  const iface = new (require('ethers').Interface)([
    'function transfer(address to, uint256 amount)'
  ]);
  const data = iface.encodeFunctionData('transfer', [toAddress, amount]);
  const result = await privyRpc(walletId, appId, appSecret, 'eth_sendTransaction', {
    transaction: { to: USDC_KRUMP, data, value: '0x0' }
  }, { sponsor: false });
  return { success: true, hash: result?.hash || result?.user_operation_hash };
}

/**
 * Transfer JAB (EVVM principal) via Privy: personal_sign + eth_sendTransaction.
 */
async function transferJab(walletId, fromAddress, toAddress, amountRaw, appId, appSecret) {
  const provider = new JsonRpcProvider(RPC_URL);
  const core = new Contract(EVVM_CORE, EVVM_CORE_ABI, provider);

  const nonce = await core.getNextCurrentSyncNonce(fromAddress);
  const priorityFee = 0n;
  const amount = BigInt(amountRaw || AMOUNT_JAB_RAW);
  const toAddr = getAddress(toAddress);
  const coreAddr = getAddress(EVVM_CORE);

  const coder = AbiCoder.defaultAbiCoder();
  const encoded = coder.encode(
    ['string', 'address', 'string', 'address', 'uint256', 'uint256'],
    ['pay', toAddr, '', JAB_TOKEN, amount, priorityFee]
  );
  const hashPayload = keccak256(encoded);

  const message = [
    EVVM_ID.toString(),
    coreAddr.toLowerCase(),
    hashPayload.toLowerCase(),
    fromAddress.toLowerCase(),
    nonce.toString(),
    'false'
  ].join(',');

  console.warn('[KrumpPayout] JAB: requesting personal_sign (message length=%d)', message.length);
  const signResult = await privyRpc(walletId, appId, appSecret, 'personal_sign', {
    message,
    encoding: 'utf-8'
  }, { sponsor: false });
  const signature = signResult?.signature;
  if (!signature) throw new Error('No signature from personal_sign');

  const iface = new (require('ethers').Interface)(EVVM_CORE_ABI);
  const payData = iface.encodeFunctionData('pay', [
    fromAddress,
    toAddr,
    '',
    JAB_TOKEN,
    amount,
    priorityFee,
    fromAddress,
    nonce,
    false,
    signature.startsWith('0x') ? signature : '0x' + signature
  ]);

  console.warn('[KrumpPayout] JAB: sending eth_sendTransaction (Core.pay)');
  const txResult = await privyRpc(walletId, appId, appSecret, 'eth_sendTransaction', {
    transaction: { to: EVVM_CORE, data: payData, value: '0x0' }
  }, { sponsor: false });
  return { success: true, hash: txResult?.hash || txResult?.user_operation_hash };
}

/**
 * Transfer from loser's Privy wallet to winner's wallet.
 * Uses winner's payout_token preference: ip, usdc_krump, or jab.
 */
async function transferBattlePayout(loserAgentId, winnerAgentId) {
  const Agent = require('../models/Agent');
  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    console.warn('[KrumpPayout] skipped reason=no_credentials (PRIVY_APP_ID or PRIVY_APP_SECRET not set on server)');
    return { skipped: true, reason: 'no_credentials' };
  }

  const loser = Agent.findById(loserAgentId);
  const winner = Agent.findById(winnerAgentId);
  if (!loser || !winner) {
    console.warn('[KrumpPayout] skipped reason=agent_not_found loserFound=%s winnerFound=%s', !!loser, !!winner);
    return { error: 'Agent not found' };
  }

  const walletId = loser.privy_wallet_id;
  const toAddress = winner.wallet_address;
  if (!walletId || !toAddress) {
    const reason = !walletId ? 'loser_no_wallet' : 'winner_no_wallet';
    console.warn('[KrumpPayout] skipped reason=%s (loser has privy_wallet_id=%s, winner has wallet_address=%s)', reason, !!walletId, !!toAddress);
    return { skipped: true, reason };
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
    return { error: 'Invalid winner wallet address' };
  }

  const token = (winner.payout_token || 'ip').toLowerCase();
  if (!['ip', 'usdc_krump', 'jab'].includes(token)) {
    console.warn('[KrumpPayout] skipped reason=invalid_payout_token token=%s', token);
    return { skipped: true, reason: 'invalid_payout_token' };
  }

  try {
    let result;
    if (token === 'ip') {
      result = await transferIp(walletId, toAddress, AMOUNT_IP_WEI, appId, appSecret);
    } else if (token === 'usdc_krump') {
      result = await transferUsdcKrump(walletId, toAddress, AMOUNT_USDC_RAW, appId, appSecret);
    } else {
      // JAB: use loser's stored wallet_address (Privy wallet RPC does not support eth_accounts)
      const fromAddress = loser.wallet_address || null;
      if (!fromAddress || !/^0x[a-fA-F0-9]{40}$/.test(fromAddress)) {
        return { error: 'Could not get loser wallet address (agent must have wallet_address linked for JAB payouts)' };
      }
      result = await transferJab(walletId, fromAddress, toAddress, AMOUNT_JAB_RAW, appId, appSecret);
    }
    return result;
  } catch (err) {
    console.warn('[KrumpPayout] transfer failed error=%s', err.message);
    return { error: err.message };
  }
}

/**
 * Agent-to-agent transfer (tip, payment). Sender must have privy_wallet_id, recipient wallet_address.
 */
async function transferAgentToAgent(fromAgentId, toAgentId, amount, token) {
  const Agent = require('../models/Agent');
  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) return { error: 'Privy not configured' };

  const from = Agent.findById(fromAgentId) || Agent.findBySlug(fromAgentId);
  const to = Agent.findById(toAgentId) || Agent.findBySlug(toAgentId);
  if (!from || !to) return { error: 'Agent not found' };
  if (from.id === to.id) return { error: 'Cannot tip yourself' };

  const walletId = from.privy_wallet_id;
  const toAddress = to.wallet_address;
  if (!walletId || !toAddress) {
    return { error: !walletId ? 'You need a Privy wallet to send' : 'Recipient has no wallet linked' };
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) return { error: 'Invalid recipient address' };

  const t = (token || 'ip').toLowerCase();
  if (!['ip', 'usdc_krump', 'jab'].includes(t)) return { error: 'Invalid token' };

  const amountRaw = parseAmount(amount, t);
  if (!amountRaw) return { error: 'Invalid amount' };

  try {
    let result;
    if (t === 'ip') {
      result = await transferIp(walletId, toAddress, amountRaw, appId, appSecret);
    } else if (t === 'usdc_krump') {
      result = await transferUsdcKrump(walletId, toAddress, amountRaw, appId, appSecret);
    } else {
      // JAB: use sender's stored wallet_address (Privy wallet RPC does not support eth_accounts)
      const fromAddress = from.wallet_address || null;
      if (!fromAddress || !/^0x[a-fA-F0-9]{40}$/.test(fromAddress)) {
        return { error: 'Sender must have wallet_address linked for JAB transfers' };
      }
      result = await transferJab(walletId, fromAddress, toAddress, amountRaw, appId, appSecret);
    }
    return result;
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = {
  transferBattlePayout,
  transferAgentToAgent,
  parseAmount,
  CHAIN_CAIP2,
  BATTLE_PAYOUT_WEI: AMOUNT_IP_WEI,
  AMOUNT_USDC_RAW,
  AMOUNT_JAB_RAW
};
