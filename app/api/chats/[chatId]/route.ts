import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

type RouteContext = { params: Promise<{ chatId: string }> };

// GET - Fetch chat with messages and extracted data
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await context.params;

    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        trip: { userId: session.user.id },
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        extractedLocations: { orderBy: { createdAt: 'asc' } },
        extractedCosts: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Transform extracted data to match frontend format
    const extractedLocations: Record<number, Array<{ name: string; type: string; description?: string; area?: string }>> = {};
    for (const loc of chat.extractedLocations) {
      if (!extractedLocations[loc.messageIndex]) {
        extractedLocations[loc.messageIndex] = [];
      }
      extractedLocations[loc.messageIndex].push({
        name: loc.name,
        type: loc.type,
        description: loc.description || undefined,
        area: loc.area || undefined,
      });
    }

    const extractedCosts: Record<number, Array<{ name: string; category: string; amount: number; quantity: number; unit: string; notes?: string; text_to_match?: string }>> = {};
    for (const cost of chat.extractedCosts) {
      if (!extractedCosts[cost.messageIndex]) {
        extractedCosts[cost.messageIndex] = [];
      }
      extractedCosts[cost.messageIndex].push({
        name: cost.name,
        category: cost.category,
        amount: cost.amount,
        quantity: cost.quantity,
        unit: cost.unit,
        notes: cost.notes || undefined,
        text_to_match: cost.textToMatch || undefined,
      });
    }

    return NextResponse.json({
      ...chat,
      extractedLocations,
      extractedCosts,
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}

// PUT - Update chat (title, messages, extracted data)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await context.params;
    const data = await request.json();

    // Verify ownership
    const existingChat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        trip: { userId: session.user.id },
      },
    });

    if (!existingChat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Update chat basic data
    await prisma.chat.update({
      where: { id: chatId },
      data: {
        title: data.title,
        destination: data.destination,
        budget: data.budget,
        tripSetupComplete: data.tripSetupComplete ?? false,
      },
    });

    // Sync messages if provided
    if (data.messages) {
      await prisma.message.deleteMany({ where: { chatId } });
      if (data.messages.length > 0) {
        await prisma.message.createMany({
          data: data.messages.map((msg: { role: string; content: string }) => ({
            chatId,
            role: msg.role,
            content: msg.content,
          })),
        });
      }
    }

    // Sync extracted locations if provided
    if (data.extractedLocations) {
      await prisma.extractedLocation.deleteMany({ where: { chatId } });
      const locations: { chatId: string; messageIndex: number; name: string; type: string; description?: string; area?: string }[] = [];
      for (const [msgIdx, locs] of Object.entries(data.extractedLocations)) {
        for (const loc of locs as Array<{ name: string; type: string; description?: string; area?: string }>) {
          locations.push({
            chatId,
            messageIndex: parseInt(msgIdx),
            name: loc.name,
            type: loc.type,
            description: loc.description || undefined,
            area: loc.area || undefined,
          });
        }
      }
      if (locations.length > 0) {
        await prisma.extractedLocation.createMany({ data: locations });
      }
    }

    // Sync extracted costs if provided
    if (data.extractedCosts) {
      await prisma.extractedCostItem.deleteMany({ where: { chatId } });
      const costs: { chatId: string; messageIndex: number; name: string; category: string; amount: number; quantity: number; unit: string; notes?: string; textToMatch?: string }[] = [];
      for (const [msgIdx, costItems] of Object.entries(data.extractedCosts)) {
        for (const cost of costItems as Array<{ name: string; category: string; amount: number; quantity: number; unit: string; notes?: string; text_to_match?: string }>) {
          costs.push({
            chatId,
            messageIndex: parseInt(msgIdx),
            name: cost.name,
            category: cost.category,
            amount: cost.amount,
            quantity: cost.quantity,
            unit: cost.unit,
            notes: cost.notes || undefined,
            textToMatch: cost.text_to_match || undefined,
          });
        }
      }
      if (costs.length > 0) {
        await prisma.extractedCostItem.createMany({ data: costs });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 });
  }
}

// DELETE - Delete chat
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await context.params;

    // Verify ownership
    const existingChat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        trip: { userId: session.user.id },
      },
    });

    if (!existingChat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    await prisma.chat.delete({ where: { id: chatId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}
