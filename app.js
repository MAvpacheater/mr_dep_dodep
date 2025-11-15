// Глобальні змінні
let chatMessages = [];
let settings = {
    apiKey: '',
    model: 'gemini-2.0-flash-exp',
    temperature: 0.9,
    maxTokens: 2048
};
let currentImage = null;

// Ініціалізація при завантаженні
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initChat();
    initGallery();
    initDocs();
    initSettings();
    initModal();
    loadSettings();
    loadChatHistory();
});

// Навігація між сторінками
function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const pageName = btn.dataset.page;
            
            // Оновлення активної кнопки
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Показати відповідну сторінку
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(`${pageName}-page`).classList.add('active');
        });
    });
}

// Ініціалізація чату
function initChat() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// Відправка повідомлення
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message || !settings.apiKey) {
        if (!settings.apiKey) {
            alert('Будь ласка, введіть API ключ у налаштуваннях');
        }
        return;
    }
    
    // Додати повідомлення користувача
    addMessage('user', message);
    input.value = '';
    
    // Показати індикатор завантаження
    showLoading();
    
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${settings.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{
                            text: `Ти Mr Dep Dodep. Ось твоя повна характеристика:\n\n${window.FULL_CHARACTER_INFO}\n\nВідповідай від його імені, використовуючи його стиль мови, філософію та характер. Будь спокійним, виваженим, з тонким гумором та саркастичною ноткою. Твої фрази мають бути короткими та змістовними.\n\nПитання користувача: ${message}`
                        }]
                    }],
                    generationConfig: {
                        temperature: settings.temperature,
                        maxOutputTokens: settings.maxTokens
                    }
                })
            }
        );
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }
        
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Помилка отримання відповіді';
        
        hideLoading();
        addMessage('assistant', aiResponse);
        
    } catch (error) {
        hideLoading();
        addMessage('assistant', `Помилка: ${error.message}`);
    }
}

// Додати повідомлення в чат
function addMessage(role, content) {
    const messagesContainer = document.getElementById('chat-messages');
    const emptyState = messagesContainer.querySelector('.empty-state');
    
    if (emptyState) {
        emptyState.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    if (role === 'assistant') {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        actionsDiv.innerHTML = `
            <button class="icon-btn" onclick="copyText(\`${content.replace(/`/g, '\\`')}\`)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            </button>
            <button class="icon-btn" onclick="downloadText(\`${content.replace(/`/g, '\\`')}\`, 'mr-dep-message.txt')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
            </button>
        `;
        
        contentDiv.appendChild(actionsDiv);
    }
    
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Зберегти історію
    chatMessages.push({ role, content });
    saveChatHistory();
}

// Показати індикатор завантаження
function showLoading() {
    const messagesContainer = document.getElementById('chat-messages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant';
    loadingDiv.id = 'loading-message';
    loadingDiv.innerHTML = `
        <div class="message-content">
            <div class="loading-dots">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        </div>
    `;
    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Приховати індикатор завантаження
function hideLoading() {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

// Копіювання тексту
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Скопійовано!');
    });
}

// Завантаження тексту
function downloadText(text, filename) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Завантажено!');
}

// Показати сповіщення
function showNotification(message) {
    // Можна додати toast-повідомлення
    console.log(message);
}

// Ініціалізація галереї
function initGallery() {
    loadImages();
}

// Завантаження зображень
async function loadImages() {
    const galleryGrid = document.getElementById('gallery-grid');
    
    // Список зображень (додайте свої імена файлів)
    const imageList = [
        'mr-dep-1.jpg',
        'mr-dep-2.jpg',
        'mr-dep-3.jpg',
        'mr-dep-4.jpg'
    ];
    
    // Очистити порожній стан
    galleryGrid.innerHTML = '';
    
    if (imageList.length === 0) {
        galleryGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🖼️</div>
                <p>Додайте зображення в папку images/ вашого репозиторію</p>
            </div>
        `;
        return;
    }
    
    imageList.forEach(imageName => {
        const imagePath = `images/${imageName}`;
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `
            <div class="gallery-image-wrapper" onclick="openImageModal('${imagePath}')">
                <img src="${imagePath}" alt="${imageName}" class="gallery-image">
                <div class="gallery-overlay">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
                    </svg>
                </div>
            </div>
            <div class="gallery-actions">
                <button class="btn-secondary" onclick="copyText('${imagePath}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Копіювати
                </button>
                <button class="btn-primary" onclick="downloadImage('${imagePath}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Завантажити
                </button>
            </div>
        `;
        galleryGrid.appendChild(item);
    });
}

// Завантаження зображення
function downloadImage(imagePath) {
    const a = document.createElement('a');
    a.href = imagePath;
    a.download = imagePath.split('/').pop();
    a.click();
    showNotification('Завантажено!');
}

// Ініціалізація документації
function initDocs() {
    const docsGrid = document.getElementById('docs-grid');
    
    Object.values(window.CHARACTER_DATA).forEach(section => {
        const card = document.createElement('div');
        card.className = 'doc-card';
        
        let html = `<h3>${section.title}</h3>`;
        
        if (section.content) {
            html += `<p>${section.content}</p>`;
        }
        
        if (section.list) {
            html += '<ul>';
            section.list.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += '</ul>';
        }
        
        if (section.footer) {
            html += `<p>${section.footer}</p>`;
        }
        
        const fullText = `${section.title}\n\n${section.content || ''}\n${section.list ? section.list.join('\n') : ''}\n${section.footer || ''}`;
        
        html += `
            <div class="doc-actions">
                <button class="btn-secondary" onclick="copyText(\`${fullText.replace(/`/g, '\\`')}\`)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Копіювати
                </button>
                <button class="btn-primary" onclick="downloadText(\`${fullText.replace(/`/g, '\\`')}\`, 'mr-dep-${section.title.replace(/\s+/g, '-')}.txt')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Завантажити
                </button>
            </div>
        `;
        
        card.innerHTML = html;
        docsGrid.appendChild(card);
    });
}

// Ініціалізація налаштувань
function initSettings() {
    const modelSelect = document.getElementById('model-select');
    const tempSlider = document.getElementById('temperature');
    const tokensSlider = document.getElementById('max-tokens');
    const tempValue = document.getElementById('temp-value');
    const tokensValue = document.getElementById('tokens-value');
    const apiKeyInput = document.getElementById('api-key');
    const clearChatBtn = document.getElementById('clear-chat');
    
    // Заповнити список моделей
    window.GEMINI_MODELS.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
    });
    
    // Обробники подій
    apiKeyInput.addEventListener('change', () => {
        settings.apiKey = apiKeyInput.value;
        saveSettings();
    });
    
    modelSelect.addEventListener('change', () => {
        settings.model = modelSelect.value;
        saveSettings();
    });
    
    tempSlider.addEventListener('input', () => {
        settings.temperature = parseFloat(tempSlider.value);
        tempValue.textContent = settings.temperature.toFixed(1);
        saveSettings();
    });
    
    tokensSlider.addEventListener('input', () => {
        settings.maxTokens = parseInt(tokensSlider.value);
        tokensValue.textContent = settings.maxTokens;
        saveSettings();
    });
    
    clearChatBtn.addEventListener('click', () => {
        if (confirm('Ви впевнені, що хочете очистити всю історію чату?')) {
            chatMessages = [];
            localStorage.removeItem('mrDepChat');
            document.getElementById('chat-messages').innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h2>Привіт. Я Mr Dep Dodep.</h2>
                    <p>Задай своє питання, і я допоможу згенерувати ідеї для контенту.</p>
                </div>
            `;
            showNotification('Історію чату очищено');
        }
    });
}

// Збереження налаштувань
function saveSettings() {
    localStorage.setItem('mrDepSettings', JSON.stringify(settings));
}

// Завантаження налаштувань
function loadSettings() {
    const saved = localStorage.getItem('mrDepSettings');
    if (saved) {
        settings = JSON.parse(saved);
        
        document.getElementById('api-key').value = settings.apiKey;
        document.getElementById('model-select').value = settings.model;
        document.getElementById('temperature').value = settings.temperature;
        document.getElementById('max-tokens').value = settings.maxTokens;
        document.getElementById('temp-value').textContent = settings.temperature.toFixed(1);
        document.getElementById('tokens-value').textContent = settings.maxTokens;
    }
}

// Збереження історії чату
function saveChatHistory() {
    localStorage.setItem('mrDepChat', JSON.stringify(chatMessages));
}

// Завантаження історії чату
function loadChatHistory() {
    const saved = localStorage.getItem('mrDepChat');
    if (saved) {
        chatMessages = JSON.parse(saved);
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = '';
        
        chatMessages.forEach(msg => {
            addMessageToDOM(msg.role, msg.content);
        });
    }
}

// Додати повідомлення в DOM без збереження
function addMessageToDOM(role, content) {
    const messagesContainer = document.getElementById('chat-messages');
    const emptyState = messagesContainer.querySelector('.empty-state');
    
    if (emptyState) {
        emptyState.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    if (role === 'assistant') {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        actionsDiv.innerHTML = `
            <button class="icon-btn" onclick="copyText(\`${content.replace(/`/g, '\\`')}\`)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            </button>
            <button class="icon-btn" onclick="downloadText(\`${content.replace(/`/g, '\\`')}\`, 'mr-dep-message.txt')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
            </button>
        `;
        
        contentDiv.appendChild(actionsDiv);
    }
    
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
}

// Ініціалізація модального вікна
function initModal() {
    const modal = document.getElementById('image-modal');
    const backdrop = modal.querySelector('.modal-backdrop');
    const closeBtn = modal.querySelector('.modal-close');
    const copyBtn = document.getElementById('modal-copy');
    const downloadBtn = document.getElementById('modal-download');
    
    backdrop.addEventListener('click', closeImageModal);
    closeBtn.addEventListener('click', closeImageModal);
    
    copyBtn.addEventListener('click', () => {
        if (currentImage) {
            copyText(currentImage);
        }
    });
    
    downloadBtn.addEventListener('click', () => {
        if (currentImage) {
            downloadImage(currentImage);
        }
    });
}

// Відкрити модальне вікно з зображенням
function openImageModal(imagePath) {
    currentImage = imagePath;
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    
    modalImage.src = imagePath;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Закрити модальне вікно
function closeImageModal() {
    const modal = document.getElementById('image-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    currentImage = null;
}
