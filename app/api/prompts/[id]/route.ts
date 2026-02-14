import { NextRequest, NextResponse } from 'next/server';
import { DEMO_USER_ID, getPromptManager } from '../../../../src/server/prompt-store';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const manager = getPromptManager();
  const prompt = manager.getPrompt(DEMO_USER_ID, id);

  if (!prompt) {
    return NextResponse.json({ error: 'prompt not found' }, { status: 404 });
  }

  const versions = manager
    .getPromptVersions(DEMO_USER_ID, id)
    .sort((a, b) => b.versionNumber - a.versionNumber);

  return NextResponse.json({ prompt, versions });
}
