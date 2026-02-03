import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface HeliusTransaction {
  signature: string;
  type: string;
  source: string;
  destination: string;
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

            console.log(`Found SOL transfer to main wallet: ${amountSol} SOL from ${transfer.fromUserAccount}`);

            // Find matching PaymentOrder
            const pendingOrder = await prisma.paymentOrder.findFirst({
              where: {
                status: 'pending',
                amountSol: {
                  // Allow for small rounding differences (0.001 SOL)
                  gte: amountSol - 0.001,
                  lte: amountSol + 0.001,
                },
              },
            });

            if (pendingOrder) {
              console.log(`Matched PaymentOrder: ${pendingOrder.id}`);

              // Update the payment order with transaction signature
              const updatedOrder = await prisma.paymentOrder.update({
                where: { id: pendingOrder.id },
                data: {
                  status: 'completed',
                  txSignature: tx.signature,
                  paidAmount: amountSol,
                  paidAt: new Date(tx.timestamp * 1000),
                },
              });

              // Process the payment based on type
              if (updatedOrder.type === 'card_creation') {
                console.log(`Processing card creation for user ${updatedOrder.userId}`);
                // Card creation will be triggered by the frontend polling
              } else if (updatedOrder.type === 'card_topup') {
                console.log(`Processing card topup for card ${updatedOrder.cardId}`);
                // Topup will be triggered by the frontend polling
              }
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
