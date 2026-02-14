import { NextRequest, NextResponse } from 'next/server';
import { getPromptManager, persistPromptManager } from '../../../../../src/server/prompt-store';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const manager = getPromptManager();

  try {
    const stats = manager.bookmarkListing('public-visitor', id);
    persistPromptManager();
    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'failed to bookmark listing' },
      { status: 400 },
    );
  }
}
