# 작업 지시(Codex): YouTube Producer Hub — AI 이미지 생성 + TTS 실연동 + SRT 내보내기

## 0. 먼저 읽을 것
- 경로: `C:/Users/user/.gemini/antigravity/scratch/youtube-producer-hub/`
- `NEXT_AGENT_HANDOFF.md`에 현재 자동제작 MVP의 전체 스키마와 동작이 정리돼 있음. 이 파일을 먼저 정독할 것.
- 순수 바닐라 JS / HTML5 Canvas / Web Audio / MediaRecorder / LocalStorage. **프레임워크·빌드도구 추가 금지.**
- HTML 삽입 시 반드시 `escapeHTML()`. 상태 변경 후 `saveData()` 호출. `<script src="app.js">` 태그가 `</body>` 직전에 유지되는지 확인(과거 실수 이력 있음).

## 1. 아키텍처 원칙 (매우 중요 — 반드시 준수)
이 프로젝트는 **프론트엔드 전용**이다. 브라우저에서 API 키를 직접 쓰면 키가 노출된다.
- **보안이 해결된 것처럼 보고하지 말 것.** 아래 두 모드를 코드/문서에서 명확히 구분한다:
  - **로컬 테스트 모드(현재):** API 키를 `localStorage`에 저장하고 브라우저에서 직접 API 호출. 개인 로컬 테스트 전용.
  - **정식 배포 구조(미래):** 서버리스 프록시가 키를 보관하고 프론트는 프록시만 호출.
- 모든 실제 API 호출은 아래 **두 함수 경계 안에만** 존재해야 한다. 나중에 본문만 서버리스 fetch로 교체 가능하도록:
  - `generateSceneImageViaProxy({ prompt, size, model })` → base64/DataURL 반환
  - `generateNarrationViaProxy({ text, model, voice, instructions, format })` → ArrayBuffer(오디오) 반환
  - 현재 구현은 이 함수 내부에서 `localStorage` 키를 읽어 OpenAI/ElevenLabs로 직접 fetch. 함수 상단에 `// LOCAL TEST MODE: replace body with serverless proxy call for production` 주석 명시.
- UI에 상시 경고 배너: **"⚠️ 로컬 테스트 모드 — API 키가 브라우저에 저장됩니다. 이 사이트를 공개 배포하면 키가 노출될 수 있습니다."**

## 2. 채널 설정(Settings)에 "AI 서비스 연동" 카드 추가
`renderSettings()`(app.js:1259 부근)와 `saveProfile()`에 필드 추가. 값은 `state.profile`에 저장(백업 import/export의 프로필 병합 로직에도 키 추가해 하위호환 유지). 단, **API 키만은** `state.profile`가 아니라 별도 localStorage 키(`yph_api_keys`)에 저장해 백업 JSON에 실려 유출되지 않도록 분리한다.

- OpenAI API Key (이미지 + TTS 공용)
- ElevenLabs API Key (선택)
- **이미지 모델** (기본값 `gpt-image-2` — 현재 공식 최신. 설정값으로 유지해 `gpt-image-1.5`, `gpt-image-1`, `gpt-image-1-mini`로 교체 가능. dall-e-3 하드코딩 금지)
- **TTS 모델** (기본값 `gpt-4o-mini-tts`), **목소리**(alloy/ash/ballad/coral/echo/fable/onyx/nova/sage/shimmer/verse/marin/cedar 중 선택), **말투 instructions**(자유 텍스트, 예: "차분하고 신뢰감 있는 성우 톤")
- 위 경고 배너를 이 카드 상단에 표시.

> 참고: 모델명은 자주 바뀐다. 구현 전 OpenAI 공식 문서에서 현재 GA 이미지/TTS 모델을 재확인하고 기본값을 맞출 것. 모델은 전부 설정값으로 분리해 하드코딩하지 말 것.

## 3. 장면별 AI 이미지 생성 (generateSceneImageViaProxy)
`renderScenesList()`(app.js:1687)가 그리는 각 장면 카드에 **"AI 이미지 생성"** 버튼 추가.
- 프롬프트 빌드: 장면 `title` + `caption`/`narration` + 프로젝트 `style`(Comic/Illustration/Documentary) 조합. (`state.profile.promptTemplate`의 `{{title}}`/`{{content}}` 토큰 재사용 가능)
- `generateSceneImageViaProxy`가 `POST https://api.openai.com/v1/images/generations` 호출. body: `{ model, prompt, size, n:1 }`.
  - **⚠️ 응답 처리 주의:** `gpt-image-1` 계열은 dall-e-3와 달리 **이미지 URL이 아니라 `data[0].b64_json`(base64)를 반환**한다. `data:image/png;base64,${b64_json}`로 DataURL을 만든다. (URL을 fetch하려 하지 말 것)
  - `size`는 프로젝트 `aspectRatio`로 매핑: `16:9` → `1536x1024`, `9:16` → `1024x1536`, 정사각 필요 시 `1024x1024`.
  - **일괄 생성 금지:** 비용·대기시간 때문에 이번 범위에서 "장면 전체 일괄 생성"은 넣지 않는다. **장면별 단일 생성만** 구현.
- 받은 DataURL을 **기존 이미지 리사이저를 통과**시켜 `scene.imageData`/`scene.imageName`에 저장. 현재 리사이저는 `handleSceneImageUpload`(app.js:1896) **안에 인라인**으로 존재(최대 800px·70% JPEG). 이를 **`resizeImageToDataURL(srcDataUrl) → Promise<dataUrl>` 재사용 헬퍼로 추출**하고, 업로드 경로와 AI 생성 경로가 **둘 다** 이 헬퍼를 쓰도록 리팩터(기존 업로드 동작이 깨지지 않게).
- 호출 중 버튼에 스피너/비활성화 + 진행상태 표시. 완료 후 `renderScenesList()`와 프리뷰 갱신.

## 4. TTS 실합성 + 타임라인 믹싱 (generateNarrationViaProxy)
현재 `startVideoRendering()`(app.js:2414)는 `apAudioCtx.createMediaStreamDestination()`(`dest`)에 BGM을 gain 0.35로 연결한 뒤 `apStartMediaRecorder(canvasStream, dest.stream, totalDuration)`(app.js:2485)를 호출한다. `speakNarration()`(1954)의 Web Speech는 **미리듣기 전용**이며 녹화엔 안 들어간다. 이제 실제 TTS를 녹화에 믹싱한다.

- **렌더링 시작 전 프리페치 단계** 추가: 각 장면 `narration`을 `generateNarrationViaProxy`로 요청.
  - OpenAI: `POST https://api.openai.com/v1/audio/speech`, body `{ model, voice, input: narration, instructions, response_format: "mp3" }`, 응답은 바이너리 → `arrayBuffer()`.
  - 응답 ArrayBuffer를 `apAudioCtx.decodeAudioData`로 AudioBuffer 디코딩해 **메모리 배열**(장면 순서대로)에 보관. (localStorage에 저장하지 말 것 — 용량 초과)
- **스케줄링:** MediaRecorder 시작 시점의 `apAudioCtx.currentTime`을 기준 t0로 잡고, 각 장면 누적 오프셋(장면1=0s, 장면2=장면1.duration, …)에 맞춰 `const src = apAudioCtx.createBufferSource(); src.buffer = buf; src.connect(ttsGain); src.start(t0 + offset);`
- **믹싱 볼륨:** BGM gain을 **0.35 → 0.2로 낮추고**, TTS gain은 1.0. 두 gain 모두 `dest`에 connect. (요구사항: BGM 20% / TTS 100%)
- **예외 처리:** OpenAI 키 없음 → TTS 건너뛰고 기존 무음/BGM-only 렌더링으로 폴백(크래시 금지). ElevenLabs 키가 있으면 그쪽 우선 사용 옵션 제공(`POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}`).
- 취소(`cancelVideoRendering`) 시 예약된 소스 노드도 정리.

## 5. 자막(SRT) 내보내기
`apFinishRendering()`(app.js:2556)에서 다운로드 버튼이 노출될 때, **"자막(.srt) 다운로드"** 버튼 추가.
- 장면 누적 오프셋으로 각 장면 `[start,end]` 초를 계산 → `HH:MM:SS,mmm` 포맷 SRT 생성. 자막 텍스트는 `caption`(없으면 `narration`).
- Blob(`text/plain`)으로 즉시 다운로드. 파일명은 프로젝트 title 기반 안전 파일명 + `.srt`.

## 6. 검증 및 마무리 (필수)
1. `node --check app.js` 통과.
2. **키 없는 상태**에서 앱 진입/자동제작/기존 로컬 이미지 업로드/텍스트 수정·저장·새로고침 유지가 **깨지지 않는지** 확인. AI 버튼은 키 없으면 친절한 경고(alert/토스트) 후 무동작.
3. 리사이저 리팩터 후 **기존 업로드 이미지 저장 경로가 그대로 동작**하는지 확인.
4. (키 보유 시) 실제 1회: AI 이미지 생성 → 저장 → 렌더 → TTS 믹싱된 WebM + SRT 다운로드까지 end-to-end 확인.
5. `NEXT_AGENT_HANDOFF.md`에 새 기능/스키마(설정 필드, `yph_api_keys` 저장 구조, 프록시 함수 경계, 로컬 테스트 모드 vs 정식 배포 구분)를 갱신. **보안이 완결됐다고 쓰지 말고 로컬 테스트 전용임을 명시.**

## 7. 참고 (검증된 사실 — 2026-07 확인)
- 이미지: `gpt-image-1`은 base64(`b64_json`) 반환(URL 아님). size는 1024²/1536×1024/1024×1536. 변형: `gpt-image-1-mini`, `gpt-image-1.5`, `gpt-image-2`.
- TTS: `gpt-4o-mini-tts`가 `instructions`(말투)를 지원. `tts-1`/`tts-1-hd`는 instructions 미지원. 목소리: alloy/ash/ballad/coral/echo/fable/onyx/nova/sage/shimmer/verse/marin/cedar.
- 출처: openai.com/index/image-generation-api, developers.openai.com/api/docs/models/gpt-image-1, developers.openai.com/api/docs/guides/text-to-speech, developers.openai.com/api/docs/models/gpt-4o-mini-tts

---

## 8. 추가 수정사항 (2차 — 반드시 반영. 위 내용과 충돌하면 이 절이 우선)

**8-1. 이미지 모델 기본값** — `gpt-image-2`(현재 공식 최신). 단 모델명은 설정값으로 유지해 `gpt-image-1.5`/`gpt-image-1`/`gpt-image-1-mini`로 교체 가능. (§2에 반영됨)

**8-2. 실제 재생시간 기반 타이밍 재계산 (§4 보강)** — TTS AudioBuffer 디코딩 후 각 장면의 실제 재생시간을 계산해, 설정된 장면 길이보다 음성이 길면 음성에 맞춘다.
```js
effectiveDuration = Math.max(
  configuredSceneDuration,
  ttsAudioBuffer ? ttsAudioBuffer.duration + 0.3 : 0
);
```
- 장면 오프셋, 전체 렌더링 시간, Canvas 애니메이션 진행, SRT 시간표를 **모두 `effectiveDuration` 기준으로 다시 계산**한다.
- TTS가 다음 장면과 겹치거나 마지막 음성이 잘리지 않도록 한다. (0.3초 여유 포함)

**8-3. 단일 기준 시각으로 A/V 싱크 (§4 보강)** — BGM·TTS·Canvas 장면 진행이 모두 하나의 기준 시각을 쓰게 한다.
```js
const renderStartAt = apAudioCtx.currentTime + 0.15;
```
- 모든 오디오 예약(`source.start(renderStartAt + offset)`)과 Canvas 애니메이션 시작을 이 값 기준으로. MediaRecorder 시작 시점과 오디오 예약 시점의 차이로 싱크가 어긋나지 않게 한다.

**8-4. 1차 구현 범위 = OpenAI만 (§4 조정)** — 이번 1차는 **OpenAI 이미지 + OpenAI TTS + 오디오 믹싱 + SRT**를 우선 완료한다. **ElevenLabs는 provider 함수와 설정 경계만** 만들어 두면 된다(미구현 스텁 허용). 실제 연동 시 OpenAI voice 값이 아니라 **별도 ElevenLabs Voice ID 설정 필드**를 둔다.

**8-5. CORS/실행 출처 (§5 보강)** — 브라우저 직접 호출의 CORS 성공을 **보장하지 않는다**. `file://`로 열지 말고 로컬 HTTP 서버에서 테스트:
```bash
python -m http.server 8080
```
CORS/출처 문제가 나면 **코드 버그로 오인하지 말 것.** 정식 배포에서는 서버리스 프록시로 교체(§1 프록시 함수 경계).

**8-6. 에러를 사용자에게 구분 표시** — 아래를 각각 다른 안내 문구로 처리(뭉뚱그린 "실패" 금지):
- API 키 없음
- 인증 또는 결제 문제 (401/402)
- 모델 접근 불가 / 조직 인증 필요 (403·verification)
- 사용량 제한 (429)
- 네트워크 / CORS 오류
- 콘텐츠 정책 거절 (400 content policy)
- 사용자 취소

**8-7. 취소 시 리소스 정리 (§4 보강)** — 생성된 모든 `AudioBufferSourceNode`를 배열로 관리해 취소 시 전부 `stop()`. 이미지/TTS 생성 요청에는 가능하면 `AbortController`를 사용해 중단 가능하게.

**8-8. 일괄 생성 제외 (§3에 반영됨)** — 이미지 생성은 비용·대기시간이 있으므로 장면 전체 일괄 생성은 이번 범위 밖. 장면별 단일 생성만.
