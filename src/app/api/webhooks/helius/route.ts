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
    // Verify authentication header from Helius
    const authHeader = request.headers.get('x-helius-secret');
    const expectedSecret = process.env.HELIUS_WEBHOOK_SECRET;

    console.log('=== HELIUS WEBHOOK RECEIVED ===');
    console.log('Auth header received:', authHeader ? 'present' : 'missing');
    console.log('Expected secret configured:', expectedSecret ? 'yes' : 'no');

    // Verify auth if secret is configured
    if (expectedSecret && authHeader !== expectedSecret) {
      console.error('Webhook auth failed - invalid secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = await request.json();
    console.log('Helius webhook received:', {
      webhookID: payload.webhookID,
      transactionCount: payload.transactions?.length || 0,
    });

    if (!payload.transactions || payload.transactions.length === 0) {
      console.log('No transactions in webhook payload');
      return NextResponse.json({ success: true, message: 'No transactions' });
    }

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

            // Try to extract memo from transaction
            const memo = extractMemoFromTx(tx);
            console.log(`Extracted memo from transaction: ${memo || 'none'}`);

            // Check if this is a token verification payment (must be at least ~0.02 SOL = roughly $5 at current prices)
            // Accept any payment >= 0.02 SOL as a verification payment
            const isVerification = amountSol >= 0.02;
            
            if (isVerification) {
              let verificationOrder = null;

              // First try to match by memo if we have one (most accurate)
              if (memo) {
                verificationOrder = await prisma.paymentOrder.findFirst({
                  where: {
                    status: 'pending',
                    isTokenVerification: true,
                    verificationMemo: memo,
                  },
                });
                if (verificationOrder) {
                  console.log(`Matched verification order by memo: ${verificationOrder.id}`);
                }
              }

              // If no memo match, try to find by amount and recent timestamp
              if (!verificationOrder) {
                verificationOrder = await prisma.paymentOrder.findFirst({
                  where: {
                    status: 'pending',
                    isTokenVerification: true,
                    amountUsd: 5, // Standard verification fee is $5
                    // Order must have been created within last 30 minutes (within expiry window)
                    expiresAt: {
                      gte: new Date(), // Not expired yet
                    },
                  },
                  orderBy: { createdAt: 'desc' },
                });
                if (verificationOrder) {
                  console.log(`Matched verification order by amount/timestamp: ${verificationOrder.id}`);
                }
              }

              if (verificationOrder) {
                console.log(`Processing token verification order: ${verificationOrder.id} for user ${verificationOrder.userId}`);

                // Check if sender's wallet has required tokens
                const tokenCheck = await checkTokenBalance(senderAddress);
                console.log(`Token check for ${senderAddress}:`, tokenCheck);

                const verified = tokenCheck.hasRequiredTokens;

                // Update verification order
                const updatedOrder = await prisma.paymentOrder.update({
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
                console.log(`Updated order status: ${updatedOrder.status}, tokenVerified: ${updatedOrder.tokenVerified}`);

                if (!verified) {
                  console.log(`User ${verificationOrder.userId} does not have required tokens. Balance: ${tokenCheck.balance}, Required: ${tokenCheck.required}`);
                }
                
                continue; // Move to next transfer
              } else {
                console.log(`No pending verification order found for $5 token check from ${senderAddress}`);
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

// GET endpoint for health check and debugging
export async function GET() {
  try {
    // Get recent verification orders for debugging
    const recentVerifications = await prisma.paymentOrder.findMany({
      where: {
        isTokenVerification: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        userId: true,
        status: true,
        tokenVerified: true,
        senderAddress: true,
        amountUsd: true,
        amountSol: true,
        txSignature: true,
        createdAt: true,
        expiresAt: true,
        paidAt: true,
      },
    });

    return NextResponse.json({
      status: 'Webhook endpoint is active',
      mainWallet: '6aGvR36EkR4wB57xN8JvMAR3nikzYoYwxbBKJTJYD3jy',
      webhookSecretConfigured: !!process.env.HELIUS_WEBHOOK_SECRET,
      recentVerifications: recentVerifications.map(v => ({
        ...v,
        isExpired: new Date(v.expiresAt) < new Date(),
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch debug info' }, { status: 500 });
  }
}
