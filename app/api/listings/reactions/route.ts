import { NextResponse } from 'next/server';
import { getPromptManager } from '../../../../src/server/prompt-store';

export const runtime = 'nodejs';

const PUBLIC_VISITOR_ID = 'public-visitor';

export async function GET() {
  const manager = getPromptManager();
  const reactions = manager.listReactionsForUser(PUBLIC_VISITOR_ID);

  return NextResponse.json({
    liked: reactions.liked.map((entry) => ({ ...entry.listing, stats: entry.stats })),
    bookmarked: reactions.bookmarked.map((entry) => ({ ...entry.listing, stats: entry.stats })),
  });
}
