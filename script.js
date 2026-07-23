// ============================================
// Exact Linux Terminal AI Engine (Gemini API with Auto-Fallback)
// ============================================

const FALLBACK_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash"
];

function getActiveApiKey() {
    if (typeof window !== 'undefined' && window.API_KEY) return window.API_KEY;
    return "";
}

const jokeBtn = document.getElementById('jokeBtn');
const clearBtn = document.getElementById('clearBtn');
const jokeDisplay = document.getElementById('jokeDisplay');
const cliForm = document.getElementById('cliForm');
const cliInput = document.getElementById('cliInput');

function appendLog(cmd, htmlContent) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.style.marginTop = '10px';
    entry.innerHTML = `
        <div>
            <span class="prompt-text">yusuf@clr4:~$</span> <span class="cmd-text">${escapeHtml(cmd)}</span>
        </div>
        <div style="margin-top: 4px;">${htmlContent}</div>
    `;
    jokeDisplay.appendChild(entry);
    jokeDisplay.scrollTop = jokeDisplay.scrollHeight;
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const getJokePrompt = () => {
    const randomNum = Math.floor(Math.random() * 10000);
    return `Tell me a short, funny, clean joke. Unique seed: ${randomNum}. Just give me the joke directly without any intro or outro.`;
};

async function fetchAIResponse(promptText, commandName = 'ai') {
    const loadingId = 'loading-' + Date.now();
    appendLog(commandName, `<div id="${loadingId}" class="loading-text">🔄 Fetching AI response...</div>`);

    const currentKey = getActiveApiKey();

    if (!currentKey) {
        const loadingElem = document.getElementById(loadingId);
        if (loadingElem) loadingElem.outerHTML = `<div class="error-text">❌ API Key missing. Please refresh (Ctrl + F5).</div>`;
        return;
    }

    let lastError = null;

    for (const model of FALLBACK_MODELS) {
        try {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }]
                })
            });

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (response.ok && text) {
                const loadingElem = document.getElementById(loadingId);
                if (loadingElem) loadingElem.outerHTML = `<div class="response-text">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
                return;
            }

            if (data.error) {
                lastError = data.error.message;
                if (response.status === 429 || response.status === 404) {
                    console.warn(`Model ${model} returned ${response.status}. Trying fallback...`);
                    continue;
                } else {
                    throw new Error(data.error.message);
                }
            }
        } catch (err) {
            lastError = err.message;
        }
    }

    const loadingElem = document.getElementById(loadingId);
    if (loadingElem) {
        loadingElem.outerHTML = `<div class="error-text">❌ API Error: ${escapeHtml(lastError || 'Rate limit reached. Please retry in 10-20 seconds.')}</div>`;
    }
}

if (jokeBtn) {
    jokeBtn.addEventListener('click', () => {
        fetchAIResponse(getJokePrompt(), 'joke');
    });
}

if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        jokeDisplay.innerHTML = `
            <div class="log-entry">
                <span class="prompt-text">yusuf@clr4:~$</span> <span class="cmd-text">clear</span>
            </div>
        `;
    });
}

if (cliForm) {
    cliForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = cliInput.value.trim();
        if (!val) return;

        cliInput.value = '';

        const lower = val.toLowerCase();
        if (lower === 'joke' || lower === 'tell joke') {
            fetchAIResponse(getJokePrompt(), 'joke');
        } else if (lower === 'clear' || lower === 'cls') {
            clearBtn.click();
        } else if (lower === 'neofetch') {
            appendLog('neofetch', '<div class="response-text">Neofetch details displayed above.</div>');
        } else {
            fetchAIResponse(val, val);
        }
    });
}