// Default Channel Profile (used to de-hardcode channel-specific logic)
const DEFAULT_PROFILE = {
    channelName: "존재와 길",
    brandKeywords: ["존재와 길", "미야모토 무사시"],
    categories: [
        { value: "Philosophy", label: "철학" },
        { value: "Stoicism", label: "스토아 학파" },
        { value: "History", label: "역사적 인물" },
        { value: "Self-Improvement", label: "자기 계발" },
        { value: "Mindset", label: "마음가짐" }
    ],
    powerWords: ["목숨", "위협", "비밀", "규율", "무사시", "천일", "만일", "고독", "성찰", "생사", "생존", "훈련", "스토아", "성공", "인생", "초인", "경지", "결투", "법칙"],
    speechRate: 300, // characters spoken per minute
    descTemplate: "이 영상이 우리 삶에 던지는 질문에 귀 기울여 보십시오.\n어떤 역경 속에서도 흔들리지 않는 규율과 단련의 힘을 나누고자 합니다.",
    descCta: "도움이 되셨다면 구독과 좋아요로 함께 길을 걸어가 주시기 바랍니다.",
    // {{title}} = 대본 제목, {{content}} = 선택한 섹션 본문 발췌
    promptTemplate: "/imagine prompt: cinematic dramatic lighting, epic atmospheric visualization inspired by \"{{title}}\". Scene: {{content}}, highly detailed, moody cinematic, 8k resolution, unreal engine 5 render --ar 16:9 --style raw --v 6.0",
    imageModel: "gpt-image-2",
    ttsProvider: "openai",
    ttsModel: "gpt-4o-mini-tts",
    ttsVoice: "coral",
    ttsInstructions: "차분하고 신뢰감 있는 성우 톤으로 자연스럽게 말해 주세요.",
    elevenLabsVoiceId: "",
    defaultScriptTemplateId: "longform",
    scriptTemplates: [
        {
            id: "longform",
            name: "롱폼",
            sections: [
                { key: "intro", label: "인트로", placeholder: "시청자의 이목을 끄는 강력한 훅과 핵심 오프닝 메시지를 작성하세요..." },
                { key: "body1", label: "본론 1", placeholder: "첫 번째 핵심 이야기나 정보를 흥미롭게 서술하세요..." },
                { key: "body2", label: "본론 2", placeholder: "구체적인 사례, 근거 또는 실천 방안을 작성하세요..." },
                { key: "body3", label: "본론 3", placeholder: "핵심 메시지를 시청자의 삶과 연결해 정리하세요..." },
                { key: "outro", label: "아웃트로", placeholder: "결론과 자연스러운 구독 유도(CTA)를 작성하세요..." }
            ]
        },
        {
            id: "shorts",
            name: "쇼츠",
            sections: [
                { key: "hook", label: "훅", placeholder: "첫 1~3초 안에 시선을 붙잡을 한 문장을 작성하세요..." },
                { key: "core", label: "핵심", placeholder: "하나의 핵심 메시지를 빠르고 선명하게 전달하세요..." },
                { key: "cta", label: "CTA", placeholder: "댓글, 구독 또는 다음 행동을 짧게 제안하세요..." }
            ]
        },
        {
            id: "vlog",
            name: "브이로그",
            sections: [
                { key: "opening", label: "오프닝", placeholder: "오늘 영상의 상황과 기대감을 소개하세요..." },
                { key: "scene1", label: "자유 섹션 1", placeholder: "장면, 대사, 내레이션을 자유롭게 작성하세요..." },
                { key: "scene2", label: "자유 섹션 2", placeholder: "다음 장면의 흐름을 자유롭게 작성하세요..." },
                { key: "closing", label: "마무리", placeholder: "오늘의 여운과 다음 영상 예고를 남기세요..." }
            ]
        }
    ]
};

const API_KEYS_STORAGE_KEY = "yph_api_keys";

function getRuntimeMode() {
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1"
        ? "local-test"
        : "public";
}

function loadApiKeys() {
    if (getRuntimeMode() === "public") {
        return { openai: "", elevenLabs: "" };
    }
    try {
        const stored = JSON.parse(localStorage.getItem(API_KEYS_STORAGE_KEY) || "{}");
        return {
            openai: typeof stored.openai === "string" ? stored.openai : "",
            elevenLabs: typeof stored.elevenLabs === "string" ? stored.elevenLabs : ""
        };
    } catch (error) {
        console.warn("API key settings could not be parsed.", error);
        return { openai: "", elevenLabs: "" };
    }
}

function saveApiKeys(keys) {
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify({
        openai: (keys.openai || "").trim(),
        elevenLabs: (keys.elevenLabs || "").trim()
    }));
}

// Global State
let state = {
    ideas: [],
    scripts: [],
    videoProjects: [],
    activeScriptId: null,
    activeVideoProjectId: null,
    seoTitle: "", // Deprecated: Migrated to scripts
    seoTags: [],   // Deprecated: Migrated to scripts
    dailyChecklist: [false, false, false, false, false],
    profile: JSON.parse(JSON.stringify(DEFAULT_PROFILE))
};

// Initial Sample Data (Only loaded on first visit)
const SAMPLE_DATA = {
    ideas: [
        {
            id: "idea-1",
            title: "미야모토 무사시가 독고행(獨行道)에서 남긴 21가지 인생 규율",
            desc: "무사시가 죽기 직전 남긴 21가지 원칙 중 현대인에게 가장 와닿는 5가지를 추려 고독과 자립에 관해 풀어냅니다.",
            category: "Philosophy",
            difficulty: "Hard",
            status: "idea",
            createdAt: new Date().toISOString()
        },
        {
            id: "idea-2",
            title: "불안을 다스리는 세네카의 편지 - 스토아 철학의 실천적 교훈",
            desc: "불안은 미래의 고통을 미리 겪는 것이라는 세네카의 성찰을 중심으로, 현대인의 마인드셋을 치유하는 명상적 내용.",
            category: "Stoicism",
            difficulty: "Medium",
            status: "idea",
            createdAt: new Date().toISOString()
        },
        {
            id: "idea-3",
            title: "오륜서 물의 장에서 배우는 유연하게 생존하는 대처법",
            desc: "딱딱하게 굳어있는 고정관념을 깨고, 물처럼 상황에 맞춰 변화하고 싸우는 지혜를 담은 병법 해석 영상.",
            category: "History",
            difficulty: "Hard",
            status: "idea",
            createdAt: new Date().toISOString()
        }
    ],
    scripts: [
        {
            id: "script-1",
            title: "목숨을 위협하는 수준의 수련 | 미야모토 무사시",
            status: "Drafting",
            intro: "1600년대 일본, 60여 차례의 생사를 넘나드는 결투에서 단 한 번도 패배하지 않은 남자가 있었습니다. 바로 미야모토 무사시입니다. 그의 수련은 단순한 연습이 아니었습니다. 매 순간 칼끝에 죽음의 긴장을 올리는 '목숨을 위협하는 수준의 수련'이었습니다. 그는 왜 스스로를 죽음의 문턱까지 밀어붙였을까요?",
            body1: "무사시가 남긴 불후의 병법서 《오륜서》에서 그는 '천일의 수련을 단(鍛)이라 하고, 만일의 수련을 련(練)이라 한다'고 전합니다. 여기서 단련이란 매일의 지루한 기본기를 수만 번 반복하며 자신의 자만과 한계를 잘라내는 칼날 같은 규율을 말합니다. 그는 실전을 머릿속에 끊임없이 그렸고, 훈련마저도 실제 생사의 싸움처럼 비장하게 임했습니다.",
            body2: "혹독한 수련의 핵심은 평정심이었습니다. 흔히 '평상심'이라 부르는 마음가짐인데, 무사시는 격투 중이든 일상이든 호흡과 심장 박동의 고요함을 유지해야 한다고 보았습니다. 목숨이 위태로운 칼싸움 속에서도 그가 평정을 지킬 수 있었던 원동력은 가차 없는 훈련을 통해 자신의 한계를 소멸시켰기 때문입니다.",
            body3: "이러한 극한의 훈련은 오늘날 우리에게 어떤 의미를 줄까요? 우리는 칼을 겨누고 싸우진 않지만, 현대 사회라는 보이지 않는 전쟁터에서 매일 매일을 살아갑니다. 미야모토 무사시의 수련은 우리에게 지독한 규율과 꾸준함, 그리고 흔들리지 않는 평정심만이 나를 지켜주는 최고의 방패이자 무기임을 보여줍니다.",
            outro: "당신의 삶에서 '천일의 단'과 '만일의 련'은 무엇인가요? 매일 꾸준한 규율을 실천하고 있다면, 당신은 이미 자신만의 검을 단련하고 있는 것입니다. 오늘 이야기가 도움이 되셨다면, '존재와 길' 채널의 구독과 좋아요를 눌러주시기 바랍니다. 당신만의 길을 묵묵히 걸어가는 여정을 응원합니다.",
            checklist: [true, false, false, false, false, false, false],
            prompts: [],
            seoTitle: "목숨을 위협하는 수준의 수련 | 미야모토 무사시의 혹독한 규율",
            seoTags: ["미야모토 무사시", "오륜서", "동양 철학", "자기 계발", "정신력 단련", "인생 조언", "존재와 길", "규율", "독고행", "동기부여"],
            createdAt: new Date().toISOString()
        }
    ],
    activeScriptId: "script-1",
    dailyChecklist: [false, false, false, false, false],
    profile: JSON.parse(JSON.stringify(DEFAULT_PROFILE))
};

function checkAndInitRuntimeMode() {
    if (getRuntimeMode() === "public") {
        if (localStorage.getItem(API_KEYS_STORAGE_KEY)) {
            localStorage.removeItem(API_KEYS_STORAGE_KEY);
        }
    }
}

function applyRuntimeModeUI() {
    const mode = getRuntimeMode();
    const openaiInput = document.getElementById("set-openai-api-key");
    const elevenlabsInput = document.getElementById("set-elevenlabs-api-key");
    const warningBanner = document.querySelector(".local-api-warning");
    const settingsHelp = document.querySelector(".settings-help");

    if (mode === "public") {
        if (openaiInput) {
            openaiInput.disabled = true;
            openaiInput.type = "text";
            openaiInput.value = "[공개 배포 모드 - 브라우저 직접 호출 차단됨]";
            openaiInput.placeholder = "공개 배포 모드에서는 사용할 수 없습니다.";
        }
        if (elevenlabsInput) {
            elevenlabsInput.disabled = true;
            elevenlabsInput.type = "text";
            elevenlabsInput.value = "[공개 배포 모드 - 브라우저 직접 호출 차단됨]";
            elevenlabsInput.placeholder = "공개 배포 모드에서는 사용할 수 없습니다.";
        }
        if (warningBanner) {
            warningBanner.innerText = "ℹ️ 공개 배포 모드 — 브라우저 직접 API 호출이 비활성화되어 있습니다. 실제 AI 기능을 사용하려면 서버리스 프록시를 연결해야 합니다.";
            warningBanner.style.background = "rgba(6, 182, 212, 0.1)";
            warningBanner.style.borderColor = "var(--secondary)";
            warningBanner.style.color = "var(--text-main)";
        }
        if (settingsHelp) {
            settingsHelp.innerText = "공개 배포 모드에서는 브라우저의 OpenAI 직접 호출이 차단됩니다. 이미지 및 TTS 생성을 사용하려면 서버리스 프록시가 필요합니다.";
        }
    } else {
        if (warningBanner) {
            warningBanner.innerText = "⚠️ 로컬 테스트 모드 — API 키가 브라우저에 저장됩니다. 이 사이트를 공개 배포하면 키가 노출될 수 있습니다.";
        }
    }
}

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    checkAndInitRuntimeMode();
    const isFirstRun = loadData();
    switchView('dashboard');
    setupFormListeners();
    if (isFirstRun) openOnboardingModal();
    applyRuntimeModeUI();
});

// Load Data from LocalStorage
function loadData() {
    const localData = localStorage.getItem("youtube_producer_hub_data");
    let isFirstRun = false;
    if (localData) {
        try {
            state = JSON.parse(localData);
        } catch (e) {
            console.error("Error parsing stored data, using an empty state instead", e);
            state = createEmptyState();
        }
    } else {
        state = createEmptyState();
        isFirstRun = true;
    }

    normalizeStateData();
    applyProfileToUI();
    if (localData) saveData();
    return isFirstRun;
}

function createEmptyState() {
    const emptyProfile = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    emptyProfile.channelName = "내 채널";
    emptyProfile.brandKeywords = [];
    emptyProfile.categories = [
        { value: "Education", label: "교육" },
        { value: "Entertainment", label: "엔터테인먼트" },
        { value: "Vlog", label: "브이로그" },
        { value: "Information", label: "정보" },
        { value: "Shorts", label: "쇼츠" }
    ];
    emptyProfile.powerWords = [];
    emptyProfile.descTemplate = "이 영상의 핵심 내용과 시청자가 얻을 수 있는 가치를 소개합니다.";
    emptyProfile.descCta = "영상이 도움이 되셨다면 구독과 좋아요, 알림 설정을 부탁드립니다.";
    return {
        ideas: [],
        scripts: [],
        videoProjects: [],
        activeScriptId: null,
        activeVideoProjectId: null,
        seoTitle: "",
        seoTags: [],
        dailyChecklist: [false, false, false, false, false],
        profile: emptyProfile
    };
}

function normalizeStateData() {
    if (!Array.isArray(state.ideas)) state.ideas = [];
    if (!Array.isArray(state.scripts)) state.scripts = [];
    if (!Array.isArray(state.videoProjects)) state.videoProjects = [];

    // Migrate old global seoTitle/seoTags if any
    if (state.scripts && state.scripts.length > 0) {
        if (state.seoTitle && !state.scripts[0].seoTitle) {
            state.scripts[0].seoTitle = state.seoTitle;
        }
        if (state.seoTags && state.seoTags.length > 0 && (!state.scripts[0].seoTags || state.scripts[0].seoTags.length === 0)) {
            state.scripts[0].seoTags = state.seoTags;
        }
    }

    // Ensure dailyChecklist exists
    if (!Array.isArray(state.dailyChecklist)) {
        state.dailyChecklist = [false, false, false, false, false];
    }

    // Ensure channel profile exists and has every key (merge with defaults for forward-compat)
    state.profile = Object.assign(JSON.parse(JSON.stringify(DEFAULT_PROFILE)), state.profile || {});
    if (!Array.isArray(state.profile.categories) || state.profile.categories.length === 0) {
        state.profile.categories = JSON.parse(JSON.stringify(DEFAULT_PROFILE.categories));
    }
    if (!Array.isArray(state.profile.brandKeywords)) state.profile.brandKeywords = [];
    if (!Array.isArray(state.profile.powerWords)) state.profile.powerWords = [];
    if (!Array.isArray(state.profile.scriptTemplates) || state.profile.scriptTemplates.length === 0) {
        state.profile.scriptTemplates = JSON.parse(JSON.stringify(DEFAULT_PROFILE.scriptTemplates));
    }
    state.profile.scriptTemplates = state.profile.scriptTemplates.filter(template => (
        template && template.id && template.name && Array.isArray(template.sections) && template.sections.length > 0
    ));
    if (state.profile.scriptTemplates.length === 0) {
        state.profile.scriptTemplates = JSON.parse(JSON.stringify(DEFAULT_PROFILE.scriptTemplates));
    }
    if (!getScriptTemplate(state.profile.defaultScriptTemplateId)) {
        state.profile.defaultScriptTemplateId = state.profile.scriptTemplates[0].id;
    }

    state.scripts.forEach(normalizeScript);
    state.videoProjects.forEach(normalizeVideoProject);
    
    if (state.scripts.length > 0 && !state.scripts.some(s => s.id === state.activeScriptId)) {
        state.activeScriptId = state.scripts[0].id;
    }
    if (state.scripts.length === 0) state.activeScriptId = null;

    if (state.videoProjects.length > 0 && !state.videoProjects.some(vp => vp.id === state.activeVideoProjectId)) {
        state.activeVideoProjectId = state.videoProjects[0].id;
    }
    if (state.videoProjects.length === 0) state.activeVideoProjectId = null;
}

function getScriptTemplate(templateId) {
    const templates = (state.profile && state.profile.scriptTemplates) || DEFAULT_PROFILE.scriptTemplates;
    return templates.find(template => template.id === templateId) || templates[0];
}

function normalizeScript(script) {
    if (!script.prompts) script.prompts = [];
    if (script.seoTitle === undefined) script.seoTitle = "";
    if (!script.seoTags) script.seoTags = [];
    const templates = state.profile.scriptTemplates;
    const legacyTemplate = templates.find(template => template.id === "longform");
    if (!script.templateId || !templates.some(template => template.id === script.templateId)) {
        script.templateId = legacyTemplate ? legacyTemplate.id : state.profile.defaultScriptTemplateId;
    }
    if (!script.sections || typeof script.sections !== "object" || Array.isArray(script.sections)) script.sections = {};

    const legacyKeys = ["intro", "body1", "body2", "body3", "outro"];
    legacyKeys.forEach(key => {
        if (script.sections[key] === undefined) script.sections[key] = script[key] || "";
        if (script[key] === undefined) script[key] = script.sections[key] || "";
    });

    const template = getScriptTemplate(script.templateId);
    template.sections.forEach(section => {
        if (script.sections[section.key] === undefined) script.sections[section.key] = "";
    });
}

// Reflect profile into static UI chrome (sidebar identity + category dropdowns)
function applyProfileToUI() {
    const name = state.profile.channelName || "My Channel";
    const nameEl = document.querySelector(".profile-name");
    if (nameEl) nameEl.innerText = name;
    const imgEl = document.querySelector(".profile-img");
    if (imgEl) imgEl.innerText = name.trim().charAt(0) || "C";
    populateCategoryDropdowns();
}

// Fill the idea filter + new-idea modal category selects from the profile
function populateCategoryDropdowns() {
    const cats = state.profile.categories || [];

    const filter = document.getElementById("filter-category");
    if (filter) {
        const current = filter.value;
        filter.innerHTML = '<option value="all">모든 카테고리</option>';
        cats.forEach(c => {
            const o = document.createElement("option");
            o.value = c.value;
            o.innerText = c.label;
            filter.appendChild(o);
        });
        if (current) filter.value = current;
    }

    const modalSelect = document.getElementById("idea-category");
    if (modalSelect) {
        modalSelect.innerHTML = "";
        cats.forEach(c => {
            const o = document.createElement("option");
            o.value = c.value;
            o.innerText = c.label;
            modalSelect.appendChild(o);
        });
    }
}

// Look up a category's display label from its stored value
function categoryLabel(value) {
    const cat = (state.profile.categories || []).find(c => c.value === value);
    return cat ? cat.label : value;
}

// Save Data to LocalStorage
function saveData() {
    localStorage.setItem("youtube_producer_hub_data", JSON.stringify(state));
    updateGlobalStats();
}

// Toast Notification
let toastTimeout;
function showToast(message = "저장됨 ✓") {
    const toast = document.getElementById("toast-notification");
    toast.innerText = message;
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
    }, 2000);
}

// Global Stats Calculator
function updateGlobalStats() {
    // Total Ideas
    document.getElementById("stat-ideas-count").innerText = state.ideas.length;

    // Total Scripts
    const scriptingCount = state.scripts.filter(s => s.status !== "Completed").length;
    document.getElementById("stat-scripts-count").innerText = scriptingCount;

    // Total Completed
    const completedCount = state.scripts.filter(s => s.status === "Completed").length;
    document.getElementById("stat-complete-count").innerText = completedCount;

    // Total speaking duration
    let totalChars = 0;
    state.scripts.forEach(s => {
        totalChars += getScriptSections(s).reduce((sum, section) => sum + (s.sections[section.key] || "").length, 0);
    });
    document.getElementById("stat-duration-count").innerText = calculateEstTime(totalChars);
}

function getScriptSections(script) {
    return getScriptTemplate(script && script.templateId).sections;
}

// Format Estimated Duration
function calculateEstTime(chars) {
    if (!chars) return "0:00";
    // Speech rate is configurable per channel (default Korean ~300 chars/min)
    const rate = (state.profile && state.profile.speechRate) || 300;
    const totalSeconds = Math.round((chars / rate) * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// View Switching
function switchView(viewId) {
    // Toggle active link class in sidebar
    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });
    document.getElementById(`nav-${viewId}`).classList.add("active");

    // Toggle active view container
    document.querySelectorAll(".page-container").forEach(view => {
        view.classList.remove("active");
    });
    document.getElementById(`view-${viewId}`).classList.add("active");

    // Update Header title
    const titles = {
        dashboard: "대시보드 개요",
        ideas: "아이디어 브레인스토밍 보드",
        editor: "스크립트 라이팅 에디터",
        seo: "SEO 메타데이터 플래너",
        "auto-prod": "동영상 자동 제작 (MVP)",
        settings: "채널 프로필 설정"
    };
    document.getElementById("page-title").innerText = titles[viewId];

    // Trigger specific rendering depending on view
    if (viewId === 'dashboard') {
        renderPipeline();
        renderDailyChecklist();
    } else if (viewId === 'ideas') {
        renderIdeas();
    } else if (viewId === 'editor') {
        populateScriptSelector();
        loadActiveScript();
    } else if (viewId === 'seo') {
        populateSeoScriptSelector();
        loadActiveSeoScript();
    } else if (viewId === 'auto-prod') {
        populateAutoProjectSelector();
        loadActiveVideoProject();
    } else if (viewId === 'settings') {
        renderSettings();
    }
}

/* ==========================================================================
   Dashboard Pipeline & Checklist Logic
   ========================================================================== */
function renderPipeline() {
    const pipelineContainer = document.getElementById("dashboard-pipeline");
    pipelineContainer.innerHTML = "";

    // List all scripts from oldest to newest or modified
    if (state.scripts.length === 0) {
        pipelineContainer.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                <p>작성된 대본이 없습니다. 아이디어 보드에서 시작하거나 에디터에서 새로 추가해보세요!</p>
            </div>
        `;
        return;
    }

    state.scripts.forEach(script => {
        // Calculate progress percentage based on checklist (7 items)
        const completedChecks = (script.checklist || []).filter(c => c).length;
        const progressPercent = Math.round((completedChecks / 7) * 100);

        let statusText = "초고 작성";
        let badgeClass = "status-scripting";
        if (script.status === "Recording") { statusText = "낭독 녹음"; badgeClass = "status-recording"; }
        else if (script.status === "Editing") { statusText = "영상 편집"; badgeClass = "status-editing"; }
        else if (script.status === "Completed") { statusText = "제작 완료"; badgeClass = "status-completed"; }

        const pipelineItem = document.createElement("div");
        pipelineItem.className = "pipeline-item";
        pipelineItem.innerHTML = `
            <div class="pipeline-info">
                <span class="pipeline-title">${escapeHTML(script.title)}</span>
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                    <span class="status-badge ${badgeClass}">${statusText}</span>
                    <span class="pipeline-tag">${calculateEstTime(getScriptCharCount(script))}</span>
                </div>
            </div>
            <div class="pipeline-progress-container">
                <div class="pipeline-progress-label">
                    <span>진행도</span>
                    <span>${progressPercent}%</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="editScript('${script.id}')">에디터 열기</button>
            </div>
        `;
        pipelineContainer.appendChild(pipelineItem);
    });
}

function renderDailyChecklist() {
    if (!state.dailyChecklist) {
        state.dailyChecklist = [false, false, false, false, false];
    }
    const items = document.querySelectorAll("#view-dashboard .checklist-container .checklist-item");
    items.forEach((item, idx) => {
        if (state.dailyChecklist[idx]) {
            item.classList.add("checked");
        } else {
            item.classList.remove("checked");
        }
    });
}

function editScript(scriptId) {
    state.activeScriptId = scriptId;
    saveData();
    switchView('editor');
}

function getScriptCharCount(script) {
    return getScriptSections(script).reduce((sum, section) => sum + (script.sections[section.key] || "").length, 0);
}

function toggleQuickCheck(element) {
    const idx = parseInt(element.getAttribute("data-idx"));
    element.classList.toggle("checked");
    
    if (!state.dailyChecklist) {
        state.dailyChecklist = [false, false, false, false, false];
    }
    state.dailyChecklist[idx] = element.classList.contains("checked");
    
    saveData();
    showToast();
}

/* ==========================================================================
   Idea Board Logic
   ========================================================================== */
function renderIdeas() {
    const grid = document.getElementById("ideas-grid-container");
    grid.innerHTML = "";

    const searchQuery = document.getElementById("search-ideas").value.toLowerCase();
    const filterCategory = document.getElementById("filter-category").value;
    const filterDifficulty = document.getElementById("filter-difficulty").value;

    const filtered = state.ideas.filter(idea => {
        const matchesSearch = idea.title.toLowerCase().includes(searchQuery) || idea.desc.toLowerCase().includes(searchQuery);
        const matchesCategory = filterCategory === "all" || idea.category === filterCategory;
        const matchesDifficulty = filterDifficulty === "all" || idea.difficulty === filterDifficulty;
        return matchesSearch && matchesCategory && matchesDifficulty;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; min-height: 250px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                <p>일치하는 아이디어가 없습니다. 새로운 자극을 위해 새로운 아이디어를 추가해 보세요.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(idea => {
        const card = document.createElement("div");
        card.className = "card idea-card";
        
        let diffText = "보통";
        if (idea.difficulty === "Easy") diffText = "쉬움";
        else if (idea.difficulty === "Hard") diffText = "어려움";

        const categoryText = categoryLabel(idea.category);

        card.innerHTML = `
            <div class="idea-meta">
                <span class="tag-pill">${escapeHTML(categoryText)}</span>
                <span class="difficulty-pill difficulty-${idea.difficulty.toLowerCase()}">${diffText}</span>
            </div>
            <h3>${escapeHTML(idea.title)}</h3>
            <p class="idea-desc">${escapeHTML(idea.desc)}</p>
            <div class="idea-actions">
                <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; border-color: rgba(239, 68, 68, 0.2); color: #fca5a5;" onclick="deleteIdea('${idea.id}')">삭제</button>
                <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="convertToScript('${idea.id}')">대본 변환</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function deleteIdea(id) {
    if (confirm("정말로 이 아이디어를 삭제하시겠습니까?")) {
        state.ideas = state.ideas.filter(idea => idea.id !== id);
        saveData();
        renderIdeas();
        showToast("아이디어 삭제됨");
    }
}

function convertToScript(ideaId) {
    const idea = state.ideas.find(i => i.id === ideaId);
    if (!idea) return;

    // Create a new script based on this idea
    const newScript = {
        id: "script-" + Date.now(),
        title: idea.title,
        status: "Drafting",
        intro: `[인트로] ${idea.title}에 관한 이야기를 소개합니다.`,
        body1: `[본론 1] ${idea.desc}`,
        body2: "",
        body3: "",
        outro: "[아웃트로] 오늘의 깨달음과 구독 안내.",
        checklist: [false, false, false, false, false, false, false],
        prompts: [],
        seoTitle: idea.title,
        seoTags: [],
        createdAt: new Date().toISOString()
    };

    state.scripts.push(newScript);
    
    // Remove from ideas board since it is now in active production
    state.ideas = state.ideas.filter(i => i.id !== ideaId);
    state.activeScriptId = newScript.id;
    
    saveData();
    showToast("대본 생성됨 ✓");
    alert("아이디어가 대본 제작 리스트로 변환되었습니다. 에디터로 이동합니다!");
    switchView('editor');
}

// Modal handling
function openNewIdeaModal() {
    document.getElementById("new-idea-modal").classList.add("active");
}

function closeNewIdeaModal() {
    document.getElementById("new-idea-modal").classList.remove("active");
    document.getElementById("new-idea-form").reset();
}

function setupFormListeners() {
    const form = document.getElementById("new-idea-form");
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = document.getElementById("idea-title").value;
        const desc = document.getElementById("idea-desc").value;
        const category = document.getElementById("idea-category").value;
        const difficulty = document.getElementById("idea-difficulty").value;

        const newIdea = {
            id: "idea-" + Date.now(),
            title,
            desc,
            category,
            difficulty,
            status: "idea",
            createdAt: new Date().toISOString()
        };

        state.ideas.unshift(newIdea);
        saveData();
        closeNewIdeaModal();
        renderIdeas();
        showToast("아이디어 추가됨 ✓");
    });
}

/* ==========================================================================
   Script Editor Logic
   ========================================================================== */
function populateScriptSelector() {
    const select = document.getElementById("active-script-select");
    select.innerHTML = "";

    if (state.scripts.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.innerText = "작성 가능한 스크립트 없음";
        select.appendChild(option);
        return;
    }

    state.scripts.forEach(script => {
        const option = document.createElement("option");
        option.value = script.id;
        option.innerText = script.title;
        if (script.id === state.activeScriptId) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function loadActiveScript() {
    const select = document.getElementById("active-script-select");
    const activeId = select.value;
    
    if (!activeId) {
        clearEditorFields();
        return;
    }

    state.activeScriptId = activeId;
    const script = state.scripts.find(s => s.id === activeId);
    if (!script) return;

    // Fill elements
    document.getElementById("script-title-input").value = script.title || "";
    document.getElementById("script-status-select").value = script.status || "Drafting";
    renderScriptTemplateSelector(script);
    renderScriptSections(script);

    // Sync Checklist
    const listItems = document.querySelectorAll("#script-asset-checklist .checklist-item");
    const scriptChecklist = script.checklist || [false, false, false, false, false, false, false];
    listItems.forEach((item, idx) => {
        if (scriptChecklist[idx]) {
            item.classList.add("checked");
        } else {
            item.classList.remove("checked");
        }
    });

    calculateScriptMetrics();
    renderSavedPrompts();
    saveData();
}

function createNewScript() {
    const templateId = state.profile.defaultScriptTemplateId || getScriptTemplate().id;
    const template = getScriptTemplate(templateId);
    const sections = {};
    template.sections.forEach(section => { sections[section.key] = ""; });
    const newScript = {
        id: "script-" + Date.now(),
        title: "새로운 대본 " + (state.scripts.length + 1),
        status: "Drafting",
        templateId,
        sections,
        intro: "",
        body1: "",
        body2: "",
        body3: "",
        outro: "",
        checklist: [false, false, false, false, false, false, false],
        prompts: [],
        seoTitle: "",
        seoTags: [],
        createdAt: new Date().toISOString()
    };
    state.scripts.push(newScript);
    state.activeScriptId = newScript.id;
    
    saveData();
    populateScriptSelector();
    loadActiveScript();
    showToast("새 대본이 생성되었습니다 ✓");
}

function clearEditorFields() {
    document.getElementById("script-title-input").value = "";
    document.getElementById("script-sections-container").innerHTML = '<div class="empty-state compact-empty">대본을 선택하거나 새로 만들어 주세요.</div>';
    document.getElementById("prompt-section-select").innerHTML = "";
    document.getElementById("script-template-select").innerHTML = "";
    document.getElementById("script-total-words").innerText = "0";
    document.getElementById("script-est-time").innerText = "0:00";
    document.getElementById("ai-prompt-output").value = "";
    document.getElementById("saved-prompts-list").innerHTML = "";
}

function saveCurrentScriptData() {
    const activeId = state.activeScriptId;
    if (!activeId) return;

    const script = state.scripts.find(s => s.id === activeId);
    if (!script) return;

    script.title = document.getElementById("script-title-input").value;
    script.status = document.getElementById("script-status-select").value;
    getScriptSections(script).forEach(section => {
        const input = document.getElementById(`script-section-${section.key}`);
        if (input) script.sections[section.key] = input.value;
    });
    syncLegacyScriptFields(script);

    calculateScriptMetrics();
    saveData();

    // Dynamically update dropdown selector option text
    const select = document.getElementById("active-script-select");
    const activeOption = select.options[select.selectedIndex];
    if (activeOption) {
        activeOption.innerText = script.title || "제목 없는 스크립트";
    }
}

function syncLegacyScriptFields(script) {
    ["intro", "body1", "body2", "body3", "outro"].forEach(key => {
        script[key] = script.sections[key] || "";
    });
}

function renderScriptTemplateSelector(script) {
    const select = document.getElementById("script-template-select");
    select.innerHTML = "";
    state.profile.scriptTemplates.forEach(template => {
        const option = document.createElement("option");
        option.value = template.id;
        option.innerText = template.name;
        option.selected = template.id === script.templateId;
        select.appendChild(option);
    });
}

function changeScriptTemplate() {
    const script = state.scripts.find(s => s.id === state.activeScriptId);
    if (!script) return;
    const selectedId = document.getElementById("script-template-select").value;
    if (!getScriptTemplate(selectedId)) return;
    script.templateId = selectedId;
    normalizeScript(script);
    saveData();
    renderScriptSections(script);
    calculateScriptMetrics();
    showToast("대본 구성 변경됨 ✓");
}

function renderScriptSections(script) {
    const container = document.getElementById("script-sections-container");
    const promptSelect = document.getElementById("prompt-section-select");
    container.innerHTML = "";
    promptSelect.innerHTML = "";

    getScriptSections(script).forEach(section => {
        const block = document.createElement("div");
        block.className = "section-editor-block";
        block.innerHTML = `
            <div class="section-header">
                <span class="section-title">${escapeHTML(section.label)}</span>
                <span class="section-word-count" id="wc-${escapeHTML(section.key)}">0 자</span>
            </div>
            <textarea id="script-section-${escapeHTML(section.key)}" class="script-textarea" data-section-key="${escapeHTML(section.key)}" placeholder="${escapeHTML(section.placeholder || "내용을 작성하세요...")}" oninput="saveCurrentScriptData()"></textarea>
        `;
        container.appendChild(block);
        block.querySelector("textarea").value = script.sections[section.key] || "";

        const option = document.createElement("option");
        option.value = section.key;
        option.innerText = section.label;
        promptSelect.appendChild(option);
    });
}

function updateScriptStatus() {
    saveCurrentScriptData();
    showToast("상태 저장됨");
}

function calculateScriptMetrics() {
    const script = state.scripts.find(s => s.id === state.activeScriptId);
    let totalChars = 0;
    if (script) {
        getScriptSections(script).forEach(section => {
            const input = document.getElementById(`script-section-${section.key}`);
            const count = input ? input.value.length : (script.sections[section.key] || "").length;
            const countEl = document.getElementById(`wc-${section.key}`);
            if (countEl) countEl.innerText = count + " 자";
            totalChars += count;
        });
    }
    document.getElementById("script-total-words").innerText = totalChars.toLocaleString();
    document.getElementById("script-est-time").innerText = calculateEstTime(totalChars);
}

function toggleAssetCheck(element) {
    const idx = parseInt(element.getAttribute("data-idx"));
    const activeId = state.activeScriptId;
    if (!activeId) return;

    const script = state.scripts.find(s => s.id === activeId);
    if (!script) return;

    if (!script.checklist) {
        script.checklist = [false, false, false, false, false, false, false];
    }

    element.classList.toggle("checked");
    script.checklist[idx] = element.classList.contains("checked");

    saveData();
    showToast();
}

// AI Prompt Generation Helper based on script theme
function generatePrompt() {
    const activeId = state.activeScriptId;
    if (!activeId) {
        alert("작성 중인 활성 대본이 없습니다.");
        return;
    }
    const script = state.scripts.find(s => s.id === activeId);
    if (!script) return;

    const sectionKey = document.getElementById("prompt-section-select").value;
    const sectionText = (script.sections[sectionKey] || "").trim();

    if (!sectionText) {
        alert("선택한 섹션의 내용이 비어있습니다. 에디터에서 대본 내용을 먼저 입력해 주세요.");
        return;
    }

    // Take a concise excerpt of the section as the scene description
    const excerpt = sectionText.replace(/\s+/g, " ").slice(0, 120);

    // Fill the user-defined template. {{title}} and {{content}} are the supported tokens.
    const template = (state.profile && state.profile.promptTemplate) || DEFAULT_PROFILE.promptTemplate;
    const midjourneyPrompt = template
        .replace(/\{\{\s*title\s*\}\}/g, script.title || "")
        .replace(/\{\{\s*content\s*\}\}/g, excerpt);

    document.getElementById("ai-prompt-output").value = midjourneyPrompt;
}

function saveGeneratedPrompt() {
    const activeId = state.activeScriptId;
    if (!activeId) return;
    const script = state.scripts.find(s => s.id === activeId);
    if (!script) return;

    const textarea = document.getElementById("ai-prompt-output");
    const promptText = textarea.value.trim();

    if (!promptText) {
        alert("저장할 프롬프트가 없습니다. 먼저 프롬프트를 생성해 주세요.");
        return;
    }

    const sectionSelect = document.getElementById("prompt-section-select");
    const sectionValue = sectionSelect.value;
    const sectionText = sectionSelect.options[sectionSelect.selectedIndex].text;

    if (!script.prompts) {
        script.prompts = [];
    }

    const newPrompt = {
        id: "prompt-" + Date.now(),
        section: sectionValue,
        sectionLabel: sectionText,
        text: promptText,
        done: false
    };

    script.prompts.push(newPrompt);
    textarea.value = "";
    
    saveData();
    renderSavedPrompts();
    showToast("프롬프트 저장됨 ✓");
}

function renderSavedPrompts() {
    const activeId = state.activeScriptId;
    if (!activeId) return;
    const script = state.scripts.find(s => s.id === activeId);
    const container = document.getElementById("saved-prompts-list");
    container.innerHTML = "";

    if (!script || !script.prompts || script.prompts.length === 0) {
        container.innerHTML = `
            <div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 12px; border: 1px dashed var(--border-color); border-radius: 8px;">
                저장된 프롬프트가 없습니다.
            </div>
        `;
        return;
    }

    script.prompts.forEach(prompt => {
        const item = document.createElement("div");
        item.className = "saved-prompt-item";
        item.style.cssText = "background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px;";
        
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="tag-pill" style="font-size: 0.65rem;">${escapeHTML(prompt.sectionLabel)}</span>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="btn-icon" style="padding: 4px;" onclick="togglePromptDone('${prompt.id}')" title="${prompt.done ? '미완료로 표시' : '완료로 표시'}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${prompt.done ? 'var(--success)' : 'var(--text-muted)'}" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                    <button class="btn-icon" style="padding: 4px;" onclick="copySavedPromptText('${prompt.id}')" title="복사">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                    <button class="btn-icon" style="padding: 4px; color: var(--danger);" onclick="deleteSavedPrompt('${prompt.id}')" title="삭제">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>
            <div style="font-size: 0.8rem; color: ${prompt.done ? 'var(--text-muted)' : 'var(--text-main)'}; text-decoration: ${prompt.done ? 'line-through' : 'none'}; word-break: break-all; max-height: 60px; overflow-y: auto; background: var(--bg-input); padding: 6px; border-radius: 4px; font-family: monospace;">
                ${escapeHTML(prompt.text)}
            </div>
        `;
        container.appendChild(item);
    });
}

function togglePromptDone(promptId) {
    const activeId = state.activeScriptId;
    if (!activeId) return;
    const script = state.scripts.find(s => s.id === activeId);
    if (!script || !script.prompts) return;

    const prompt = script.prompts.find(p => p.id === promptId);
    if (prompt) {
        prompt.done = !prompt.done;
        saveData();
        renderSavedPrompts();
        showToast();
    }
}

function copySavedPromptText(promptId) {
    const activeId = state.activeScriptId;
    if (!activeId) return;
    const script = state.scripts.find(s => s.id === activeId);
    if (!script || !script.prompts) return;

    const prompt = script.prompts.find(p => p.id === promptId);
    if (prompt) {
        navigator.clipboard.writeText(prompt.text).then(() => {
            alert("미드저니 프롬프트가 복사되었습니다!");
        });
    }
}

function deleteSavedPrompt(promptId) {
    const activeId = state.activeScriptId;
    if (!activeId) return;
    const script = state.scripts.find(s => s.id === activeId);
    if (!script || !script.prompts) return;

    script.prompts = script.prompts.filter(p => p.id !== promptId);
    saveData();
    renderSavedPrompts();
    showToast("프롬프트 삭제됨");
}

/* ==========================================================================
   SEO & Metadata Logic
   ========================================================================== */
function populateSeoScriptSelector() {
    const select = document.getElementById("seo-script-select");
    select.innerHTML = "";

    if (state.scripts.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.innerText = "대상 영상 없음";
        select.appendChild(option);
        return;
    }

    state.scripts.forEach(script => {
        const option = document.createElement("option");
        option.value = script.id;
        option.innerText = script.title;
        if (script.id === state.activeScriptId) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function loadActiveSeoScript() {
    const select = document.getElementById("seo-script-select");
    const activeId = select.value;
    
    if (!activeId) {
        document.getElementById('seo-title-input').value = "";
        document.getElementById("seo-tags-list").innerHTML = "";
        document.getElementById("seo-score-value").innerText = "0";
        document.getElementById("seo-desc-output").value = "";
        return;
    }

    state.activeScriptId = activeId;
    saveData();

    const script = state.scripts.find(s => s.id === activeId);
    if (!script) return;

    document.getElementById('seo-title-input').value = script.seoTitle || "";
    renderTags();
    analyzeSeoTitle();
    generateDescriptionTemplate();
}

function analyzeSeoTitle() {
    const activeId = state.activeScriptId;
    const script = state.scripts.find(s => s.id === activeId);
    if (!script) return;

    const titleInput = document.getElementById("seo-title-input");
    const titleText = titleInput.value;
    script.seoTitle = titleText;
    saveData();

    // Char count update
    document.getElementById("title-char-count").innerText = `${titleText.length} / 70 자`;

    const analysisContainer = document.getElementById("seo-title-analysis");
    analysisContainer.innerHTML = "";

    const checks = [
        {
            name: "길이 최적화 (50~70자 사이 권장)",
            valid: titleText.length >= 25 && titleText.length <= 70,
            feedback: titleText.length < 25 ? "너무 짧습니다. 조금 더 구체적으로 작성하세요." : (titleText.length > 70 ? "길이가 너무 깁니다. 모바일 화면에서 제목이 짤릴 수 있습니다." : "적절한 글자수 범위에 부합합니다.")
        },
        {
            name: "핵심 정보/감정 유도 키워드 탑재",
            valid: checkPowerWords(titleText),
            feedback: `시청자의 이목을 끌 수 있는 핵심 단어(${(state.profile.powerWords || []).slice(0, 5).join(", ") || "설정에서 등록"})가 들어가면 노출도와 클릭율이 오릅니다.`
        },
        {
            name: `채널 브랜드 키워드 포함`,
            valid: (state.profile.brandKeywords || []).some(k => k && titleText.includes(k)),
            feedback: `검색 및 브랜딩을 위해 채널 고유 키워드(${(state.profile.brandKeywords || []).join(", ") || "설정에서 등록"})를 포함하는 것을 추천합니다.`
        }
    ];

    let score = 0;
    checks.forEach(check => {
        if (check.valid) score += 25;
        const item = document.createElement("div");
        item.className = `checklist-item ${check.valid ? 'checked' : ''}`;
        item.innerHTML = `
            <div class="checklist-checkbox">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div style="display: flex; flex-direction: column;">
                <span class="checklist-label" style="${check.valid ? 'text-decoration: none; opacity: 1;' : ''}">${check.name}</span>
                <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${check.feedback}</span>
            </div>
        `;
        analysisContainer.appendChild(item);
    });

    // Score from tags count
    const tagScore = Math.min((script.seoTags || []).length * 2.5, 25);
    score += tagScore;

    // Final SEO Score
    const finalScore = Math.min(Math.round(score + 25), 100); // base points 25
    document.getElementById("seo-score-value").innerText = finalScore;
    
    // Comment
    let comment = "조금 더 최적화가 필요합니다.";
    if (finalScore >= 85) comment = "우수한 유튜브 SEO 최적화 상태입니다!";
    else if (finalScore >= 60) comment = "기본적인 구성을 갖췄습니다. 키워드를 보강하세요.";
    document.getElementById("seo-score-comment").innerText = comment;
}

function checkPowerWords(title) {
    const powerWords = (state.profile && state.profile.powerWords) || [];
    return powerWords.some(word => word && title.includes(word));
}

// Tag Management
function renderTags() {
    const activeId = state.activeScriptId;
    const script = state.scripts.find(s => s.id === activeId);
    const tagsContainer = document.getElementById("seo-tags-list");
    tagsContainer.innerHTML = "";

    if (!script) return;
    if (!script.seoTags) script.seoTags = [];

    script.seoTags.forEach((tag, idx) => {
        const chip = document.createElement("div");
        chip.className = "tag-chip";
        chip.innerHTML = `
            <span>#${tag}</span>
            <svg onclick="removeTag(${idx})" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        `;
        tagsContainer.appendChild(chip);
    });
}

function handleTagInput(event) {
    if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        const activeId = state.activeScriptId;
        const script = state.scripts.find(s => s.id === activeId);
        if (!script) return;
        if (!script.seoTags) script.seoTags = [];

        const input = document.getElementById("seo-tag-input");
        const val = input.value.trim().replace(/,/g, "");
        
        if (val && !script.seoTags.includes(val)) {
            script.seoTags.push(val);
            saveData();
            renderTags();
            analyzeSeoTitle();
            generateDescriptionTemplate();
            input.value = "";
            showToast("태그 추가됨");
        }
    }
}

function removeTag(idx) {
    const activeId = state.activeScriptId;
    const script = state.scripts.find(s => s.id === activeId);
    if (!script) return;
    if (!script.seoTags) script.seoTags = [];

    script.seoTags.splice(idx, 1);
    saveData();
    renderTags();
    analyzeSeoTitle();
    generateDescriptionTemplate();
    showToast("태그 제거됨");
}

function copyAllTags() {
    const activeId = state.activeScriptId;
    const script = state.scripts.find(s => s.id === activeId);
    if (!script || !script.seoTags || script.seoTags.length === 0) {
        alert("태그가 비어 있습니다.");
        return;
    }
    const tagsString = script.seoTags.join(", ");
    navigator.clipboard.writeText(tagsString).then(() => {
        alert("유튜브 형식의 쉼표 태그들이 복사되었습니다!");
    });
}

// Description Generator
function generateDescriptionTemplate() {
    const descArea = document.getElementById("seo-desc-output");
    const activeId = state.activeScriptId;
    const script = state.scripts.find(s => s.id === activeId);
    
    if (!script) {
        descArea.value = "대본을 선택하거나 새로 작성하세요.";
        return;
    }

    const title = script.seoTitle || script.title || "[여기에 영상 제목이 노출됩니다]";
    const tagsHash = (script.seoTags || []).map(t => `#${t}`).join(" ");

    // Speaking speed is configurable per channel (chars per minute)
    const rate = (state.profile && state.profile.speechRate) || 300;

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const bodyText = (state.profile && state.profile.descTemplate) || DEFAULT_PROFILE.descTemplate;
    const ctaText = (state.profile && state.profile.descCta) || DEFAULT_PROFILE.descCta;
    let elapsedSeconds = 0;
    const timeline = getScriptSections(script).map(section => {
        const line = `${formatTime(elapsedSeconds)} - ${section.label}`;
        elapsedSeconds += Math.round(((script.sections[section.key] || "").length / rate) * 60);
        return line;
    }).join("\n");

    const template = `${title}

${bodyText}

[타임라인]
${timeline}

${ctaText}

- 관련 해시태그
${tagsHash}
`;
    descArea.value = template;
}

function copyDescription() {
    const desc = document.getElementById("seo-desc-output").value;
    navigator.clipboard.writeText(desc).then(() => {
        alert("설명 본문 템플릿이 복사되었습니다!");
    });
}

/* ==========================================================================
   Channel Profile (Settings) Logic
   ========================================================================== */
function renderSettings() {
    const p = state.profile;
    const apiKeys = loadApiKeys();
    document.getElementById("set-channel-name").value = p.channelName || "";
    document.getElementById("set-speech-rate").value = p.speechRate || 300;
    document.getElementById("set-brand-keywords").value = (p.brandKeywords || []).join(", ");
    document.getElementById("set-power-words").value = (p.powerWords || []).join(", ");
    document.getElementById("set-desc-template").value = p.descTemplate || "";
    document.getElementById("set-desc-cta").value = p.descCta || "";
    document.getElementById("set-prompt-template").value = p.promptTemplate || "";
    if (getRuntimeMode() === "public") {
        document.getElementById("set-openai-api-key").value = "[공개 배포 모드 - 브라우저 직접 호출 차단됨]";
        document.getElementById("set-elevenlabs-api-key").value = "[공개 배포 모드 - 브라우저 직접 호출 차단됨]";
    } else {
        document.getElementById("set-openai-api-key").value = apiKeys.openai;
        document.getElementById("set-elevenlabs-api-key").value = apiKeys.elevenLabs;
    }
    document.getElementById("set-image-model").value = p.imageModel || DEFAULT_PROFILE.imageModel;
    document.getElementById("set-tts-provider").value = p.ttsProvider || DEFAULT_PROFILE.ttsProvider;
    document.getElementById("set-tts-model").value = p.ttsModel || DEFAULT_PROFILE.ttsModel;
    document.getElementById("set-tts-voice").value = p.ttsVoice || DEFAULT_PROFILE.ttsVoice;
    document.getElementById("set-tts-instructions").value = p.ttsInstructions || "";
    document.getElementById("set-elevenlabs-voice-id").value = p.elevenLabsVoiceId || "";
    toggleTtsProviderFields();
    renderSettingsCategories();
    renderSettingsScriptTemplates();
}

function renderSettingsScriptTemplates() {
    const select = document.getElementById("set-default-script-template");
    select.innerHTML = "";
    state.profile.scriptTemplates.forEach(template => {
        const option = document.createElement("option");
        option.value = template.id;
        option.innerText = template.name;
        option.selected = template.id === state.profile.defaultScriptTemplateId;
        select.appendChild(option);
    });
    renderTemplateSectionLabels();
}

function renderTemplateSectionLabels() {
    const templateId = document.getElementById("set-default-script-template").value;
    const template = getScriptTemplate(templateId);
    const container = document.getElementById("set-template-sections-list");
    container.innerHTML = "";
    template.sections.forEach(section => {
        const row = document.createElement("div");
        row.className = "template-section-row";
        row.innerHTML = `
            <code>${escapeHTML(section.key)}</code>
            <input type="text" class="input-field template-label-input" data-template-id="${escapeHTML(template.id)}" data-section-key="${escapeHTML(section.key)}" value="${escapeHTML(section.label)}" aria-label="${escapeHTML(section.key)} 섹션 라벨">
        `;
        container.appendChild(row);
    });
}

function applyTemplateLabelInputs() {
    document.querySelectorAll(".template-label-input").forEach(input => {
        const template = getScriptTemplate(input.dataset.templateId);
        const section = template.sections.find(item => item.key === input.dataset.sectionKey);
        if (section && input.value.trim()) section.label = input.value.trim();
    });
}

function handleSettingsTemplateChange() {
    applyTemplateLabelInputs();
    renderTemplateSectionLabels();
}

function renderSettingsCategories() {
    const container = document.getElementById("set-categories-list");
    if (!container) return;
    container.innerHTML = "";
    (state.profile.categories || []).forEach((c, idx) => {
        const chip = document.createElement("div");
        chip.className = "tag-chip";
        chip.innerHTML = `
            <span>${escapeHTML(c.label)}</span>
            <svg onclick="removeSettingsCategory(${idx})" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        `;
        container.appendChild(chip);
    });
}

function addSettingsCategory() {
    const input = document.getElementById("set-category-input");
    const label = input.value.trim();
    if (!label) return;
    if (!state.profile.categories) state.profile.categories = [];
    if (state.profile.categories.some(c => c.label === label)) {
        alert("이미 있는 카테고리입니다.");
        return;
    }
    state.profile.categories.push({ value: "cat-" + Date.now(), label });
    input.value = "";
    saveData();
    renderSettingsCategories();
    populateCategoryDropdowns();
    showToast("카테고리 추가됨 ✓");
}

function handleCategoryInput(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        addSettingsCategory();
    }
}

function removeSettingsCategory(idx) {
    if (!state.profile.categories) return;
    state.profile.categories.splice(idx, 1);
    saveData();
    renderSettingsCategories();
    populateCategoryDropdowns();
    showToast("카테고리 제거됨");
}

function splitList(str) {
    return (str || "").split(",").map(s => s.trim()).filter(Boolean);
}

function saveProfile() {
    const p = state.profile;
    p.channelName = document.getElementById("set-channel-name").value.trim() || "My Channel";
    const rate = parseInt(document.getElementById("set-speech-rate").value, 10);
    p.speechRate = (rate && rate > 0) ? rate : 300;
    p.brandKeywords = splitList(document.getElementById("set-brand-keywords").value);
    p.powerWords = splitList(document.getElementById("set-power-words").value);
    p.descTemplate = document.getElementById("set-desc-template").value;
    p.descCta = document.getElementById("set-desc-cta").value;
    p.promptTemplate = document.getElementById("set-prompt-template").value.trim() || DEFAULT_PROFILE.promptTemplate;
    p.imageModel = document.getElementById("set-image-model").value.trim() || DEFAULT_PROFILE.imageModel;
    p.ttsProvider = document.getElementById("set-tts-provider").value || DEFAULT_PROFILE.ttsProvider;
    p.ttsModel = document.getElementById("set-tts-model").value.trim() || DEFAULT_PROFILE.ttsModel;
    p.ttsVoice = document.getElementById("set-tts-voice").value || DEFAULT_PROFILE.ttsVoice;
    p.ttsInstructions = document.getElementById("set-tts-instructions").value.trim();
    p.elevenLabsVoiceId = document.getElementById("set-elevenlabs-voice-id").value.trim();
    p.defaultScriptTemplateId = document.getElementById("set-default-script-template").value;
    applyTemplateLabelInputs();

    if (getRuntimeMode() !== "public") {
        saveApiKeys({
            openai: document.getElementById("set-openai-api-key").value,
            elevenLabs: document.getElementById("set-elevenlabs-api-key").value
        });
    }

    saveData();
    applyProfileToUI();
    const activeScript = state.scripts.find(s => s.id === state.activeScriptId);
    if (activeScript) renderScriptSections(activeScript);
    showToast("채널 프로필 저장됨 ✓");
}

function toggleTtsProviderFields() {
    const provider = document.getElementById("set-tts-provider").value;
    const openAiFields = document.getElementById("set-openai-tts-fields");
    const elevenLabsFields = document.getElementById("set-elevenlabs-tts-fields");
    if (openAiFields) openAiFields.style.display = provider === "openai" ? "block" : "none";
    if (elevenLabsFields) elevenLabsFields.style.display = provider === "elevenlabs" ? "block" : "none";
}

function openOnboardingModal() {
    document.getElementById("onboarding-modal").classList.add("active");
}

function chooseOnboarding(mode) {
    state = mode === "sample" ? JSON.parse(JSON.stringify(SAMPLE_DATA)) : createEmptyState();
    normalizeStateData();
    saveData();
    applyProfileToUI();
    document.getElementById("onboarding-modal").classList.remove("active");
    switchView(mode === "sample" ? "dashboard" : "settings");
    showToast(mode === "sample" ? "샘플 데이터로 시작합니다 ✓" : "빈 채널로 시작합니다 ✓");
}

function resetAllData() {
    if (!confirm("아이디어, 대본, SEO, 채널 설정을 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return;
    localStorage.removeItem("youtube_producer_hub_data");
    localStorage.removeItem(API_KEYS_STORAGE_KEY);
    state = createEmptyState();
    normalizeStateData();
    saveData();
    applyProfileToUI();
    switchView("settings");
    showToast("모든 데이터가 초기화되었습니다");
}

/* ==========================================================================
   Backup Import / Export Logic
   ========================================================================= */
function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 4));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `youtube_creator_studio_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("백업 파일 내보냄 ✓");
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedState = JSON.parse(e.target.result);
            
            // Simple validation to check structure
            if (importedState && Array.isArray(importedState.ideas) && Array.isArray(importedState.scripts)) {
                state = importedState;
                normalizeStateData();

                saveData();
                applyProfileToUI();
                
                // Re-render current active view
                const activeTab = document.querySelector(".nav-item.active");
                const viewId = activeTab ? activeTab.id.replace("nav-", "") : "dashboard";
                switchView(viewId);
                
                showToast("백업 가져오기 성공 ✓");
                alert("데이터 백업을 성공적으로 가져왔습니다!");
            } else {
                alert("올바르지 않은 백업 파일 형식입니다.");
            }
        } catch (err) {
            console.error(err);
            alert("파일 읽기 또는 파싱 중 오류가 발생했습니다.");
        }
    };
    reader.readAsText(file);
    event.target.value = ""; // Reset
}

// Helper to escape HTML tags to prevent XSS
function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

/* ========================================================================== 
   Auto Production View (MVP) Logic
   ========================================================================== */
class YphApiError extends Error {
    constructor(category, message, status = 0) {
        super(message);
        this.name = "YphApiError";
        this.category = category;
        this.status = status;
    }
}

function classifyApiResponseError(status, payload) {
    const detail = payload && payload.error ? (payload.error.message || payload.error.code || "") : "";
    const normalized = String(detail).toLowerCase();
    if (status === 401 || status === 402) {
        return new YphApiError("auth-billing", "인증 또는 결제 문제로 API 요청이 거절되었습니다. API 키와 결제 상태를 확인해 주세요.", status);
    }
    if (status === 403 || normalized.includes("verification") || normalized.includes("organization")) {
        return new YphApiError("access-verification", "모델 접근 권한이 없거나 조직 인증이 필요합니다. OpenAI 프로젝트와 조직 인증 상태를 확인해 주세요.", status);
    }
    if (status === 429) {
        return new YphApiError("rate-limit", "API 사용량 제한에 도달했습니다. 잠시 후 다시 시도하거나 사용 한도를 확인해 주세요.", status);
    }
    if (status === 400 && (normalized.includes("content policy") || normalized.includes("safety") || normalized.includes("moderation"))) {
        return new YphApiError("content-policy", "콘텐츠 정책에 의해 요청이 거절되었습니다. 장면 설명을 수정한 뒤 다시 시도해 주세요.", status);
    }
    return new YphApiError("network-cors", `네트워크, CORS 또는 API 서버 오류가 발생했습니다.${detail ? ` (${detail})` : ""}`, status);
}

function apiErrorMessage(error) {
    if (error && error.category === "public-mode-blocked") {
        return "공개 배포에서는 브라우저 직접 API 호출이 비활성화되어 있습니다. 실제 AI 기능을 사용하려면 서버리스 프록시를 연결해야 합니다.";
    }
    if (error && error.category === "missing-key") return "API 키 없음 — 설정 > AI 서비스 연동에서 OpenAI API 키를 저장해 주세요.";
    if (error && error.category === "auth-billing") return error.message;
    if (error && error.category === "access-verification") return error.message;
    if (error && error.category === "rate-limit") return error.message;
    if (error && error.category === "network-cors") return error.message;
    if (error && error.category === "content-policy") return error.message;
    if ((error && error.category === "cancelled") || (error && error.name === "AbortError")) return "사용자 취소 — 요청이 취소되었습니다.";
    return "네트워크, CORS 또는 API 응답을 확인할 수 없습니다. 로컬 HTTP 서버와 브라우저 콘솔을 확인해 주세요.";
}

async function generateSceneImageViaProxy({ prompt, size, model, signal }) {
    if (getRuntimeMode() === "public") {
        throw new YphApiError("public-mode-blocked", "Public mode direct API call blocked.");
    }
    // LOCAL TEST MODE: replace body with serverless proxy call for production
    const apiKey = loadApiKeys().openai;
    if (!apiKey) throw new YphApiError("missing-key", "OpenAI API key is missing.");
    try {
        const response = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ model, prompt, size, n: 1 }),
            signal
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw classifyApiResponseError(response.status, payload);
        const base64 = payload && payload.data && payload.data[0] && payload.data[0].b64_json;
        if (!base64) throw new YphApiError("network-cors", "API 응답에 b64_json 이미지 데이터가 없습니다.", response.status);
        return `data:image/png;base64,${base64}`;
    } catch (error) {
        if (signal && signal.aborted) throw new YphApiError("cancelled", "Image request cancelled.");
        if (error instanceof YphApiError) throw error;
        throw new YphApiError("network-cors", "네트워크 또는 CORS 오류로 이미지 API에 연결하지 못했습니다.");
    }
}

function generateNarrationViaElevenLabsStub() {
    throw new YphApiError("access-verification", "ElevenLabs 연동은 1차 범위에서 준비되지 않았습니다. TTS 제공자를 OpenAI로 선택해 주세요.");
}

async function generateNarrationViaProxy({ text, model, voice, instructions, format, signal }) {
    if (getRuntimeMode() === "public") {
        throw new YphApiError("public-mode-blocked", "Public mode direct API call blocked.");
    }
    // LOCAL TEST MODE: replace body with serverless proxy call for production
    if ((state.profile.ttsProvider || "openai") === "elevenlabs") {
        return generateNarrationViaElevenLabsStub();
    }
    const apiKey = loadApiKeys().openai;
    if (!apiKey) throw new YphApiError("missing-key", "OpenAI API key is missing.");
    const body = {
        model,
        voice,
        input: text,
        response_format: format
    };
    if (instructions) body.instructions = instructions;
    try {
        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body),
            signal
        });
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw classifyApiResponseError(response.status, payload);
        }
        return await response.arrayBuffer();
    } catch (error) {
        if (signal && signal.aborted) throw new YphApiError("cancelled", "Narration request cancelled.");
        if (error instanceof YphApiError) throw error;
        throw new YphApiError("network-cors", "네트워크 또는 CORS 오류로 TTS API에 연결하지 못했습니다.");
    }
}

let apCurrentTime = 0;
let apIsPlaying = false;
let apLastTickTime = 0;
let apBgmFile = null;
let apBgmAudioUrl = "";
let apBgmAudioElement = null; // for playing during preview

// Render State
let apMediaRecorder = null;
let apRecordedChunks = [];
let apIsRendering = false;
let apRenderBgmSourceNode = null;
let apAudioCtx = null;
let apRenderSourceNodes = [];
let apRenderAbortControllers = [];
let apSceneImageControllers = new Map();
let apRenderTimeline = null;
let apLastRenderTimeline = null;
let apRenderStartAt = 0;
let apRenderCancelled = false;
let apCombinedStream = null;

function normalizeVideoProject(project) {
    if (!project.scenes) project.scenes = [];
    project.scenes.forEach(scene => {
        if (scene.duration === undefined) scene.duration = 5;
        if (scene.cameraMotion === undefined) scene.cameraMotion = "static";
        if (scene.transition === undefined) scene.transition = "fade";
        if (scene.imageFit === undefined) scene.imageFit = "crop";
    });
}

function populateAutoProjectSelector() {
    const select = document.getElementById("auto-project-select");
    if (!select) return;
    select.innerHTML = "";

    if (state.videoProjects.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.innerText = "생성된 비디오 프로젝트 없음";
        select.appendChild(option);
        return;
    }

    state.videoProjects.forEach(project => {
        const option = document.createElement("option");
        option.value = project.id;
        option.innerText = project.title || "제목 없는 비디오";
        if (project.id === state.activeVideoProjectId) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function loadActiveVideoProject() {
    const select = document.getElementById("auto-project-select");
    if (!select) return;
    const activeId = select.value;

    apPlayerStop(); // Stop any playing preview

    if (!activeId) {
        state.activeVideoProjectId = null;
        document.getElementById("auto-prod-config-card").style.display = "flex";
        document.getElementById("auto-prod-editor-panel").style.display = "none";
        document.getElementById("ap-result-container").style.display = "none";
        apCurrentTime = 0;
        apPlayerDrawCurrentFrame();
        return;
    }

    state.activeVideoProjectId = activeId;
    saveData();

    const project = state.videoProjects.find(vp => vp.id === activeId);
    if (!project) return;

    // Show / Hide Panels
    document.getElementById("auto-prod-config-card").style.display = "none";
    document.getElementById("auto-prod-editor-panel").style.display = "flex";
    document.getElementById("ap-result-container").style.display = "none";

    // Fill configuration form default inputs in case they edit it next time
    document.getElementById("ap-idea").value = project.idea || "";
    document.getElementById("ap-title").value = project.title || "";
    document.getElementById("ap-duration").value = project.duration || "60";
    document.getElementById("ap-aspect-ratio").value = project.aspectRatio || "16:9";
    document.getElementById("ap-style").value = project.style || "Comic";
    document.getElementById("ap-captions-enabled").checked = project.captionsEnabled !== false;

    // Rerender scenes checklist editor list
    renderScenesList();

    // Init player canvas size
    apPlayerInit();
}

function startNewVideoProject() {
    state.activeVideoProjectId = null;
    saveData();
    populateAutoProjectSelector();
    loadActiveVideoProject();
}

function deleteActiveVideoProject() {
    if (!state.activeVideoProjectId) return;
    if (!confirm("정말로 이 자동제작 프로젝트를 삭제하시겠습니까?")) return;

    state.videoProjects = state.videoProjects.filter(vp => vp.id !== state.activeVideoProjectId);
    state.activeVideoProjectId = null;

    saveData();
    populateAutoProjectSelector();
    loadActiveVideoProject();
    showToast("프로젝트가 삭제되었습니다");
}

function generateStoryboardFromConfig() {
    const idea = document.getElementById("ap-idea").value.trim();
    const title = document.getElementById("ap-title").value.trim();
    const duration = parseInt(document.getElementById("ap-duration").value, 10);
    const aspectRatio = document.getElementById("ap-aspect-ratio").value;
    const style = document.getElementById("ap-style").value;
    const sceneCountVal = document.getElementById("ap-scene-count").value;
    const captionsEnabled = document.getElementById("ap-captions-enabled").checked;

    if (!idea || !title) {
        alert("영상 아이디어와 제목을 모두 입력해 주세요.");
        return;
    }

    // Determine scene count
    let sceneCount = 5;
    if (sceneCountVal === "auto") {
        if (duration === 30) sceneCount = 3;
        else if (duration === 60) sceneCount = 5;
        else if (duration === 180) sceneCount = 7;
    } else {
        sceneCount = parseInt(sceneCountVal, 10);
    }

    const sceneDuration = Math.round(duration / sceneCount);
    const scenes = [];
    const labels = ["도입부 훅", "상황 분석", "핵심 갈등", "실천적 변화", "결론 및 CTA"];

    for (let i = 0; i < sceneCount; i++) {
        const order = i + 1;
        let sceneTitle = `${labels[i % labels.length]} (${order}/${sceneCount})`;
        let narration = "";
        let caption = "";

        if (i === 0) {
            sceneTitle = `도입부: 훅 (${order}/${sceneCount})`;
            narration = `여러분은 "${idea}"에 대해 진지하게 생각해 보신 적이 있나요? 사소해 보이지만, 우리의 삶을 뒤흔들 중요한 전환점이 여기에 숨겨져 있습니다.`;
            caption = `"${idea}"의 오프닝 훅`;
        } else if (i === 1) {
            sceneTitle = `상황: 현실적인 고민 (${order}/${sceneCount})`;
            narration = "우리는 언제나 바쁜 일상 속에서 시작을 미루고, 끊임없는 피로와 지침 속에서 포기하고 싶은 순간들과 직면하곤 합니다.";
            caption = "밀려오는 피로와 포기하고 싶은 마음";
        } else if (i === 2) {
            sceneTitle = `갈등: 변화의 시작점 (${order}/${sceneCount})`;
            narration = "하지만 진정한 성장은 거창한 변화에서 시작되지 않습니다. 오늘 겪는 갈등 속에서 아주 미세한 한 걸음을 내딛는 것만이 돌파구를 만들어 냅니다.";
            caption = "돌파구를 만들기 위한 미세한 한 걸음";
        } else if (i === 3) {
            sceneTitle = `실천: 규율의 중요성 (${order}/${sceneCount})`;
            narration = "천일의 수련을 '단'이라 하고 만일의 수련을 '련'이라 부르듯, 매일 실천하는 규율과 한계 돌파가 우리를 새로운 지평으로 안내합니다.";
            caption = "하루하루 단련해 나가는 규율";
        } else {
            sceneTitle = `결론: 성찰 및 아웃트로 (${order}/${sceneCount})`;
            narration = `결국 가장 큰 무기는 포기하지 않고 묵묵히 걸어가는 자신만의 길입니다. 오늘부터 여러분도 삶의 작은 수련을 시작해 보세요. 감사합니다.`;
            caption = "구독과 좋아요로 채널과 함께해 주세요";
        }

        const cameraMotions = ["zoomIn", "panLeftToRight", "panRightToLeft", "panTopToBottom", "zoomOut"];
        const cameraMotion = cameraMotions[i % cameraMotions.length];

        scenes.push({
            id: "scene-" + Date.now() + "-" + i,
            order,
            title: sceneTitle,
            narration,
            caption,
            duration: sceneDuration,
            cameraMotion,
            transition: "fade",
            imageFit: "crop",
            imageData: null,
            imageName: ""
        });
    }

    const newProject = {
        id: "project-" + Date.now(),
        idea,
        title,
        duration,
        aspectRatio,
        style,
        captionsEnabled,
        scenes,
        status: "Drafting",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    state.videoProjects.push(newProject);
    state.activeVideoProjectId = newProject.id;
    saveData();

    populateAutoProjectSelector();
    loadActiveVideoProject();
    showToast("스토리보드 자동 생성 완료 ✓");
}

function renderScenesList() {
    const project = state.videoProjects.find(vp => vp.id === state.activeVideoProjectId);
    const container = document.getElementById("ap-scenes-list");
    if (!container) return;
    container.innerHTML = "";

    if (!project || project.scenes.length === 0) {
        container.innerHTML = `<div class="empty-state compact-empty">장면이 없습니다.</div>`;
        return;
    }

    const totalScenes = project.scenes.length;
    project.scenes.forEach((scene, index) => {
        const safeSceneId = escapeHTML(scene.id);
        const item = document.createElement("div");
        item.className = "card";
        item.style.cssText = "padding: 16px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;";
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="tag-pill" style="background: var(--primary); color: white; border: none; font-size: 0.7rem; font-weight: 700;">장면 ${index + 1}</span>
                <div style="display: flex; gap: 6px;">
                    <button class="btn-icon" style="padding: 4px;" onclick="moveSceneUp('${scene.id}')" title="위로 이동" ${index === 0 ? 'disabled' : ''}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                    </button>
                    <button class="btn-icon" style="padding: 4px;" onclick="moveSceneDown('${scene.id}')" title="아래로 이동" ${index === totalScenes - 1 ? 'disabled' : ''}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <button class="btn-icon" style="padding: 4px; color: var(--danger);" onclick="deleteScene('${scene.id}')" title="장면 삭제">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 80px 1fr; gap: 12px; align-items: center;">
                <div id="ap-scene-thumb-${scene.id}" style="width: 80px; height: 45px; background: #222; border: 1px solid var(--border-color); border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; aspect-ratio: 16/9;">
                    <canvas id="ap-thumb-canvas-${scene.id}" width="160" height="90" style="width: 100%; height: 100%; object-fit: cover;"></canvas>
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <input type="file" id="ap-image-upload-${scene.id}" accept="image/*" onchange="handleSceneImageUpload(event, '${scene.id}')" style="display: none;">
                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.75rem;" onclick="document.getElementById('ap-image-upload-${scene.id}').click()">
                        이미지 파일 업로드
                    </button>
                    <div style="display: flex; gap: 6px;">
                        <button id="ap-ai-image-btn-${safeSceneId}" class="btn btn-primary" style="padding: 6px 10px; font-size: 0.72rem; flex: 1; justify-content: center;" onclick="generateAiImageForScene('${safeSceneId}')">
                            AI 이미지 생성
                        </button>
                        <button id="ap-ai-image-cancel-${safeSceneId}" class="btn btn-secondary" style="display: none; padding: 6px 10px; font-size: 0.72rem; color: var(--danger);" onclick="cancelSceneImageGeneration('${safeSceneId}')">취소</button>
                    </div>
                    <div id="ap-image-name-${scene.id}" style="font-size: 0.7rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px;">
                        ${escapeHTML(scene.imageName || "로컬 만화 패널 사용 중")}
                    </div>
                    <div id="ap-ai-image-status-${safeSceneId}" class="ai-generation-status"></div>
                </div>
            </div>
            
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.8rem; margin-bottom: 4px; display: block; font-weight: 600;">장면 제목 / 콘셉트</label>
                <input type="text" class="input-field" style="padding: 6px 12px; font-size: 0.85rem; padding-left: 12px;" value="${escapeHTML(scene.title)}" oninput="updateSceneField('${scene.id}', 'title', this.value)">
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.8rem; margin-bottom: 4px; display: block; font-weight: 600;">지속 시간 (초)</label>
                    <input type="number" class="input-field" style="padding: 6px 12px; font-size: 0.85rem; padding-left: 12px;" min="1" max="60" value="${scene.duration}" oninput="updateSceneField('${scene.id}', 'duration', parseInt(this.value, 10) || 5)">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.8rem; margin-bottom: 4px; display: block; font-weight: 600;">카메라 효과</label>
                    <select class="input-field" style="padding: 6px 12px; font-size: 0.85rem; height: auto; padding-left: 12px;" onchange="updateSceneField('${scene.id}', 'cameraMotion', this.value)">
                        <option value="static" ${scene.cameraMotion === 'static' ? 'selected' : ''}>고정 화면</option>
                        <option value="zoomIn" ${scene.cameraMotion === 'zoomIn' ? 'selected' : ''}>천천히 줌인</option>
                        <option value="zoomOut" ${scene.cameraMotion === 'zoomOut' ? 'selected' : ''}>천천히 줌아웃</option>
                        <option value="panLeftToRight" ${scene.cameraMotion === 'panLeftToRight' ? 'selected' : ''}>좌에서 우로</option>
                        <option value="panRightToLeft" ${scene.cameraMotion === 'panRightToLeft' ? 'selected' : ''}>우에서 좌로</option>
                        <option value="panTopToBottom" ${scene.cameraMotion === 'panTopToBottom' ? 'selected' : ''}>위에서 아래로</option>
                    </select>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.8rem; margin-bottom: 4px; display: block; font-weight: 600;">이미지 맞춤</label>
                    <select class="input-field" style="padding: 6px 12px; font-size: 0.85rem; height: auto; padding-left: 12px;" onchange="updateSceneField('${scene.id}', 'imageFit', this.value)">
                        <option value="crop" ${scene.imageFit !== 'contain' ? 'selected' : ''}>꽉 차게 (Crop)</option>
                        <option value="contain" ${scene.imageFit === 'contain' ? 'selected' : ''}>맞춤 (Contain)</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0; display: flex; align-items: flex-end;">
                    <button class="btn btn-secondary" style="padding: 8px 12px; font-size: 0.8rem; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;" onclick="speakNarration('${scene.id}')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                        TTS 미리듣기
                    </button>
                </div>
            </div>
            
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.8rem; margin-bottom: 4px; display: block; font-weight: 600;">나레이션 (대사)</label>
                <textarea class="input-field" style="padding: 6px 12px; font-size: 0.85rem; min-height: 50px; height: 50px; resize: vertical; padding-left: 12px;" oninput="updateSceneField('${scene.id}', 'narration', this.value)">${escapeHTML(scene.narration)}</textarea>
            </div>
            
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.8rem; margin-bottom: 4px; display: block; font-weight: 600;">자막 (공란 시 대사 사용)</label>
                <input type="text" class="input-field" style="padding: 6px 12px; font-size: 0.85rem; padding-left: 12px;" value="${escapeHTML(scene.caption || '')}" placeholder="비워둘 시 위 대사가 자동으로 자막으로 노출됩니다" oninput="updateSceneField('${scene.id}', 'caption', this.value)">
            </div>
        `;
        container.appendChild(item);
        
        // Render the small thumbnail on its canvas
        apDrawThumbnail(scene.id, scene, project.style, index);
    });
}

function addNewSceneToActiveProject() {
    const project = state.videoProjects.find(vp => vp.id === state.activeVideoProjectId);
    if (!project) return;

    const newScene = {
        id: "scene-" + Date.now(),
        order: project.scenes.length + 1,
        title: "새로운 장면 " + (project.scenes.length + 1),
        narration: "나레이션 대사 내용을 적어주세요.",
        caption: "",
        duration: 5,
        cameraMotion: "static",
        transition: "fade",
        imageFit: "crop",
        imageData: null,
        imageName: ""
    };

    project.scenes.push(newScene);
    saveData();
    renderScenesList();
    apPlayerDrawCurrentFrame();
    showToast("새 장면 추가됨 ✓");
}

function moveSceneUp(sceneId) {
    const project = state.videoProjects.find(vp => vp.id === state.activeVideoProjectId);
    if (!project) return;

    const idx = project.scenes.findIndex(s => s.id === sceneId);
    if (idx <= 0) return;

    // Swap
    const temp = project.scenes[idx];
    project.scenes[idx] = project.scenes[idx - 1];
    project.scenes[idx - 1] = temp;

    // Fix orders
    project.scenes.forEach((s, i) => s.order = i + 1);

    saveData();
    renderScenesList();
    apPlayerDrawCurrentFrame();
    showToast("순서 변경됨 ✓");
}

function moveSceneDown(sceneId) {
    const project = state.videoProjects.find(vp => vp.id === state.activeVideoProjectId);
    if (!project) return;

    const idx = project.scenes.findIndex(s => s.id === sceneId);
    if (idx === -1 || idx === project.scenes.length - 1) return;

    // Swap
    const temp = project.scenes[idx];
    project.scenes[idx] = project.scenes[idx + 1];
    project.scenes[idx + 1] = temp;

    // Fix orders
    project.scenes.forEach((s, i) => s.order = i + 1);

    saveData();
    renderScenesList();
    apPlayerDrawCurrentFrame();
    showToast("순서 변경됨 ✓");
}

function deleteScene(sceneId) {
    const project = state.videoProjects.find(vp => vp.id === state.activeVideoProjectId);
    if (!project) return;
    if (project.scenes.length <= 1) {
        alert("최소 1개 이상의 장면이 있어야 합니다.");
        return;
    }
    if (!confirm("이 장면을 삭제하시겠습니까?")) return;

    project.scenes = project.scenes.filter(s => s.id !== sceneId);
    // Fix orders
    project.scenes.forEach((s, i) => s.order = i + 1);

    saveData();
    renderScenesList();
    apPlayerDrawCurrentFrame();
    showToast("장면 삭제됨");
}

function updateSceneField(sceneId, field, value) {
    const project = state.videoProjects.find(vp => vp.id === state.activeVideoProjectId);
    if (!project) return;

    const scene = project.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    scene[field] = value;
    saveData();
    
    // Draw real-time frame changes on input
    if (field === 'title' || field === 'caption' || field === 'narration' || field === 'cameraMotion' || field === 'imageFit') {
        apPlayerDrawCurrentFrame();
    }
    
    // Update thumbnail canvas
    const index = project.scenes.findIndex(s => s.id === sceneId);
    apDrawThumbnail(sceneId, scene, project.style, index);
}

function handleSceneImageUpload(event, sceneId) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const compressedDataUrl = await resizeImageToDataURL(e.target.result);
            const project = state.videoProjects.find(vp => vp.id === state.activeVideoProjectId);
            if (project) {
                const scene = project.scenes.find(s => s.id === sceneId);
                if (scene) {
                    scene.imageData = compressedDataUrl;
                    scene.imageName = file.name;
                    saveData();
                    renderScenesList();
                    apPlayerDrawCurrentFrame();
                    showToast("이미지 등록됨 ✓");
                }
            }
        } catch (error) {
            console.error("Canvas export failed", error);
            alert("이미지 처리 중 오류가 발생했습니다.");
        }
    };
    reader.readAsDataURL(file);
}

function resizeImageToDataURL(srcDataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const maxSize = 800;
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            try {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", 0.7));
            } catch (error) {
                reject(error);
            }
        };
        img.onerror = () => reject(new Error("Image decode failed."));
        img.src = srcDataUrl;
    });
}

function buildSceneImagePrompt(project, scene) {
    const content = [scene.caption || scene.narration || "", `Visual style: ${project.style}`].filter(Boolean).join(". ");
    const template = state.profile.promptTemplate || DEFAULT_PROFILE.promptTemplate;
    return template
        .replace(/\{\{\s*title\s*\}\}/g, scene.title || project.title || "")
        .replace(/\{\{\s*content\s*\}\}/g, content);
}

async function generateAiImageForScene(sceneId) {
    const project = state.videoProjects.find(vp => vp.id === state.activeVideoProjectId);
    const scene = project && project.scenes.find(item => item.id === sceneId);
    if (!project || !scene) return;
    if (getRuntimeMode() === "public") {
        const error = new YphApiError("public-mode-blocked", "Public mode direct API call blocked.");
        alert(apiErrorMessage(error));
        return;
    }
    if (!loadApiKeys().openai) {
        const error = new YphApiError("missing-key", "OpenAI API key is missing.");
        alert(apiErrorMessage(error));
        return;
    }

    const button = document.getElementById(`ap-ai-image-btn-${sceneId}`);
    const cancelButton = document.getElementById(`ap-ai-image-cancel-${sceneId}`);
    const status = document.getElementById(`ap-ai-image-status-${sceneId}`);
    const controller = new AbortController();
    apSceneImageControllers.set(sceneId, controller);
    button.disabled = true;
    button.innerText = "생성 중…";
    cancelButton.style.display = "inline-flex";
    status.className = "ai-generation-status";
    status.innerText = "OpenAI가 장면 이미지를 생성하고 있습니다.";

    try {
        const size = project.aspectRatio === "9:16" ? "1024x1536" : "1536x1024";
        const model = state.profile.imageModel || DEFAULT_PROFILE.imageModel;
        const dataUrl = await generateSceneImageViaProxy({
            prompt: buildSceneImagePrompt(project, scene),
            size,
            model,
            signal: controller.signal
        });
        const resized = await resizeImageToDataURL(dataUrl);
        scene.imageData = resized;
        scene.imageName = `AI · ${model}`;
        saveData();
        renderScenesList();
        apPlayerDrawCurrentFrame();
        showToast("AI 이미지 생성 완료 ✓");
    } catch (error) {
        const message = apiErrorMessage(error);
        status.className = `ai-generation-status${error.category === "cancelled" ? "" : " error"}`;
        status.innerText = message;
        showToast(message);
    } finally {
        apSceneImageControllers.delete(sceneId);
        if (button && button.isConnected) {
            button.disabled = false;
            button.innerText = "AI 이미지 생성";
        }
        if (cancelButton && cancelButton.isConnected) cancelButton.style.display = "none";
    }
}

function cancelSceneImageGeneration(sceneId) {
    const controller = apSceneImageControllers.get(sceneId);
    if (controller) controller.abort();
}

function speakNarration(sceneId) {
    const project = state.videoProjects.find(vp => vp.id === state.activeVideoProjectId);
    if (!project) return;
    const scene = project.scenes.find(s => s.id === sceneId);
    if (!scene || !scene.narration) return;
    
    // Cancel active synthesis speech
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(scene.narration);
        utterance.lang = "ko-KR";
        window.speechSynthesis.speak(utterance);
    } else {
        alert("이 브라우저는 TTS(Speech Synthesis) 기능을 지원하지 않습니다.");
    }
}

/* ==========================================================================
   Canvas Player Engine Logic
   ========================================================================== */
function apPlayerInit() {
    const canvas = document.getElementById("ap-player-canvas");
    if (!canvas) return;
    
    const project = state.videoProjects.find(vp => vp.id === state.activeVideoProjectId);
    if (!project) return;
    
    const wrapper = document.getElementById("ap-canvas-wrapper");
    if (project.aspectRatio === "9:16") {
        wrapper.style.aspectRatio = "9/16";
        canvas.width = 720;
        canvas.height = 1280;
    } else {
        wrapper.style.aspectRatio = "16/9";
        canvas.width = 1280;
        canvas.height = 720;
    }
    
    apCurrentTime = 0;
    apPlayerDrawCurrentFrame();
}

function apGetActiveScene(project, time) {
    let elapsed = 0;
    for (let i = 0; i < project.scenes.length; i++) {
        const scene = project.scenes[i];
        const duration = apGetEffectiveSceneDuration(project, scene);
        if (time >= elapsed && time < elapsed + duration) {
            return {
                scene,
                index: i,
                progress: (time - elapsed) / duration
            };
        }
        elapsed += duration;
    }
    
    if (project.scenes.length > 0) {
        return {
            scene: project.scenes[project.scenes.length - 1],
            index: project.scenes.length - 1,
            progress: 1.0
        };
    }
    return null;
}

function apGetEffectiveSceneDuration(project, scene) {
    if (apRenderTimeline && apRenderTimeline.projectId === project.id) {
        const timing = apRenderTimeline.scenes.find(item => item.sceneId === scene.id);
        if (timing) return timing.effectiveDuration;
    }
    return Math.max(0.1, Number(scene.duration) || 5);
}

function apGetProjectDuration(project) {
    return project.scenes.reduce((sum, scene) => sum + apGetEffectiveSceneDuration(project, scene), 0);
}

function apPlayerDrawCurrentFrame() {
    const canvas = document.getElementById("ap-player-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    const project = state.videoProjects.find(vp => vp.id === state.activeVideoProjectId);
    if (!project) {
        ctx.fillStyle = "#0d0d12";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
    }
    
    const activeData = apGetActiveScene(project, apCurrentTime);
    if (!activeData) {
        ctx.fillStyle = "#0d0d12";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
    }
    
    const { scene, index, progress } = activeData;
    
    // Draw background base
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw scene frame with Ken Burns Camera effect
    apDrawSceneFrame(ctx, canvas.width, canvas.height, scene, progress, project.style, index);
    
    // Handle transitions (fade out last 0.5s into next scene)
    const transitionTime = 0.5; // seconds
    let elapsed = 0;
    for (let i = 0; i < index; i++) elapsed += apGetEffectiveSceneDuration(project, project.scenes[i]);
    const sceneEndTime = elapsed + apGetEffectiveSceneDuration(project, scene);
    const remainingTime = sceneEndTime - apCurrentTime;
    
    if (remainingTime < transitionTime && index < project.scenes.length - 1 && scene.transition === "fade") {
        const nextScene = project.scenes[index + 1];
        const fadeProgress = (transitionTime - remainingTime) / transitionTime;
        
        ctx.save();
        ctx.globalAlpha = fadeProgress;
        apDrawSceneFrame(ctx, canvas.width, canvas.height, nextScene, 0, project.style, index + 1);
        ctx.restore();
    }
    
    // Draw captions
    if (project.captionsEnabled !== false) {
        apDrawCaption(ctx, canvas.width, canvas.height, scene);
    }
    
    // Update player timeline label
    const totalDuration = apGetProjectDuration(project);
    document.getElementById("ap-player-time").innerText = `${apCurrentTime.toFixed(1)}s / ${totalDuration.toFixed(1)}s`;
}

function apDrawSceneFrame(ctx, width, height, scene, progress, style, index) {
    let scale = 1.0;
    let dx = 0;
    let dy = 0;
    
    if (scene.cameraMotion === "zoomIn") {
        scale = 1.0 + progress * 0.15;
    } else if (scene.cameraMotion === "zoomOut") {
        scale = 1.15 - progress * 0.15;
    } else if (scene.cameraMotion === "panLeftToRight") {
        scale = 1.15;
        dx = (-0.075 + progress * 0.15) * width;
    } else if (scene.cameraMotion === "panRightToLeft") {
        scale = 1.15;
        dx = (0.075 - progress * 0.15) * width;
    } else if (scene.cameraMotion === "panTopToBottom") {
        scale = 1.15;
        dy = (-0.075 + progress * 0.15) * height;
    }
    
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2 + dx / scale, -height / 2 + dy / scale);
    
    if (scene.imageData) {
        const img = new Image();
        img.src = scene.imageData;
        if (img.complete) {
            drawSceneImage(ctx, img, width, height, scene.imageFit);
        } else {
            // Draw placeholder during load, hook onload to redraw
            img.onload = () => {
                if (!apIsPlaying && !apIsRendering) apPlayerDrawCurrentFrame();
            };
            apDrawCartoonPanelFallback(ctx, width, height, scene, index, style);
        }
    } else {
        apDrawCartoonPanelFallback(ctx, width, height, scene, index, style);
    }
    ctx.restore();
}

function drawSceneImage(ctx, img, canvasWidth, canvasHeight, fit) {
    const imgWidth = img.width;
    const imgHeight = img.height;
    const imgRatio = imgWidth / imgHeight;
    const canvasRatio = canvasWidth / canvasHeight;
    
    let drawWidth, drawHeight, x, y;
    
    if (fit === "contain") {
        if (imgRatio > canvasRatio) {
            drawWidth = canvasWidth;
            drawHeight = canvasWidth / imgRatio;
        } else {
            drawHeight = canvasHeight;
            drawWidth = canvasHeight * imgRatio;
        }
        x = (canvasWidth - drawWidth) / 2;
        y = (canvasHeight - drawHeight) / 2;
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.drawImage(img, x, y, drawWidth, drawHeight);
    } else {
        // default crop fill
        if (imgRatio > canvasRatio) {
            drawHeight = canvasHeight;
            drawWidth = canvasHeight * imgRatio;
        } else {
            drawWidth = canvasWidth;
            drawHeight = canvasWidth / imgRatio;
        }
        x = (canvasWidth - drawWidth) / 2;
        y = (canvasHeight - drawHeight) / 2;
        ctx.drawImage(img, x, y, drawWidth, drawHeight);
    }
}

function apDrawCartoonPanelFallback(ctx, width, height, scene, index, style) {
    // 1. Setup gradient based on visual style theme
    let grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.8);
    if (style === "Comic") {
        grad.addColorStop(0, "#2c1c4d"); // Deep purple
        grad.addColorStop(1, "#0a0614"); // Near black
    } else if (style === "Illustration") {
        grad.addColorStop(0, "#19333f"); // Warm teal
        grad.addColorStop(1, "#070e12"); // Obsidian slate
    } else {
        // Documentary
        grad.addColorStop(0, "#232625"); // Classic slate grey
        grad.addColorStop(1, "#080908"); // Charcoal obsidian
    }
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    
    // 2. Add abstract geometric visual indicators
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    
    const textScale = width / 1280;
    
    if (style === "Comic") {
        // Starburst lines background
        ctx.save();
        ctx.translate(width / 2, height / 2);
        for (let a = 0; a < 360; a += 15) {
            ctx.rotate(15 * Math.PI / 180);
            ctx.beginPath();
            ctx.moveTo(100 * textScale, 0);
            ctx.lineTo(width, 0);
            ctx.stroke();
        }
        ctx.restore();
    } else if (style === "Illustration") {
        // Smooth hills waves
        ctx.fillStyle = "rgba(6, 182, 212, 0.04)";
        ctx.beginPath();
        ctx.moveTo(0, height * 0.7);
        ctx.quadraticCurveTo(width * 0.35, height * 0.55, width * 0.65, height * 0.75);
        ctx.quadraticCurveTo(width * 0.85, height * 0.85, width, height * 0.65);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
    } else {
        // Documentary framing lines
        ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
        ctx.fillRect(0, height * 0.25, width, height * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, height * 0.25); ctx.lineTo(width, height * 0.25);
        ctx.moveTo(0, height * 0.75); ctx.lineTo(width, height * 0.75);
        ctx.stroke();
    }
    
    // 3. Scene label indicators
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = `bold ${Math.round(20 * textScale)}px Outfit, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(`SCENE ${index + 1}`, 48 * textScale, 54 * textScale);
    
    ctx.textAlign = "right";
    ctx.fillText(style.toUpperCase(), width - 48 * textScale, 54 * textScale);
    
    // 4. Center title text drawing
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.round(42 * textScale)}px Outfit, sans-serif`;
    ctx.textAlign = "center";
    
    // Text shadow for readability
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 12 * textScale;
    
    const titleText = scene.title || `장면 ${index + 1}`;
    ctx.fillText(titleText, width / 2, height / 2 - 30 * textScale);
    ctx.shadowBlur = 0; // reset shadow
    
    // 5. Stylized character silhouette
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.arc(width / 2, height / 2 + 100 * textScale, 65 * textScale, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2 + 230 * textScale, 130 * textScale, 80 * textScale, 0, 0, Math.PI * 2);
    ctx.fill();
}

function apDrawCaption(ctx, width, height, scene) {
    const text = scene.caption || scene.narration || "";
    if (!text.trim()) return;
    
    ctx.save();
    const fontSize = Math.round(height * 0.042);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    
    // Text word wrapping
    const maxWidth = width * 0.85;
    const words = text.split(" ");
    let lines = [];
    let currentLine = "";
    
    for (let n = 0; n < words.length; n++) {
        let testLine = currentLine + words[n] + " ";
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(currentLine.trim());
            currentLine = words[n] + " ";
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine.trim());
    
    // Semi-transparent overlay block
    const lineHeight = fontSize + 16;
    const padding = 20;
    const rectHeight = lines.length * lineHeight + padding;
    const rectY = height * 0.86 - rectHeight / 2;
    
    ctx.fillStyle = "rgba(10, 10, 15, 0.8)";
    ctx.fillRect(width * 0.05, rectY, width * 0.9, rectHeight);
    
    ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
    ctx.lineWidth = 1;
    ctx.strokeRect(width * 0.05, rectY, width * 0.9, rectHeight);
    
    // Write text
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 4;
    
    lines.forEach((line, idx) => {
        const textY = rectY + padding / 2 + (idx + 1) * lineHeight - lineHeight * 0.35;
        ctx.fillText(line, width / 2, textY);
    });
    
    ctx.restore();
}

function apDrawThumbnail(sceneId, scene, style, index) {
    const canvas = document.getElementById(`ap-thumb-canvas-${sceneId}`);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (scene.imageData) {
        const img = new Image();
        img.src = scene.imageData;
        if (img.complete) {
            drawSceneImage(ctx, img, canvas.width, canvas.height, scene.imageFit);
        } else {
            img.onload = () => {
                drawSceneImage(ctx, img, canvas.width, canvas.height, scene.imageFit);
            };
            apDrawCartoonPanelFallback(ctx, canvas.width, canvas.height, scene, index, style);
        }
    } else {
        apDrawCartoonPanelFallback(ctx, canvas.width, canvas.height, scene, index, style);
    }
}

/* ==========================================================================
   Player Playback Timers
   ========================================================================== */
function apPlayerTogglePlay() {
    if (apIsPlaying) {
        apPlayerPause();
    } else {
        apPlayerPlay();
    }
}

function apPlayerPlay() {
    const project = state.videoProjects.find(vp => vp.id === state.activeVideoProjectId);
    if (!project || project.scenes.length === 0) return;
    
    apIsPlaying = true;
    const btn = document.getElementById("ap-play-btn");
    if (btn) {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="4" x2="18" y2="20"></line><line x1="6" y1="4" x2="6" y2="20"></line></svg>
        `; // Pause icon
    }
    
    apLastTickTime = performance.now();
    
    // Play back background music if loaded
    if (apBgmAudioElement && apBgmAudioUrl) {
        apBgmAudioElement.currentTime = apCurrentTime % apBgmAudioElement.duration;
        apBgmAudioElement.play().catch(err => console.log("Audio play failed:", err));
    }
    
    apPlayerLoop();
}

function apPlayerPause() {
    apIsPlaying = false;
    const btn = document.getElementById("ap-play-btn");
    if (btn) {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        `; // Play icon
    }
    
    if (apBgmAudioElement) {
        apBgmAudioElement.pause();
    }
}

function apPlayerStop() {
    apPlayerPause();
    apCurrentTime = 0;
    apPlayerDrawCurrentFrame();
}

function apPlayerRewind() {
    apCurrentTime = 0;
    apPlayerDrawCurrentFrame();
    if (apBgmAudioElement && apIsPlaying) {
        apBgmAudioElement.currentTime = 0;
    }
}

function apPlayerLoop() {
    if (!apIsPlaying) return;
    
    const now = performance.now();
    const dt = (now - apLastTickTime) / 1000;
    apLastTickTime = now;
    
    const project = state.videoProjects.find(vp => vp.id === state.activeVideoProjectId);
    if (!project) {
        apPlayerStop();
        return;
    }
    
    const totalDuration = apGetProjectDuration(project);
    apCurrentTime += dt;
    
    if (apCurrentTime >= totalDuration) {
        apCurrentTime = totalDuration;
        apPlayerDrawCurrentFrame();
        apPlayerStop();
        return;
    }
    
    apPlayerDrawCurrentFrame();
    requestAnimationFrame(apPlayerLoop);
}

/* ==========================================================================
   MediaRecorder Video Rendering & Exporter
   ========================================================================== */
function readFileAsArrayBuffer(file) {
    if (!file) return Promise.resolve(null);
    if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = () => reject(reader.error || new Error("File read failed."));
        reader.readAsArrayBuffer(file);
    });
}

function decodeAudioBuffer(audioContext, arrayBuffer) {
    return new Promise((resolve, reject) => {
        const copy = arrayBuffer.slice(0);
        const result = audioContext.decodeAudioData(copy, resolve, reject);
        if (result && typeof result.then === "function") result.then(resolve).catch(reject);
    });
}

async function prefetchNarrationBuffers(project) {
    const buffers = new Array(project.scenes.length).fill(null);
    const hasNarration = project.scenes.some(scene => (scene.narration || "").trim());
    if (!hasNarration) return buffers;

    if (getRuntimeMode() === "public") {
        document.getElementById("ap-render-status").innerText = "공개 배포 모드 — TTS 없이 BGM/무음 영상으로 계속합니다.";
        showToast("공개 배포 모드 — TTS를 건너뛰고 렌더링합니다.");
        return buffers;
    }

    if ((state.profile.ttsProvider || "openai") === "openai" && !loadApiKeys().openai) {
        document.getElementById("ap-render-status").innerText = "API 키 없음 — TTS 없이 BGM/무음 영상으로 계속합니다.";
        showToast("API 키 없음 — TTS를 건너뛰고 렌더링합니다.");
        return buffers;
    }

    for (let index = 0; index < project.scenes.length; index++) {
        if (!apIsRendering) throw new YphApiError("cancelled", "Rendering cancelled.");
        const narration = (project.scenes[index].narration || "").trim();
        if (!narration) continue;
        document.getElementById("ap-render-status").innerText = `TTS 생성 중… (${index + 1}/${project.scenes.length})`;
        const controller = new AbortController();
        apRenderAbortControllers.push(controller);
        const audioData = await generateNarrationViaProxy({
            text: narration,
            model: state.profile.ttsModel || DEFAULT_PROFILE.ttsModel,
            voice: state.profile.ttsVoice || DEFAULT_PROFILE.ttsVoice,
            instructions: state.profile.ttsInstructions || "",
            format: "mp3",
            signal: controller.signal
        });
        buffers[index] = await decodeAudioBuffer(apAudioCtx, audioData);
    }
    return buffers;
}

function buildEffectiveRenderTimeline(project, narrationBuffers) {
    let offset = 0;
    const scenes = project.scenes.map((scene, index) => {
        const configuredSceneDuration = Math.max(0.1, Number(scene.duration) || 5);
        const ttsAudioBuffer = narrationBuffers[index] || null;
        const effectiveDuration = Math.max(
            configuredSceneDuration,
            ttsAudioBuffer ? ttsAudioBuffer.duration + 0.3 : 0
        );
        const timing = {
            sceneId: scene.id,
            offset,
            end: offset + effectiveDuration,
            configuredSceneDuration,
            effectiveDuration,
            audioBuffer: ttsAudioBuffer
        };
        offset += effectiveDuration;
        return timing;
    });
    return { projectId: project.id, totalDuration: offset, scenes };
}

function stopRenderResources({ abortRequests = false, closeAudio = true } = {}) {
    if (abortRequests) {
        apRenderAbortControllers.forEach(controller => controller.abort());
    }
    apRenderAbortControllers = [];
    apRenderSourceNodes.forEach(source => {
        try { source.stop(); } catch (error) {}
        try { source.disconnect(); } catch (error) {}
    });
    apRenderSourceNodes = [];
    apRenderBgmSourceNode = null;
    if (apCombinedStream) {
        apCombinedStream.getTracks().forEach(track => track.stop());
        apCombinedStream = null;
    }
    if (closeAudio && apAudioCtx) {
        apAudioCtx.close().catch(() => {});
        apAudioCtx = null;
    }
}

async function startVideoRendering() {
    const project = state.videoProjects.find(vp => vp.id === state.activeVideoProjectId);
    if (!project || project.scenes.length === 0) {
        alert("렌더링할 비디오 프로젝트가 없습니다.");
        return;
    }
    
    if (apIsRendering) return;
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream || !(window.AudioContext || window.webkitAudioContext)) {
        alert("이 브라우저는 Canvas 녹화, MediaRecorder 또는 Web Audio를 지원하지 않습니다. 최신 Chrome 또는 Edge에서 실행해 주세요.");
        return;
    }
    apIsRendering = true;
    apRenderCancelled = false;
    apRenderTimeline = null;
    apLastRenderTimeline = null;
    apRenderAbortControllers = [];
    apRenderSourceNodes = [];
    apPlayerStop(); // stop active player
    
    // Toggle overlays
    const overlay = document.getElementById("ap-render-overlay");
    overlay.style.display = "flex";
    document.getElementById("ap-result-container").style.display = "none";
    document.getElementById("ap-render-status").innerText = "오디오 믹싱 중...";
    document.getElementById("ap-render-progress-circle").innerText = "0%";
    document.getElementById("ap-render-time-est").innerText = "인코딩 대기 중...";
    
    apCurrentTime = 0;
    apRecordedChunks = [];
    apPlayerDrawCurrentFrame();
    
    const canvas = document.getElementById("ap-player-canvas");
    
    // Set actual canvas dimension
    if (project.aspectRatio === "9:16") {
        canvas.width = 720;
        canvas.height = 1280;
    } else {
        canvas.width = 1280;
        canvas.height = 720;
    }
    
    try {
        apAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        await apAudioCtx.resume();
        const dest = apAudioCtx.createMediaStreamDestination();
        const narrationBuffers = await prefetchNarrationBuffers(project);
        if (!apIsRendering) return;

        apRenderTimeline = buildEffectiveRenderTimeline(project, narrationBuffers);
        apLastRenderTimeline = {
            projectId: project.id,
            totalDuration: apRenderTimeline.totalDuration,
            scenes: apRenderTimeline.scenes.map(item => ({
                sceneId: item.sceneId,
                offset: item.offset,
                end: item.end,
                configuredSceneDuration: item.configuredSceneDuration,
                effectiveDuration: item.effectiveDuration
            }))
        };

        let bgmBuffer = null;
        if (apBgmFile) {
            document.getElementById("ap-render-status").innerText = "배경음악 디코딩 중…";
            try {
                bgmBuffer = await decodeAudioBuffer(apAudioCtx, await readFileAsArrayBuffer(apBgmFile));
            } catch (error) {
                console.warn("BGM decode failed; rendering without BGM.", error);
                document.getElementById("ap-render-status").innerText = "배경음악을 읽지 못해 TTS/무음으로 계속합니다.";
            }
        }

        const bgmGain = apAudioCtx.createGain();
        bgmGain.gain.value = 0.2;
        bgmGain.connect(dest);
        const ttsGain = apAudioCtx.createGain();
        ttsGain.gain.value = 1.0;
        ttsGain.connect(dest);

        apRenderStartAt = apAudioCtx.currentTime + 0.15;
        if (bgmBuffer) {
            apRenderBgmSourceNode = apAudioCtx.createBufferSource();
            apRenderBgmSourceNode.buffer = bgmBuffer;
            apRenderBgmSourceNode.loop = true;
            apRenderBgmSourceNode.connect(bgmGain);
            apRenderBgmSourceNode.start(apRenderStartAt);
            apRenderSourceNodes.push(apRenderBgmSourceNode);
        }
        apRenderTimeline.scenes.forEach(timing => {
            if (!timing.audioBuffer) return;
            const source = apAudioCtx.createBufferSource();
            source.buffer = timing.audioBuffer;
            source.connect(ttsGain);
            source.start(apRenderStartAt + timing.offset);
            apRenderSourceNodes.push(source);
        });

        const canvasStream = canvas.captureStream(30);
        apStartMediaRecorder(canvasStream, dest.stream, apRenderTimeline.totalDuration, apRenderStartAt);
    } catch (error) {
        if (apRenderCancelled || (error && error.category === "cancelled")) return;
        console.error("Rendering setup failed", error);
        apIsRendering = false;
        document.getElementById("ap-render-overlay").style.display = "none";
        stopRenderResources({ abortRequests: true });
        alert(apiErrorMessage(error));
    }
}

function apStartMediaRecorder(canvasStream, audioStream, totalDuration, renderStartAt) {
    const combinedStream = new MediaStream();
    apCombinedStream = combinedStream;
    
    // Add canvas video track
    canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
    
    // Add audio track if available
    if (audioStream) {
        audioStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
    }
    
    let options = { mimeType: 'video/webm;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm;codecs=vp8' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/webm' };
        }
    }
    
    try {
        apMediaRecorder = new MediaRecorder(combinedStream, options);
    } catch (e) {
        console.error("Recorder initialization fallback", e);
        apMediaRecorder = new MediaRecorder(combinedStream);
    }
    
    apMediaRecorder.ondataavailable = function(e) {
        if (e.data && e.data.size > 0) {
            apRecordedChunks.push(e.data);
        }
    };
    
    apMediaRecorder.onstop = function() {
        if (apRenderCancelled) {
            stopRenderResources({ abortRequests: true });
            return;
        }
        apFinishRendering();
    };
    
    apMediaRecorder.start();
    apRenderStartAt = renderStartAt;
    apRenderLoop(totalDuration, renderStartAt);
}

function apRenderLoop(totalDuration, renderStartAt) {
    if (!apIsRendering) return;

    apCurrentTime = Math.max(0, apAudioCtx.currentTime - renderStartAt);
    
    if (apCurrentTime >= totalDuration) {
        apCurrentTime = totalDuration;
        apPlayerDrawCurrentFrame();
        
        if (apMediaRecorder && apMediaRecorder.state !== "inactive") {
            apMediaRecorder.stop();
        }
        return;
    }
    
    apPlayerDrawCurrentFrame();
    
    // Update progress overlay
    const progress = Math.min((apCurrentTime / totalDuration) * 100, 99.9);
    document.getElementById("ap-render-progress-circle").innerText = `${Math.round(progress)}%`;
    document.getElementById("ap-render-status").innerText = `인코딩 진행 중... (${apCurrentTime.toFixed(1)}s / ${totalDuration.toFixed(1)}s)`;
    
    const remainingTime = totalDuration - apCurrentTime;
    document.getElementById("ap-render-time-est").innerText = `예상 남은 시간: 약 ${remainingTime.toFixed(1)}초`;
    
    requestAnimationFrame(() => apRenderLoop(totalDuration, renderStartAt));
}

function apFinishRendering() {
    apIsRendering = false;
    document.getElementById("ap-render-overlay").style.display = "none";
    
    stopRenderResources();
    
    const blob = new Blob(apRecordedChunks, { type: 'video/webm' });
    const videoUrl = URL.createObjectURL(blob);
    
    const resultContainer = document.getElementById("ap-result-container");
    resultContainer.style.display = "flex";
    
    const videoElement = document.getElementById("ap-rendered-video");
    videoElement.src = videoUrl;
    
    const downloadLink = document.getElementById("ap-download-link");
    downloadLink.href = videoUrl;
    
    const project = state.videoProjects.find(vp => vp.id === state.activeVideoProjectId);
    const title = project ? project.title : "untitled";
    const safeTitle = title.replace(/[^a-zA-Z0-9가-힣\s-_]/g, "").trim().replace(/\s+/g, "_");
    downloadLink.download = `${safeTitle || "video"}.webm`;

    apRenderTimeline = null;
    apPlayerInit(); // Reset player canvas bounds
    showToast("렌더링 완료 ✓");
}

function formatSrtTimestamp(seconds) {
    const totalMilliseconds = Math.max(0, Math.round(seconds * 1000));
    const hours = Math.floor(totalMilliseconds / 3600000);
    const minutes = Math.floor((totalMilliseconds % 3600000) / 60000);
    const secs = Math.floor((totalMilliseconds % 60000) / 1000);
    const millis = totalMilliseconds % 1000;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

function getSrtTimeline(project) {
    if (apLastRenderTimeline && apLastRenderTimeline.projectId === project.id) return apLastRenderTimeline;
    let offset = 0;
    return {
        projectId: project.id,
        totalDuration: project.scenes.reduce((sum, scene) => sum + Math.max(0.1, Number(scene.duration) || 5), 0),
        scenes: project.scenes.map(scene => {
            const duration = Math.max(0.1, Number(scene.duration) || 5);
            const timing = { sceneId: scene.id, offset, end: offset + duration, effectiveDuration: duration };
            offset += duration;
            return timing;
        })
    };
}

function buildSrtContent(project, timeline = getSrtTimeline(project)) {
    return timeline.scenes.map((timing, index) => {
        const scene = project.scenes.find(item => item.id === timing.sceneId);
        const text = ((scene && (scene.caption || scene.narration)) || "").trim().replace(/\r\n?/g, "\n");
        return `${index + 1}\n${formatSrtTimestamp(timing.offset)} --> ${formatSrtTimestamp(timing.end)}\n${text}`;
    }).join("\n\n") + "\n";
}

function downloadSrtForActiveProject() {
    const project = state.videoProjects.find(vp => vp.id === state.activeVideoProjectId);
    if (!project || project.scenes.length === 0) {
        alert("자막을 내보낼 비디오 프로젝트가 없습니다.");
        return;
    }
    const safeTitle = (project.title || "subtitles").replace(/[^a-zA-Z0-9가-힣\s-_]/g, "").trim().replace(/\s+/g, "_") || "subtitles";
    const blob = new Blob([buildSrtContent(project)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeTitle}.srt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast("SRT 자막 내보냄 ✓");
}

function cancelVideoRendering() {
    if (!apIsRendering) return;
    apRenderCancelled = true;
    apIsRendering = false;
    apRenderAbortControllers.forEach(controller => controller.abort());
    apRenderSourceNodes.forEach(source => {
        try { source.stop(); } catch (error) {}
    });

    if (apMediaRecorder && apMediaRecorder.state !== "inactive") {
        apMediaRecorder.stop();
    } else {
        stopRenderResources({ abortRequests: true });
    }
    
    apRecordedChunks = [];
    document.getElementById("ap-render-overlay").style.display = "none";
    
    apRenderTimeline = null;
    apPlayerStop();
    showToast(apiErrorMessage(new YphApiError("cancelled", "Rendering cancelled.")));
}

function handleBgmUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    apBgmFile = file;
    apBgmAudioUrl = URL.createObjectURL(file);
    document.getElementById("ap-bgm-status").innerText = `배경음악: ${file.name}`;
    
    if (apBgmAudioElement) {
        apBgmAudioElement.src = apBgmAudioUrl;
    } else {
        apBgmAudioElement = new Audio(apBgmAudioUrl);
        apBgmAudioElement.loop = true;
    }
    showToast("배경음악 등록됨 ✓");
}
