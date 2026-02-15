# Plan.md — Prompt Management Web App (개인 워크스페이스 + 공개 공유 플랫폼, 추후 마켓 확장)

## 0) 목표(한 문장)
**개인 프롬프트를 폴더/태그/버전/시맨틱 검색으로 관리**하고, 원하는 버전은 **공개 플랫폼에 게시/공유(기본 Fork 허용, 옵션으로 제한)**하며, **AI로 목적/모델 조건에 맞춰 프롬프트를 개선**할 수 있는 웹 앱을 만든다. (프롬프트 “실행/테스트”는 MVP 범위 밖)

---

## 1) 제품 범위/가정(Assumptions)

### 1.1 MVP 포함
- **웹 앱(계정 기반 클라우드)**: 로그인 후 개인 워크스페이스 사용
- **Prompt Library**: CRUD, 폴더 트리, 태그, 즐겨찾기, 아카이브, 휴지통
- **Workspace 탐색 UX**: 라이브러리 리스트(행) 기반 탐색 + 프롬프트별 즉시 복사(Quick Copy)
- **버전관리**: 수정/AI개선 시 자동 버전 생성, diff, 롤백, 대표 버전(pin)
- **검색**: 키워드 + 시맨틱 검색(개인/공개 각각 범위 분리)
- **AI Prompt Optimizer**: 목적/모델/출력형식/톤/제약 선택 → 변형안 생성 → diff 비교 → 새 버전 저장
- **템플릿 변수**: `{{variable}}` 스키마 정의 + 렌더(채워넣기) + 누락 경고
- **프롬프트 린터(정적 검사)**: 모호성/충돌/형식 불일치/변수 누락 등 경고
- **공개 공유 플랫폼**:
  - 게시(Publish): 특정 버전(버전 고정)으로 Public/Unlisted
  - 탐색: 태그/카테고리/검색/정렬(최신/인기) + 카드 클릭 시 상세 보기
  - 소셜: 좋아요/북마크
  - 복사: Listing 상세에서 본문 즉시 복사(버튼 레이블: `복사`)
  - 포크: 기본 허용(원작자가 금지 옵션 가능), 출처 자동 표기, 계보(부모 링크)
  - 신고/모더레이션 최소 기능(관리자만)
- **내보내기/가져오기 + 로컬 백업**: Markdown+YAML / JSON, ZIP 패키지, (선택) 백업 암호화
- **로컬 실행 영속성**: dev 서버 재시작 후에도 데이터 유지되는 로컬 DB(예: SQLite) 저장

### 1.2 MVP 제외(Non-goals)
- 프롬프트 실제 실행/결과 로그/평가(A/B, 테스트셋)는 제외
- 팀 협업(권한/워크스페이스/SSO 등)은 제외(데이터 모델은 확장 가능하게)
- 결제/판매/라이선스 부여 자동화는 제외(마켓 확장용 필드/모델만 예약)

### 1.3 중요한 제품 원칙
- **원본 보존**: AI가 무엇을 해도 원본/이전 버전은 반드시 남는다.
- **공개/비공개 기본값**: 워크스페이스 자산은 기본 비공개. 공개는 “명시적 Publish”로만.
- **Fork 기본 허용**: 커뮤니티 성장 기본값. 단, 원작자는 게시 시 Fork/상업적 이용/재배포 등을 옵션으로 제한 가능.
- **프롬프트는 ‘자산’**: 문서처럼 저장하되, “메타/버전/권리/계보”를 먼저-class로 다룬다.

---

## 2) 기술 스택(LLM로 빠르게 개발하기 좋은 조합)

### 2.1 권장 스택(의사결정: 이 문서 기준)
- **Frontend/Backend**: Next.js (App Router) + TypeScript
- **UI**: Tailwind + shadcn/ui (or Radix)
- **Auth**: Auth.js(NextAuth) 또는 Supabase Auth(택1)
- **DB**: Postgres + **pgvector**(시맨틱 검색) + full-text search(tsvector)
- **ORM**: Prisma (or Drizzle)
- **Storage**: S3 호환(이미지/백업 ZIP 저장 필요 시)
- **Jobs/Queue**: Inngest / Trigger.dev / BullMQ(택1) — 임베딩 생성, 인기 지표 집계 등 비동기 작업
- **AI Provider**: OpenAI(임베딩 + 개선), 추후 멀티 프로바이더 확장 가능하게 추상화

> 현실 팁: Supabase를 쓰면 Auth + Postgres + pgvector(확장) + Storage까지 한 번에 잡히는 장점이 큼.

### 2.2 배포/운영(최소)
- Vercel(Next.js) + Managed Postgres(Supabase/Neon/Railway 등)
- 관측: Sentry(프론트/백), OpenTelemetry(선택)
- Rate limiting: Upstash Redis(선택) 또는 API gateway 레이트리밋

---

## 3) 아키텍처 개요

### 3.1 경계(Boundaries)
- **Private Workspace**와 **Public Platform**은 같은 앱이지만, 데이터/검색/권한 스코프가 명확히 분리됨
  - Private: `user_id` 스코프 강제
  - Public: `listing.visibility = public|unlisted` 기반, 민감도에 따라 게시 제한

### 3.2 프롬프트 내부 표현(결정)
- 저장 모델은 **메시지 블록 기반**(role: system/user/assistant, order)으로 통일
- UI에서는 **Simple(단일 텍스트) 뷰**와 **Chat(역할 분리) 뷰**를 제공
  - Simple 뷰 = 내부 블록을 합쳐 보여주되, 저장은 블록으로 유지
  - 조회 기본 표시에서는 `[system]`, `[user]` 같은 role 접두를 본문 앞에 렌더링하지 않는다(본문 content만 표시)
  - 이유: Optimizer/린터/변수 시스템이 블록 구조에서 훨씬 견고

### 3.3 시맨틱 검색(결정)
- `prompt_version.embedding`(vector) 저장 + 벡터 인덱스(HNSW/IVFFLAT)
- 검색은 **하이브리드**:
  - (A) full-text(ts_rank) + (B) cosine similarity
  - 개인/공개 스코프 + 필터(태그/폴더/목적 등) + 정렬

---

## 4) 단계별 개발 계획(LLM 코딩에 최적화된 체크리스트)

> 아래 단계는 “순서/의존성” 중심이며, 기간 추정은 의도적으로 넣지 않는다(프로젝트 상황에 따라 달라짐).

### Phase 0 — 리포지토리/기반 세팅
**Deliverables**
- Next.js + TS + 린팅/포맷팅(ESLint/Prettier) + 테스트 셋업(Vitest/Playwright)
- DB 마이그레이션/ORM 세팅
- Auth(이메일/소셜 중 최소 1개) + 세션 보호 라우팅
- 기본 레이아웃(사이드바/상단바), 라우팅 스켈레톤(Private/Public 분리)
- 로컬 실행용 상태 저장소(로컬 DB 파일) 초기화/로드/세이브 루틴

**Acceptance criteria**
- 로그인 전에는 Private 경로 접근 불가
- 로그인 후 “빈 워크스페이스” 화면까지 접근 가능
- CI에서 lint/test 통과
- dev 서버 재시작 후에도 생성한 프롬프트/게시 데이터가 유지됨

---

### Phase 1 — Prompt Library(핵심 CRUD) + 폴더/태그
**Deliverables**
- Prompt 생성/수정/복제/아카이브/삭제(휴지통) + 복구
- 폴더 트리 CRUD + 이동(드래그앤드롭은 이후 가능)
- 태그 CRUD + 자동완성 + 병합(merge) 기능(선택)
- 메타데이터 입력(목적/출력형식/언어/톤/민감도/메모 등)
- 라이브러리 리스트(행) UI + 선택/하이라이트 + 미리보기 스니펫
- 프롬프트별 원클릭 복사 버튼(Quick Copy)

**Acceptance criteria**
- Prompt 상세 화면에서 편집 저장 시 새 버전 생성(Phase2와 연결되나 최소 스텁 필요)
- 폴더/태그 필터로 리스트가 정확히 바뀜
- 휴지통에서 복구/완전삭제 동작
- 리스트에서 복사 버튼으로 현재 대표 버전 본문이 클립보드에 즉시 복사됨

---

### Phase 2 — Versioning + Diff + Rollback(신뢰의 핵심)
**Deliverables**
- `Prompt`(자산) / `PromptVersion`(스냅샷) 분리
- “편집 저장”은 기본적으로 **새 버전 생성**(옵션: 빠른 수정도 새 버전)
- 버전 목록, 버전 비교(diff), 특정 버전으로 롤백
- 대표 버전(pin) 지정

**Acceptance criteria**
- 어떤 변경도 과거를 덮어쓰지 않는다(버전 수가 증가)
- 버전 비교에서 변경점이 사용자에게 명확히 보인다
- 롤백 시 대표 버전이 정확히 바뀐다

---

### Phase 3 — Search(키워드 + 시맨틱)
**Deliverables**
- 개인 워크스페이스 키워드 검색(full-text)
- 시맨틱 인덱싱 파이프라인(버전 생성 → 임베딩 생성 → 저장)
- 하이브리드 검색 API(개인 스코프)
- 공개 플랫폼 키워드/시맨틱 검색 API(공개 스코프)

**Acceptance criteria**
- 개인 검색 결과는 타 유저 자산이 절대 섞이지 않는다
- 시맨틱 검색이 “유사 프롬프트”를 상식적으로 반환한다
- 태그/폴더/목적 필터가 정상 동작

---

### Phase 4 — 템플릿 변수 + 렌더링
**Deliverables**
- 변수 스키마 정의(이름/설명/기본값/필수 여부/타입: string/enum/number 등)
- 프롬프트 본문에서 `{{var}}` 파싱
- “변수 채우기” 폼 → 렌더된 프롬프트 출력(복사 버튼)
- 변수 누락/미사용 경고(린터와 연동)

**Acceptance criteria**
- 누락된 필수 변수가 있으면 렌더 불가 + 안내
- 렌더 결과가 저장된 버전의 본문과 일관되게 생성
- 복사 시 원하는 포맷(단일 텍스트/블록별)을 선택 가능

---

### Phase 5 — Prompt Linter(정적 검사)
**Deliverables**
- 규칙 기반 린트 엔진(빠르고 결정적)
- 경고/오류 레벨, 클릭 시 해당 위치 하이라이트
- “게시 전 검사”와 “AI 개선 전 검사”에 자동 실행

**Acceptance criteria**
- 최소 규칙: 변수 누락, 역할 혼재, 출력 형식 충돌, 모호 표현 경고
- 린트 결과가 버전마다 재현 가능(같은 입력이면 같은 결과)

---

### Phase 6 — AI Prompt Optimizer(조건 특화 개선)
**Deliverables**
- Optimizer UI: 목적/모델 특성/출력 형식/톤/제약 선택
- 개선 실행 → 변형안 2~4개 생성(짧게/엄격/안전/구조화 등)
- 원본 vs 개선본 diff, 채택 시 새 버전 저장
- 실행 로그(조건, 생성 시각, 사용한 템플릿 버전) 저장

**Acceptance criteria**
- 개선 결과는 항상 “새 버전”으로만 저장된다
- 사용자 선택 조건이 결과에 반영(예: JSON 출력이면 JSON 지시 강화)
- 민감도 설정이 “AI 전송 금지”인 프롬프트는 개선 실행 차단 또는 로컬 규칙 기반만 제공

---

### Phase 7 — Public Platform(게시/탐색/포크/모더레이션 최소)
**Deliverables**
- Publish Wizard: 버전 선택 → 카드 메타(제목/요약/태그/카테고리) → 권리 정책 선택 → 게시
- Public Explore 카드 + 카드 클릭 시 Listing 상세 패널/페이지
- Public Listing 상세(내용, 변수 안내, 출처, 라이선스/정책 표시) + 본문 복사 버튼(`복사`)
- 좋아요/북마크
- 내가 누른 좋아요/북마크 listing 목록 조회(분리 리스트)
- 포크(허용 시): 내 워크스페이스로 복제(새 Prompt 생성) + 출처 자동 기록
- 신고(Report) + 관리자 리뷰(기본 Admin UI)

**Acceptance criteria**
- Public/Unlisted 동작이 명확하고, Unlisted는 검색에 나오지 않는다
- Explore에서 카드 클릭 시 버전 고정 본문이 정확히 표시된다
- 상세에서 `복사` 버튼으로 본문 복사가 가능하다
- 사용자는 Public 페이지에서 내가 좋아요/북마크한 listing을 각각 리스트로 확인할 수 있다
- Fork 허용 기본값이며, 게시자가 금지하면 버튼/엔드포인트가 막힌다
- 포크한 자산에는 “부모 listing/version” 출처가 항상 남는다
- 신고가 누적되면 관리자 화면에서 처리 가능(숨김/삭제/사용자 제재 등 최소)

---

### Phase 8 — Export/Import + 로컬 백업
**Deliverables**
- 내보내기: 선택한 프롬프트(또는 전체) → ZIP 생성
  - Markdown+YAML(frontmatter) + JSON(manifest)
- 가져오기: ZIP/JSON 업로드 → 충돌 처리(같은 ID/슬러그) 정책
- 백업 암호화 옵션(선택): WebCrypto AES-GCM + PBKDF2

**Acceptance criteria**
- 내보낸 ZIP으로 원상복구(import) 가능
- Markdown은 Obsidian에 넣어도 읽기 좋음(버전/메타가 YAML에 존재)
- 암호화 백업은 비밀번호 없으면 복구 불가

---

### Phase 9 — 하드닝(보안/스팸/성능)
**Deliverables**
- 레이트리밋(특히 로그인/검색/AI 개선)
- 기본 스팸 방지(반복 게시/링크 도배/태그 스팸)
- 벡터 인덱스 튜닝 + 캐시(검색/피드)
- 보안 점검: IDOR, 권한 체크, CSRF(필요 시), XSS 대응

**Acceptance criteria**
- 주요 엔드포인트에 권한 누락이 없다
- 공개 플랫폼이 스팸에 즉시 무너지지 않는 수준의 방어가 있다
- 검색/피드가 체감상 빠르다

---

## 5) LLM을 개발에 쓰는 운영 방법(추천)

### 5.1 “모듈 단위”로 쪼개서 시키기
LLM에게 한 번에 “전체 앱”을 시키지 말고, 아래처럼 **작은 PR 단위**로.
- PR1: DB 스키마 + 마이그레이션
- PR2: Prompt CRUD API + UI 리스트
- PR3: Versioning + Diff
- PR4: Search API + UI
- PR5: Optimizer API + UI
- PR6: Public listing + fork + report

### 5.2 코드 생성용 프롬프트 템플릿(예시)
- “다음 스키마를 기준으로 Next.js Route Handler(REST)를 구현해. 권한 체크는 반드시 `session.user.id` 스코프를 강제하고, 에러는 RFC7807 형태로 반환해. 테스트(Vitest)도 같이 작성해.”
- “이 UI는 shadcn 컴포넌트만 사용하고, 접근성(aria)과 로딩/에러 상태를 모두 처리해.”
- “Diff는 line-based로 구현하고, 변경된 라인 하이라이트만 우선 제공해.”

### 5.3 반드시 강제할 품질 게이트
- 타입 에러 0
- 서버: 권한 체크(스코프) 테스트 1개 이상
- UI: 로딩/에러/빈 상태 3종 세트
- 마이그레이션은 롤백 가능하게 작성

---

## 6) 리스크 & 대응(깊게 생각해야 하는 부분)

1) **플랫폼 스팸/저품질 홍수**
- 대응: 게시 레이트리밋, 태그/링크 제한, 신고/숨김, 최소 모더레이션 툴, 신규 계정 제한

2) **프롬프트 ‘도용/재업’ 분쟁**
- 대응: 계보(provenance) 강제, 출처 자동 표기, 신고/중재 플로우, (추후) 검증/뱃지

3) **AI 개선 프라이버시**
- 대응: 민감도 필드 + “AI 전송 금지” 옵션, 공지/동의, 로그 최소화

4) **시맨틱 검색 비용/지연**
- 대응: 비동기 임베딩, 배치 처리, 캐시, 저장 전략(대표 버전만 인덱싱 옵션)

5) **나중에 마켓 붙일 때 데이터/정책이 뒤틀림**
- 대응: 지금부터 RightsPolicy, ForkRelation, License 예약 모델을 분리 설계

---

## 7) 완료 정의(Definition of Done)
- 개인 워크스페이스에서 프롬프트를 **폴더/태그/버전/검색**으로 쾌적하게 관리 가능
- 워크스페이스 리스트에서 프롬프트를 빠르게 탐색하고 즉시 복사 가능
- AI 개선 → diff → 새 버전 저장 플로우가 안정적
- 공개 플랫폼에 게시/검색/상세조회/복사/포크/신고가 가능하며, **Fork 기본 허용 + 옵션 제한**이 정확히 동작
- 내보내기/가져오기/로컬 백업이 동작하여 사용자 신뢰를 확보
- dev 서버 재시작 이후에도 로컬 DB 기반으로 상태가 유지됨

---

## 8) 추가 요구 반영 & 다음 세션 시작점 (2026-02-14)

### 8.1 추가 요구사항 반영 체크
- [x] Workspace 라이브러리 리스트(행) 탐색 UI
- [x] Workspace 각 프롬프트 즉시 복사 버튼
- [x] Public 카드 클릭 → 상세 보기
- [x] Public 상세에서 본문 복사 버튼(레이블: `복사`)
- [x] Public 페이지에서 내가 Like/Bookmark한 프롬프트 목록 조회
- [x] Prompt 조회 화면에서 `[system]`, `[user]` role 접두 미표시(본문만 표시)
- [x] dev 재시작 후 상태 유지 로컬 DB( SQLite ) 영속화

### 8.2 다음 Codex 세션 시작 TODO
- [ ] 인메모리+스냅샷 구조를 실제 도메인 DB 스키마(Postgres/Prisma)로 이관
- [ ] 로컬 DB 마이그레이션/백업/복구 정책 문서화
- [ ] Public 상세에 변수 스키마/렌더 안내 노출
- [ ] API 에러 응답을 전 엔드포인트에서 일관된 JSON 포맷으로 강제
