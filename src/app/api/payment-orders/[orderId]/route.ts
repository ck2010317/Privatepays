import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { verifyTransaction, getRecentTransactions, solToUsd } from '@/lib/solana';
import zeroidApi from '@/lib/api/zeroid';

// Check payment status and process if paid
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { orderId } = await params;

    const order = await prisma.paymentOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // If already completed or failed, just return status
    if (['completed', 'failed'].includes(order.status)) {
      let card = null;
      if (order.createdCardId) {
        card = await prisma.card.findUnique({
          where: { id: order.createdCardId },
        });
      }
      return NextResponse.json({ order, card });
    }

    // Check if expired
    if (order.status === 'pending' && new Date(order.expiresAt) < new Date()) {
      await prisma.paymentOrder.update({
        where: { id: orderId },
        data: { status: 'expired' },
      });
      return NextResponse.json({ 
        order: { ...order, status: 'expired' },
        message: 'Payment order has expired'
      });
    }

    // Check for payment on blockchain
    if (order.status === 'pending') {
      try {
        // Use expected wallet or fallback to the main deposit wallet
        const walletToCheck = order.expectedWallet || '6aGvR36EkR4wB57xN8JvMAR3nikzYoYwxbBKJTJYD3jy';
        console.log(`Checking transactions for order ${orderId} on wallet ${walletToCheck}, expected amount: ${order.amountSol} SOL`);
        
        const transactions = await getRecentTransactions(walletToCheck, 20);
        
        // Look for a transaction that matches our expected amount (with 5% tolerance)
        const minAmount = order.amountSol * 0.95;
        const maxAmount = order.amountSol * 1.05;
        
        // Find transaction that was sent after order was created and matches amount
        const orderCreatedTime = new Date(order.createdAt).getTime() / 1000;
        
        for (const tx of transactions) {
          // Skip if transaction is older than order
          if (tx.blockTime && tx.blockTime < orderCreatedTime - 60) continue;
          
          // Skip if signature is missing
          if (!tx.signature) continue;
          
          // Check if amount matches
          if (tx.amount >= minAmount && tx.amount <= maxAmount) {
            // Check if this transaction is already used by another order
            const existingOrder = await prisma.paymentOrder.findFirst({
              where: { txSignature: tx.signature },
            });
            
            if (existingOrder) continue;
            
            // Found a matching payment!
            // Update order as paid (including sender address for token verification)
            await prisma.paymentOrder.update({
              where: { id: orderId },
              data: {
                status: 'processing',
                txSignature: tx.signature,
                paidAmount: tx.amount,
                paidAt: new Date(),
                senderAddress: tx.from, // Capture sender for token verification
              },
            });

            // Process the order
            return await processPaymentOrder(orderId, user.id);
          }
        }
      } catch (blockchainError) {
        console.error('Error checking blockchain transactions:', blockchainError);
        // Don't fail the request, just return waiting status
        return NextResponse.json({ 
          order,
          message: 'Waiting for payment... (could not verify blockchain at this moment)',
        });
      }
    }

    // If already processing, try to complete
    if (order.status === 'processing') {
      return await processPaymentOrder(orderId, user.id);
    }

    return NextResponse.json({ 
      order,
      message: 'Waiting for payment...'
    });
  } catch (error) {
    console.error('Check payment order error:', error);
    const message = error instanceof Error ? error.message : 'Failed to check order';
    const stack = error instanceof Error ? error.stack : '';
    console.error('Error details:', { message, stack });
    
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message, details: stack }, { status: 500 });
  }
}

// Process a paid order - create card or top-up
async function processPaymentOrder(orderId: string, userId: string) {
  const order = await prisma.paymentOrder.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  try {
    if (order.type === 'card_creation') {
      // Get user details for card creation
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // NEW: Verify token ownership during payment processing
      const { checkTokenBalance } = await import('@/lib/solana');
      const senderAddress = order.senderAddress;
      
      if (!senderAddress) {
        throw new Error('Payment sender address not found');
      }

      console.log(`Verifying token balance for sender: ${senderAddress}`);
      const tokenCheck = await checkTokenBalance(senderAddress);
      
      if (!tokenCheck.hasRequiredTokens) {
        console.error(`Token verification FAILED: ${senderAddress} has ${tokenCheck.balance} tokens, needs ${tokenCheck.required}`);
        
        // Mark order as failed due to failed token verification
        await prisma.paymentOrder.update({
          where: { id: orderId },
          data: { 
            status: 'failed',
            tokenVerified: false,
          },
        });
        
        return NextResponse.json(
          { 
            error: 'Token verification failed. Your wallet does not hold the required tokens. Refund will be processed.',
            tokenBalance: tokenCheck.balance,
            tokenRequired: tokenCheck.required,
          },
          { status: 403 }
        );
      }

      console.log(`Token verification PASSED: ${senderAddress} has ${tokenCheck.balance} tokens`);
      
      // Update order to mark token as verified
      await prisma.paymentOrder.update({
        where: { id: orderId },
        data: { tokenVerified: true },
      });

      // Create card via ZeroID API
      let zeroidCardId = null;
      try {
        console.log('Creating card with ZeroID:', {
          title: order.cardTitle || 'My Card',
          email: order.email || user.email,
          phone_number: order.phoneNumber || user.phone || '+10000000000',
          card_commission_id: '5',
          currency_id: 'usdc',
        });
        
        const result = await zeroidApi.createCard({
          title: order.cardTitle || 'My Card',
          email: order.email || user.email,
          phone_number: order.phoneNumber || user.phone || '+10000000000',
          card_commission_id: '5',
          currency_id: 'usdc',
        });
        
        console.log('ZeroID createCard response:', result);
        zeroidCardId = result.card_id;
      } catch (apiError) {
        console.error('ZeroID card creation error - FULL:', apiError);
        console.error('ZeroID Error details:', {
          message: apiError instanceof Error ? apiError.message : 'Unknown error',
          stack: apiError instanceof Error ? apiError.stack : 'No stack',
        });
        
        // Mark as failed
        await prisma.paymentOrder.update({
          where: { id: orderId },
          data: { 
            status: 'failed',
          },
        });
        return NextResponse.json({ 
          error: 'Failed to create card. Payment received. Please contact support.',
          zeroidError: apiError instanceof Error ? apiError.message : String(apiError),
          order: { ...order, status: 'failed' }
        }, { status: 500 });
      }

      // Create card in our database
      const card = await prisma.card.create({
        data: {
          userId,
          zeroidCardId,
          title: order.cardTitle || 'My Card',
          status: 'active',
          // Store the NET amount the card will receive (after fees deducted by API)
          balance: order.topUpAmount && order.topUpFee 
            ? Math.max(0, order.topUpAmount - order.topUpFee)
            : order.topUpAmount || 0,
          currency: 'USD',
        },
      });

      // If there's initial top-up, do it via ZeroID
      if (order.topUpAmount && order.topUpAmount > 0 && zeroidCardId) {
        try {
          await zeroidApi.topUpCard(zeroidCardId, {
            amount: order.topUpAmount,
            currency_id: 'usdc',
          });
        } catch (topUpError) {
          console.error('ZeroID top-up error:', topUpError);
          // Card created but top-up failed - still mark as completed
          // Admin can manually fix this
        }
      }

      // Update order as completed
      await prisma.paymentOrder.update({
        where: { id: orderId },
        data: {
          status: 'completed',
          createdCardId: card.id,
        },
      });

      // Create transaction record
      await prisma.transaction.create({
        data: {
          userId,
          cardId: card.id,
          type: 'card_creation',
          amount: -order.amountUsd,
          currency: 'USD',
          status: 'completed',
          description: `Card created: ${order.cardTitle}`,
          reference: order.txSignature,
        },
      });

      return NextResponse.json({
        order: { ...order, status: 'completed', createdCardId: card.id },
        card,
        message: 'Card created successfully!',
      });

    } else if (order.type === 'card_topup') {
      // Get card
      const card = await prisma.card.findUnique({
        where: { id: order.cardId! },
      });

      if (!card) {
        throw new Error('Card not found');
      }

      // Top-up via ZeroID API
      if (card.zeroidCardId) {
        try {
          await zeroidApi.topUpCard(card.zeroidCardId, {
            amount: order.topUpAmount!,
            currency_id: 'usdc',
          });
        } catch (apiError) {
          console.error('ZeroID top-up error:', apiError);
          await prisma.paymentOrder.update({
            where: { id: orderId },
            data: { status: 'failed' },
          });
          return NextResponse.json({
            error: 'Failed to top-up card. Payment received. Please contact support.',
            order: { ...order, status: 'failed' }
          }, { status: 500 });
        }
      }

      // Update card balance
      const updatedCard = await prisma.card.update({
        where: { id: card.id },
        data: { balance: { increment: order.topUpAmount! } },
      });

      // Update order as completed
      await prisma.paymentOrder.update({
        where: { id: orderId },
        data: { status: 'completed' },
      });

      // Create transaction record
      await prisma.transaction.create({
        data: {
          userId,
          cardId: card.id,
          type: 'card_topup',
          amount: -order.amountUsd,
          currency: 'USD',
          status: 'completed',
          description: `Top-up: $${order.topUpAmount}`,
          reference: order.txSignature,
        },
      });

      return NextResponse.json({
        order: { ...order, status: 'completed' },
        card: updatedCard,
        message: 'Card topped up successfully!',
      });
    }

    return NextResponse.json({ error: 'Invalid order type' }, { status: 400 });

  } catch (error) {
    console.error('Process payment order error:', error);
    return NextResponse.json({
      error: 'Failed to process order. Please contact support.',
      order,
    }, { status: 500 });
  }
}

// Manually verify a transaction signature
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { orderId } = await params;
    const body = await request.json();
    const { txSignature } = body;

    if (!txSignature) {
      return NextResponse.json(
        { error: 'Transaction signature is required' },
        { status: 400 }
      );
    }

    const order = await prisma.paymentOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!['pending', 'processing'].includes(order.status)) {
      return NextResponse.json({
        error: `Order already ${order.status}`,
        order,
      }, { status: 400 });
    }

    // Check if expired
    if (new Date(order.expiresAt) < new Date()) {
      await prisma.paymentOrder.update({
        where: { id: orderId },
        data: { status: 'expired' },
      });
      return NextResponse.json({
        error: 'Order has expired',
        order: { ...order, status: 'expired' },
      }, { status: 400 });
    }

    // Verify the transaction
    const verification = await verifyTransaction(
      txSignature,
      order.expectedWallet,
      order.amountSol * 0.95 // 5% tolerance
    );

    if (!verification.valid) {
      return NextResponse.json({
        error: verification.error || 'Invalid transaction',
        order,
      }, { status: 400 });
    }

    // Check if transaction already used
    const existingOrder = await prisma.paymentOrder.findUnique({
      where: { txSignature },
    });

    if (existingOrder) {
      return NextResponse.json({
        error: 'This transaction has already been used',
        order,
      }, { status: 400 });
    }

    // Update order as paid
    await prisma.paymentOrder.update({
      where: { id: orderId },
      data: {
        status: 'processing',
        txSignature,
        paidAmount: verification.amount,
        paidAt: new Date(),
      },
    });

    // Process the order
    return await processPaymentOrder(orderId, user.id);

  } catch (error) {
    console.error('Verify payment error:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify payment';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
