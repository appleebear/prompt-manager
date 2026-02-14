import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="hero">
      <p className="eyebrow">Private Workspace + Public Platform</p>
      <h1 className="hero-title">Prompt assets, version history, and publishing in one local app.</h1>
      <p className="hero-copy">
        개인 프롬프트를 버전 단위로 관리하고, 선택한 버전을 공개 탐색 탭에 게시할 수 있습니다.
      </p>
      <div className="hero-actions">
        <Link href="/workspace" className="button button-primary">
          워크스페이스 열기
        </Link>
        <Link href="/public" className="button button-ghost">
          공개 탐색 보기
        </Link>
      </div>
      <div className="hero-grid">
        <article className="tile">
          <h2>Version-safe editing</h2>
          <p>수정 저장 시 새 버전이 생성되어 과거 스냅샷이 보존됩니다.</p>
        </article>
        <article className="tile">
          <h2>Template + lint</h2>
          <p>변수 렌더링과 정적 린트를 통해 배포 전 품질을 빠르게 확인할 수 있습니다.</p>
        </article>
        <article className="tile">
          <h2>Publish to public feed</h2>
          <p>대표 버전을 즉시 공개 listing으로 배포하고 좋아요/북마크 반응을 확인합니다.</p>
        </article>
      </div>
    </section>
  );
}
