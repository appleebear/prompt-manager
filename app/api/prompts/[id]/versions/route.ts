import { NextRequest, NextResponse } from 'next/server';
import { DEMO_USER_ID, getPromptManager, persistPromptManager } from '../../../../../src/server/prompt-store';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CreateVersionBody = {
  content?: string;
  summary?: string;
  role?: 'system' | 'user' | 'assistant';
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as CreateVersionBody;
  const content = body.content?.trim();

  if (!content) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const manager = getPromptManager();
  const prompt = manager.getPrompt(DEMO_USER_ID, id);
  if (!prompt) {
    return NextResponse.json({ error: 'prompt not found' }, { status: 404 });
  }

  const created = manager.createVersion({
    userId: DEMO_USER_ID,
    promptId: id,
    createdBy: 'user',
    summary: body.summary?.trim(),
    blocks: [{ role: body.role ?? 'system', content }],
  });
  persistPromptManager();

  return NextResponse.json({
    prompt: manager.getPrompt(DEMO_USER_ID, id),
    version: created,
  });
}
