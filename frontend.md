# Frontend 실행 가이드

이 프로젝트의 프론트엔드는 **Next.js(App Router)** 기반입니다.

## 1) 사전 준비

- Node.js 22+ 권장 (`node:sqlite` 사용)
- npm 사용

버전 확인:

```bash
node -v
npm -v
```

## 2) 의존성 설치

프로젝트 루트(`/Users/harry/prompt-manager`)에서 실행:

```bash
npm install
```

## 3) 개발 서버 실행

```bash
npm run dev
```

기본 접속 주소:

- 홈: `http://localhost:3000`
- 워크스페이스: `http://localhost:3000/workspace`
- 공개 탐색: `http://localhost:3000/public`

## 4) 프로덕션 빌드/실행

빌드:

```bash
npm run build
```

실행:

```bash
npm run start
```

## 5) 품질 확인 명령

전체 테스트:

```bash
npm run test
```

타입 체크:

```bash
npm run typecheck
```

테스트 watch 모드:

```bash
npm run test:watch
```

## 6) 데이터 저장 위치

앱 상태는 SQLite로 저장됩니다.

- 기본 DB 파일: `data/prompt-manager.sqlite`
- 환경변수로 변경 가능: `PROMPT_MANAGER_DB_PATH`

예시:

```bash
PROMPT_MANAGER_DB_PATH=/tmp/prompt-manager.sqlite npm run dev
```

## 7) 자주 쓰는 문제 해결

포트를 이미 사용 중일 때:

```bash
PORT=3001 npm run dev
```

로컬 상태(데이터)를 초기화하려면 개발 서버 종료 후 DB 파일을 삭제:

```bash
rm -f data/prompt-manager.sqlite
```

다시 `npm run dev` 실행 시 샘플 데이터가 재생성됩니다.
