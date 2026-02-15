import { describe, expect, it } from 'vitest';
import { toDisplayPromptText } from '../src/prompt-text.js';

describe('toDisplayPromptText', () => {
  it('shouldJoinBlockContentsWithoutRolePrefixes', () => {
    const rendered = toDisplayPromptText([
      { role: 'system', content: 'You are a concise assistant.' },
      { role: 'user', content: 'Summarize the release notes.' },
    ]);

    expect(rendered).toBe('You are a concise assistant.\nSummarize the release notes.');
    expect(rendered).not.toContain('[system]');
    expect(rendered).not.toContain('[user]');
  });
});
