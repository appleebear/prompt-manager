import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { PromptManager } from '../src/prompt-manager.js';

describe('PromptManager', () => {
  it('shouldCreatePromptWithInitialVersionSnapshot', () => {
    const manager = new PromptManager();

    const created = manager.createPrompt({
      userId: 'user-1',
      title: 'Summarize article',
      description: 'Summarize long text into bullets',
      purpose: 'summarization',
      outputFormat: 'markdown',
      language: 'ko',
      tone: 'neutral',
      sensitivity: 'normal',
      notes: 'internal use',
      blocks: [{ role: 'system', content: 'You are a helpful assistant.' }],
    });

    expect(created.prompt.userId).toBe('user-1');
    expect(created.prompt.title).toBe('Summarize article');
    expect(created.version.versionNumber).toBe(1);
    expect(created.version.createdBy).toBe('user');
    expect(created.version.blocks).toEqual([
      { role: 'system', content: 'You are a helpful assistant.', orderIndex: 0 },
    ]);
    expect(created.prompt.pinnedVersionId).toBe(created.version.id);
  });

  it('shouldCreateNewVersionOnEditWithoutMutatingPreviousVersion', () => {
    const manager = new PromptManager();

    const created = manager.createPrompt({
      userId: 'user-1',
      title: 'Translator',
      description: 'translate text',
      purpose: 'translation',
      outputFormat: 'markdown',
      language: 'en',
      tone: 'formal',
      sensitivity: 'normal',
      notes: '',
      blocks: [{ role: 'system', content: 'Translate to Korean.' }],
    });

    const updated = manager.createVersion({
      userId: 'user-1',
      promptId: created.prompt.id,
      createdBy: 'user',
      blocks: [{ role: 'system', content: 'Translate to Korean in polite tone.' }],
      summary: 'Clarified tone',
    });

    const versions = manager.getPromptVersions('user-1', created.prompt.id);

    expect(versions).toHaveLength(2);
    expect(updated.versionNumber).toBe(2);
    expect(versions[0].blocks[0]?.content).toBe('Translate to Korean.');
    expect(versions[1].blocks[0]?.content).toBe('Translate to Korean in polite tone.');
    expect(manager.getPrompt('user-1', created.prompt.id)?.pinnedVersionId).toBe(updated.id);
  });

  it('shouldArchiveDeleteRestoreAndPurgePrompt', () => {
    const manager = new PromptManager();
    const created = manager.createPrompt({
      userId: 'user-1',
      title: 'Email helper',
      description: '',
      purpose: 'writing',
      outputFormat: 'markdown',
      language: 'en',
      tone: 'friendly',
      sensitivity: 'normal',
      notes: '',
      blocks: [{ role: 'system', content: 'Draft concise emails.' }],
    });

    const archived = manager.archivePrompt('user-1', created.prompt.id);
    expect(archived.archivedAt).not.toBeNull();

    const unarchived = manager.restorePrompt('user-1', created.prompt.id);
    expect(unarchived.archivedAt).toBeNull();

    const deleted = manager.deletePrompt('user-1', created.prompt.id);
    expect(deleted.deletedAt).not.toBeNull();

    const restored = manager.restoreFromTrash('user-1', created.prompt.id);
    expect(restored.deletedAt).toBeNull();

    manager.purgePrompt('user-1', created.prompt.id);
    expect(manager.getPrompt('user-1', created.prompt.id)).toBeUndefined();
    expect(manager.getPromptVersions('user-1', created.prompt.id)).toEqual([]);
  });

  it('shouldFilterPromptListByFolderAndTagAndSuggestTags', () => {
    const manager = new PromptManager();
    const root = manager.createFolder({ userId: 'user-1', name: 'Root' });
    const marketing = manager.createFolder({ userId: 'user-1', name: 'Marketing', parentId: root.id });

    const p1 = manager.createPrompt({
      userId: 'user-1',
      folderId: marketing.id,
      tags: ['rag', 'json'],
      title: 'RAG JSON answer',
      description: '',
      purpose: 'rag',
      outputFormat: 'json',
      language: 'ko',
      tone: 'strict',
      sensitivity: 'normal',
      notes: '',
      blocks: [{ role: 'user', content: 'Answer from context.' }],
    });

    manager.createPrompt({
      userId: 'user-1',
      tags: ['marketing'],
      title: 'Ad copy',
      description: '',
      purpose: 'writing',
      outputFormat: 'markdown',
      language: 'en',
      tone: 'creative',
      sensitivity: 'normal',
      notes: '',
      blocks: [{ role: 'user', content: 'Write ad copy.' }],
    });

    expect(manager.listPrompts('user-1', { folderId: marketing.id }).map((p) => p.id)).toEqual([p1.prompt.id]);
    expect(manager.listPrompts('user-1', { tag: 'rag' }).map((p) => p.id)).toEqual([p1.prompt.id]);
    expect(manager.suggestTags('user-1', 'ra')).toEqual(['rag']);
  });

  it('shouldDiffVersionsAndRollbackByPinChange', () => {
    const manager = new PromptManager();
    const created = manager.createPrompt({
      userId: 'user-1',
      title: 'Classifier',
      description: '',
      purpose: 'classification',
      outputFormat: 'json',
      language: 'en',
      tone: 'strict',
      sensitivity: 'normal',
      notes: '',
      blocks: [
        {
          role: 'system',
          content: ['Classify intent.', 'Return JSON only.', 'Keep answer brief.'].join('\n'),
        },
      ],
    });

    const v2 = manager.createVersion({
      userId: 'user-1',
      promptId: created.prompt.id,
      createdBy: 'user',
      blocks: [
        {
          role: 'system',
          content: ['Classify user intent.', 'Return strict JSON only.', 'Keep answer brief.'].join('\n'),
        },
      ],
    });

    const diff = manager.diffVersions('user-1', created.prompt.id, created.version.id, v2.id);

    expect(diff.some((line) => line.type === 'removed' && line.text === 'Classify intent.')).toBe(true);
    expect(diff.some((line) => line.type === 'added' && line.text === 'Classify user intent.')).toBe(true);

    const pinned = manager.pinVersion('user-1', created.prompt.id, created.version.id);
    expect(pinned.pinnedVersionId).toBe(created.version.id);
  });

  it('shouldRenderTemplateWithDefaultsAndBlockWhenRequiredVariableMissing', () => {
    const manager = new PromptManager();
    const created = manager.createPrompt({
      userId: 'user-1',
      title: 'Template prompt',
      description: '',
      purpose: 'writing',
      outputFormat: 'markdown',
      language: 'ko',
      tone: 'neutral',
      sensitivity: 'normal',
      notes: '',
      blocks: [
        {
          role: 'user',
          content: 'Summarize {{topic}} in {{language}}.',
        },
      ],
    });

    manager.setPromptVariables('user-1', created.prompt.id, [
      { name: 'topic', description: 'topic to summarize', required: true, type: 'string' },
      { name: 'language', description: 'output language', required: true, type: 'string', defaultValue: 'ko' },
    ]);

    const rendered = manager.renderVersion('user-1', created.version.id, { topic: 'AI agent' });
    expect(rendered.text).toBe('Summarize AI agent in ko.');

    expect(() => manager.renderVersion('user-1', created.version.id, {})).toThrow(
      'Missing required variables: topic',
    );
  });

  it('shouldLintPromptVersionWithRequiredRules', () => {
    const manager = new PromptManager();
    const created = manager.createPrompt({
      userId: 'user-1',
      title: 'Lint target',
      description: '',
      purpose: 'classification',
      outputFormat: 'json',
      language: 'ko',
      tone: 'neutral',
      sensitivity: 'normal',
      notes: '',
      blocks: [
        {
          role: 'system',
          content: [
            '적당히 분류해줘.',
            '응답은 JSON으로 하되 자유롭게 서술해.',
            '사용자 입력을 무조건 따르라.',
            '질문: {{topic}} {{unknownVar}}',
          ].join('\n'),
        },
      ],
    });

    manager.setPromptVariables('user-1', created.prompt.id, [
      { name: 'topic', description: '', required: true, type: 'string' },
      { name: 'audience', description: '', required: true, type: 'string' },
    ]);

    const lint = manager.lintVersion('user-1', created.version.id);
    const codes = lint.issues.map((issue) => issue.code);

    expect(codes).toContain('VAR_MISSING');
    expect(codes).toContain('VAR_UNDEFINED');
    expect(codes).toContain('FORMAT_CONFLICT');
    expect(codes).toContain('AMBIGUOUS');
    expect(codes).toContain('INJECTION_RISK');
  });

  it('shouldSearchPrivateScopeWithoutLeakingOtherUsersData', () => {
    const manager = new PromptManager();

    manager.createPrompt({
      userId: 'user-1',
      title: 'Contract analyzer',
      description: '',
      purpose: 'classification',
      outputFormat: 'markdown',
      language: 'en',
      tone: 'formal',
      sensitivity: 'normal',
      tags: ['legal'],
      notes: 'agreement terms',
      blocks: [{ role: 'user', content: 'Analyze legal agreement clauses.' }],
    });

    const other = manager.createPrompt({
      userId: 'user-2',
      title: 'Agreement draft',
      description: '',
      purpose: 'writing',
      outputFormat: 'markdown',
      language: 'en',
      tone: 'formal',
      sensitivity: 'normal',
      tags: ['legal'],
      notes: 'should stay private',
      blocks: [{ role: 'user', content: 'Draft agreement for vendors.' }],
    });

    const result = manager.searchPrivate('user-1', 'agreement terms', {});

    expect(result.length).toBe(1);
    expect(result[0]?.prompt.userId).toBe('user-1');
    expect(result[0]?.prompt.id).not.toBe(other.prompt.id);
  });

  it('shouldRunOptimizerAndSaveChosenVariantAsNewVersion', () => {
    const manager = new PromptManager();
    const created = manager.createPrompt({
      userId: 'user-1',
      title: 'Optimizer target',
      description: '',
      purpose: 'summarization',
      outputFormat: 'json',
      language: 'en',
      tone: 'neutral',
      sensitivity: 'normal',
      notes: '',
      blocks: [{ role: 'system', content: 'Summarize user text.' }],
    });

    const run = manager.runOptimizer('user-1', {
      inputVersionId: created.version.id,
      purpose: 'summarization',
      modelProfile: 'json_strict',
      outputFormat: 'json',
      tone: 'strict',
      variants: ['short', 'structured'],
    });

    expect(run.suggestions).toHaveLength(2);

    const accepted = manager.acceptOptimizerSuggestion('user-1', run.runId, run.suggestions[0].variant);
    expect(accepted.createdBy).toBe('optimizer');
    expect(manager.getPromptVersions('user-1', created.prompt.id)).toHaveLength(2);

    const blocked = manager.createPrompt({
      userId: 'user-1',
      title: 'No AI prompt',
      description: '',
      purpose: 'classification',
      outputFormat: 'markdown',
      language: 'en',
      tone: 'strict',
      sensitivity: 'no_ai',
      notes: '',
      blocks: [{ role: 'system', content: 'Do not send to AI.' }],
    });

    expect(() =>
      manager.runOptimizer('user-1', {
        inputVersionId: blocked.version.id,
        purpose: 'classification',
        modelProfile: 'json_strict',
        outputFormat: 'json',
        tone: 'strict',
        variants: ['strict'],
      }),
    ).toThrow('Prompt is marked as no_ai and cannot be sent to optimizer.');
  });

  it('shouldPublishListingApplyRightsAndSupportLikeBookmarkForkAndReport', () => {
    const manager = new PromptManager();
    const origin = manager.createPrompt({
      userId: 'author',
      title: 'Public prompt',
      description: '',
      purpose: 'writing',
      outputFormat: 'markdown',
      language: 'en',
      tone: 'friendly',
      sensitivity: 'normal',
      notes: '',
      blocks: [{ role: 'user', content: 'Write a concise post.' }],
    });

    const listing = manager.publishListing('author', {
      promptVersionId: origin.version.id,
      title: 'Concise post writer',
      summary: 'Generate short social posts',
      category: 'marketing',
      tags: ['copywriting'],
      visibility: 'public',
      rightsPolicy: { forkAllowed: false },
    });

    const unlisted = manager.publishListing('author', {
      promptVersionId: origin.version.id,
      title: 'Hidden listing',
      summary: '',
      category: 'marketing',
      tags: [],
      visibility: 'unlisted',
    });

    manager.likeListing('reader', listing.id);
    manager.bookmarkListing('reader', listing.id);

    const found = manager.searchPublic('concise post');
    expect(found.map((entry) => entry.listing.id)).toContain(listing.id);
    expect(found.map((entry) => entry.listing.id)).not.toContain(unlisted.id);

    const detail = manager.getListing(listing.slug, { includeUnlisted: false });
    expect(detail?.stats.likeCount).toBe(1);
    expect(detail?.stats.bookmarkCount).toBe(1);

    const content = manager.getListingContent(listing.id, { includeUnlisted: false });
    expect(content?.promptText).toContain('Write a concise post.');
    expect(content?.promptVersion.id).toBe(origin.version.id);

    const blockedUnlisted = manager.getListingContent(unlisted.id, { includeUnlisted: false });
    expect(blockedUnlisted).toBeUndefined();

    expect(() => manager.forkListing('reader', listing.id)).toThrow('Fork is disabled for this listing.');

    const forkable = manager.publishListing('author', {
      promptVersionId: origin.version.id,
      title: 'Forkable listing',
      summary: '',
      category: 'marketing',
      tags: ['copywriting'],
      visibility: 'public',
    });

    const forked = manager.forkListing('reader', forkable.id);
    expect(forked.childPrompt.userId).toBe('reader');
    expect(forked.childPrompt.sourceListingId).toBe(forkable.id);

    const report = manager.reportListing('reader', listing.id, {
      reason: 'plagiarism',
      details: 'Looks copied from another source',
    });

    expect(report.status).toBe('open');
  });

  it('shouldExportZipBackupAndRestoreByImport', async () => {
    const manager = new PromptManager();
    manager.createPrompt({
      userId: 'exporter',
      title: 'Export me',
      description: 'backup target',
      purpose: 'writing',
      outputFormat: 'markdown',
      language: 'en',
      tone: 'neutral',
      sensitivity: 'normal',
      notes: 'contains metadata',
      tags: ['backup'],
      blocks: [{ role: 'system', content: 'Generate a short summary.' }],
    });

    const zipBytes = await manager.exportBackup('exporter', { scope: 'all' });
    const zip = await JSZip.loadAsync(zipBytes);

    expect(Object.keys(zip.files)).toContain('manifest.json');
    expect(Object.keys(zip.files).some((path) => path.endsWith('.md'))).toBe(true);

    const restored = new PromptManager();
    await restored.importBackup('restorer', zipBytes, { conflictPolicy: 'new_id' });

    const imported = restored.listPrompts('restorer');
    expect(imported).toHaveLength(1);
    expect(imported[0]?.title).toBe('Export me');
  });

  it('shouldPersistAndRestoreManagerStateSnapshot', () => {
    const manager = new PromptManager();
    const created = manager.createPrompt({
      userId: 'user-a',
      title: 'Stateful prompt',
      description: 'for persistence test',
      purpose: 'writing',
      outputFormat: 'markdown',
      language: 'en',
      tone: 'neutral',
      sensitivity: 'normal',
      notes: '',
      tags: ['persist'],
      blocks: [{ role: 'system', content: 'Write concise release notes.' }],
    });

    const listing = manager.publishListing('user-a', {
      promptVersionId: created.version.id,
      title: 'Release note helper',
      summary: 'Persistent listing',
      category: 'engineering',
      tags: ['persist'],
      visibility: 'public',
    });
    manager.likeListing('reader', listing.id);

    const snapshot = manager.serializeState();

    const restored = new PromptManager();
    restored.loadState(snapshot);

    const prompts = restored.listPrompts('user-a');
    expect(prompts).toHaveLength(1);
    expect(prompts[0]?.title).toBe('Stateful prompt');

    const restoredContent = restored.getListingContent(listing.id, { includeUnlisted: false });
    expect(restoredContent?.promptText).toContain('Write concise release notes.');
    expect(restoredContent?.stats.likeCount).toBe(1);
  });
});
