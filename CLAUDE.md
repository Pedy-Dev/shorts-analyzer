# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Working Principles & Collaboration Style

### Core Philosophy
You are a **senior developer colleague**, not just a tool. Work with expert-level systematic thinking and always aim for the best outcomes and continuous improvement.

### Execution Principles

**1. Critical Review**
- Point out logical flaws, feasibility issues, or better alternatives in my proposals
- NO passive agreement like "sounds good" or "okay"
- If you have a better idea, take proactive initiative

**2. Expert-Level Thinking**
- Apply systematic considerations that experienced professionals would use
- Highlight commonly overlooked pitfalls and risks first
- Consider real-world production implications

**3. Honest Limitations**
- Clearly separate what you're certain about from assumptions/inferences
- Explicitly state knowledge boundaries (latest trends, hands-on experience, organizational context)
- Ask questions to understand my constraints and context

**4. Goal-Oriented Approach**
- Understand my intent and goals first, then optimize for them
- Pursue better results through constructive criticism
- **NEVER fabricate facts or lie** (except for script writing work)
- If you're unsure, say so clearly

---

## Developer Experience Level

**USER SKILL LEVEL: Beginner (1 month of coding experience)**

This project is Next.js-based "YouTube Shorts Analyzer" using TypeScript/React/Supabase. Adjust explanations accordingly.

### Work Style Guidelines

**1. Before Starting Any Feature/Bug Fix:**
- DON'T jump into code immediately
- FIRST explain: "which files need modification" and "what each file does"
- Provide step-by-step breakdown

**2. When I Paste File Contents:**
- Modify ONLY that specific file
- If other files need changes, explain verbally first and get my approval

**3. Code Modifications:**
- Show ONLY the changed portions, not entire files
- Provide before/after comparison when possible
- After changes, explain each line in beginner-friendly terms
- Use simple example data to demonstrate how the code works

**4. Large Refactoring (routing, folder structure, DB schema):**
- NEVER do this unless I explicitly request it
- Keep existing code intact, only add/modify necessary parts
- Preserve the current architecture

**5. Creating New Files:**
- First explain: file path, filename, file purpose
- Then show the complete code

**6. If I Don't Understand:**
- Re-explain the same content more simply, step by step
- Break down complex concepts

**7. "Let's Start from Step 1" Workflow:**
- First: Present step-by-step plan
- Second: I paste the file
- Third: You modify the code

---

## Project Overview

**YouTube Shorts Analyzer (유튜브 쇼츠 해커)** - AI-powered analysis tool for YouTube Shorts performance and content strategy. Built with Next.js 15 (App Router), Gemini AI, and YouTube APIs.

## Development Commands

```bash
npm run dev      # Development server on localhost:3000
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

**Note:** No testing framework configured. TypeScript and ESLint errors are ignored during builds (`next.config.ts`) for rapid iteration.

## Environment Variables

```bash
# Google OAuth (MyChannelTab feature)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# AI Analysis
GEMINI_API_KEY=                    # Server-side only

# Database (not actively used yet)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# YouTube Data API (server fallback)
YOUTUBE_API_KEY_SERVER=
```

**SECURITY WARNING:** `.env.local` is currently committed with real credentials. Should be added to `.gitignore`.

## Architecture Overview

### Authentication & Authorization Rules

**CRITICAL: 세 가지 인증 모드의 완전 분리**

이 프로젝트는 3가지 독립적인 인증/권한 레벨을 가지고 있으며, 각각은 **절대로 서로를 오염시키면 안 됩니다**.

#### 1. 사이트 로그인 (Google OAuth - 기본 프로필만)

**목적**: 사용자 계정 생성 및 분석 기록 저장

**사용 범위**:
- 사용자 식별 (google_id, email, name, profile_image)
- Supabase users 테이블에 저장
- httpOnly 쿠키 `user_id`로 세션 관리

**사용 API**:
- `/api/auth/google?type=login` - OAuth URL 생성
- `/api/auth/callback` (state=login) - 콜백 처리
- `/api/user/me` - 현재 로그인 사용자 정보 조회

**절대 금지**:
- ❌ 타 채널 분석 API에서 이 쿠키 읽기
- ❌ YouTube API 호출 시 이 세션 사용

---

#### 2. 내 채널 분석 (Google OAuth - YouTube 권한 포함)

**목적**: 로그인된 사용자의 YouTube 채널 데이터 접근

**사용 범위**:
- YouTube Analytics API 접근 (engaged views, retention, subscriber conversion)
- YouTube Data API 중 인증 필요 기능 (내 채널 정보 조회)
- DB에 저장된 `youtube_access_token`, `youtube_refresh_token`, `youtube_channel_id`, `youtube_channel_title` 사용

**사용 API**:
- `/api/auth/google?type=youtube` - YouTube 권한 OAuth URL 생성
- `/api/auth/callback` (state=youtube) - YouTube 토큰 저장
- `/api/my-channels` - 내 채널 목록 조회
- `/api/youtube-analytics` - Analytics 데이터 조회
- `/api/analyze-performance` - 내 채널 AI 분석

**데이터 흐름**:
1. 사용자가 "내 채널 연결하기" 클릭 → `type=youtube`로 OAuth 진행
2. 콜백에서 YouTube 토큰을 Supabase `users` 테이블에 저장
3. 이후 방문 시 MyChannelTab이 `/api/user/me`에서 `youtubeChannelId`, `youtubeChannelTitle` 자동 로드

**절대 금지**:
- ❌ 타 채널 분석 시 이 토큰 사용
- ❌ 다른 사용자 채널 분석에 내 OAuth 토큰 유출

---

#### 3. 타 채널 분석 (완전 Stateless, API 키만 사용)

**목적**: 로그인 없이 또는 로그인과 무관하게 공개 채널 분석

**사용 범위**:
- YouTube Data API v3 (공개 데이터만)
- 사용자가 직접 입력한 API 키 (`localStorage`의 `youtube_api_key`)
- 절대 세션/쿠키/DB 인증 사용 안 함

**사용 API** (모두 완전 stateless):
- `/api/get-channel-id` - 채널 URL → 채널 ID 변환
- `/api/get-shorts` - 채널의 쇼츠 목록 조회
- `/api/subtitle` - 영상 자막 추출 (youtubei.js, API 키 불필요)
- `/api/generate-script` - AI 분석 (Gemini)

**구현 규칙**:
- ✅ `request.json()`에서 `apiKey` 파라미터만 받기
- ✅ 서버 환경변수 `YOUTUBE_API_KEY_SERVER`를 1차 폴백으로 사용 (할당량 분산)
- ✅ 유저 제공 `apiKey`를 2차로 사용
- ❌ **절대 금지**: `cookies()`, `NextRequest.cookies.get()`, Supabase client, OAuth 토큰

**코드 예시** (올바른 패턴):
```typescript
// ✅ 올바른 예시 (get-shorts/route.ts)
export async function POST(request: NextRequest) {
  const { channelId, apiKey } = await request.json();

  // 서버 API 키 먼저 시도
  const serverApiKey = process.env.YOUTUBE_API_KEY_SERVER;
  if (serverApiKey) {
    try {
      const result = await fetchWithKey(channelId, serverApiKey);
      return NextResponse.json({ shorts: result });
    } catch (error) {
      // 할당량 초과 시에만 유저 키로 폴백
    }
  }

  // 유저 API 키로 폴백
  const result = await fetchWithKey(channelId, apiKey);
  return NextResponse.json({ shorts: result });
}
```

```typescript
// ❌ 절대 금지 패턴
export async function POST(request: NextRequest) {
  const userId = request.cookies.get('user_id')?.value; // ❌ 금지!
  const { data } = await supabase.from('users').select('youtube_access_token'); // ❌ 금지!
  // ...
}
```

---

### Two Main Features

1. **Channel Analysis Tab** (`ChannelAnalysisTab.tsx`)
   - Analyze any public channel without authentication
   - User provides their own YouTube Data API key (stored in `localStorage`)
   - Fetches up to 50 shorts, extracts Korean subtitles
   - AI compares top 30% vs bottom 30% performers
   - Generates content creation guidelines

2. **My Channel Tab** (`MyChannelTab.tsx`)
   - Requires Google OAuth (YouTube + Analytics scopes)
   - Accesses YouTube Analytics API for advanced metrics
   - Provides deeper insights: funnel analysis, retention gaps, subscriber conversion
   - Tokens stored in httpOnly cookies

### API Route Structure

All routes in `app/api/` return JSON with `{ success, error, ...data }` pattern:

- **`/api/auth/google`** - Generate OAuth URL
- **`/api/auth/callback`** - Exchange code for tokens, store in cookies
- **`/api/my-channels`** - List user's YouTube channels (OAuth required)
- **`/api/get-channel-id`** - Resolve channel ID from URL
- **`/api/get-shorts`** - Fetch shorts via YouTube Data API
- **`/api/subtitle`** - Extract subtitles using `youtube-transcript` (no API quota cost)
- **`/api/youtube-analytics`** - Fetch Analytics API data (engaged views, retention, etc.)
- **`/api/generate-script`** - Main AI analysis endpoint (Gemini)
- **`/api/analyze-performance`** - Deep AI analysis with Analytics data
- **`/api/save-analysis-history`** - Store results (endpoint exists, not actively used)

### Performance Score Formula

Used to rank videos for analysis:

```javascript
score = (views / 10000) * 0.5 + (likeRate * 100) * 0.3 + (commentRate * 100) * 0.2
```

Videos <7 days old are filtered out (performance needs time to stabilize).

## AI Analysis System

### Gemini Integration (`/api/generate-script`)

**Two modes:**

1. **Analyze Mode** - Compare top vs bottom performers in 3 steps:
   - Step 1: Topic/angle characteristics (Gemini 2.5 Flash)
   - Step 2: Title patterns (Gemini 2.0 Flash Exp)
   - Step 3: Script structure (Gemini 2.5 Flash)
   - Summary: Key differences (100-char bullets)

2. **Guideline Mode** - Generate actionable content guide:
   - 3-second hook strategies
   - Retention tactics
   - Topic selection patterns
   - Title formulas
   - Script structure checklist

**Fallback strategy:**
- Tries server Gemini key first, then user-provided key (via headers)
- Auto-retries with different models on quota/error
- Handles Korean language outputs

### Performance Analysis (`/api/analyze-performance`)

For authenticated users with Analytics data:

- Content analysis by topic/angle/title
- Funnel analysis (engagement → retention → subscription)
- Subscription triggers (emotional patterns)
- Next video blueprint with checklist
- Compares top 30% vs bottom 30% by engaged views

## YouTube API Patterns

### Dual API Key System

- **User-provided key** (localStorage): Primary for Channel Analysis
- **Server key** (env var): Fallback when user quota exhausted
- **Why:** Distribute API quota across users (10,000 units/day limit)

### Shorts Detection

Fetches videos from uploads playlist, filters by `duration ≤ 61 seconds`:

```javascript
// Fetches 50 videos/page, max 10 pages
// Returns detailed stats: views, likes, comments, duration
```

### Subtitle Extraction

Uses `youtube-transcript` package (no quota cost):
- Auto-generated Korean subtitles only
- Fails silently if unavailable → returns "자막이 없습니다"
- Server-side only (avoids CORS issues)

### YouTube Analytics API

Metrics used in MyChannelTab:
- `engagedViews` (70-85%+ watch time)
- `averageViewPercentage` (retention)
- `subscribersGained`
- `likes`, `shares`

**Viral Index calculation:**
```javascript
viralIndex = (likes + comments + shares) / views
```

## Authentication Flows

### Google OAuth (MyChannelTab)

1. User clicks "Login" → `/api/auth/google` generates OAuth URL
2. Google redirects to `/api/auth/callback?code=...`
3. Exchange code for tokens, store in httpOnly cookies:
   - `google_access_token` (1 hour, refresh on use)
   - `google_refresh_token` (7 days)
4. Frontend calls `/api/my-channels` to verify auth + list channels

**Scopes:** `youtube.readonly`, `yt-analytics.readonly`

### Supabase Setup

`app/lib/supabase.ts` provides browser client factory:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Current usage:** Minimal (no active database operations in code). Likely for future history storage.

## Important Patterns

### State Management
- No Redux/Zustand - pure React `useState` + `useEffect`
- `localStorage` for API keys + UI preferences
- httpOnly cookies for OAuth tokens (server-managed)

### Component Conventions
- All interactive components use `'use client'`
- Lucide React for icons
- Tailwind CSS (mobile-first)
- Modal pattern: `isOpen` + `onClose` props

### Error Handling
- Extensive console logging with emoji prefixes (📌, ✅, ❌)
- Quota errors return 429 status
- Auth errors return 401
- Gemini JSON parsing has multi-stage fallbacks

### Gemini Response Parsing

Models sometimes wrap JSON in markdown blocks:

```typescript
// Handles: ```json\n{...}\n``` and variations
let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '')
return JSON.parse(cleaned)
```

## Common Development Tasks

### Add New Analysis Metric

1. Update `analyzeVideosWithScore()` in `MyChannelTab.tsx`
2. Add metric to `/api/analyze-performance` request payload
3. Update `buildPromptForGemini()` in route handler
4. Add UI display in result rendering

### Debug OAuth Issues

1. Check cookies exist: DevTools → Application → Cookies → `google_access_token`
2. Verify redirect URI matches Google Cloud Console
3. Check `/api/my-channels` response for 401 errors
4. Look for scope mismatch in OAuth consent screen

### Modify AI Analysis

1. Edit prompts in `/api/generate-script` route handler
2. Adjust `STEP*_TEMPERATURE` constants for creativity/consistency
3. Update `parseGeminiResponse()` if changing JSON structure
4. Test fallback models (2.5 Flash, 2.0 Flash Exp)

## Known Gotchas

### YouTube API Quotas
- Channel info: 1 unit
- Videos list: 1 unit + 1 per 50 videos
- Daily limit: 10,000 units
- **Solution:** Users provide their own keys

### Subtitle Limitations
- Only auto-generated Korean subtitles
- Not all videos have them (returns "자막이 없습니다")
- Uses `youtubei.js` scraping (no quota cost)

### Performance Data Timing
- Filters out videos <7 days old
- Shorts performance stabilizes after 7 days for more accurate analysis
- Top/bottom 30% comparison ignores middle 40%

### Gemini Prompt Engineering
- Prompts are 800+ lines with detailed Korean instructions
- Temperature varies by step (0.3-0.8)
- JSON parsing is fragile - always has fallback to raw text

## Quick Reference for Claude Instances

When working on this codebase:

1. **Most logic is server-side** in `app/api/` routes
2. **Dual YouTube API key system** - server key + user key
3. **No test framework** - rely on extensive console logs
4. **Korean language** - UI and analysis outputs in Korean
5. **Performance critical** - 50 videos + subtitles takes ~30 seconds
6. **Check API routes first** before modifying components
7. **Gemini prompts are massive** - see `/api/generate-script`
8. **httpOnly cookies** - OAuth tokens not accessible client-side


---

## Current Patch Focus (2025-11)

### Goal
Move the service from “1회성 분석 툴” → “로그인 기반 아카이브 + 데이터 수집 플랫폼”으로 발전시키는 1차 패치.

### Scope (High-level)

1. **Authentication Change**
   - 타 채널 분석 / 내 채널 분석 기능은 Google 로그인 필수로 전환
   - 분석 관련 API는 항상 userId를 전제로 동작

2. **Archive v1 (User Analysis History)**
   - `channel_analysis_history` 테이블 추가
     - userId, channelId, channelTitle, isOwnChannel, ytCategory, creatorCategory, videoCount, createdAt 등
   - 분석 성공 시 해당 정보 저장
   - "내 분석 기록" 페이지에서:
     - 내가 분석한 채널 리스트 표시
     - 행 클릭 시 기존 분석 결과 페이지로 이동

3. **Analysis Result UX Improvements**
   - 분석 결과 화면에서:
     - 각 영상 제목/썸네일 클릭 시 YouTube 링크 새 탭으로 열기
     - 사이트 로고 클릭 시 메인(/ 또는 /dashboard)으로 이동
     - 하단에 "상위 30% / 하위 30% 영상" 요약 섹션 추가 (정렬 기준 지표는 기존 퍼포먼스 스코어 또는 NAWP 등)

4. **AI-based Creator Category**
   - 타 채널 분석 시:
     - 채널명, 설명, 영상 제목 리스트를 기반으로 Gemini에 질의
     - 아래와 같은 쇼츠 제작자 관점 카테고리 중 하나를 선택:
       - 썰, 쇼핑쇼츠, 드라마/영화 리뷰, 연예인 이슈, 시사/정치, 브랜딩/기업 스토리, 교육/정보, 코미디/밈, 브이로그/일상, 기타
     - 결과를 `creatorCategory` 필드로 `channel_analysis_history`에 저장
   - "내 분석 기록" 리스트에 creatorCategory 컬럼 표시

5. **Global Popular Shorts Collection (v0)**
   - YouTube Data API `videos.list(chart=mostPopular)`를 사용해 카테고리별 인기 영상 수집
   - 60초 이하만 쇼츠로 간주해서 필터링
   - `popular_shorts_snapshot` 테이블에 저장 (videoId, title, channelId, categoryId, viewCount, likeCount, snapshotDate 등)
   - 이번 패치에서는 UI는 최소화 또는 생략, 주 목적은 데이터 수집 시작
