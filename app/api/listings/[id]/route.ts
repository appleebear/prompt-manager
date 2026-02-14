import { NextRequest, NextResponse } from 'next/server';
import { getPromptManager } from '../../../../src/server/prompt-store';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const manager = getPromptManager();
  const detail = manager.getListingContent(id, { includeUnlisted: false });

  if (!detail) {
    return NextResponse.json({ error: 'listing not found' }, { status: 404 });
  }

  return NextResponse.json(detail);
}
