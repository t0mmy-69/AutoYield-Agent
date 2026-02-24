/**
 * GET /api/wallet/info
 * Returns agent wallet address, chain info, and USDC contract address
 * needed by the frontend to construct a deposit transaction.
 */
import { withAuth } from '../../../lib/auth.js';
import { getAgentWallet } from '../../../lib/db.js';
import { CHAINS } from '../../../lib/chains/configs.js';
import { getCredential } from '../../../lib/credentials.js';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { userId } = req.session;
  const wallet = getAgentWallet(userId);
  if (!wallet) return res.status(404).json({ error: 'No agent wallet found.' });

  const chainId = wallet.chain_id || 'sepolia';
  const chain = CHAINS[chainId];

  const usdcAddress = chain ? getCredential(chain.usdcEnvVar) : getCredential('USDC_ADDRESS');

  res.status(200).json({
    agentAddress: wallet.address,
    chainId,
    chainNumericId: chain?.chainId ?? null,
    chainName: chain?.name ?? chainId,
    usdcAddress: usdcAddress || null,
  });
});
