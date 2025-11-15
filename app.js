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
            
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
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
            showToast('Будь ласка, введіть API ключ у налаштуваннях', 'error');
        }
        return;
    }
    
    addMessage('user', message);
    input.value = '';
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
        showToast('Помилка при отриманні відповіді', 'error');
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
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'icon-btn';
        copyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
        `;
        copyBtn.onclick = () => copyToClipboard(content);
        
        actionsDiv.appendChild(copyBtn);
        contentDiv.appendChild(actionsDiv);
    }
    
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
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

// Копіювання в буфер обміну (правильно)
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Скопійовано в буфер обміну', 'success');
    } catch (err) {
        // Fallback для старих браузерів
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Скопійовано в буфер обміну', 'success');
        } catch (err) {
            showToast('Помилка копіювання', 'error');
        }
        document.body.removeChild(textArea);
    }
}

// Завантаження зображення
function downloadImage(imagePath) {
    fetch(imagePath)
        .then(response => response.blob())
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = imagePath.split('/').pop();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Зображення завантажено', 'success');
        })
        .catch(() => {
            showToast('Помилка завантаження', 'error');
        });
}

// Показати сповіщення (Toast)
function showToast(message, type = 'success') {
    // Видалити попередні toast, якщо є
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '✓' : '✕';
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInUp 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// Ініціалізація галереї
function initGallery() {
    loadImages();
}

// Завантаження зображень
async function loadImages() {
    const galleryGrid = document.getElementById('gallery-grid');
    
    // Список зображень (оновіть своїми іменами файлів)
    const imageList = [
        'dodep-coder.png',
        'dodep-ninja.png',
        'dodeper.png',
        'dodeper1.png'
    ];
    
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
        
        const wrapper = document.createElement('div');
        wrapper.className = 'gallery-image-wrapper';
        wrapper.onclick = () => openImageModal(imagePath);
        
        const img = document.createElement('img');
        img.src = imagePath;
        img.alt = imageName;
        img.className = 'gallery-image';
        
        const overlay = document.createElement('div');
        overlay.className = 'gallery-overlay';
        overlay.innerHTML = `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
            </svg>
        `;
        
        wrapper.appendChild(img);
        wrapper.appendChild(overlay);
        
        const actions = document.createElement('div');
        actions.className = 'gallery-actions';
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-secondary';
        copyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Копіювати
        `;
        copyBtn.onclick = () => copyImageToClipboard(imagePath);
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn-primary';
        downloadBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Завантажити
        `;
        downloadBtn.onclick = () => downloadImage(imagePath);
        
        actions.appendChild(copyBtn);
        actions.appendChild(downloadBtn);
        
        item.appendChild(wrapper);
        item.appendChild(actions);
        
        galleryGrid.appendChild(item);
    });
}

// Копіювати зображення в буфер обміну
async function copyImageToClipboard(imagePath) {
    try {
        const response = await fetch(imagePath);
        const blob = await response.blob();
        
        await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
        ]);
        
        showToast('Зображення скопійовано', 'success');
    } catch (err) {
        // Fallback: копіювати шлях
        await copyToClipboard(imagePath);
    }
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
        
        html += `<div class="doc-actions">`;
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-primary';
        copyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Копіювати
        `;
        
        html += `</div>`;
        card.innerHTML = html;
        
        const actionsDiv = card.querySelector('.doc-actions');
        actionsDiv.appendChild(copyBtn);
        
        copyBtn.onclick = () => copyToClipboard(fullText);
        
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
    
    window.GEMINI_MODELS.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
    });
    
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
            showToast('Історію чату очищено', 'success');
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
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'icon-btn';
        copyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
        `;
        copyBtn.onclick = () => copyToClipboard(content);
        
        actionsDiv.appendChild(copyBtn);
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
            copyImageToClipboard(currentImage);
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
