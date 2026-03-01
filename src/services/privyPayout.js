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
 * Call Privy wallet RPC (eth_sendTransaction, personal_sign, eth_accounts).
 */
async function privyRpc(walletId, appId, appSecret, method, params, options = {}) {
  const auth = Buffer.from(`${appId}:${appSecret}`).toString('base64');
  const body = { method, caip2: CHAIN_CAIP2, params };
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
    throw new Error(errMsg);
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

/**
 * Transfer IP (native token) via Privy.
 */
async function transferIp(walletId, toAddress, amountWei, appId, appSecret) {
  const value = amountWei || AMOUNT_IP_WEI;
  const result = await privyRpc(walletId, appId, appSecret, 'eth_sendTransaction', {
    transaction: { to: toAddress, value }
  });
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
    transaction: { to: USDC_KRUMP, data, value: '0' }
  });
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

  const txResult = await privyRpc(walletId, appId, appSecret, 'eth_sendTransaction', {
    transaction: { to: EVVM_CORE, data: payData, value: '0' }
  });
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

  // #region agent log
  try {
    fetch('http://127.0.0.1:7476/ingest/f39bfd8c-08e1-4a03-8cb8-804e3f1c18e3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'eb9737'},body:JSON.stringify({sessionId:'eb9737',location:'privyPayout.js:transferBattlePayout-entry',message:'transferBattlePayout called',data:{loserAgentId,winnerAgentId,hasAppId:!!appId,hasAppSecret:!!appSecret},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
  } catch (_) {}
  // #endregion

  if (!appId || !appSecret) {
    console.warn('Privy credentials not set - skipping battle payout');
    // #region agent log
    try { fetch('http://127.0.0.1:7476/ingest/f39bfd8c-08e1-4a03-8cb8-804e3f1c18e3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'eb9737'},body:JSON.stringify({sessionId:'eb9737',location:'privyPayout.js:skip',message:'Payout skipped',data:{reason:'no_credentials'},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{}); } catch (_) {}
    // #endregion
    return { skipped: true, reason: 'no_credentials' };
  }

  const loser = Agent.findById(loserAgentId);
  const winner = Agent.findById(winnerAgentId);
  if (!loser || !winner) {
    // #region agent log
    try { fetch('http://127.0.0.1:7476/ingest/f39bfd8c-08e1-4a03-8cb8-804e3f1c18e3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'eb9737'},body:JSON.stringify({sessionId:'eb9737',location:'privyPayout.js:error',message:'Agent not found',data:{loserFound:!!loser,winnerFound:!!winner},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{}); } catch (_) {}
    // #endregion
    return { error: 'Agent not found' };
  }

  const walletId = loser.privy_wallet_id;
  const toAddress = winner.wallet_address;
  if (!walletId || !toAddress) {
    const reason = !walletId ? 'loser_no_wallet' : 'winner_no_wallet';
    // #region agent log
    try { fetch('http://127.0.0.1:7476/ingest/f39bfd8c-08e1-4a03-8cb8-804e3f1c18e3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'eb9737'},body:JSON.stringify({sessionId:'eb9737',location:'privyPayout.js:skip',message:'Payout skipped',data:{reason,hasWalletId:!!walletId,hasToAddress:!!toAddress},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{}); } catch (_) {}
    // #endregion
    return { skipped: true, reason };
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
    return { error: 'Invalid winner wallet address' };
  }

  const token = (winner.payout_token || 'ip').toLowerCase();
  if (!['ip', 'usdc_krump', 'jab'].includes(token)) {
    // #region agent log
    try { fetch('http://127.0.0.1:7476/ingest/f39bfd8c-08e1-4a03-8cb8-804e3f1c18e3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'eb9737'},body:JSON.stringify({sessionId:'eb9737',location:'privyPayout.js:skip',message:'Payout skipped',data:{reason:'invalid_payout_token',token},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{}); } catch (_) {}
    // #endregion
    return { skipped: true, reason: 'invalid_payout_token' };
  }

  try {
    // #region agent log
    try { fetch('http://127.0.0.1:7476/ingest/f39bfd8c-08e1-4a03-8cb8-804e3f1c18e3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'eb9737'},body:JSON.stringify({sessionId:'eb9737',location:'privyPayout.js:transfer-attempt',message:'Attempting transfer',data:{token},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{}); } catch (_) {}
    // #endregion
    let result;
    if (token === 'ip') {
      result = await transferIp(walletId, toAddress, AMOUNT_IP_WEI, appId, appSecret);
    } else if (token === 'usdc_krump') {
      result = await transferUsdcKrump(walletId, toAddress, AMOUNT_USDC_RAW, appId, appSecret);
    } else {
      const fromAddress = await getLoserAddress(walletId, appId, appSecret);
      if (!fromAddress) return { error: 'Could not get loser wallet address' };
      result = await transferJab(walletId, fromAddress, toAddress, AMOUNT_JAB_RAW, appId, appSecret);
    }
    // #region agent log
    if (result && result.hash) { try { fetch('http://127.0.0.1:7476/ingest/f39bfd8c-08e1-4a03-8cb8-804e3f1c18e3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'eb9737'},body:JSON.stringify({sessionId:'eb9737',location:'privyPayout.js:success',message:'Payout success',data:{hash:result.hash},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{}); } catch (_) {} }
    // #endregion
    return result;
  } catch (err) {
    console.error('Privy payout error:', err.message);
    // #region agent log
    try { fetch('http://127.0.0.1:7476/ingest/f39bfd8c-08e1-4a03-8cb8-804e3f1c18e3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'eb9737'},body:JSON.stringify({sessionId:'eb9737',location:'privyPayout.js:error',message:'Transfer failed',data:{error:err.message},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{}); } catch (_) {}
    // #endregion
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
      const fromAddress = await getLoserAddress(walletId, appId, appSecret);
      if (!fromAddress) return { error: 'Could not get sender wallet address' };
      result = await transferJab(walletId, fromAddress, toAddress, amountRaw, appId, appSecret);
    }
    return result;
  } catch (err) {
    return { error: err.message };
  }
}

async function getLoserAddress(walletId, appId, appSecret) {
  try {
    const result = await privyRpc(walletId, appId, appSecret, 'eth_accounts', {}, { sponsor: false });
    const accounts = result?.result ?? result;
    if (Array.isArray(accounts) && accounts[0]) return accounts[0];
    if (typeof result === 'string') return result;
    return null;
  } catch {
    return null;
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
