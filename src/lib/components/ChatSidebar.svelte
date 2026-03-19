<script lang="ts">
  import { onMount } from 'svelte';
  import { aiService } from '../utils/aiService';

  interface Props {
    onclose?: () => void;
    oninsertCode?: (detail: { code: string }) => void;
  }

  let { onclose, oninsertCode }: Props = $props();

  interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }

  let messages: Message[] = $state([]);
  let inputValue = $state('');
  let isLoading = $state(false);
  let messagesContainer: HTMLDivElement = $state(null as any);
  let isConfigured = $state(false);
  let showSettings = $state(false);
  let selectedProvider = $state('ollama');
  let claudeApiKey = $state('');
  let ollamaUrl = $state('http://localhost:11434/api');

  onMount(() => {
    const savedProvider = localStorage.getItem('chat_provider');
    const savedClaudeKey = localStorage.getItem('claude_api_key');
    const savedOllamaUrl = localStorage.getItem('ollama_url');

    if (savedProvider) selectedProvider = savedProvider;
    if (savedClaudeKey) claudeApiKey = savedClaudeKey;
    if (savedOllamaUrl) ollamaUrl = savedOllamaUrl;

    if (savedProvider === 'claude' && savedClaudeKey) {
      configureProvider('claude', savedClaudeKey);
    } else if (savedProvider === 'ollama') {
      configureProvider('ollama', '');
    }

    checkConfiguration();
  });

  function checkConfiguration() {
    const provider = aiService.getActiveProvider();
    isConfigured = provider !== null && (
      provider.apiKey !== undefined || selectedProvider === 'ollama'
    );
  }

  function configureProvider(provider: string, key: string) {
    if (provider === 'claude') {
      aiService.configureProvider('claude', key);
      aiService.setProvider('claude');
      localStorage.setItem('chat_provider', 'claude');
      localStorage.setItem('claude_api_key', key);
    } else if (provider === 'ollama') {
      aiService.configureProvider('ollama', '', { baseUrl: ollamaUrl });
      aiService.setProvider('ollama');
      localStorage.setItem('chat_provider', 'ollama');
      localStorage.setItem('ollama_url', ollamaUrl);
    }

    isConfigured = true;
    showSettings = false;
  }

  function handleSettingsSave() {
    if (selectedProvider === 'claude' && claudeApiKey.trim()) {
      configureProvider('claude', claudeApiKey.trim());
    } else if (selectedProvider === 'ollama') {
      configureProvider('ollama', '');
    }
  }

  function handleDisconnect() {
    claudeApiKey = '';
    localStorage.removeItem('chat_provider');
    localStorage.removeItem('claude_api_key');
    isConfigured = false;
  }

  async function sendMessage() {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now()
    };

    messages = [...messages, userMessage];
    const userInput = inputValue;
    inputValue = '';
    isLoading = true;

    setTimeout(scrollToBottom, 0);

    try {
      const response = await aiService.generateCode({
        prompt: userInput,
        language: 'javascript',
        context: messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')
      });

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content: response.code,
        timestamp: Date.now()
      };

      messages = [...messages, assistantMessage];
    } catch (error: any) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: Date.now()
      };
      messages = [...messages, errorMessage];
    } finally {
      isLoading = false;
      setTimeout(scrollToBottom, 0);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function clearChat() {
    messages = [];
  }
</script>

<div class="chat-sidebar">
  <div class="chat-header">
    <h2>AI Assistant</h2>
    <div class="header-actions">
      <button class="icon-btn" onclick={() => showSettings = !showSettings} title="Settings">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2"/>
        </svg>
      </button>
      <button class="icon-btn" onclick={() => onclose?.()} title="Close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  </div>

  {#if showSettings}
    <div class="settings-panel">
      <h3>Chat Provider Settings</h3>

      <div class="info-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
        <p><strong>Note:</strong> GitHub Copilot is for inline code completion only. For chat, use Claude or Ollama.</p>
      </div>

      {#if isConfigured}
        <div class="status-connected">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          <span>Connected to {selectedProvider === 'claude' ? 'Claude' : 'Ollama'}</span>
        </div>
        <button class="btn-secondary" onclick={handleDisconnect}>Disconnect</button>
      {:else}
        <div class="form-group">
          <label for="provider">AI Provider</label>
          <select id="provider" bind:value={selectedProvider} class="input">
            <option value="ollama">Ollama (Local - Free)</option>
            <option value="claude">Claude (Anthropic API)</option>
          </select>
        </div>

        {#if selectedProvider === 'claude'}
          <div class="form-group">
            <label for="claude-key">Claude API Key</label>
            <input
              id="claude-key"
              type="password"
              bind:value={claudeApiKey}
              placeholder="sk-ant-..."
              class="input"
            />
            <p class="help-text">
              Get your API key from <a href="https://console.anthropic.com/" target="_blank">Anthropic Console</a>
            </p>
          </div>
        {:else if selectedProvider === 'ollama'}
          <div class="form-group">
            <label for="ollama-url">Ollama URL</label>
            <input
              id="ollama-url"
              type="text"
              bind:value={ollamaUrl}
              placeholder="http://localhost:11434/api"
              class="input"
            />
            <p class="help-text">
              Install Ollama from <a href="https://ollama.ai" target="_blank">ollama.ai</a>, then run <code>ollama pull codellama</code>
            </p>
          </div>
        {/if}

        <div class="settings-actions">
          <button class="btn-primary" onclick={handleSettingsSave}>Connect</button>
          <button class="btn-secondary" onclick={() => showSettings = false}>Cancel</button>
        </div>
      {/if}
    </div>
  {/if}

  {#if !isConfigured && !showSettings}
    <div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
      <h3>Connect AI Provider</h3>
      <p>Configure an AI provider to start chatting</p>
      <button class="btn-primary" onclick={() => showSettings = true}>Configure</button>
    </div>
  {:else if isConfigured}
    <div class="chat-content">
      <div class="messages-container" bind:this={messagesContainer}>
        {#if messages.length === 0}
          <div class="empty-chat">
            <p>Start a conversation with the AI assistant</p>
            <div class="suggestions">
              <button class="suggestion" onclick={() => inputValue = 'Create a bar chart with D3.js'}>
                Create a bar chart
              </button>
              <button class="suggestion" onclick={() => inputValue = 'Load and analyze CSV data with Arquero'}>
                Analyze CSV data
              </button>
              <button class="suggestion" onclick={() => inputValue = 'Create an interactive plot with Observable Plot'}>
                Create a plot
              </button>
            </div>
          </div>
        {/if}

        {#each messages as message (message.id)}
          <div class="message message-{message.role}">
            <div class="message-avatar">
              {#if message.role === 'user'}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
                </svg>
              {:else}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              {/if}
            </div>
            <div class="message-content">
              <div class="message-text">{message.content}</div>
              {#if message.role === 'assistant' && message.content && !message.content.startsWith('Error:')}
                <button
                  class="insert-btn"
                  onclick={() => oninsertCode?.({ code: message.content })}
                  title="Insert into notebook"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12l7 7 7-7"/>
                  </svg>
                  Insert into notebook
                </button>
              {/if}
            </div>
          </div>
        {/each}

        {#if isLoading}
          <div class="message message-assistant">
            <div class="message-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div class="message-content">
              <div class="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <div class="chat-input-container">
        {#if messages.length > 0}
          <button class="clear-btn" onclick={clearChat} title="Clear chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        {/if}
        <textarea
          bind:value={inputValue}
          onkeydown={handleKeydown}
          placeholder="Ask anything... (Enter to send, Shift+Enter for new line)"
          class="chat-input"
          rows="1"
          disabled={isLoading}
        ></textarea>
        <button
          class="send-btn"
          onclick={sendMessage}
          disabled={!inputValue.trim() || isLoading}
          title="Send message"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .chat-sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #fafafa;
  }

  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid #e8e8e8;
    background-color: #ffffff;
  }

  .chat-header h2 {
    font-size: 1rem;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .icon-btn {
    background: transparent;
    border: none;
    padding: 0.35rem;
    color: #6b6b6b;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .icon-btn:hover {
    background-color: #f0f0f0;
    color: #1a1a1a;
  }

  .settings-panel {
    padding: 1rem;
    background-color: #ffffff;
    border-bottom: 1px solid #e8e8e8;
  }

  .settings-panel h3 {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 1rem 0;
  }

  .info-box {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem;
    background-color: #eff6ff;
    border: 1px solid #93c5fd;
    border-radius: 6px;
    color: #1e40af;
    font-size: 0.8125rem;
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .info-box svg { flex-shrink: 0; margin-top: 0.125rem; }
  .info-box p { margin: 0; }

  .info-box code {
    background-color: #dbeafe;
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
    font-family: 'Fira Code', monospace;
    font-size: 0.75rem;
  }

  .status-connected {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background-color: #f0fdf4;
    border: 1px solid #86efac;
    border-radius: 6px;
    color: #166534;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
  }

  .form-group { margin-bottom: 1rem; }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #1a1a1a;
    margin-bottom: 0.5rem;
  }

  .input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    transition: border-color 0.15s;
  }

  input.input { font-family: 'Fira Code', monospace; }
  select.input { font-family: inherit; cursor: pointer; }

  .input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .help-text { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }
  .help-text a { color: #3b82f6; text-decoration: none; }
  .help-text a:hover { text-decoration: underline; }

  .settings-actions { display: flex; gap: 0.5rem; }

  .btn-primary, .btn-secondary {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-primary { background-color: #1a1a1a; color: #ffffff; }
  .btn-primary:hover:not(:disabled) { background-color: #000000; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary { background-color: #f3f4f6; color: #1a1a1a; }
  .btn-secondary:hover { background-color: #e5e7eb; }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
    text-align: center;
    color: #6b7280;
  }

  .empty-state svg { margin-bottom: 1rem; color: #9ca3af; }
  .empty-state h3 { font-size: 1rem; font-weight: 600; color: #1a1a1a; margin: 0 0 0.5rem 0; }
  .empty-state p { font-size: 0.875rem; margin: 0 0 1.5rem 0; }

  .chat-content { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
  .messages-container { flex: 1; overflow-y: auto; padding: 1rem; }

  .empty-chat { text-align: center; padding: 2rem 1rem; color: #6b7280; }
  .empty-chat p { margin-bottom: 1.5rem; font-size: 0.875rem; }

  .suggestions { display: flex; flex-direction: column; gap: 0.5rem; }

  .suggestion {
    padding: 0.75rem;
    background-color: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 0.875rem;
    color: #1a1a1a;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
  }

  .suggestion:hover { background-color: #f9fafb; border-color: #d1d5db; }

  .message { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; }

  .message-avatar {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: #f3f4f6;
    color: #6b7280;
  }

  .message-user .message-avatar { background-color: #dbeafe; color: #1e40af; }
  .message-content { flex: 1; min-width: 0; }

  .message-text {
    background-color: #ffffff;
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 0.875rem;
    line-height: 1.5;
    color: #1a1a1a;
    word-wrap: break-word;
    white-space: pre-wrap;
    font-family: 'Fira Code', monospace;
    border: 1px solid #e5e7eb;
  }

  .message-user .message-text { background-color: #f3f4f6; }

  .insert-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    margin-top: 0.5rem;
    padding: 0.375rem 0.75rem;
    background-color: #1a1a1a;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .insert-btn:hover { background-color: #000000; }

  .typing-indicator { display: flex; gap: 0.25rem; padding: 0.75rem; }

  .typing-indicator span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #9ca3af;
    animation: typing 1.4s infinite;
  }

  .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
  .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes typing {
    0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
    30% { opacity: 1; transform: translateY(-8px); }
  }

  .chat-input-container {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    padding: 1rem;
    background-color: #ffffff;
    border-top: 1px solid #e8e8e8;
  }

  .clear-btn {
    flex-shrink: 0;
    padding: 0.5rem;
    background: transparent;
    border: none;
    color: #6b7280;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clear-btn:hover { background-color: #f3f4f6; color: #1a1a1a; }

  .chat-input {
    flex: 1;
    padding: 0.625rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    line-height: 1.5;
    resize: none;
    max-height: 120px;
    font-family: inherit;
    transition: border-color 0.15s;
  }

  .chat-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .chat-input:disabled { opacity: 0.6; cursor: not-allowed; }

  .send-btn {
    flex-shrink: 0;
    padding: 0.625rem;
    background-color: #1a1a1a;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .send-btn:hover:not(:disabled) { background-color: #000000; }
  .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
