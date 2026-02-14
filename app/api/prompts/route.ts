import { NextRequest, NextResponse } from 'next/server';
import { DEMO_USER_ID, getPromptManager, persistPromptManager } from '../../../src/server/prompt-store';

export const runtime = 'nodejs';

type CreatePromptBody = {
  title?: string;
  content?: string;
  tags?: string;
  purpose?: string;
  outputFormat?: string;
  language?: string;
  tone?: string;
  description?: string;
  notes?: string;
};

function toPromptListItem(userId: string, promptId: string) {
  const manager = getPromptManager();
  const prompt = manager.getPrompt(userId, promptId);
  if (!prompt) {
    return null;
  }
  const versions = manager.getPromptVersions(userId, promptId);
  const pinned = versions.find((entry) => entry.id === prompt.pinnedVersionId);
  const pinnedText = pinned?.blocks.map((block) => block.content).join('\n') ?? '';
  return {
    ...prompt,
    versionCount: versions.length,
    pinnedSnippet: pinnedText.slice(0, 180),
    pinnedText,
  };
}

export async function GET(request: NextRequest) {
  const manager = getPromptManager();
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const tag = request.nextUrl.searchParams.get('tag')?.trim() ?? undefined;

  if (q) {
    const result = manager.searchPrivate(DEMO_USER_ID, q, tag ? { tag } : {});
    const prompts = result
      .map((entry) => toPromptListItem(DEMO_USER_ID, entry.prompt.id))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    return NextResponse.json({ prompts });
  }

  const prompts = manager
    .listPrompts(DEMO_USER_ID, tag ? { tag } : {})
    .map((prompt) => toPromptListItem(DEMO_USER_ID, prompt.id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return NextResponse.json({ prompts });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreatePromptBody;
  const title = body.title?.trim();
  const content = body.content?.trim();

  if (!title || !content) {
    return NextResponse.json({ error: 'title and content are required' }, { status: 400 });
  }

  const tags = (body.tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const manager = getPromptManager();
  const created = manager.createPrompt({
    userId: DEMO_USER_ID,
    title,
    description: body.description?.trim() ?? '',
    purpose: body.purpose?.trim() || 'general',
    outputFormat: body.outputFormat?.trim() || 'markdown',
    language: body.language?.trim() || 'en',
    tone: body.tone?.trim() || 'neutral',
    sensitivity: 'normal',
    notes: body.notes?.trim() ?? '',
    tags,
    blocks: [{ role: 'system', content }],
  });
  persistPromptManager();

  return NextResponse.json({
    prompt: toPromptListItem(DEMO_USER_ID, created.prompt.id),
    version: created.version,
  });
}
