import { getProvider } from './agentWallet.js';

// Estimate gas cost in USD for one rotation (2 transactions: withdraw + supply)
export async function estimateGasCostUsd() {
  try {
    const provider = getProvider();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;

    if (!gasPrice) return 0.30; // testnet fallback

    // Aave withdraw ~120k gas + ERC20 approve ~50k + Compound supply ~150k
    const estimatedGasUnits = 320000n;
    const gasCostWei = gasPrice * estimatedGasUnits;
    const gasCostEth = parseFloat(gasCostWei.toString()) / 1e18;

    // ETH/USD price — use a simple fallback for testnet
    const ethUsd = await getEthPrice();
    const gasCostUsd = gasCostEth * ethUsd;

    return parseFloat(Math.max(gasCostUsd, 0.05).toFixed(4));
  } catch {
    return 0.30; // safe fallback for testnet
  }
}

async function getEthPrice() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const data = await res.json();
    return data?.ethereum?.usd || 2500;
  } catch {
    return 2500; // fallback
  }
}
