export type PromptDisplayBlock = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export function toDisplayPromptText(blocks: PromptDisplayBlock[]): string {
  return blocks.map((block) => block.content).join('\n');
}
