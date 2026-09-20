import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client@2.7.0/+esm";

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-sidebar');
    const newChatBtn = document.querySelector('.btn-new-chat');
    const chatForm = document.querySelector('.input-form');
    const chatInput = document.getElementById('chat-input');
    const shareBtn = document.getElementById('btn-share');
    const messagesViewport = document.querySelector('.messages-viewport');

    const SPACE_ID = "Kokasospoperor/rotary-llm";
    const HF_TOKEN_KEY = "spreeuw_hf_token";

    let currentJob = null;
    let app = null;
    let chats = JSON.parse(localStorage.getItem('spreeuw_chats')) || [];
    let currentChatId = localStorage.getItem('spreeuw_current_chat_id');

    // Asset path detection
    const isSubdir = window.location.pathname.includes('/spreeuw-llm/');
    const assetPrefix = isSubdir ? '' : 'spreeuw-llm/';

    function getHfToken() {
        return localStorage.getItem(HF_TOKEN_KEY) || "";
    }

    function promptForHfToken(reason) {
        const current = getHfToken();
        const token = window.prompt(
            (reason || "ZeroGPU vereist een Hugging Face token.") +
                "\n\nPlak een read-token van https://huggingface.co/settings/tokens\n(Laat leeg om te wissen.)",
            current
        );
        if (token === null) return getHfToken();
        const trimmed = token.trim();
        if (trimmed) {
            localStorage.setItem(HF_TOKEN_KEY, trimmed);
        } else {
            localStorage.removeItem(HF_TOKEN_KEY);
        }
        app = null;
        return trimmed;
    }

    async function ensureClient() {
        if (app) return app;

        const options = { events: ["data", "status"] };
        const token = getHfToken();
        if (token) {
            options.token = token;
        }

        try {
            app = await Client.connect(SPACE_ID, options);
            return app;
        } catch (error) {
            const message = error?.message || String(error);
            if (/NetworkError|Failed to fetch|fetch resource/i.test(message)) {
                throw new Error(
                    "Geen verbinding met de Hugging Face Space. Open deze pagina via http:// (niet als lokaal bestand) en controleer of de Space online is."
                );
            }
            throw error;
        }
    }

    async function cancelCurrentJob() {
        if (!currentJob) return;
        try {
            if (typeof currentJob.cancel === "function") {
                await currentJob.cancel();
            }
        } catch (e) {
            console.warn("Could not cancel job:", e);
        }
        currentJob = null;
    }

    // Initialize
    if (chats.length === 0) {
        createNewChat();
    } else {
        if (!currentChatId || !chats.find(c => c.id === currentChatId)) {
            currentChatId = chats[0].id;
        }
        renderSidebar();
        loadChat(currentChatId);
    }

    // Lucide icons initialisatie
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Sidebar toggle
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // New Chat button
    if (newChatBtn) {
        newChatBtn.addEventListener('click', async () => {
            await cancelCurrentJob();
            createNewChat();
        });
    }

    // Form submission
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = chatInput.value.trim();
            if (message && !currentJob) {
                // Save user message
                const chat = chats.find(c => c.id === currentChatId);
                if (chat) {
                    // Update title if it's the first user message
                    if (chat.messages.length === 1 && chat.messages[0].role === 'assistant') {
                        chat.title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
                        renderSidebar();
                    }
                    chat.messages.push({ role: 'user', text: message });
                    saveChats();
                }

                appendMessage('user', message, false); 
                chatInput.value = '';
                chatInput.style.height = 'auto';
                messagesViewport.scrollTop = messagesViewport.scrollHeight;
                runStreamingPrediction(message);
            }
        });
    }

    // Textarea auto-resize and enter handling
    if (chatInput) {
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = chatInput.scrollHeight + 'px';
        });

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                chatForm.dispatchEvent(new Event('submit'));
            }
        });

        // Share button
        if (shareBtn) {
            shareBtn.addEventListener('click', async () => {
                const text = `Check mijn chat met Spreeuw LLM!`;
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: 'Spreeuw LLM Chat',
                            text: text,
                            url: window.location.href
                        });
                    } catch (err) {
                        console.error('Share failed:', err);
                    }
                } else {
                    // Fallback to clipboard
                    try {
                        await navigator.clipboard.writeText(`${text} ${window.location.href}`);
                        alert('Link gekopieerd naar klembord!');
                    } catch (err) {
                        console.error('Clipboard failed:', err);
                    }
                }
            });
        }
    }

    function createNewChat() {
        const id = Date.now().toString();
        const newChat = {
            id: id,
            title: 'Nieuw gesprek',
            messages: [
                { role: 'assistant', text: 'Hallo! Ik ben Spreeuw. Hoe kan ik je vandaag helpen?' }
            ]
        };
        chats.unshift(newChat);
        currentChatId = id;
        saveChats();
        renderSidebar();
        loadChat(id);
        if (chatInput) {
            chatInput.value = '';
            chatInput.style.height = 'auto';
            chatInput.focus();
        }
    }

    function saveChats() {
        localStorage.setItem('spreeuw_chats', JSON.stringify(chats));
        localStorage.setItem('spreeuw_current_chat_id', currentChatId);
    }

    function renderSidebar() {
        const historyNav = document.querySelector('.sidebar-history');
        if (!historyNav) return;
        
        historyNav.innerHTML = '<div class="history-group">Recent Chats</div>';
        
        chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
            
            item.innerHTML = `
                <i data-lucide="message-square"></i>
                <span>${chat.title}</span>
                <button class="btn-delete-chat" title="Verwijder gesprek">
                    <i data-lucide="trash-2"></i>
                </button>
            `;
            
            item.onclick = (e) => {
                const deleteBtn = e.target.closest('.btn-delete-chat');
                if (deleteBtn) {
                    e.stopPropagation();
                    deleteChat(chat.id);
                } else {
                    switchChat(chat.id);
                }
            };
            
            historyNav.appendChild(item);
        });
        
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    async function switchChat(id) {
        if (id === currentChatId) return;
        await cancelCurrentJob();
        currentChatId = id;
        saveChats();
        renderSidebar();
        loadChat(id);
    }

    async function deleteChat(id) {
        if (!confirm('Weet je zeker dat je dit gesprek wilt verwijderen?')) return;
        
        if (currentChatId === id) {
            await cancelCurrentJob();
        }

        chats = chats.filter(c => c.id !== id);
        
        if (currentChatId === id) {
            if (chats.length > 0) {
                currentChatId = chats[0].id;
            } else {
                createNewChat();
                return;
            }
        }
        
        saveChats();
        renderSidebar();
        loadChat(currentChatId);
    }

    function loadChat(id) {
        const chat = chats.find(c => c.id === id);
        if (!chat) return;
        
        messagesViewport.innerHTML = '';
        chat.messages.forEach(msg => {
            appendMessage(msg.role, msg.text, false);
        });
        messagesViewport.scrollTop = messagesViewport.scrollHeight;
    }

    function appendMessage(role, text, shouldSave = true) {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${role}`;

        if (role === 'assistant') {
            wrapper.innerHTML = `
                <div class="avatar ai-avatar">
                    <video class="ai-video" src="${assetPrefix}starling.mp4" width="40" height="40" loop muted></video>
                </div>
                <div class="message-content">
                    <div class="message-box">
                        ${text.includes('<br>') || text.includes('<strong>') || text.includes('<code>') ? text : formatMarkdown(text)}
                    </div>
                </div>
            `;
            messagesViewport.appendChild(wrapper);
            const newVideo = wrapper.querySelector('.ai-video');
            return { wrapper, textElement: wrapper.querySelector('.message-box'), video: newVideo };
        } else {
            wrapper.innerHTML = `
                <div class="message-box">
                    ${formatMarkdown(text)}
                </div>
            `;
            messagesViewport.appendChild(wrapper);
            return { wrapper, textElement: wrapper.querySelector('.message-box') };
        }
    }

    async function runStreamingPrediction(textInput) {
        const { textElement, video } = appendMessage('assistant', 'Verbinden…', false);
        
        if (video) {
            video.play().catch(err => console.log("Video play failed:", err));
        }

        try {
            const client = await ensureClient();
            textElement.textContent = '…';

            currentJob = client.submit("/respond", {
                message: textInput,
                system_message: "Je bent een Nederlandssprekende AI-assistent.",
                max_tokens: 200,
                temperature: 0.9,
                top_p: 0.9
            });

            let finalText = '';
            let failed = false;

            for await (const event of currentJob) {
                if (event.type === "data" && Array.isArray(event.data) && event.data[0] != null) {
                    finalText = String(event.data[0]);
                    textElement.innerHTML = formatMarkdown(finalText);
                    messagesViewport.scrollTop = messagesViewport.scrollHeight;
                }

                if (event.type === "status") {
                    if (event.stage === "error") {
                        failed = true;
                        const errMsg = event.message || event.title || "Onbekende fout van de Space.";
                        console.error("Job error:", event);

                        if (/ZeroGPU|quota|token/i.test(errMsg + (event.title || ""))) {
                            const token = promptForHfToken(errMsg);
                            textElement.innerHTML = formatMarkdown(
                                token
                                    ? "HF-token opgeslagen. Stuur je bericht opnieuw."
                                    : errMsg + "\n\nVoeg een Hugging Face token toe om ZeroGPU te gebruiken."
                            );
                        } else {
                            textElement.innerHTML = formatMarkdown("Fout: " + errMsg);
                        }
                        break;
                    }

                    if (event.stage === "complete") {
                        break;
                    }
                }
            }

            if (!failed) {
                const chat = chats.find(c => c.id === currentChatId);
                if (chat) {
                    chat.messages.push({
                        role: 'assistant',
                        text: finalText ? formatMarkdown(finalText) : textElement.innerHTML
                    });
                    saveChats();
                }
            }

        } catch (error) {
            console.error("Fout tijdens stream:", error);
            textElement.innerHTML = formatMarkdown(
                "Er is een fout opgetreden: " + (error?.message || String(error))
            );
        } finally {
            if (video) {
                video.pause();
                video.currentTime = 0;
            }
            currentJob = null;
        }
    }

    function formatMarkdown(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    }
});
