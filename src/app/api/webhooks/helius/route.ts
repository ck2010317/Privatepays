import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkTokenBalance } from '@/lib/solana';

interface HeliusTransaction {
  signature: string;
  type: string;
  source: string;
  destination: string;
  description?: string;
  tokenTransfers: Array<{
    tokenMint: string;
    nativeTransfers: Array<{
      fromUserAccount: string;
      toUserAccount: string;
      amount: number;
    }>;
  }>;
  nativeTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  timestamp: number;
}

interface HeliusWebhookPayload {
  webhookID: string;
  webhookURL: string;
  idea: string;
  auth_header: string;
  transactions: HeliusTransaction[];
}

/**
 * Extract memo from transaction description or other fields
 * Helius may include memo in description or we need to parse it
 */
function extractMemoFromTx(tx: HeliusTransaction): string | null {
  // Try to extract from description
  if (tx.description && tx.description.includes('verify_')) {
    const match = tx.description.match(/verify_[^\s]+/);
    if (match) return match[0];
  }
  // Could also parse from transaction instructions if needed
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication header
    const authHeader = request.headers.get('x-helius-secret');
    const expectedSecret = process.env.HELIUS_WEBHOOK_SECRET || 'test-secret';

    if (authHeader !== expectedSecret) {
      console.error('Invalid webhook secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload: HeliusWebhookPayload = await request.json();
    console.log('Helius webhook received:', {
      webhookID: payload.webhookID,
      transactionCount: payload.transactions.length,
    });

    const mainWallet = '6aGvR36EkR4wB57xN8JvMAR3nikzYoYwxbBKJTJYD3jy';

    // Process each transaction
    for (const tx of payload.transactions) {
      console.log(`Processing transaction: ${tx.signature}`);

      // Look for SOL transfers to our main wallet
      if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
        for (const transfer of tx.nativeTransfers) {
          // Check if this is a transfer TO our main wallet
          if (transfer.toUserAccount === mainWallet) {
            const amountLamports = transfer.amount;
            const amountSol = amountLamports / 1_000_000_000;
            const senderAddress = transfer.fromUserAccount;

            console.log(`Found SOL transfer to main wallet: ${amountSol} SOL from ${senderAddress}`);

            // Check if this is a token verification payment (~$40)
            const isVerification = amountSol >= 0.0001 && amountSol <= 2; // Rough estimate for $40
            
            if (isVerification) {
              // Try to find matching verification order
              const verificationOrder = await prisma.paymentOrder.findFirst({
                where: {
                  status: 'pending',
                  isTokenVerification: true,
                  amountSol: {
                    gte: amountSol - 0.0002,
                    lte: amountSol + 0.0002,
                  },
                },
              });

              if (verificationOrder) {
                console.log(`Matched token verification order: ${verificationOrder.id}`);

                // Check if sender's wallet has required tokens
                const tokenCheck = await checkTokenBalance(senderAddress);
                console.log(`Token check for ${senderAddress}:`, tokenCheck);

                const verified = tokenCheck.hasRequiredTokens;

                // Update verification order
                await prisma.paymentOrder.update({
                  where: { id: verificationOrder.id },
                  data: {
                    status: verified ? 'completed' : 'failed',
                    txSignature: tx.signature,
                    senderAddress: senderAddress,
                    tokenVerified: verified,
                    paidAmount: amountSol,
                    paidAt: new Date(tx.timestamp * 1000),
                  },
                });

                console.log(`Token verification ${verified ? 'PASSED' : 'FAILED'} for order ${verificationOrder.id}`);

                if (!verified) {
                  console.log(`User ${verificationOrder.userId} does not have required tokens. Balance: ${tokenCheck.balance}, Required: ${tokenCheck.required}`);
                }
                
                continue; // Move to next transfer
              }
            }

            // Regular payment order (card creation or topup)
            const pendingOrder = await prisma.paymentOrder.findFirst({
              where: {
                status: 'pending',
                isTokenVerification: false,
                amountSol: {
                  // Allow for small rounding differences (0.001 SOL)
                  gte: amountSol - 0.001,
                  lte: amountSol + 0.001,
                },
              },
            });

            if (pendingOrder) {
              console.log(`Matched regular PaymentOrder: ${pendingOrder.id}`);

              // Update the payment order with transaction signature
              const updatedOrder = await prisma.paymentOrder.update({
                where: { id: pendingOrder.id },
                data: {
                  status: 'processing',
                  txSignature: tx.signature,
                  paidAmount: amountSol,
                  paidAt: new Date(tx.timestamp * 1000),
                },
              });

              console.log(`Payment detected for order ${pendingOrder.id}, status set to 'processing'`);
              // Note: Card creation and topups are processed via GET endpoint polling
              // Setting status='processing' allows the GET endpoint to call processPaymentOrder()
            } else {
              console.warn(`No matching PaymentOrder found for amount ${amountSol} SOL`);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
