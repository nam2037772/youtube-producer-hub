# NEXT AGENT HANDOFF: YouTube Producer Hub - 경량 자동제작 MVP 탑재

본 문서는 **YouTube Producer Hub** 프로젝트를 인계받는 다음 에이전트를 위한 핸드오프 가이드입니다. 이전 단계에서 완료된 채널 프로필 및 에디터 템플릿화에 이어, 이번 단계에서 **"아이디어에서 실제 영상(WebM)까지 생성하는 경량 자동제작 MVP"** 기능 구현을 완료했습니다.

---

## 1. 프로젝트 및 아키텍처 개요
*   **경로:** `C:/Users/user/.gemini/antigravity/scratch/youtube-producer-hub/`
*   **파일 목록:**
    *   `index.html` (자동제작 뷰 마크업 및 플레이어/다운로드 컨트롤 탑재)
    *   `app.js` (스토리보드 생성, Canvas 애니메이션 재생기, Web Audio 오디오 믹싱, MediaRecorder 렌더러 구현)
    *   `style.css` (모바일/태블릿 반응형 1열 레이아웃 미디어 쿼리 추가)
*   **기본 기술:** 순수 바닐라 JS, HTML5 Canvas, Web Audio API, MediaRecorder, LocalStorage. 외부 프레임워크나 무거운 외부 라이브러리 일체 배제.

---

## 2. 확장된 데이터 스키마 (state.videoProjects)
로컬 데이터베이스인 `state`에 새로운 `videoProjects` 배열과 `activeVideoProjectId` 상태 변수가 추가 및 보완되었습니다.

```javascript
let state = {
    ideas: [...],
    scripts: [...],
    activeScriptId: "...",
    dailyChecklist: [...],
    profile: {...},
    // [NEW] 비디오 프로젝트 데이터 구조
    videoProjects: [
        {
            id: "project-1784...",      // 고유 ID
            idea: "퇴근 후 운동한 직장인...", // 사용자가 입력한 아이디어 한 줄
            title: "매일 10분의 기적",     // 영상 제목
            duration: 60,               // 전체 영상 길이 (초) - 30 | 60 | 180
            aspectRatio: "16:9",        // 화면 비 - 16:9 | 9:16
            style: "Comic",             // 비주얼 테마 스타일 - Comic | Illustration | Documentary
            captionsEnabled: true,      // 자막 오버레이 활성화 여부
            status: "Drafting",         // Drafting | Completed
            createdAt: "2026-07-18...",
            updatedAt: "2026-07-18...",
            scenes: [
                {
                    id: "scene-1784...",
                    order: 1,
                    title: "도입부: 훅",
                    narration: "대사/내레이션 문구...",
                    caption: "자막 문구 (공란 시 내레이션 사용)",
                    duration: 12,        // 장면 지속시간 (초)
                    cameraMotion: "zoomIn", // static | zoomIn | zoomOut | panLeftToRight | panRightToLeft | panTopToBottom
                    transition: "fade",  // fade | cut
                    imageFit: "crop",    // crop | contain
                    imageData: "data:image/jpeg;base64,...", // Canvas 축소 JPEG Data URL (로컬 이미지 저장)
                    imageName: "workout.jpg"
                },
                ...
            ]
        }
    ],
    activeVideoProjectId: "project-1784..." // 활성 프로젝트 ID
};
```

---

## 3. 이번 작업에서 구현된 핵심 기능
1.  **자동 제작 (Auto Production) UI 추가**
    *   사이드바에 `자동 제작 (MVP)` 탭 추가. 16:9/9:16 화면비에 반응하여 Canvas 및 미리보기 영역이 동적으로 변화함.
    *   영상 프로젝트가 없는 경우 설정 입력 폼(아이디어, 제목, 길이, 비율, 스타일, 장면수, 자막 여부)이 노출되고, 생성 완료 시 스토리보드 상세 편집 및 실시간 프리뷰가 노출됨.
2.  **경량 스토리보드 로컬 생성**
    *   입력된 아이디어 한 줄을 파싱하여 [도입 훅 -> 상황 분석 -> 핵심 갈등 -> 실천 변화 -> 결론/CTA]의 구조에 맞는 장면들을 로컬 룰에 따라 텍스트, 시간, 어울리는 카메라 모션 태그와 함께 즉각 생성.
    *   생성 후 장면 추가, 장면 삭제, 위/아래 순서 변경, 개별 장면 제목/지속시간/카메라효과/나레이션/자막의 실시간 수정 및 LocalStorage 저장 완비.
3.  **만화형 fallback 장면 및 켄 번즈(Ken Burns) 카메라 무빙**
    *   장면에 직접 이미지를 업로드하지 않은 경우, 비주얼 스타일(Comic/Illustration/Documentary)의 테마 톤에 최적화된 그라데이션, 방사형 속도선, 웨이브 힐스, 프레임 경계선, SCENE 라벨, 캐릭터 실루엣 등을 Canvas에 그립니다.
    *   각 장면 재생 진행률(0~1)에 따라 Canvas Matrix 변환을 적용하여 부드러운 카메라 효과(줌인, 줌아웃, 좌우 패닝, 상하 패닝)를 실시간 렌더링합니다.
4.  **자막(Caption) 렌더링**
    *   Canvas 하단 영역에 자막을 직접 그리며, 배경에 검은색 반투명 박스 및 테두리를 둘러 가독성을 대폭 향상했습니다.
    *   Canvas 폭에 맞춘 자동 줄바꿈(Word Wrapping) 기능을 갖춰 긴 대사도 잘림 없이 노출됩니다.
5.  **배경음악 및 로컬 이미지 최적화**
    *   배경음악(BGM) 업로드 시 Web Audio API를 활용해 오디오를 믹싱 및 반복 루프 재생시킵니다. 오디오가 없는 경우 무음으로 처리되어 렌더링이 실패하지 않습니다.
    *   이미지 업로드 시, LocalStorage의 5MB 용량 제한을 우회하기 위해 **Canvas 리사이징 헬퍼(최대 800px 해상도의 70% 압축 JPEG Data URL 변환)**를 통과시켜 저장하므로 브라우저 스토리지 쿼터 초과 크래시가 방지됩니다.
6.  **WebM 실시간 레코더 (렌더링)**
    *   `canvas.captureStream(30)`과 `MediaRecorder` 및 Web Audio mixed stream 목적지를 합성하여 사용자가 설정한 가로형(1280x720) 혹은 세로형(720x1280) 동영상 파일을 실시간 인코딩합니다.
    *   렌더링 중 진행률(%), 현재 오프셋 초, 예상 남은 시간이 원형 카운터에 출력되며 언제든지 렌더링을 안전하게 취소할 수 있습니다.
    *   인코딩 완료 시 브라우저 내부 Object URL을 활용해 실제 `<video>` 컴포넌트로 결과물을 재생할 수 있으며, 안전한 파일명의 WebM 파일 다운로드 기능을 제공합니다.

---

## 4. 검증 결과
*   `node --check app.js` 검증 통과 완료.
*   **백업 호환성:** 기존에 `videoProjects` 필드가 없는 백업 파일을 가져오기(Import)해도 `normalizeStateData()`를 통해 빈 배열로 자동 마이그레이션되어 정상 작동하며, 백업 다운로드 시 `videoProjects` 데이터도 함께 백업 포맷에 안전하게 저장됩니다.
*   **화면 크기 대응:** 가로가 좁아지거나 모바일 기기에서 탐색할 때 2열 레이아웃이 1열 세로형으로 반응형 흐름을 유연하게 갖추도록 `style.css` 미디어 쿼리 커스터마이징 완료.

---

## 5. 이전 확장 후보(아래 §6에서 이번에 구현됨)
1.  **AI Image Generator API 연동**
    *   현재의 `local` 드로잉 대신 실제 생성 이미지 API(Stable Diffusion, DALL-E 등)를 호출하여 `scene.imageData`를 실시간 생성/교체하는 비동기 워커 연결.
2.  **TTS 목소리 실제 합성 (Audio Track Overlap)**
    *   장면별 나레이션 텍스트를 실제 TTS API로 전송하여 목소리 `.mp3` 버퍼를 얻고, 이를 Web Audio API 단에서 배경음악 노드와 정확한 오프셋 타이밍에 맞춰 병합(Overlay) 레코딩하는 모듈 추가.
3.  **자막(SRT/VTT) 내보내기**
    *   장면별 타임라인 초 오프셋을 활용하여 유튜브 표준 자막 파일(`.srt`)을 즉석 다운로드하는 편의 기능 추가.

---

## 6. 2026-07-18 AI 이미지 + OpenAI TTS + SRT 연동 완료

### 구현된 기능

- 장면 카드마다 단일 `AI 이미지 생성` 버튼을 추가했다. 일괄 생성 기능은 없다.
- 이미지 요청은 `generateSceneImageViaProxy({ prompt, size, model, signal })` 경계 안에서만 실행된다.
- 기본 이미지 모델은 `gpt-image-2`이며 설정에서 다른 모델 문자열로 교체할 수 있다.
- GPT Image 응답의 `data[0].b64_json`을 PNG Data URL로 변환한 뒤 기존 업로드와 동일한 `resizeImageToDataURL()`을 거쳐 최대 800px, JPEG 70%로 저장한다.
- 기존 로컬 이미지 업로드도 동일한 리사이저를 사용하도록 리팩터했다.
- 렌더링 전에 장면별 OpenAI TTS를 프리페치하고 Web Audio `AudioBuffer`로 디코딩한다.
- TTS 요청은 `generateNarrationViaProxy({ text, model, voice, instructions, format, signal })` 경계 안에서만 실행된다.
- BGM gain은 0.2, TTS gain은 1.0이다.
- ElevenLabs는 설정/provider/Voice ID와 스텁 경계만 존재하며 실제 API 호출은 구현하지 않았다.
- 렌더 완료 후 WebM과 함께 SRT 다운로드 버튼이 표시된다.

### 프로필 스키마 추가

다음 값은 `state.profile`에 저장되며 기존 백업은 `DEFAULT_PROFILE` 병합으로 자동 보완된다.

```js
{
  imageModel: "gpt-image-2",
  ttsProvider: "openai", // openai | elevenlabs
  ttsModel: "gpt-4o-mini-tts",
  ttsVoice: "coral",
  ttsInstructions: "차분하고 신뢰감 있는 성우 톤으로 자연스럽게 말해 주세요.",
  elevenLabsVoiceId: ""
}
```

### API 키 저장 구조

API 키는 `state.profile`에 넣지 않는다. 별도 localStorage 키를 사용한다.

```js
localStorage["yph_api_keys"] = JSON.stringify({
  openai: "...",
  elevenLabs: "..."
});
```

따라서 기존 `exportData()`가 내보내는 백업 JSON에는 API 키가 포함되지 않는다. 전체 데이터 초기화 시 이 별도 키도 삭제된다.

### 보안 경계 — 반드시 유지

현재 보안이 해결된 구조가 아니다.

- 로컬 테스트 모드: 브라우저 localStorage에서 API 키를 읽고 OpenAI API를 직접 호출한다. 개인 로컬 테스트 전용이다.
- 정식 배포 구조: 서버리스 프록시가 키를 보관하고 프론트엔드는 프록시만 호출해야 한다.
- 정식 배포 전에는 `generateSceneImageViaProxy()`와 `generateNarrationViaProxy()` 두 함수의 본문만 서버리스 호출로 교체한다.
- 다른 함수에 실제 API `fetch()`를 추가하지 않는다.
- 브라우저 직접 호출은 CORS/출처 정책에 따라 실패할 수 있으며, 이를 무조건 코드 버그로 판단하면 안 된다.

### 렌더 타이밍과 취소

TTS 디코딩 후 각 장면은 다음 값으로 다시 계산된다.

```js
effectiveDuration = Math.max(
  configuredSceneDuration,
  ttsAudioBuffer ? ttsAudioBuffer.duration + 0.3 : 0
);
```

- 장면 오프셋, 전체 렌더 시간, Canvas 장면 진행률, TTS 예약, SRT가 이 타임라인을 사용한다.
- BGM, TTS, Canvas는 `renderStartAt = apAudioCtx.currentTime + 0.15`를 공통 기준으로 사용한다.
- 모든 TTS/BGM `AudioBufferSourceNode`는 배열로 관리한다.
- 렌더 취소 시 모든 source를 stop하고 TTS AbortController를 abort한다.
- 장면 이미지 요청도 장면별 AbortController와 취소 버튼을 사용한다.

### 사용자 오류 구분

다음 오류를 서로 다른 한국어 메시지로 표시한다.

1. API 키 없음
2. 인증 또는 결제 문제(401/402)
3. 모델 접근 불가 또는 조직 인증 필요(403/verification)
4. 사용량 제한(429)
5. 네트워크/CORS/API 서버 문제
6. 콘텐츠 정책 거절(400 content policy)
7. 사용자 취소

### 검증 결과

- `node --check app.js` 통과.
- `python -m http.server 8080 --bind 127.0.0.1`로 HTTP 200 응답 확인.
- HTTP jsdom 스모크 테스트 통과:
  - 키 없는 상태와 키 분리 저장
  - 스토리보드/텍스트 저장과 새로고침 유지
  - 기존 로컬 이미지 업로드와 공용 리사이저
  - GPT Image base64 응답 처리
  - OpenAI TTS 요청 body
  - 오류 분류
  - effectiveDuration/오프셋 재계산
  - SRT effective timeline
- 실제 유료 OpenAI 호출은 사용할 API 키가 제공되지 않아 수행하지 못했다. 따라서 실제 계정 권한, 결제, 브라우저 CORS까지 성공했다고 보고하면 안 된다.

---

## 7. 런타임 실행 모드 분리 및 최종 점검 완료 (2026-07-18)

### 런타임 실행 모드 분리 구현
- **로컬 테스트 모드 (Local Test Mode):**
  - 조건: `window.location.hostname`이 `localhost` 또는 `127.0.0.1`인 경우.
  - 동작: API 키 입력란 활성화, `localStorage["yph_api_keys"]`를 통한 키 로드 및 직접 OpenAI API fetch 호출 허용.
- **공개 배포 모드 (Public/Deployment Mode):**
  - 조건: `github.io`를 포함한 그 외 모든 웹 출처.
  - 동작:
    1. API 키 입력란 비활성화(`disabled`) 및 값에 `[공개 배포 모드 - 브라우저 직접 호출 차단됨]` 자동 표시.
    2. `localStorage`에 기존 `yph_api_keys`가 존재할 시 안전하게 삭제(유출 방지 및 값 노출 차단).
    3. `loadApiKeys()`가 무조건 빈 키(`{ openai: "", elevenLabs: "" }`)를 반환하도록 봉인하여 스토리지 직접 위조 방지.
    4. `generateSceneImageViaProxy` 및 `generateNarrationViaProxy`에서 `public-mode-blocked` 에러를 발생시켜 브라우저 직접 fetch를 원천 차단.
    5. 사용자가 AI 이미지 생성 클릭 시 크래시 없이 경고 창(`alert`)을 띄워 *"공개 배포에서는 브라우저 직접 API 호출이 비활성화되어 있습니다. 실제 AI 기능을 사용하려면 서버리스 프록시를 연결해야 합니다."* 메시지 출력.
    6. 비디오 렌더링 시 TTS를 자동으로 우회하고 BGM 및 무음 렌더링으로 폴백하여 에러 없이 WebM 생성 성공.
    7. 로컬 이미지 업로드, 텍스트 편집, 켄 번즈 연출, 자막 렌더링, BGM 합성, SRT 자막 내보내기, 로컬 저장 등의 모든 기본 기능은 공개 배포 모드에서도 100% 정상 작동.

### 배포 및 Git 설정 결과
- **로컬 Git 저장소 초기화 및 첫 커밋 완료:**
  - `git init`, `git branch -m main` 설정 완료.
  - `git commit`을 실행하여 전체 최종 코드를 로컬 저장소에 보존.
- **GitHub Actions 배포 워크플로우 추가:**
  - `.github/workflows/deploy-pages.yml` 생성 완료. `main` 브랜치에 push 시 자동으로 GitHub Pages에 빌드 및 배포되도록 구성.
- **원격 저장소 push 보류 사유:**
  - GitHub 계정(`nam2037772`)에 `youtube-producer-hub` 원격 저장소가 아직 생성되어 있지 않습니다.
  - "원격 저장소가 없으면 임의로 새 공개 저장소를 만들지 않는다"는 원칙에 의거하여, 원격 push와 GitHub Pages 활성화 단계는 보류되었습니다.
  - **사용자 조치 사항:** GitHub 홈페이지 혹은 `gh repo create youtube-producer-hub --public` 명령으로 원격 저장소를 생성한 후, 로컬 저장소에 `git remote add origin https://github.com/nam2037772/youtube-producer-hub.git`를 추가하고 `git push -u origin main`을 실행하면 자동 배포가 시작됩니다.

