import { randomUUID } from 'node:crypto';
import JSZip from 'jszip';
import YAML from 'yaml';

export type BlockRole = 'system' | 'user' | 'assistant';
export type Sensitivity = 'normal' | 'no_ai' | 'no_share';
export type VersionCreator = 'user' | 'optimizer' | 'fork' | 'import';

export interface PromptBlockInput {
  role: BlockRole;
  content: string;
}

export interface PromptMetadataInput {
  userId: string;
  folderId?: string;
  tags?: string[];
  title: string;
  description: string;
  purpose: string;
  outputFormat: string;
  language: string;
  tone: string;
  sensitivity: Sensitivity;
  notes: string;
}

export interface Prompt extends Omit<PromptMetadataInput, 'userId' | 'folderId' | 'tags'> {
  id: string;
  userId: string;
  folderId: string | null;
  tags: string[];
  sourceListingId?: string;
  sourceVersionId?: string;
  pinnedVersionId: string;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersionBlock {
  role: BlockRole;
  content: string;
  orderIndex: number;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  versionNumber: number;
  createdBy: VersionCreator;
  sourceVersionId: string | null;
  summary: string | null;
  blocks: PromptVersionBlock[];
  createdAt: string;
}

export interface Folder {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderInput {
  userId: string;
  name: string;
  parentId?: string;
}

export interface CreatePromptInput extends PromptMetadataInput {
  blocks: PromptBlockInput[];
}

export interface CreateVersionInput {
  userId: string;
  promptId: string;
  createdBy: VersionCreator;
  sourceVersionId?: string;
  summary?: string;
  blocks: PromptBlockInput[];
}

export interface PromptListFilter {
  folderId?: string;
  tag?: string;
}

export interface SearchFilter extends PromptListFilter {
  purpose?: string;
  outputFormat?: string;
  language?: string;
}

export interface SearchResult {
  prompt: Prompt;
  score: number;
}

export type OptimizerVariant = 'short' | 'strict' | 'safe' | 'structured';

export interface OptimizerRunInput {
  inputVersionId: string;
  purpose: string;
  modelProfile: string;
  outputFormat: string;
  tone: string;
  variants: OptimizerVariant[];
}

export interface OptimizerSuggestion {
  variant: OptimizerVariant;
  blocks: PromptVersionBlock[];
  summary: string;
}

export interface OptimizerRunResult {
  runId: string;
  suggestions: OptimizerSuggestion[];
}

interface OptimizerRunRecord {
  runId: string;
  userId: string;
  promptId: string;
  inputVersionId: string;
  config: OptimizerRunInput;
  suggestions: OptimizerSuggestion[];
}

interface OptimizerRunStateRecord {
  runId: string;
  userId: string;
  promptId: string;
  inputVersionId: string;
  config: OptimizerRunInput;
  suggestions: OptimizerSuggestion[];
}

export type ListingVisibility = 'public' | 'unlisted';
export type ListingStatus = 'active' | 'hidden' | 'removed';

export interface RightsPolicy {
  forkAllowed: boolean;
  redistributionAllowed: boolean;
  commercialUseAllowed: boolean;
  shareAlike: boolean;
  attributionRequired: boolean;
}

export interface PublishListingInput {
  promptVersionId: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  visibility: ListingVisibility;
  rightsPolicy?: Partial<RightsPolicy>;
}

export interface Listing {
  id: string;
  ownerUserId: string;
  promptVersionId: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  visibility: ListingVisibility;
  rightsPolicy: RightsPolicy;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListingStats {
  listingId: string;
  likeCount: number;
  bookmarkCount: number;
  forkCount: number;
}

export interface ListingDetail {
  listing: Listing;
  stats: ListingStats;
}

export interface ListingContentDetail extends ListingDetail {
  promptVersion: PromptVersion;
  promptText: string;
}

export interface PublicSearchResult {
  listing: Listing;
  score: number;
}

export interface ReportInput {
  reason: string;
  details: string;
}

export interface Report {
  id: string;
  listingId: string;
  reporterUserId: string;
  reason: string;
  details: string;
  status: 'open' | 'triaged' | 'resolved' | 'dismissed';
  createdAt: string;
  updatedAt: string;
}

export interface ForkResult {
  childPrompt: Prompt;
  childVersion: PromptVersion;
}

export interface ExportBackupInput {
  scope: 'all' | 'selected';
  promptIds?: string[];
}

export interface ImportBackupInput {
  conflictPolicy: 'new_id' | 'suffix_slug';
}

export type VariableType = 'string' | 'number' | 'enum' | 'json';

export interface PromptVariableDefinition {
  name: string;
  description: string;
  required: boolean;
  type: VariableType;
  enumValues?: string[];
  defaultValue?: unknown;
}

export interface RenderedPrompt {
  text: string;
  blocks: PromptVersionBlock[];
}

export type LintCode =
  | 'VAR_MISSING'
  | 'VAR_UNDEFINED'
  | 'ROLE_MIXED'
  | 'FORMAT_CONFLICT'
  | 'AMBIGUOUS'
  | 'INJECTION_RISK';

export interface LintIssue {
  code: LintCode;
  level: 'warning' | 'error';
  message: string;
}

export interface LintResult {
  issues: LintIssue[];
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

export interface PromptManagerStateSnapshot {
  prompts: Prompt[];
  versionsByPrompt: Array<[string, PromptVersion[]]>;
  folders: Folder[];
  userTags: Array<[string, string[]]>;
  variablesByPrompt: Array<[string, PromptVariableDefinition[]]>;
  optimizerRuns: OptimizerRunStateRecord[];
  listings: Listing[];
  listingStats: ListingStats[];
  listingLikes: Array<[string, string[]]>;
  listingBookmarks: Array<[string, string[]]>;
  reports: Report[];
}

export class PromptManager {
  private readonly prompts = new Map<string, Prompt>();
  private readonly versionsByPrompt = new Map<string, PromptVersion[]>();
  private readonly folders = new Map<string, Folder>();
  private readonly userTags = new Map<string, Set<string>>();
  private readonly variablesByPrompt = new Map<string, PromptVariableDefinition[]>();
  private readonly optimizerRuns = new Map<string, OptimizerRunRecord>();
  private readonly listings = new Map<string, Listing>();
  private readonly listingStats = new Map<string, ListingStats>();
  private readonly listingLikes = new Map<string, Set<string>>();
  private readonly listingBookmarks = new Map<string, Set<string>>();
  private readonly reports = new Map<string, Report>();

  createFolder(input: CreateFolderInput): Folder {
    if (input.parentId) {
      const parent = this.folders.get(input.parentId);
      if (!parent || parent.userId !== input.userId) {
        throw new Error('Parent folder not found.');
      }
    }

    const now = new Date().toISOString();
    const folder: Folder = {
      id: randomUUID(),
      userId: input.userId,
      parentId: input.parentId ?? null,
      name: input.name,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.folders.set(folder.id, folder);
    return { ...folder };
  }

  createPrompt(input: CreatePromptInput): { prompt: Prompt; version: PromptVersion } {
    if (input.folderId) {
      const folder = this.folders.get(input.folderId);
      if (!folder || folder.userId !== input.userId) {
        throw new Error('Folder not found.');
      }
    }

    const now = new Date().toISOString();
    const promptId = randomUUID();
    const versionId = randomUUID();

    const version: PromptVersion = {
      id: versionId,
      promptId,
      versionNumber: 1,
      createdBy: 'user',
      sourceVersionId: null,
      summary: null,
      blocks: this.toVersionBlocks(input.blocks),
      createdAt: now,
    };

    const normalizedTags = this.normalizeTags(input.tags ?? []);

    const prompt: Prompt = {
      id: promptId,
      userId: input.userId,
      folderId: input.folderId ?? null,
      tags: normalizedTags,
      title: input.title,
      description: input.description,
      purpose: input.purpose,
      outputFormat: input.outputFormat,
      language: input.language,
      tone: input.tone,
      sensitivity: input.sensitivity,
      notes: input.notes,
      pinnedVersionId: versionId,
      archivedAt: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.prompts.set(prompt.id, prompt);
    this.versionsByPrompt.set(prompt.id, [version]);
    this.addTags(input.userId, normalizedTags);

    return { prompt: this.clonePrompt(prompt), version: this.cloneVersion(version) };
  }

  createVersion(input: CreateVersionInput): PromptVersion {
    const prompt = this.mustGetOwnedPrompt(input.userId, input.promptId);
    const versions = this.versionsByPrompt.get(prompt.id);

    if (!versions) {
      throw new Error('Versions not found for prompt.');
    }

    const version: PromptVersion = {
      id: randomUUID(),
      promptId: prompt.id,
      versionNumber: versions.length + 1,
      createdBy: input.createdBy,
      sourceVersionId: input.sourceVersionId ?? prompt.pinnedVersionId,
      summary: input.summary ?? null,
      blocks: this.toVersionBlocks(input.blocks),
      createdAt: new Date().toISOString(),
    };

    versions.push(version);
    prompt.pinnedVersionId = version.id;
    prompt.updatedAt = version.createdAt;

    return this.cloneVersion(version);
  }

  archivePrompt(userId: string, promptId: string): Prompt {
    const prompt = this.mustGetOwnedPrompt(userId, promptId);
    prompt.archivedAt = new Date().toISOString();
    prompt.updatedAt = prompt.archivedAt;
    return this.clonePrompt(prompt);
  }

  restorePrompt(userId: string, promptId: string): Prompt {
    const prompt = this.mustGetOwnedPrompt(userId, promptId);
    prompt.archivedAt = null;
    prompt.updatedAt = new Date().toISOString();
    return this.clonePrompt(prompt);
  }

  deletePrompt(userId: string, promptId: string): Prompt {
    const prompt = this.mustGetOwnedPrompt(userId, promptId);
    prompt.deletedAt = new Date().toISOString();
    prompt.updatedAt = prompt.deletedAt;
    return this.clonePrompt(prompt);
  }

  restoreFromTrash(userId: string, promptId: string): Prompt {
    const prompt = this.mustGetOwnedPrompt(userId, promptId);
    prompt.deletedAt = null;
    prompt.updatedAt = new Date().toISOString();
    return this.clonePrompt(prompt);
  }

  purgePrompt(userId: string, promptId: string): void {
    this.mustGetOwnedPrompt(userId, promptId);
    this.prompts.delete(promptId);
    this.versionsByPrompt.delete(promptId);
    this.variablesByPrompt.delete(promptId);
  }

  diffVersions(userId: string, promptId: string, fromVersionId: string, toVersionId: string): DiffLine[] {
    this.mustGetOwnedPrompt(userId, promptId);
    const from = this.mustGetVersion(promptId, fromVersionId);
    const to = this.mustGetVersion(promptId, toVersionId);

    const fromLines = this.versionText(from).split('\n');
    const toLines = this.versionText(to).split('\n');
    const fromSet = new Set(fromLines);
    const toSet = new Set(toLines);
    const diff: DiffLine[] = [];

    for (const line of fromLines) {
      if (!toSet.has(line)) {
        diff.push({ type: 'removed', text: line });
      } else {
        diff.push({ type: 'unchanged', text: line });
      }
    }

    for (const line of toLines) {
      if (!fromSet.has(line)) {
        diff.push({ type: 'added', text: line });
      }
    }

    return diff;
  }

  pinVersion(userId: string, promptId: string, versionId: string): Prompt {
    const prompt = this.mustGetOwnedPrompt(userId, promptId);
    this.mustGetVersion(promptId, versionId);
    prompt.pinnedVersionId = versionId;
    prompt.updatedAt = new Date().toISOString();
    return this.clonePrompt(prompt);
  }

  setPromptVariables(userId: string, promptId: string, variables: PromptVariableDefinition[]): PromptVariableDefinition[] {
    this.mustGetOwnedPrompt(userId, promptId);
    const normalized = this.normalizeVariables(variables);
    this.variablesByPrompt.set(promptId, normalized);
    return normalized.map((entry) => ({ ...entry, enumValues: entry.enumValues ? [...entry.enumValues] : undefined }));
  }

  renderVersion(userId: string, versionId: string, values: Record<string, unknown>): RenderedPrompt {
    const version = this.mustGetOwnedVersion(userId, versionId);
    const definitions = this.variablesByPrompt.get(version.promptId) ?? [];
    const definitionMap = new Map(definitions.map((entry) => [entry.name, entry]));
    const missing = definitions
      .filter((entry) => entry.required && values[entry.name] === undefined && entry.defaultValue === undefined)
      .map((entry) => entry.name);

    if (missing.length > 0) {
      throw new Error(`Missing required variables: ${missing.join(', ')}`);
    }

    const blocks = version.blocks.map((block) => ({
      ...block,
      content: block.content.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, rawName: string) => {
        const name = rawName.trim();
        const provided = values[name];
        if (provided !== undefined) {
          return String(provided);
        }
        const definition = definitionMap.get(name);
        if (definition?.defaultValue !== undefined) {
          return String(definition.defaultValue);
        }
        return '';
      }),
    }));

    return { text: blocks.map((block) => block.content).join('\n'), blocks };
  }

  lintVersion(userId: string, versionId: string): LintResult {
    const version = this.mustGetOwnedVersion(userId, versionId);
    const prompt = this.mustGetOwnedPrompt(userId, version.promptId);
    const content = version.blocks.map((block) => block.content).join('\n');
    const variables = this.variablesByPrompt.get(prompt.id) ?? [];
    const variableNames = new Set(variables.map((entry) => entry.name));
    const usedVariables = this.extractVariables(content);
    const issues: LintIssue[] = [];

    for (const variable of variables) {
      if (variable.required && !usedVariables.has(variable.name)) {
        issues.push({
          code: 'VAR_MISSING',
          level: 'error',
          message: `Required variable '${variable.name}' is missing in prompt body.`,
        });
      }
    }

    for (const name of usedVariables) {
      if (!variableNames.has(name)) {
        issues.push({
          code: 'VAR_UNDEFINED',
          level: 'warning',
          message: `Variable '${name}' is used but not defined in schema.`,
        });
      }
    }

    if (prompt.outputFormat.toLowerCase() === 'json' && /(자유롭게 서술|freely describe|narrative)/i.test(content)) {
      issues.push({
        code: 'FORMAT_CONFLICT',
        level: 'warning',
        message: 'JSON output format conflicts with free-form instruction.',
      });
    }

    if (/(적당히|충분히|알아서|최대한)/i.test(content)) {
      issues.push({
        code: 'AMBIGUOUS',
        level: 'warning',
        message: 'Prompt contains ambiguous instructions.',
      });
    }

    if (/(사용자 입력을 무조건 따르|무조건 따르라|ignore previous instructions|follow user input unconditionally)/i.test(content)) {
      issues.push({
        code: 'INJECTION_RISK',
        level: 'warning',
        message: 'Prompt may be vulnerable to instruction injection.',
      });
    }

    const roleWords = /(system:|user:|assistant:)/gi;
    const roleMatches = [...content.matchAll(roleWords)];
    if (version.blocks.length === 1 && roleMatches.length > 1) {
      issues.push({
        code: 'ROLE_MIXED',
        level: 'warning',
        message: 'Single block appears to contain mixed role instructions.',
      });
    }

    issues.sort((a, b) => a.code.localeCompare(b.code));
    return { issues };
  }

  listPrompts(userId: string, filter: PromptListFilter = {}): Prompt[] {
    return [...this.prompts.values()]
      .filter((prompt) => prompt.userId === userId)
      .filter((prompt) => !prompt.deletedAt)
      .filter((prompt) => (filter.folderId ? prompt.folderId === filter.folderId : true))
      .filter((prompt) => (filter.tag ? prompt.tags.includes(filter.tag) : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((prompt) => this.clonePrompt(prompt));
  }

  suggestTags(userId: string, prefix: string): string[] {
    const tags = [...(this.userTags.get(userId) ?? new Set<string>())];
    return tags.filter((tag) => tag.startsWith(prefix)).sort((a, b) => a.localeCompare(b));
  }

  searchPrivate(userId: string, query: string, filter: SearchFilter): SearchResult[] {
    const tokens = this.tokenize(query);
    const prompts = this.listPrompts(userId, filter)
      .filter((prompt) => (filter.purpose ? prompt.purpose === filter.purpose : true))
      .filter((prompt) => (filter.outputFormat ? prompt.outputFormat === filter.outputFormat : true))
      .filter((prompt) => (filter.language ? prompt.language === filter.language : true));

    const ranked = prompts
      .map((prompt) => {
        if (tokens.length === 0) {
          return { prompt, score: 0 };
        }
        const source = this.searchSourceText(prompt);
        const sourceTokens = new Set(this.tokenize(source));
        const keywordMatches = tokens.filter((token) => sourceTokens.has(token)).length;
        const keywordScore = keywordMatches / tokens.length;
        const union = new Set([...tokens, ...sourceTokens]);
        const intersection = tokens.filter((token) => sourceTokens.has(token)).length;
        const semanticScore = union.size > 0 ? intersection / union.size : 0;
        return { prompt, score: keywordScore * 0.6 + semanticScore * 0.4 };
      })
      .filter((entry) => entry.score > 0 || tokens.length === 0)
      .sort((a, b) => b.score - a.score);

    return ranked;
  }

  runOptimizer(userId: string, input: OptimizerRunInput): OptimizerRunResult {
    const baseVersion = this.mustGetOwnedVersion(userId, input.inputVersionId);
    const prompt = this.mustGetOwnedPrompt(userId, baseVersion.promptId);

    if (prompt.sensitivity === 'no_ai') {
      throw new Error('Prompt is marked as no_ai and cannot be sent to optimizer.');
    }

    const variants = input.variants.length === 0 ? (['short', 'strict'] as const) : input.variants;
    const suggestions = variants.map((variant) => this.buildOptimizerSuggestion(baseVersion, input, variant));
    const runId = randomUUID();

    this.optimizerRuns.set(runId, {
      runId,
      userId,
      promptId: prompt.id,
      inputVersionId: baseVersion.id,
      config: input,
      suggestions,
    });

    return {
      runId,
      suggestions: suggestions.map((entry) => ({
        variant: entry.variant,
        summary: entry.summary,
        blocks: entry.blocks.map((block) => ({ ...block })),
      })),
    };
  }

  acceptOptimizerSuggestion(userId: string, runId: string, variant: OptimizerVariant): PromptVersion {
    const run = this.optimizerRuns.get(runId);
    if (!run || run.userId !== userId) {
      throw new Error('Optimizer run not found.');
    }

    const suggestion = run.suggestions.find((entry) => entry.variant === variant);
    if (!suggestion) {
      throw new Error('Optimizer variant not found.');
    }

    return this.createVersion({
      userId,
      promptId: run.promptId,
      createdBy: 'optimizer',
      sourceVersionId: run.inputVersionId,
      summary: suggestion.summary,
      blocks: suggestion.blocks.map((block) => ({ role: block.role, content: block.content })),
    });
  }

  publishListing(userId: string, input: PublishListingInput): Listing {
    const version = this.mustGetOwnedVersion(userId, input.promptVersionId);
    const now = new Date().toISOString();
    const listing: Listing = {
      id: randomUUID(),
      ownerUserId: userId,
      promptVersionId: version.id,
      slug: this.generateListingSlug(input.title),
      title: input.title,
      summary: input.summary,
      category: input.category,
      tags: this.normalizeTags(input.tags),
      visibility: input.visibility,
      rightsPolicy: this.mergeRightsPolicy(input.rightsPolicy),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    this.listings.set(listing.id, listing);
    this.listingStats.set(listing.id, {
      listingId: listing.id,
      likeCount: 0,
      bookmarkCount: 0,
      forkCount: 0,
    });
    this.listingLikes.set(listing.id, new Set());
    this.listingBookmarks.set(listing.id, new Set());
    return this.cloneListing(listing);
  }

  getListing(slug: string, options: { includeUnlisted: boolean }): ListingDetail | undefined {
    const listing = [...this.listings.values()].find((entry) => entry.slug === slug);
    if (!listing || listing.status !== 'active') {
      return undefined;
    }
    if (!options.includeUnlisted && listing.visibility !== 'public') {
      return undefined;
    }
    const stats = this.mustGetListingStats(listing.id);
    return { listing: this.cloneListing(listing), stats: { ...stats } };
  }

  getListingContent(listingId: string, options: { includeUnlisted: boolean }): ListingContentDetail | undefined {
    const listing = this.listings.get(listingId);
    if (!listing || listing.status !== 'active') {
      return undefined;
    }
    if (!options.includeUnlisted && listing.visibility !== 'public') {
      return undefined;
    }

    const stats = this.mustGetListingStats(listing.id);
    const promptVersion = this.mustGetVersionById(listing.promptVersionId);
    return {
      listing: this.cloneListing(listing),
      stats: { ...stats },
      promptVersion: this.cloneVersion(promptVersion),
      promptText: promptVersion.blocks.map((block) => block.content).join('\n'),
    };
  }

  searchPublic(query: string): PublicSearchResult[] {
    const tokens = this.tokenize(query);
    const listings = [...this.listings.values()]
      .filter((listing) => listing.status === 'active')
      .filter((listing) => listing.visibility === 'public');

    const ranked = listings
      .map((listing) => {
        if (tokens.length === 0) {
          return { listing: this.cloneListing(listing), score: 0 };
        }
        const source = [listing.title, listing.summary, listing.tags.join(' ')].join('\n');
        const sourceTokens = new Set(this.tokenize(source));
        const hits = tokens.filter((token) => sourceTokens.has(token)).length;
        return { listing: this.cloneListing(listing), score: hits / tokens.length };
      })
      .filter((entry) => entry.score > 0 || tokens.length === 0)
      .sort((a, b) => b.score - a.score);

    return ranked;
  }

  likeListing(userId: string, listingId: string): ListingStats {
    const listing = this.mustGetListing(listingId);
    if (listing.status !== 'active') {
      throw new Error('Listing is not active.');
    }
    const likes = this.listingLikes.get(listingId) ?? new Set<string>();
    likes.add(userId);
    this.listingLikes.set(listingId, likes);
    const stats = this.mustGetListingStats(listingId);
    stats.likeCount = likes.size;
    return { ...stats };
  }

  bookmarkListing(userId: string, listingId: string): ListingStats {
    const listing = this.mustGetListing(listingId);
    if (listing.status !== 'active') {
      throw new Error('Listing is not active.');
    }
    const bookmarks = this.listingBookmarks.get(listingId) ?? new Set<string>();
    bookmarks.add(userId);
    this.listingBookmarks.set(listingId, bookmarks);
    const stats = this.mustGetListingStats(listingId);
    stats.bookmarkCount = bookmarks.size;
    return { ...stats };
  }

  forkListing(userId: string, listingId: string): ForkResult {
    const listing = this.mustGetListing(listingId);
    if (listing.status !== 'active') {
      throw new Error('Listing is not active.');
    }
    if (!listing.rightsPolicy.forkAllowed) {
      throw new Error('Fork is disabled for this listing.');
    }

    const sourceVersion = this.mustGetVersionById(listing.promptVersionId);
    const sourcePrompt = this.mustGetPromptById(sourceVersion.promptId);
    const created = this.createPrompt({
      userId,
      title: `${sourcePrompt.title} (fork)`,
      description: sourcePrompt.description,
      purpose: sourcePrompt.purpose,
      outputFormat: sourcePrompt.outputFormat,
      language: sourcePrompt.language,
      tone: sourcePrompt.tone,
      sensitivity: sourcePrompt.sensitivity,
      notes: sourcePrompt.notes,
      tags: sourcePrompt.tags,
      blocks: sourceVersion.blocks.map((block) => ({ role: block.role, content: block.content })),
    });

    const storedPrompt = this.mustGetOwnedPrompt(userId, created.prompt.id);
    storedPrompt.sourceListingId = listing.id;
    storedPrompt.sourceVersionId = sourceVersion.id;
    const firstVersion = this.mustGetVersion(storedPrompt.id, created.version.id);
    firstVersion.createdBy = 'fork';
    firstVersion.sourceVersionId = sourceVersion.id;

    const stats = this.mustGetListingStats(listingId);
    stats.forkCount += 1;

    return {
      childPrompt: this.clonePrompt(storedPrompt),
      childVersion: this.cloneVersion(firstVersion),
    };
  }

  reportListing(userId: string, listingId: string, input: ReportInput): Report {
    const listing = this.mustGetListing(listingId);
    if (listing.status !== 'active') {
      throw new Error('Listing is not active.');
    }

    const now = new Date().toISOString();
    const report: Report = {
      id: randomUUID(),
      listingId,
      reporterUserId: userId,
      reason: input.reason,
      details: input.details,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };
    this.reports.set(report.id, report);
    return { ...report };
  }

  async exportBackup(userId: string, input: ExportBackupInput): Promise<Uint8Array> {
    const zip = new JSZip();
    const prompts = [...this.prompts.values()]
      .filter((prompt) => prompt.userId === userId)
      .filter((prompt) => (input.scope === 'selected' ? input.promptIds?.includes(prompt.id) : true));

    const manifest = {
      exportedAt: new Date().toISOString(),
      prompts: prompts.map((prompt) => ({
        prompt: this.clonePrompt(prompt),
        variables: (this.variablesByPrompt.get(prompt.id) ?? []).map((entry) => ({
          ...entry,
          enumValues: entry.enumValues ? [...entry.enumValues] : undefined,
        })),
        versions: (this.versionsByPrompt.get(prompt.id) ?? []).map((version) => this.cloneVersion(version)),
      })),
    };

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    for (const entry of manifest.prompts) {
      const slug = this.backupSlug(entry.prompt.title, entry.prompt.id);
      zip.file(`prompts/${slug}/prompt.json`, JSON.stringify(entry.prompt, null, 2));

      for (const version of entry.versions) {
        const frontmatter = {
          id: entry.prompt.id,
          title: entry.prompt.title,
          tags: entry.prompt.tags,
          purpose: entry.prompt.purpose,
          output_format: entry.prompt.outputFormat,
          language: entry.prompt.language,
          tone: entry.prompt.tone,
          sensitivity: entry.prompt.sensitivity,
          version_id: version.id,
          version_number: version.versionNumber,
          created_at: version.createdAt,
          variables: entry.variables.map((variable) => ({
            name: variable.name,
            required: variable.required,
            description: variable.description,
          })),
        };

        const body = version.blocks
          .map((block) => `### ${block.role}\n${block.content}`)
          .join('\n\n')
          .trim();

        const markdown = ['---', YAML.stringify(frontmatter).trim(), '---', body].join('\n');
        zip.file(`prompts/${slug}/versions/${version.id}.md`, markdown);
      }
    }

    return zip.generateAsync({ type: 'uint8array' });
  }

  async importBackup(userId: string, zipBytes: Uint8Array, _input: ImportBackupInput): Promise<void> {
    const zip = await JSZip.loadAsync(zipBytes);
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      throw new Error('Invalid backup: manifest.json missing.');
    }

    const rawManifest = await manifestFile.async('string');
    const manifest = JSON.parse(rawManifest) as {
      prompts: Array<{
        prompt: Prompt;
        variables: PromptVariableDefinition[];
        versions: PromptVersion[];
      }>;
    };

    for (const item of manifest.prompts) {
      if (item.versions.length === 0) {
        continue;
      }

      const orderedVersions = [...item.versions].sort((a, b) => a.versionNumber - b.versionNumber);
      const initial = orderedVersions[0];
      if (!initial) {
        continue;
      }

      const created = this.createPrompt({
        userId,
        title: item.prompt.title,
        description: item.prompt.description,
        purpose: item.prompt.purpose,
        outputFormat: item.prompt.outputFormat,
        language: item.prompt.language,
        tone: item.prompt.tone,
        sensitivity: item.prompt.sensitivity,
        notes: item.prompt.notes,
        tags: item.prompt.tags,
        blocks: initial.blocks.map((block) => ({ role: block.role, content: block.content })),
      });

      if (item.variables.length > 0) {
        this.setPromptVariables(userId, created.prompt.id, item.variables);
      }

      for (const version of orderedVersions.slice(1)) {
        this.createVersion({
          userId,
          promptId: created.prompt.id,
          createdBy: version.createdBy,
          summary: version.summary ?? undefined,
          sourceVersionId: version.sourceVersionId ?? undefined,
          blocks: version.blocks.map((block) => ({ role: block.role, content: block.content })),
        });
      }
    }
  }

  serializeState(): PromptManagerStateSnapshot {
    return {
      prompts: [...this.prompts.values()].map((prompt) => this.clonePrompt(prompt)),
      versionsByPrompt: [...this.versionsByPrompt.entries()].map(([promptId, versions]) => [
        promptId,
        versions.map((version) => this.cloneVersion(version)),
      ]),
      folders: [...this.folders.values()].map((folder) => ({ ...folder })),
      userTags: [...this.userTags.entries()].map(([userId, tags]) => [userId, [...tags.values()]]),
      variablesByPrompt: [...this.variablesByPrompt.entries()].map(([promptId, variables]) => [
        promptId,
        variables.map((variable) => ({
          ...variable,
          enumValues: variable.enumValues ? [...variable.enumValues] : undefined,
        })),
      ]),
      optimizerRuns: [...this.optimizerRuns.values()].map((run) => ({
        runId: run.runId,
        userId: run.userId,
        promptId: run.promptId,
        inputVersionId: run.inputVersionId,
        config: {
          ...run.config,
          variants: [...run.config.variants],
        },
        suggestions: run.suggestions.map((suggestion) => ({
          variant: suggestion.variant,
          summary: suggestion.summary,
          blocks: suggestion.blocks.map((block) => ({ ...block })),
        })),
      })),
      listings: [...this.listings.values()].map((listing) => this.cloneListing(listing)),
      listingStats: [...this.listingStats.values()].map((stats) => ({ ...stats })),
      listingLikes: [...this.listingLikes.entries()].map(([listingId, users]) => [listingId, [...users.values()]]),
      listingBookmarks: [...this.listingBookmarks.entries()].map(([listingId, users]) => [
        listingId,
        [...users.values()],
      ]),
      reports: [...this.reports.values()].map((report) => ({ ...report })),
    };
  }

  loadState(snapshot: PromptManagerStateSnapshot): void {
    this.prompts.clear();
    this.versionsByPrompt.clear();
    this.folders.clear();
    this.userTags.clear();
    this.variablesByPrompt.clear();
    this.optimizerRuns.clear();
    this.listings.clear();
    this.listingStats.clear();
    this.listingLikes.clear();
    this.listingBookmarks.clear();
    this.reports.clear();

    for (const prompt of snapshot.prompts) {
      this.prompts.set(prompt.id, this.clonePrompt(prompt));
    }

    for (const [promptId, versions] of snapshot.versionsByPrompt) {
      this.versionsByPrompt.set(
        promptId,
        versions.map((version) => this.cloneVersion(version)),
      );
    }

    for (const folder of snapshot.folders) {
      this.folders.set(folder.id, { ...folder });
    }

    for (const [userId, tags] of snapshot.userTags) {
      this.userTags.set(userId, new Set(tags));
    }

    for (const [promptId, variables] of snapshot.variablesByPrompt) {
      this.variablesByPrompt.set(
        promptId,
        variables.map((variable) => ({
          ...variable,
          enumValues: variable.enumValues ? [...variable.enumValues] : undefined,
        })),
      );
    }

    for (const run of snapshot.optimizerRuns) {
      this.optimizerRuns.set(run.runId, {
        runId: run.runId,
        userId: run.userId,
        promptId: run.promptId,
        inputVersionId: run.inputVersionId,
        config: {
          ...run.config,
          variants: [...run.config.variants],
        },
        suggestions: run.suggestions.map((suggestion) => ({
          variant: suggestion.variant,
          summary: suggestion.summary,
          blocks: suggestion.blocks.map((block) => ({ ...block })),
        })),
      });
    }

    for (const listing of snapshot.listings) {
      this.listings.set(listing.id, this.cloneListing(listing));
    }

    for (const stats of snapshot.listingStats) {
      this.listingStats.set(stats.listingId, { ...stats });
    }

    for (const [listingId, users] of snapshot.listingLikes) {
      this.listingLikes.set(listingId, new Set(users));
    }

    for (const [listingId, users] of snapshot.listingBookmarks) {
      this.listingBookmarks.set(listingId, new Set(users));
    }

    for (const report of snapshot.reports) {
      this.reports.set(report.id, { ...report });
    }
  }

  getPrompt(userId: string, promptId: string): Prompt | undefined {
    const prompt = this.prompts.get(promptId);
    if (!prompt || prompt.userId !== userId) {
      return undefined;
    }

    return this.clonePrompt(prompt);
  }

  getPromptVersions(userId: string, promptId: string): PromptVersion[] {
    const prompt = this.prompts.get(promptId);
    if (!prompt || prompt.userId !== userId) {
      return [];
    }

    const versions = this.versionsByPrompt.get(promptId) ?? [];
    return versions.map((version) => this.cloneVersion(version));
  }

  private mustGetOwnedPrompt(userId: string, promptId: string): Prompt {
    const prompt = this.prompts.get(promptId);
    if (!prompt || prompt.userId !== userId) {
      throw new Error('Prompt not found.');
    }
    return prompt;
  }

  private toVersionBlocks(blocks: PromptBlockInput[]): PromptVersionBlock[] {
    return blocks.map((block, index) => ({
      role: block.role,
      content: block.content,
      orderIndex: index,
    }));
  }

  private clonePrompt(prompt: Prompt): Prompt {
    return { ...prompt, tags: [...prompt.tags] };
  }

  private cloneVersion(version: PromptVersion): PromptVersion {
    return {
      ...version,
      blocks: version.blocks.map((block) => ({ ...block })),
    };
  }

  private mustGetOwnedVersion(userId: string, versionId: string): PromptVersion {
    for (const [promptId, versions] of this.versionsByPrompt.entries()) {
      const version = versions.find((entry) => entry.id === versionId);
      if (!version) {
        continue;
      }
      const prompt = this.mustGetOwnedPrompt(userId, promptId);
      if (prompt.id !== version.promptId) {
        throw new Error('Version not found.');
      }
      return version;
    }
    throw new Error('Version not found.');
  }

  private mustGetVersion(promptId: string, versionId: string): PromptVersion {
    const versions = this.versionsByPrompt.get(promptId) ?? [];
    const version = versions.find((entry) => entry.id === versionId);
    if (!version) {
      throw new Error('Version not found.');
    }
    return version;
  }

  private versionText(version: PromptVersion): string {
    return version.blocks.map((block) => block.content).join('\n');
  }

  private normalizeTags(tags: string[]): string[] {
    return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
  }

  private addTags(userId: string, tags: string[]): void {
    const existing = this.userTags.get(userId) ?? new Set<string>();
    for (const tag of tags) {
      existing.add(tag);
    }
    this.userTags.set(userId, existing);
  }

  private normalizeVariables(variables: PromptVariableDefinition[]): PromptVariableDefinition[] {
    const deduped = new Map<string, PromptVariableDefinition>();
    for (const variable of variables) {
      const name = variable.name.trim();
      if (!name) {
        continue;
      }
      deduped.set(name, {
        ...variable,
        name,
        enumValues: variable.enumValues ? [...variable.enumValues] : undefined,
      });
    }
    return [...deduped.values()];
  }

  private extractVariables(content: string): Set<string> {
    const names = new Set<string>();
    for (const match of content.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)) {
      names.add(match[1] ?? '');
    }
    return names;
  }

  private tokenize(input: string): string[] {
    return input
      .toLowerCase()
      .split(/[^a-z0-9가-힣_]+/i)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  private searchSourceText(prompt: Prompt): string {
    const pinned = this.mustGetVersion(prompt.id, prompt.pinnedVersionId);
    const blocks = pinned.blocks.map((block) => block.content).join('\n');
    return [prompt.title, prompt.description, prompt.notes, prompt.tags.join(' '), blocks].join('\n');
  }

  private buildOptimizerSuggestion(
    baseVersion: PromptVersion,
    input: OptimizerRunInput,
    variant: OptimizerVariant,
  ): OptimizerSuggestion {
    const suffixByVariant: Record<OptimizerVariant, string> = {
      short: 'Keep the answer concise.',
      strict: 'Follow all constraints strictly.',
      safe: 'Refuse unsafe or policy-violating requests.',
      structured: 'Return output with clear sections and bullet points.',
    };

    const extra = [
      suffixByVariant[variant],
      `Tone: ${input.tone}.`,
      `Purpose: ${input.purpose}.`,
      input.outputFormat.toLowerCase() === 'json' ? 'Output must be valid JSON.' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return {
      variant,
      summary: `Optimizer variant: ${variant}`,
      blocks: baseVersion.blocks.map((block) => ({
        ...block,
        content: `${block.content}\n${extra}`.trim(),
      })),
    };
  }

  private mergeRightsPolicy(overrides?: Partial<RightsPolicy>): RightsPolicy {
    return {
      forkAllowed: overrides?.forkAllowed ?? true,
      redistributionAllowed: overrides?.redistributionAllowed ?? true,
      commercialUseAllowed: overrides?.commercialUseAllowed ?? true,
      shareAlike: overrides?.shareAlike ?? false,
      attributionRequired: true,
    };
  }

  private generateListingSlug(title: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
    const root = base || 'listing';
    let candidate = root;
    let index = 2;
    const existing = new Set([...this.listings.values()].map((listing) => listing.slug));
    while (existing.has(candidate)) {
      candidate = `${root}-${index}`;
      index += 1;
    }
    return candidate;
  }

  private cloneListing(listing: Listing): Listing {
    return { ...listing, tags: [...listing.tags], rightsPolicy: { ...listing.rightsPolicy } };
  }

  private mustGetListing(listingId: string): Listing {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw new Error('Listing not found.');
    }
    return listing;
  }

  private mustGetListingStats(listingId: string): ListingStats {
    const stats = this.listingStats.get(listingId);
    if (!stats) {
      throw new Error('Listing stats not found.');
    }
    return stats;
  }

  private mustGetPromptById(promptId: string): Prompt {
    const prompt = this.prompts.get(promptId);
    if (!prompt) {
      throw new Error('Prompt not found.');
    }
    return prompt;
  }

  private mustGetVersionById(versionId: string): PromptVersion {
    for (const versions of this.versionsByPrompt.values()) {
      const version = versions.find((entry) => entry.id === versionId);
      if (version) {
        return version;
      }
    }
    throw new Error('Version not found.');
  }

  private backupSlug(title: string, id: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${base || 'prompt'}-${id.slice(0, 8)}`;
  }
}
