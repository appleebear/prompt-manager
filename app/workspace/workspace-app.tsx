'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { toDisplayPromptText } from '../../src/prompt-text';

type PromptListItem = {
  id: string;
  title: string;
  description: string;
  purpose: string;
  outputFormat: string;
  language: string;
  tone: string;
  tags: string[];
  updatedAt: string;
  versionCount: number;
  pinnedSnippet: string;
  pinnedText: string;
};

type PromptVersion = {
  id: string;
  versionNumber: number;
  createdBy: string;
  summary: string | null;
  createdAt: string;
  blocks: Array<{ role: 'system' | 'user' | 'assistant'; content: string; orderIndex: number }>;
};

type PromptDetail = {
  prompt: PromptListItem;
  versions: PromptVersion[];
};

export function WorkspaceApp() {
  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PromptDetail | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copyingPromptId, setCopyingPromptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createTags, setCreateTags] = useState('');
  const [versionContent, setVersionContent] = useState('');
  const [versionSummary, setVersionSummary] = useState('');

  useEffect(() => {
    void loadPrompts('');
  }, []);

  useEffect(() => {
    if (!selectedPromptId) {
      setDetail(null);
      return;
    }

    void loadPromptDetail(selectedPromptId);
  }, [selectedPromptId]);

  const selectedPrompt = useMemo(
    () => prompts.find((prompt) => prompt.id === selectedPromptId) ?? null,
    [prompts, selectedPromptId],
  );

  async function loadPrompts(nextQuery: string) {
    setLoadingList(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (nextQuery.trim()) {
        params.set('q', nextQuery.trim());
      }

      const response = await fetch(`/api/prompts?${params.toString()}`, { cache: 'no-store' });
      const json = (await response.json()) as { prompts?: PromptListItem[]; error?: string };

      if (!response.ok) {
        throw new Error(json.error ?? '프롬프트 목록을 불러오지 못했습니다.');
      }

      const nextPrompts = json.prompts ?? [];
      setPrompts(nextPrompts);

      if (nextPrompts.length === 0) {
        setSelectedPromptId(null);
        setDetail(null);
        return;
      }

      const currentStillExists = selectedPromptId
        ? nextPrompts.some((prompt) => prompt.id === selectedPromptId)
        : false;

      if (!currentStillExists) {
        setSelectedPromptId(nextPrompts[0]?.id ?? null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoadingList(false);
    }
  }

  async function loadPromptDetail(promptId: string) {
    setLoadingDetail(true);
    setError(null);

    try {
      const response = await fetch(`/api/prompts/${promptId}`, { cache: 'no-store' });
      const json = (await response.json()) as { prompt?: PromptListItem; versions?: PromptVersion[]; error?: string };

      if (!response.ok || !json.prompt || !json.versions) {
        throw new Error(json.error ?? '프롬프트 상세를 불러오지 못했습니다.');
      }

      setDetail({ prompt: json.prompt, versions: json.versions });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '알 수 없는 오류가 발생했습니다.');
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadPrompts(query);
  }

  async function handleCreatePrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: createTitle,
          content: createContent,
          tags: createTags,
          purpose: 'general',
          outputFormat: 'markdown',
          language: 'en',
          tone: 'neutral',
        }),
      });

      const json = (await response.json()) as { prompt?: PromptListItem; error?: string };
      if (!response.ok || !json.prompt) {
        throw new Error(json.error ?? '프롬프트 생성에 실패했습니다.');
      }

      setCreateTitle('');
      setCreateContent('');
      setCreateTags('');
      setNotice('새 프롬프트를 생성했습니다.');

      await loadPrompts(query);
      setSelectedPromptId(json.prompt.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPromptId) {
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/prompts/${selectedPromptId}/versions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          content: versionContent,
          summary: versionSummary,
          role: 'system',
        }),
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? '새 버전 생성에 실패했습니다.');
      }

      setVersionContent('');
      setVersionSummary('');
      setNotice('새 버전을 생성했습니다.');
      await loadPrompts(query);
      await loadPromptDetail(selectedPromptId);
    } catch (versionError) {
      setError(versionError instanceof Error ? versionError.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePublishSelected() {
    if (!detail) {
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          promptId: detail.prompt.id,
          title: detail.prompt.title,
          summary: detail.prompt.description,
          category: detail.prompt.purpose,
          tags: detail.prompt.tags.join(','),
          visibility: 'public',
          forkAllowed: true,
        }),
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? '게시에 실패했습니다.');
      }

      setNotice('선택한 대표 버전을 Public에 게시했습니다.');
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function copyPromptToClipboard(prompt: PromptListItem) {
    const text = prompt.pinnedText || prompt.pinnedSnippet;
    if (!text) {
      setNotice('복사할 본문이 없습니다.');
      return;
    }

    setCopyingPromptId(prompt.id);
    setError(null);
    setNotice(null);

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setNotice(`"${prompt.title}" 프롬프트를 클립보드에 복사했습니다.`);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : '클립보드 복사에 실패했습니다.');
    } finally {
      setCopyingPromptId(null);
    }
  }

  return (
    <section className="workspace-shell">
      <div className="workspace-header">
        <div>
          <p className="eyebrow">Private Workspace</p>
          <h1 className="section-title">Prompt Library</h1>
        </div>
        <p className="muted">버전 이력과 게시 플로우를 한 화면에서 관리합니다.</p>
      </div>

      <div className="status-stack" role="status" aria-live="polite">
        {error ? <p className="status status-error">{error}</p> : null}
        {notice ? <p className="status status-ok">{notice}</p> : null}
      </div>

      <div className="workspace-grid">
        <aside className="panel">
          <form className="inline-form" onSubmit={handleSearch}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search prompts"
              className="input"
              aria-label="Search prompts"
            />
            <button type="submit" className="button button-primary" disabled={loadingList}>
              {loadingList ? '검색 중...' : '검색'}
            </button>
          </form>

          <form className="stacked-form" onSubmit={handleCreatePrompt}>
            <h2 className="panel-title">새 프롬프트</h2>
            <input
              value={createTitle}
              onChange={(event) => setCreateTitle(event.target.value)}
              placeholder="Title"
              className="input"
              required
            />
            <textarea
              value={createContent}
              onChange={(event) => setCreateContent(event.target.value)}
              placeholder="Prompt content"
              className="textarea"
              rows={5}
              required
            />
            <input
              value={createTags}
              onChange={(event) => setCreateTags(event.target.value)}
              placeholder="tags (comma separated)"
              className="input"
            />
            <button type="submit" className="button button-primary" disabled={busy}>
              {busy ? '처리 중...' : '생성'}
            </button>
          </form>

          <div className="prompt-list" aria-busy={loadingList}>
            {prompts.length === 0 ? <p className="empty">프롬프트가 없습니다.</p> : null}
            {prompts.length > 0 ? (
              <div className="library-list" role="list">
                {prompts.map((prompt) => {
                  const active = prompt.id === selectedPromptId;
                  return (
                    <article key={prompt.id} className={`library-row ${active ? 'library-row-active' : ''}`} role="listitem">
                      <button type="button" className="library-select" onClick={() => setSelectedPromptId(prompt.id)}>
                        <span className="prompt-card-title">{prompt.title}</span>
                        <span className="prompt-card-meta">
                          {prompt.versionCount} versions · {prompt.purpose} · {new Date(prompt.updatedAt).toLocaleDateString()}
                        </span>
                        <span className="library-snippet">{prompt.pinnedSnippet || '본문 미리보기가 없습니다.'}</span>
                      </button>
                      <div className="library-row-footer">
                        <div className="library-tags">
                          {prompt.tags.slice(0, 4).map((tag) => (
                            <span key={`${prompt.id}-${tag}`} className="tag">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => void copyPromptToClipboard(prompt)}
                          disabled={copyingPromptId === prompt.id}
                          aria-label={`${prompt.title} 프롬프트 복사`}
                          title="프롬프트 복사"
                        >
                          <span className="icon-wrap" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
                              <path
                                d="M9 9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                              />
                              <path
                                d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                              />
                            </svg>
                          </span>
                          <span>{copyingPromptId === prompt.id ? '복사 중...' : '복사'}</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </div>
        </aside>

        <section className="panel panel-wide">
          {!selectedPrompt && !loadingList ? <p className="empty">왼쪽에서 프롬프트를 선택하세요.</p> : null}
          {loadingDetail ? <p className="empty">상세 정보를 불러오는 중...</p> : null}

          {detail ? (
            <>
              <div className="detail-header">
                <div>
                  <h2 className="section-title">{detail.prompt.title}</h2>
                  <p className="muted">{detail.prompt.description || '설명 없음'}</p>
                  <p className="muted">
                    {detail.prompt.outputFormat} · {detail.prompt.language} · {detail.prompt.tone}
                  </p>
                </div>
                <button type="button" className="button button-ghost" onClick={handlePublishSelected} disabled={busy}>
                  Public에 게시
                </button>
              </div>

              <form className="stacked-form" onSubmit={handleCreateVersion}>
                <h3 className="panel-title">새 버전 추가</h3>
                <input
                  value={versionSummary}
                  onChange={(event) => setVersionSummary(event.target.value)}
                  className="input"
                  placeholder="version summary (optional)"
                />
                <textarea
                  value={versionContent}
                  onChange={(event) => setVersionContent(event.target.value)}
                  className="textarea"
                  rows={5}
                  placeholder="new version content"
                  required
                />
                <button type="submit" className="button button-primary" disabled={busy}>
                  버전 저장
                </button>
              </form>

              <div className="version-stack">
                <h3 className="panel-title">Version History</h3>
                {detail.versions.map((version) => (
                  <article key={version.id} className="version-card">
                    <header className="version-header">
                      <strong>v{version.versionNumber}</strong>
                      <span className="muted">
                        {version.createdBy} · {new Date(version.createdAt).toLocaleString()}
                      </span>
                    </header>
                    {version.summary ? <p className="muted">{version.summary}</p> : null}
                    <pre className="codeblock">{toDisplayPromptText(version.blocks)}</pre>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </section>
  );
}
