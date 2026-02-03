import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const HELIUS_RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=7d359733-8771-4d20-af8c-54f756c96bb1';

// Your Solana wallet address to receive payments
export const DEPOSIT_WALLET_ADDRESS = '6aGvR36EkR4wB57xN8JvMAR3nikzYoYwxbBKJTJYD3jy';

const connection = new Connection(HELIUS_RPC_URL, 'confirmed');

export interface SolanaTransaction {
  signature: string;
  slot: number;
  blockTime: number | null;
  amount: number; // in SOL
  from: string;
  to: string;
  status: 'confirmed' | 'finalized' | 'failed';
}

/**
 * Get recent transactions to a specific wallet address
 */
export async function getRecentTransactions(
  walletAddress: string,
  limit: number = 20
): Promise<SolanaTransaction[]> {
  try {
    const pubkey = new PublicKey(walletAddress);
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit });
    
    const transactions: SolanaTransaction[] = [];
    
    for (const sig of signatures) {
      try {
        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        
        if (!tx || !tx.meta) continue;
        
        // Find SOL transfer amount
        const preBalances = tx.meta.preBalances;
        const postBalances = tx.meta.postBalances;
        const accountKeys = tx.transaction.message.accountKeys;
        
        // Find the index of our wallet
        const walletIndex = accountKeys.findIndex(
          (key) => key.pubkey.toString() === walletAddress
        );
        
        if (walletIndex === -1) continue;
        
        const balanceChange = (postBalances[walletIndex] - preBalances[walletIndex]) / LAMPORTS_PER_SOL;
        
        // Only include incoming transactions (positive balance change)
        if (balanceChange > 0) {
          // Find the sender (account with negative balance change, excluding fee payer edge cases)
          let sender = 'unknown';
          for (let i = 0; i < accountKeys.length; i++) {
            if (i !== walletIndex) {
              const change = postBalances[i] - preBalances[i];
              if (change < 0) {
                sender = accountKeys[i].pubkey.toString();
                break;
              }
            }
          }
          
          transactions.push({
            signature: sig.signature,
            slot: sig.slot,
            blockTime: sig.blockTime,
            amount: balanceChange,
            from: sender,
            to: walletAddress,
            status: sig.confirmationStatus as 'confirmed' | 'finalized' | 'failed',
          });
        }
      } catch (err) {
        console.error(`Error parsing transaction ${sig.signature}:`, err);
      }
    }
    
    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}

/**
 * Check if a specific transaction exists and is valid
 */
export async function verifyTransaction(
  signature: string,
  expectedWallet: string,
  minAmount?: number
): Promise<{ valid: boolean; amount: number; from: string; error?: string }> {
  try {
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    
    if (!tx) {
      return { valid: false, amount: 0, from: '', error: 'Transaction not found' };
    }
    
    if (tx.meta?.err) {
      return { valid: false, amount: 0, from: '', error: 'Transaction failed' };
    }
    
    const preBalances = tx.meta!.preBalances;
    const postBalances = tx.meta!.postBalances;
    const accountKeys = tx.transaction.message.accountKeys;
    
    // Find the wallet index
    const walletIndex = accountKeys.findIndex(
      (key) => key.pubkey.toString() === expectedWallet
    );
    
    if (walletIndex === -1) {
      return { valid: false, amount: 0, from: '', error: 'Wallet not found in transaction' };
    }
    
    const balanceChange = (postBalances[walletIndex] - preBalances[walletIndex]) / LAMPORTS_PER_SOL;
    
    if (balanceChange <= 0) {
      return { valid: false, amount: 0, from: '', error: 'No incoming transfer detected' };
    }
    
    // Find sender
    let sender = 'unknown';
    for (let i = 0; i < accountKeys.length; i++) {
      if (i !== walletIndex) {
        const change = postBalances[i] - preBalances[i];
        if (change < 0) {
          sender = accountKeys[i].pubkey.toString();
          break;
        }
      }
    }
    
    if (minAmount && balanceChange < minAmount) {
      return { 
        valid: false, 
        amount: balanceChange, 
        from: sender, 
        error: `Amount ${balanceChange} SOL is less than minimum ${minAmount} SOL` 
      };
    }
    
    return { valid: true, amount: balanceChange, from: sender };
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return { valid: false, amount: 0, from: '', error: 'Failed to verify transaction' };
  }
}

/**
 * Get current SOL price in USD (using a simple approach)
 */
export async function getSolPrice(): Promise<number> {
  try {
    // Using CoinGecko API for price
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
    );
    const data = await response.json();
    return data.solana?.usd || 0;
  } catch (error) {
    console.error('Error fetching SOL price:', error);
    // Fallback price - you should handle this better in production
    return 100; 
  }
}

/**
 * Calculate how much SOL needed for a USD amount
 */
export async function usdToSol(usdAmount: number): Promise<number> {
  const solPrice = await getSolPrice();
  if (solPrice === 0) throw new Error('Could not fetch SOL price');
  return usdAmount / solPrice;
}

/**
 * Convert SOL to USD
 */
export async function solToUsd(solAmount: number): Promise<number> {
  const solPrice = await getSolPrice();
  return solAmount * solPrice;
}

/**
 * Watch for new transactions to a wallet (polling-based)
 * Returns new transactions since the last known signature
 */
export async function getNewTransactions(
  walletAddress: string,
  lastKnownSignature?: string,
  limit: number = 10
): Promise<SolanaTransaction[]> {
  const transactions = await getRecentTransactions(walletAddress, limit);
  
  if (!lastKnownSignature) {
    return transactions;
  }
  
  // Return only transactions newer than the last known one
  const lastIndex = transactions.findIndex(tx => tx.signature === lastKnownSignature);
  
  if (lastIndex === -1) {
    // Last known signature not found, return all
    return transactions;
  }
  
  return transactions.slice(0, lastIndex);
}

export { connection, HELIUS_RPC_URL };
