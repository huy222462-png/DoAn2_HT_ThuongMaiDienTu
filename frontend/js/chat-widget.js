/**
 * Chat Widget MVP
 */

(function initChatWidget() {
  const chatRoot = document.createElement('div');
  chatRoot.id = 'chatWidgetRoot';
  chatRoot.innerHTML = `
    <button id="chatToggleBtn" class="chat-toggle-btn" type="button" aria-label="Mở chatbot">
      <i class="fas fa-comment-dots"></i>
    </button>

    <div id="chatPanel" class="chat-panel" style="display: none;">
      <div class="chat-header">
        <div>
          <strong>Trợ lý mua sắm</strong>
          <div class="chat-subtitle">Hỗ trợ nhanh 24/7</div>
        </div>
        <button id="chatCloseBtn" class="chat-close-btn" type="button" aria-label="Đóng chatbot">×</button>
      </div>

      <div id="chatMessages" class="chat-messages"></div>

      <form id="chatForm" class="chat-form">
        <input id="chatInput" type="text" placeholder="Nhập câu hỏi..." maxlength="1200" autocomplete="off" />
        <button type="submit">Gửi</button>
      </form>
    </div>
  `;

  document.body.appendChild(chatRoot);

  const chatToggleBtn = document.getElementById('chatToggleBtn');
  const chatCloseBtn = document.getElementById('chatCloseBtn');
  const chatPanel = document.getElementById('chatPanel');
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');

  const conversationHistory = [];

  const appendMessage = (role, text) => {
    const message = document.createElement('div');
    message.className = `chat-message ${role}`;
    message.textContent = text;
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return message;
  };

  const appendChoices = (choices = []) => {
    if (!Array.isArray(choices) || choices.length === 0) {
      return;
    }

    const visibleChoices = choices.slice(0, 2);
    const wrapper = document.createElement('div');
    wrapper.className = 'chat-choice-grid';

    visibleChoices.forEach((choice) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chat-choice-card';
      button.textContent = String(choice.label || 'Lua chon');

      button.addEventListener('click', () => {
        const actionType = String(choice.type || 'message').toLowerCase();
        const value = String(choice.value || '').trim();
        if (!value) {
          return;
        }

        if (actionType === 'link') {
          window.location.href = value;
          return;
        }

        sendMessage(value, { displayText: String(choice.label || value) });
      });

      wrapper.appendChild(button);
    });

    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const appendTyping = () => {
    const typing = document.createElement('div');
    typing.className = 'chat-message bot chat-typing';
    typing.id = 'chatTyping';
    typing.textContent = 'Đang trả lời...';
    chatMessages.appendChild(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const removeTyping = () => {
    const typing = document.getElementById('chatTyping');
    if (typing) typing.remove();
  };

  const openChat = () => {
    chatPanel.style.display = 'flex';
    chatInput.focus();
  };

  const closeChat = () => {
    chatPanel.style.display = 'none';
  };

  chatToggleBtn.addEventListener('click', openChat);
  chatCloseBtn.addEventListener('click', closeChat);

  appendMessage('bot', 'Xin chào! Mình có thể tư vấn sản phẩm, giao hàng, đổi trả và hỗ trợ mua sắm cho bạn.');

  const sendMessage = async (rawMessage, options = {}) => {
    const message = String(rawMessage || '').trim();
    if (!message) return;

    const displayText = String(options.displayText || message);
    appendMessage('user', displayText);
    conversationHistory.push({ role: 'user', content: message });
    chatInput.value = '';
    appendTyping();

    try {
      const response = await fetch(`${API_BASE_URL}/chat/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          history: conversationHistory.slice(-6)
        })
      });

      const data = await response.json();
      removeTyping();

      if (!response.ok || !data.success) {
        appendMessage('bot', data.message || 'Mình đang bận, bạn vui lòng thử lại sau nhé.');
        return;
      }

      const answer = data.data?.answer || 'Mình chưa có thông tin phù hợp để trả lời.';
      appendMessage('bot', answer);
      conversationHistory.push({ role: 'assistant', content: answer });

      const suggestions = Array.isArray(data.data?.suggestions) ? data.data.suggestions : [];
      if (suggestions.length > 0) {
        appendChoices(suggestions);
      }
    } catch (error) {
      removeTyping();
      appendMessage('bot', 'Không thể kết nối chatbot. Bạn thử lại sau giúp mình nhé.');
      console.error('Chat widget error:', error);
    }
  };

  chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    await sendMessage(message);
  });
})();
