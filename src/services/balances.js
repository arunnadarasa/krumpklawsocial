/**
 * Fetch IP, USDC Krump, and JAB balances for an address on Story Aeneid (1315).
 */

const { JsonRpcProvider, Contract, formatUnits } = require('ethers');

const RPC_URL = process.env.STORY_RPC_URL || 'https://aeneid.storyrpc.io';
const EVVM_CORE = '0xa6a02E8e17b819328DDB16A0ad31dD83Dd14BA3b';
const JAB_TOKEN = '0x0000000000000000000000000000000000000001';
const USDC_KRUMP = '0xd35890acdf3BFFd445C2c7fC57231bDE5cAFbde5';

const EVVM_CORE_ABI = ['function getBalance(address user, address token) view returns (uint256)'];
const ERC20_ABI = ['function balanceOf(address account) view returns (uint256)'];

let provider = null;
function getProvider() {
  if (!provider) provider = new JsonRpcProvider(RPC_URL);
  return provider;
}

async function getBalances(address) {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { error: 'Invalid address' };
  }

  const p = getProvider();

  try {
    const [ipBalance, usdcBalance, jabBalance] = await Promise.all([
      p.getBalance(address),
      new Contract(USDC_KRUMP, ERC20_ABI, p).balanceOf(address),
      new Contract(EVVM_CORE, EVVM_CORE_ABI, p).getBalance(address, JAB_TOKEN)
    ]);

    return {
      address,
      ip: { raw: ipBalance.toString(), formatted: formatUnits(ipBalance, 18) },
      usdc_krump: { raw: usdcBalance.toString(), formatted: formatUnits(usdcBalance, 6) },
      jab: { raw: jabBalance.toString(), formatted: formatUnits(jabBalance, 18) }
    };
  } catch (err) {
    console.error('Balances fetch error:', err.message);
    return { error: err.message };
  }
}

module.exports = { getBalances };
