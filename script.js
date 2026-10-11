// Active Menu Item Logic
const menuItems = document.querySelectorAll('.menu-item');

menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
        // Remove active class from all
        menuItems.forEach(m => m.classList.remove('active'));
        // Add active class to clicked
        item.classList.add('active');
    });
});

// Chat Widget Toggle Logic
const chatFab = document.getElementById('chatFab');
const chatWidget = document.getElementById('chatWidget');
const closeChatBtn = document.getElementById('closeChatBtn');

if (chatFab && chatWidget && closeChatBtn) {
    chatFab.addEventListener('click', () => {
        chatWidget.classList.toggle('open');
    });

    closeChatBtn.addEventListener('click', () => {
        chatWidget.classList.remove('open');
    });
}

// Dummy Data logic removed as we are transitioning to a Knowledge Base layout.
function initKnowledgeData() {
    // We will put static content in HTML instead.
}
initKnowledgeData();

// --- AI Chat Logic Below ---
const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const stopBtn = document.getElementById('stopBtn');
let currentAbortController = null;

// This should point to your backend. When running in docker-compose locally, it's mapped to localhost:3000
const API_URL = 'http://localhost:3000/api/chat'; 
function appendUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message user-message';
    msgDiv.innerHTML = `
        <div class="avatar"><i class="fa-solid fa-user"></i></div>
        <div class="content">${escapeHTML(text)}</div>
    `;
    chatBox.appendChild(msgDiv);
    scrollToBottom();
}

function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'message ai-message typing-indicator-container';
    indicator.id = 'typingIndicator';
    indicator.innerHTML = `
        <div class="avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    chatBox.appendChild(indicator);
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}

function appendAIMessageStreaming() {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ai-message';
    msgDiv.innerHTML = `
        <div class="avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="content"></div>
    `;
    chatBox.appendChild(msgDiv);
    scrollToBottom();
    return msgDiv.querySelector('.content');
}

function setUIGenerating(isGenerating) {
    if (isGenerating) {
        sendBtn.style.display = 'none';
        stopBtn.style.display = 'flex';
    } else {
        sendBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
    }
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // UI Updates
    userInput.value = '';
    appendUserMessage(text);
    showTypingIndicator();
    setUIGenerating(true);
    
    currentAbortController = new AbortController();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: text }),
            signal: currentAbortController.signal
        });

        hideTypingIndicator();

        if (response.ok) {
            const contentDiv = appendAIMessageStreaming();
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                // Replace newlines with <br> and safely escape
                const formattedChunk = escapeHTML(chunk).replace(/\n/g, '<br>');
                contentDiv.innerHTML += formattedChunk;
                scrollToBottom();
            }
        } else {
            appendAIMessageStreaming().innerHTML = `Error: Something went wrong.`;
        }
    } catch (error) {
        hideTypingIndicator();
        if (error.name === 'AbortError') {
            const contentDiv = appendAIMessageStreaming();
            contentDiv.innerHTML = `<em>[เธซเธขเธธเธ”เธเธฒเธฃเธชเธฃเนเธฒเธเธเนเธญเธเธงเธฒเธกเนเธฅเนเธง]</em>`;
            contentDiv.style.color = 'var(--secondary)';
        } else {
            const contentDiv = appendAIMessageStreaming();
            contentDiv.innerHTML = 'Error: Could not connect to the server. Is the backend running?';
            console.error('Chat API Error:', error);
        }
    } finally {
        setUIGenerating(false);
        currentAbortController = null;
    }
}

const resetChatBtn = document.getElementById('resetChatBtn');

if (resetChatBtn) {
    resetChatBtn.addEventListener('click', () => {
        if (!chatBox) return;
        
        // Use the appropriate greeting based on the current page
        const currentUrl = window.location.href.toLowerCase();
        let greetingText = "สวัสดีครับ! 🤖 มีอะไรให้ผมช่วยแนะนำเกี่ยวกับคอมพิวเตอร์ไหมครับ?";
        
        if (currentUrl.includes('page3')) {
            greetingText = "สวัสดีครับ! 🤖 มีข้อเสนอแนะเกี่ยวกับเว็บไซต์พิมพ์บอกผมได้เลยนะครับ!";
        } else if (currentUrl.includes('index.html') || currentUrl.endsWith('/')) {
            greetingText = "สวัสดีครับ! 🤖 ยินดีต้อนรับสู่หน้าแรก มีอะไรให้ผมช่วยแนะนำไหมครับ?";
        }
            
        chatBox.innerHTML = `
            <div class="message ai-message">
                <div class="avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="content">${greetingText}</div>
            </div>
        `;
        
        // Optional: Call a backend endpoint to clear history if one exists
        try { fetch(API_URL + '/reset', { method: 'POST' }).catch(() => {}); } catch(e) {}
    });
}

// Event Listeners
if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
}
if (stopBtn) {
    stopBtn.addEventListener('click', () => {
        if (currentAbortController) {
            currentAbortController.abort();
        }
    });
}
if (userInput) {
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// --- Particle Background Effect (Tech Theme) ---
function initParticles() {
    const tsParticlesScript = document.createElement('script');
    tsParticlesScript.src = 'https://cdn.jsdelivr.net/npm/tsparticles@2/tsparticles.bundle.min.js';
    tsParticlesScript.onload = function() {
        // Robust check using URL and H1 content
        const currentUrl = window.location.href.toLowerCase();
        const h1 = document.querySelector('h1');
        const h1Text = h1 ? h1.innerText : "";
        
        const isPage2 = currentUrl.includes('page2') || h1Text.includes('วิดีโอ');
        const isPage3 = currentUrl.includes('page3') || h1Text.includes('ผู้จัดทำ');

        // --- 1. Outer Web Background (Subtle Matrix Nodes) ---
        const outerDiv = document.createElement('div');
        outerDiv.id = 'tsparticles';
        outerDiv.style.position = 'fixed';
        outerDiv.style.top = '0';
        outerDiv.style.left = '0';
        outerDiv.style.width = '100vw';
        outerDiv.style.height = '100vh';
        outerDiv.style.zIndex = '-1'; 
        document.body.prepend(outerDiv);

        let outerParticlesConfig = {
            fpsLimit: 60,
            background: { color: { value: "transparent" } },
            particles: {
                color: { value: ["#ffffff", "#38bdf8"] },
                links: { color: "#38bdf8", distance: 150, enable: true, opacity: 0.2, width: 1 },
                move: { enable: true, speed: 1 },
                number: { density: { enable: true, area: 1000 }, value: 50 },
                opacity: { value: 0.3 },
                size: { value: { min: 1, max: 2 } }
            }
        };

        tsParticles.load("tsparticles", outerParticlesConfig);

        // --- 2. Inner Frame Background (Intense AI Brain) ---
        const innerDiv = document.createElement('div');
        innerDiv.id = 'tsparticles-inner';
        innerDiv.style.position = 'absolute';
        innerDiv.style.top = '0';
        innerDiv.style.left = '0';
        innerDiv.style.width = '100%';
        innerDiv.style.height = '100%';
        innerDiv.style.zIndex = '-1';
        
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.prepend(innerDiv);
        }

        let innerParticlesConfig = {
            fpsLimit: 60,
            background: { color: { value: "transparent" } },
            interactivity: {
                events: {
                    onHover: { enable: true, mode: "repulse" },
                    resize: true,
                },
                modes: {
                    repulse: { distance: 100, duration: 0.4 }
                },
            },
            particles: {
                color: { value: ["#00f0ff", "#ff00ea"] },
                links: {
                    color: "random", distance: 100, enable: true, opacity: 0.5, width: 1.5,
                    triangles: { enable: true, opacity: 0.1 }
                },
                move: { enable: true, speed: 2 },
                number: { density: { enable: true, area: 800 }, value: 80 },
                opacity: { value: 0.8, animation: { enable: true, speed: 2, minimumValue: 0.3 } },
                size: { value: { min: 1, max: 3 } },
                shadow: { enable: true, color: "#00f0ff", blur: 10 }
            }
        };

        tsParticles.load("tsparticles-inner", innerParticlesConfig);
    };
    document.head.appendChild(tsParticlesScript);
}
initParticles();








// --- WOW Visual Effects ---

// 1. Scroll Reveal Animation
document.addEventListener("DOMContentLoaded", () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-visible');
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    const elementsToReveal = document.querySelectorAll('.article-content, .step-img, .profile-container, .video-container');
    elementsToReveal.forEach(el => {
        el.classList.add('reveal-hidden');
        observer.observe(el);
    });
});

// 2. Interactive Glass Spotlight
document.addEventListener("DOMContentLoaded", () => {
    const cards = document.querySelectorAll('.article-content, .profile-container');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
});

// --- Global Mouse Aurora Glow ---
document.addEventListener("DOMContentLoaded", () => {
    const glow = document.createElement('div');
    glow.className = 'global-mouse-glow';
    document.body.appendChild(glow);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let glowX = mouseX;
    let glowY = mouseY;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Smooth follow animation
    function animateGlow() {
        glowX += (mouseX - glowX) * 0.1;
        glowY += (mouseY - glowY) * 0.1;
        glow.style.transform = `translate(${glowX}px, ${glowY}px)`;
        requestAnimationFrame(animateGlow);
    }
    animateGlow();
});

