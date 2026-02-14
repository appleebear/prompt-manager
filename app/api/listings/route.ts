import { NextRequest, NextResponse } from 'next/server';
import { DEMO_USER_ID, getPromptManager, persistPromptManager } from '../../../src/server/prompt-store';

export const runtime = 'nodejs';

type PublishBody = {
  promptId?: string;
  title?: string;
  summary?: string;
  category?: string;
  tags?: string;
  visibility?: 'public' | 'unlisted';
  forkAllowed?: boolean;
};

export async function GET(request: NextRequest) {
  const manager = getPromptManager();
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  const entries = manager.searchPublic(q).map((entry) => {
    const detail = manager.getListing(entry.listing.slug, { includeUnlisted: true });
    return {
      ...entry.listing,
      stats: detail?.stats ?? { likeCount: 0, bookmarkCount: 0, forkCount: 0 },
    };
  });

  return NextResponse.json({ listings: entries });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as PublishBody;
  const promptId = body.promptId?.trim();

  if (!promptId) {
    return NextResponse.json({ error: 'promptId is required' }, { status: 400 });
  }

  const manager = getPromptManager();
  const prompt = manager.getPrompt(DEMO_USER_ID, promptId);
  if (!prompt) {
    return NextResponse.json({ error: 'prompt not found' }, { status: 404 });
  }

  const versions = manager.getPromptVersions(DEMO_USER_ID, promptId);
  const pinned = versions.find((entry) => entry.id === prompt.pinnedVersionId) ?? versions[versions.length - 1];
  if (!pinned) {
    return NextResponse.json({ error: 'no versions available' }, { status: 400 });
  }

  const listing = manager.publishListing(DEMO_USER_ID, {
    promptVersionId: pinned.id,
    title: body.title?.trim() || prompt.title,
    summary: body.summary?.trim() ?? prompt.description,
    category: body.category?.trim() || prompt.purpose,
    tags: (body.tags ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    visibility: body.visibility ?? 'public',
    rightsPolicy: {
      forkAllowed: body.forkAllowed ?? true,
    },
  });
  persistPromptManager();

  const detail = manager.getListing(listing.slug, { includeUnlisted: true });
  return NextResponse.json({ listing: detail?.listing ?? listing, stats: detail?.stats ?? null });
}
