import { PromptManager } from '../prompt-manager';
import { loadStateSnapshot, saveStateSnapshot } from './state-db';

export const DEMO_USER_ID = 'demo-user';

declare global {
  // eslint-disable-next-line no-var
  var __promptManagerSingleton: PromptManager | undefined;
}

function seed(manager: PromptManager): void {
  const incident = manager.createPrompt({
    userId: DEMO_USER_ID,
    title: 'Incident Report Summarizer',
    description: 'Summarize raw incident notes into executive report',
    purpose: 'summarization',
    outputFormat: 'markdown',
    language: 'en',
    tone: 'formal',
    sensitivity: 'normal',
    notes: 'used by operations team',
    tags: ['ops', 'summary'],
    blocks: [
      {
        role: 'system',
        content:
          'You are an operations analyst. Produce: Timeline, Root cause, Impact, Action items. Keep it concise.',
      },
    ],
  });

  manager.createVersion({
    userId: DEMO_USER_ID,
    promptId: incident.prompt.id,
    createdBy: 'user',
    summary: 'Added stronger structure',
    blocks: [
      {
        role: 'system',
        content:
          'You are an operations analyst. Output sections: TL;DR, Timeline, Root cause, Impact, Action items. Use bullet points.',
      },
    ],
  });

  const qa = manager.createPrompt({
    userId: DEMO_USER_ID,
    title: 'QA Test Case Writer',
    description: 'Generate deterministic test cases from requirements',
    purpose: 'coding',
    outputFormat: 'markdown',
    language: 'en',
    tone: 'strict',
    sensitivity: 'normal',
    notes: 'for backend and API contracts',
    tags: ['qa', 'testing'],
    blocks: [
      {
        role: 'user',
        content: 'Given the requirement, write happy path and edge-case tests with explicit expected outputs.',
      },
    ],
  });

  manager.publishListing(DEMO_USER_ID, {
    promptVersionId: qa.version.id,
    title: 'Deterministic QA Test Writer',
    summary: 'Create consistent test cases from requirements',
    category: 'engineering',
    tags: ['qa', 'tests', 'engineering'],
    visibility: 'public',
  });
}

export function getPromptManager(): PromptManager {
  if (!globalThis.__promptManagerSingleton) {
    const manager = new PromptManager();
    const snapshot = loadStateSnapshot();

    if (snapshot) {
      manager.loadState(snapshot);
    } else {
      seed(manager);
      saveStateSnapshot(manager.serializeState());
    }

    globalThis.__promptManagerSingleton = manager;
  }

  return globalThis.__promptManagerSingleton;
}

export function persistPromptManager(): void {
  const manager = getPromptManager();
  saveStateSnapshot(manager.serializeState());
}
