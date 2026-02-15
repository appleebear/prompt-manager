# Spec.md — Prompt Management Web App (MVP 스펙)

## 0) 제품 개요
이 제품은 (1) 개인이 프롬프트를 자산으로 관리하는 **Private Workspace**와, (2) 프롬프트를 공개/공유/포크할 수 있는 **Public Platform**으로 구성된 웹 앱이다.  
MVP에서는 “프롬프트 실행/테스트”는 제공하지 않는다. 대신 **버전관리 + 린터 + 조건 특화 AI 개선 + 시맨틱 검색**으로 품질/재사용성을 확보한다.

---

## 1) 용어 정의
- **Prompt**: 사용자가 소유하는 프롬프트 “자산”의 컨테이너(폴더/태그/대표 버전 등 포함)
- **PromptVersion**: 특정 시점의 스냅샷(본문/메타/변수/린트 결과/임베딩)
- **Block**: 프롬프트 본문을 구성하는 메시지 단위(role + content + order)
- **Listing**: 공개 플랫폼에 게시된 카드(특정 PromptVersion을 참조)
- **RightsPolicy**: Listing의 공개 범위/포크/재배포/상업적 이용/출처표기 규칙
- **Fork**: Listing을 기반으로 새 Prompt를 개인 워크스페이스에 생성하는 행위
- **OptimizerRun**: AI 개선 실행 기록(조건/프롬프트/결과 요약/생성 버전 링크)
- **LocalStateStore**: 로컬 개발 실행에서 상태를 재시작 간 유지하기 위한 영속 저장소(SQLite 등)

---

## 2) 사용자/권한 모델

### 2.1 역할(Role)
- **User**: 개인 워크스페이스를 사용, 공개 플랫폼에 게시/포크 가능
- **Admin(Moderator)**: 신고 처리, listing 숨김/삭제, 사용자 제재(최소)

### 2.2 권한 원칙
- Private Workspace 데이터는 **항상 user_id 스코프**로 조회/변경
- Public Platform 데이터는 `visibility`에 따라 노출
  - Public: 모두 조회 가능
  - Unlisted: 링크를 아는 사람만(검색/피드 제외)
  - Private: 플랫폼에 존재하지 않음(게시 전)

---

## 3) 정보구조(IA) 및 주요 화면

### 3.1 Private Workspace
- **Library(리스트)**: 폴더/태그/필터/정렬 + 검색 + 행(row) 기반 빠른 탐색
- **Quick Actions**: 각 프롬프트 항목에서 대표 버전 본문 즉시 복사
- **Prompt Detail**: 본문 편집(Simple/Chat 뷰), 메타데이터, 변수, 린트, 버전 탭, 개선 탭, 내보내기
- **Version Compare**: 선택한 두 버전 diff + 롤백
- **Backup/Import**: 내보내기 ZIP 생성, import

### 3.2 Public Platform
- **Explore**: 카테고리/태그/검색/정렬(최신/인기) + 카드 클릭 시 상세 패널/페이지
- **Listing Page**: 내용(버전 고정), 변수 안내, 라이선스/권리, 출처, 좋아요/북마크/포크/신고, 본문 복사
- **Profile(선택)**: 유저의 공개 listing 모음, 팔로우는 MVP 선택 사항
- **Admin**: 신고 큐, 액션 로그, listing 숨김/복구

---

## 4) 기능 요구사항(Functional Requirements)

### 4.1 Prompt Library (MUST)
1. 사용자는 Prompt를 생성/수정/복제/아카이브/휴지통 이동/복구/완전삭제할 수 있어야 한다.
2. Prompt는 폴더(트리 구조)에 속할 수 있으며, 폴더는 CRUD 가능해야 한다.
3. Prompt는 태그를 여러 개 가질 수 있고, 태그는 자동완성되어야 한다.
4. Prompt 메타데이터는 최소 다음을 포함해야 한다.
   - title, description(요약), purpose(use-case), output_format, language, tone, sensitivity(shareable/blocked), notes
5. Prompt 상세 편집은 **저장 시 새 버전 생성**을 기본으로 한다(과거 덮어쓰기 금지).
6. Library는 리스트(행) 형태로 빠르게 훑어볼 수 있어야 하며, 제목/버전수/목적/수정시각/스니펫을 표시해야 한다.
7. Library 각 항목에는 대표 버전 본문을 클립보드에 복사하는 버튼이 있어야 한다.
8. Prompt 조회 화면(Workspace/Public 상세)의 본문 표시에는 `[system]`, `[user]`, `[assistant]` 같은 role 접두를 노출하지 않고 content만 표시해야 한다.

### 4.2 Versioning/Diff/Rollback (MUST)
1. PromptVersion은 변경 불가능(immutable)해야 한다.
2. 버전 목록에서 생성 시각/생성 원인(수정/AI 개선/포크) 표시.
3. 두 버전 비교(diff) 제공(line-based 우선).
4. 특정 버전으로 “대표 버전(pin)”을 변경 가능.
5. 롤백은 “대표 버전 포인터 변경” 또는 “선택 버전을 새 버전으로 재생성” 중 택1. (권장: 포인터 변경 + 필요 시 새 버전 생성 옵션)

### 4.3 템플릿 변수 (MUST)
1. 본문에서 `{{var}}` 패턴을 변수로 인식한다.
2. 변수 스키마(이름/설명/기본값/필수/타입)를 저장한다.
3. “변수 채우기” UI에서 값을 입력하면 렌더된 프롬프트를 생성한다.
4. 필수 변수가 누락되면 렌더 불가 + 에러를 표시한다.
5. 미사용 변수/정의되지 않은 변수는 린터에서 경고한다.

### 4.4 Prompt Linter (MUST)
MVP 린트 규칙(최소):
- **VAR_MISSING**: 필수 변수 누락
- **VAR_UNDEFINED**: 본문에 존재하지만 스키마에 없는 변수
- **ROLE_MIXED**: system/user/assistant 구분이 요구되는데 단일 텍스트로 혼재된 경우(휴리스틱)
- **FORMAT_CONFLICT**: output_format이 JSON인데 “자유롭게 서술” 같은 충돌 지시가 있는 경우
- **AMBIGUOUS**: “적당히/충분히/알아서/최대한” 등 모호 표현 경고
- **INJECTION_RISK**: “사용자 입력을 무조건 따르라” 식의 취약 지시 경고(간단 패턴)
린트는 버전 단위로 저장 가능(캐시), 편집/게시/AI개선 전 자동 실행.

### 4.5 Search (키워드 + 시맨틱) (MUST)
1. 키워드 검색은 title/body/tags/notes를 대상으로 한다.
2. 시맨틱 검색은 PromptVersion(대표 버전 또는 최신 버전)을 임베딩하여 벡터 검색한다.
3. 개인 검색과 공개 검색은 데이터 스코프가 엄격히 분리되어야 한다.
4. 필터: tag, folder, purpose, output_format, language, updated_at, favorites
5. 정렬: relevance(하이브리드), newest, recently_updated, most_liked(공개)

### 4.6 AI Prompt Optimizer (MUST)
1. 사용자는 “개선 조건”을 선택할 수 있어야 한다.
   - purpose, model_profile(모델 특성), output_format, tone, length_constraint, do/don’t constraints
2. Optimizer는 다음을 생성해야 한다.
   - 변형안 2~4개(프리셋 기반): short/strict/safe/structured 등
3. 결과는 원본과 diff 비교 가능해야 한다.
4. 채택 시 새 PromptVersion을 생성한다.
5. OptimizerRun은 “재현 가능한 로그”를 남긴다(조건, 입력 버전, 출력 버전, 템플릿 버전).
6. sensitivity가 “AI 전송 금지”인 경우:
   - (A) 개선 실행을 차단하거나
   - (B) 규칙 기반(비-LLM) 개선만 제공 (MVP에서는 A 권장)

### 4.7 Sharing / Public Platform (MUST)
1. 사용자는 PromptVersion을 Listing으로 게시할 수 있다.
2. 게시 시 **RightsPolicy 프리셋**을 선택한다(고급 설정 포함).
3. Listing은 Public/Unlisted를 지원한다.
4. Listing 페이지에서 좋아요/북마크/포크/신고 가능.
5. 포크:
   - 기본값: 허용
   - 금지 옵션: 원작자가 게시 시 설정 가능
   - 포크 시 내 워크스페이스에 새 Prompt 생성 + 출처 자동 기록(parent listing/version)
6. 출처 표기(Attribution)는 시스템이 자동으로 표기하며(권장: 필수), 제거 불가.
7. 신고/모더레이션:
   - 신고 생성(사유 선택 + 텍스트)
   - Admin은 listing 숨김/삭제/복구, 사용자 제재(최소)를 수행
8. Explore에서 카드 클릭 시 해당 Listing의 버전 고정 본문을 상세 화면(또는 패널)에서 확인할 수 있어야 한다.
9. Listing 상세에는 본문 복사 버튼이 있어야 하며, 사용자 레이블은 `복사`를 사용한다.
10. Public 화면에서 사용자가 좋아요한 Listing 목록과 북마크한 Listing 목록을 각각 별도 리스트로 확인할 수 있어야 한다.

### 4.8 Export/Import + Local Backup (MUST)
1. 사용자는 내 프롬프트 전체 또는 선택을 ZIP으로 export 가능.
2. ZIP에는 다음이 포함된다.
   - `manifest.json`(전체 메타, 관계, 버전 목록)
   - `prompts/<prompt_slug>/versions/<version_id>.md`(YAML frontmatter + 본문)
   - `prompts/<prompt_slug>/prompt.json`(기계 복구용, 선택)
3. import는 ZIP/JSON을 지원하며, 충돌 정책을 제공한다.
   - (A) 새 ID로 가져오기(권장 기본)
   - (B) 동일 slug면 suffix 부여
4. 선택 기능: 백업 암호화(AES-GCM) + 복호화 import

### 4.9 Local Runtime Persistence (MUST for local/dev profile)
1. 로컬 개발 실행에서는 서버 재시작 후에도 프롬프트/버전/listing/반응(좋아요, 북마크) 상태가 유지되어야 한다.
2. 상태 변경 API(생성/수정/게시/반응 등)는 성공 시 영속 저장소에 즉시 반영되어야 한다.
3. 앱 시작 시 저장된 상태가 있으면 우선 로드하고, 없으면 초기 시드 데이터를 생성해야 한다.
4. 로컬 저장 실패 시 API는 JSON 에러를 반환해야 하며 클라이언트가 원인을 표시할 수 있어야 한다.

---

## 5) RightsPolicy(권리/라이선스) 스펙

### 5.1 필드
- `visibility`: public | unlisted
- `fork_allowed`: boolean (기본 true)
- `redistribution_allowed`: boolean (fork 허용 시 의미 있음, 기본 true)
- `commercial_use_allowed`: boolean (기본은 true 또는 프리셋에 따름)
- `share_alike`: boolean (기본 false)
- `attribution_required`: boolean (권장: 항상 true로 강제)

### 5.2 프리셋(예시)
- **Open Remix (기본)**: public + fork true + redistribution true + commercial true + share_alike false + attribution required
- **View Only**: public + fork false
- **Share Alike**: public + fork true + redistribution true + share_alike true
- **Commercial Reserved**: public + fork false + commercial false (마켓 판매 대비)

---

## 6) 데이터 모델(권장 Postgres 스키마)

> 아래는 MVP 기준 권장 테이블/컬럼이며, 실제 구현에 따라 일부 단순화 가능.

### 6.1 핵심
#### `users`
- id (uuid, pk)
- email, name, avatar_url
- created_at

#### `folders`
- id (uuid, pk)
- user_id (fk users)
- parent_id (nullable fk folders)
- name
- sort_order
- created_at, updated_at

#### `prompts`
- id (uuid, pk)
- user_id (fk users)
- folder_id (nullable fk folders)
- title
- description
- purpose (enum/string)
- output_format (enum/string)
- language (string)
- tone (string)
- sensitivity (enum: normal|no_ai|no_share)
- pinned_version_id (nullable fk prompt_versions)
- archived_at (nullable)
- deleted_at (nullable)  # 휴지통
- created_at, updated_at

#### `prompt_versions`
- id (uuid, pk)
- prompt_id (fk prompts)
- version_number (int)
- created_by (enum: user|optimizer|fork|import)
- source_version_id (nullable fk prompt_versions) # optimizer/fork 기반
- summary (nullable)
- lint_json (jsonb, nullable)
- embedding (vector, nullable)  # pgvector
- created_at

#### `prompt_blocks`
- id (uuid, pk)
- version_id (fk prompt_versions)
- role (enum: system|user|assistant)
- content (text)
- order_index (int)

#### `prompt_variables`
- id (uuid, pk)
- prompt_id (fk prompts)
- name (string)
- description (text)
- required (bool)
- type (enum: string|number|enum|json)
- enum_values (jsonb, nullable)
- default_value (jsonb, nullable)

#### Tags
- `tags`(id, user_id, name, created_at)
- `prompt_tags`(prompt_id, tag_id) unique(prompt_id, tag_id)

### 6.2 Public Platform
#### `listings`
- id (uuid, pk)
- owner_user_id (fk users)
- prompt_version_id (fk prompt_versions)  # 버전 고정
- slug (unique)
- title, summary
- category (string)
- tags_json (jsonb)  # 공개 태그(검색용), 또는 listing_tags 테이블로 분리
- visibility (public|unlisted)
- rights_policy_json (jsonb)
- status (active|hidden|removed)
- created_at, updated_at

#### `listing_stats`
- listing_id (pk/fk listings)
- like_count, bookmark_count, fork_count
- hot_score (float)  # 인기 정렬용(선택)
- updated_at

#### `listing_likes` / `listing_bookmarks`
- id, listing_id, user_id, created_at
- unique(listing_id, user_id)

#### `forks`
- id
- parent_listing_id (fk listings)
- parent_version_id (fk prompt_versions)
- child_prompt_id (fk prompts)
- child_version_id (fk prompt_versions)
- user_id (fk users)  # 포크한 사람
- created_at

#### `reports`
- id
- listing_id
- reporter_user_id
- reason (enum)
- details (text)
- status (open|triaged|resolved|dismissed)
- created_at, updated_at

#### `moderation_actions`
- id
- admin_user_id
- listing_id
- action (hide|remove|restore|ban_user etc)
- notes
- created_at

### 6.3 AI Optimizer
#### `optimizer_runs`
- id
- user_id
- input_version_id
- output_version_ids (jsonb)  # 변형안 여러 개
- config_json (jsonb)  # 목적/모델/제약
- provider (string)
- model (string)
- prompt_template_version (string)
- created_at

### 6.4 Local Runtime State(개발 모드 권장)
#### `app_state` (SQLite 단일 레코드)
- id (int, pk, 항상 1)
- json (text)  # PromptManager 전체 스냅샷
- updated_at (datetime)

---

## 7) API 스펙(REST 예시)

> 구현 편의상 REST로 표기. tRPC/GraphQL로 대체 가능. 응답 에러는 RFC7807 스타일 권장.

### 7.1 Private Workspace
- `POST /api/prompts`
- `GET /api/prompts?folder_id=&tag=&q=&sort=`
- `GET /api/prompts/:id`
- `POST /api/prompts/:id/duplicate`
- `PATCH /api/prompts/:id` (메타 수정)
- `POST /api/prompts/:id/archive` / `POST /api/prompts/:id/restore`
- `DELETE /api/prompts/:id` (휴지통 이동) / `DELETE /api/prompts/:id/purge` (완전삭제)
- `GET /api/prompts` 응답에는 빠른 복사용 `pinned_text`(또는 동등 필드)를 포함하는 것을 권장

#### Versions
- `POST /api/prompts/:id/versions` (새 버전 생성; body에 blocks+meta snapshot)
- `GET /api/prompts/:id/versions`
- `GET /api/versions/:versionId`
- `GET /api/versions/diff?from=&to=`
- `POST /api/prompts/:id/pin/:versionId`

#### Folders/Tags
- `POST /api/folders`, `PATCH /api/folders/:id`, `DELETE /api/folders/:id`
- `POST /api/tags`, `DELETE /api/tags/:id`, `POST /api/tags/merge`

#### Variables
- `GET /api/prompts/:id/variables`
- `PUT /api/prompts/:id/variables`
- `POST /api/versions/:versionId/render` (values -> rendered blocks/text)

#### Lint
- `POST /api/versions/:versionId/lint` (또는 버전 생성 시 서버에서 자동 실행)

#### Search
- `GET /api/search/private?q=&filters=...`
- `GET /api/search/public?q=&filters=...`

### 7.2 Optimizer
- `POST /api/optimizer/run`
  - input: versionId + config(purpose/model_profile/output_format/constraints)
  - output: suggestions[{variant, blocks, summary}] + runId
- `POST /api/optimizer/accept`
  - input: runId + chosenVariantId
  - output: newVersionId

### 7.3 Public Platform
- `POST /api/listings` (publish)
- `PATCH /api/listings/:id` (메타 수정/visibility 변경)
- `DELETE /api/listings/:id` (unpublish or remove 요청; 실제는 status 변경)
- `GET /api/listings/:slug`
- `GET /api/listings/:id` (Explore 카드 클릭 시 상세 + 본문 조회)
- `GET /api/listings/reactions` (현재 사용자의 liked/bookmarked listing 목록)
- `POST /api/listings/:id/like` / `DELETE /api/listings/:id/like`
- `POST /api/listings/:id/bookmark` / `DELETE /api/listings/:id/bookmark`
- `POST /api/listings/:id/fork` (rights 체크 필수)
- `POST /api/listings/:id/report`

`GET /api/listings/:id` 예시 응답:
- listing 메타
- stats(like/bookmark/fork)
- prompt_version(고정 버전)
- prompt_text(클립보드 복사용 평문)

### 7.4 Backup
- `POST /api/backup/export` (범위: all|selected)
- `POST /api/backup/import` (ZIP/JSON)
- (선택) `POST /api/backup/encrypt` / `POST /api/backup/decrypt` (클라에서 처리 권장)

---

## 8) 검색/인덱싱 상세

### 8.1 임베딩 생성 대상
- 기본: `pinned_version_id`(대표 버전)만 인덱싱 (비용 절감)
- 옵션: 최신 버전도 인덱싱
- 임베딩 텍스트 구성(권장):
  - `[TITLE]\n...\n[ROLE:system]\n...\n[ROLE:user]\n...\n`
  - role 라벨을 포함해 구조 정보가 들어가게

### 8.2 하이브리드 랭킹(권장)
- `score = w1 * ts_rank + w2 * cosine_similarity`
- 필터가 많을 경우 벡터 검색 후 후보 n개를 full-text로 재정렬(또는 반대)
- Public는 popularity(좋아요/북마크/hot_score) 가중치 추가 가능

### 8.3 스코프
- private: `prompts.user_id = session.user.id`
- public: `listings.visibility='public' AND status='active'` (unlisted는 slug 접근만)

---

## 9) AI Optimizer 상세

### 9.1 입력(config) 스키마 예시
```json
{
  "purpose": "summarization|classification|coding|brainstorming|rag|agent",
  "model_profile": "json_strict|coding_strong|creative|long_context|cheap_fast",
  "output_format": "free|markdown|json|table",
  "tone": "neutral|friendly|formal|strict",
  "constraints": {
    "max_length": "short|medium|long",
    "must": ["..."],
    "must_not": ["..."]
  },
  "variants": ["short", "strict", "safe", "structured"]
}
```

### 9.2 출력(suggestions)
- variant별로 blocks를 생성
- 각 variant에 요약/의도/주의점(짧게) 포함

### 9.3 안전/프라이버시
- sensitivity가 `no_ai`면 요청 거부(403) 또는 규칙 기반만
- 외부 AI로 전송되는 데이터에 대한 고지 + 사용자가 명시적으로 실행할 때만 전송
- 로그에는 원문 전체를 남기지 않는 옵션 제공(기본: 요약/해시만)

---

## 10) Export 포맷(예시)

### 10.1 Markdown + YAML frontmatter
```yaml
---
id: <prompt_id>
title: "…"
folder: "Root/Marketing"
tags: ["RAG", "JSON"]
purpose: "rag"
output_format: "json"
language: "ko"
tone: "strict"
sensitivity: "normal"
version_id: <version_id>
version_number: 7
created_at: "2026-02-13T...Z"
variables:
  - name: topic
    required: true
    description: "…"
---
```
본문은 블록을 다음처럼 직렬화(택1):
- (A) 단일 텍스트로 합치기
- (B) role 헤더를 넣어 블록 유지

### 10.2 manifest.json
- prompts/versions 관계, fork provenance, listing 정보(있다면) 포함
- import 시 충돌 처리를 위한 원본 ID/slug 포함

### 10.3 암호화(선택)
- 클라이언트에서 ZIP 바이트를 AES-GCM으로 암호화
- 키는 PBKDF2(salt + iterations)로 파생
- 산출물: `.pmbackup`(암호화된 바이너리) + 메타(JSON)

---

## 11) 모더레이션/스팸 방지(최소)

### 11.1 신고 사유(예시)
- spam, plagiarism, unsafe_content, personal_data, other

### 11.2 자동 방어(간단)
- 게시/좋아요/신고 레이트리밋
- 동일 텍스트 반복 게시 감지(해시 기반)
- 태그 개수 제한, 링크 개수 제한

### 11.3 관리자 액션
- hide(플랫폼에서 숨김), remove(삭제), restore
- 사용자 경고/일시 제한(선택)

---

## 12) 비기능 요구사항(Non-functional)

### 12.1 보안
- 모든 Private API는 session 기반 인증 필수
- IDOR 방지: 리소스 조회/수정 시 user_id 스코프 검증
- XSS: Markdown 렌더링 시 sanitize 필수
- CSRF: 쿠키 세션 사용 시 방어(동일 사이트/토큰)
- Rate limiting: 로그인/검색/AI 개선 엔드포인트 중심

### 12.2 프라이버시
- 기본 비공개, 게시 전에는 외부 노출 없음
- “AI 전송 금지” 옵션 제공
- 삭제/휴지통 정책 명시(복구 기간 등)

### 12.3 성능(목표치 예시)
- 개인 라이브러리 5,000 prompts에서 리스트/검색 체감 지연 최소
- 시맨틱 검색 p95 < 500ms(후보 수/인덱스에 따라 조정)

### 12.4 접근성/국제화
- 키보드 탐색, aria-label, 대비 준수
- i18n은 MVP에서는 한국어 우선(확장 가능)

### 12.5 관측/운영
- 에러 추적(Sentry)
- 주요 이벤트 로깅: publish/fork/optimizer_run/report
- 관리자 액션 로그(감사)
- API 에러 응답은 가능한 한 JSON 형태를 유지해, 클라이언트에서 `Unexpected end of JSON input`류 파싱 실패를 방지

---

## 13) 추후 로드맵(마켓/기업 확장 포인트)

### 13.1 Marketplace
- Product(프롬프트/팩), 가격, 라이선스 타입
- 구매자에게 `LicenseGrant` 발행(상업적 이용/포크 허용 범위 등)
- 분쟁 처리(무단 재업 신고) 강화

### 13.2 Team/Enterprise
- Workspace(팀), 역할/권한(ACL), 감사 로그, 승인 워크플로
- SSO/SAML, 키 관리, 데이터 보존 정책, 온프렘 옵션

---

## 14) MVP 완료 체크리스트
- [ ] 프롬프트 CRUD + 폴더/태그
- [ ] Workspace 리스트 탐색 UI + 항목별 복사 버튼 + 조회 본문 role 접두 미표시
- [ ] 버전 자동 생성 + diff + 롤백 + pin
- [ ] 변수 스키마 + 렌더 + 경고
- [ ] 린터 규칙 최소 세트
- [ ] 키워드 + 시맨틱 검색(개인/공개 분리)
- [ ] Optimizer 조건 선택 + 변형안 + 새 버전 저장
- [ ] Publish/Public listing + 카드→상세 + 상세 복사 + Like/Bookmark + 반응 목록 조회 + Fork(옵션 제한) + Report/Admin
- [ ] Export/Import + 로컬 백업(암호화 옵션)
- [ ] dev 재시작 간 로컬 상태 영속화(LocalStateStore)

---

## 15) 세션 핸드오프 노트 (2026-02-14)

### 15.1 이번 세션에서 추가 반영된 요구사항
- Workspace 리스트(행) 탐색 + 각 항목 즉시 복사
- Public Explore 카드 클릭 상세 + 상세 본문 복사 버튼(`복사`)
- 로컬 DB(SQLite) 기반 상태 영속화(서버 재시작 후 데이터 유지)

### 15.2 다음 세션 우선 작업
1. LocalStateStore를 Postgres/Prisma 영속 모델로 점진 이관
2. API 에러 응답 포맷(JSON Problem Details 등) 일관화
3. Public 상세의 변수 스키마/사용 예시 표시 강화
4. E2E 테스트(재시작 후 데이터 유지, 복사 버튼 동작) 자동화
