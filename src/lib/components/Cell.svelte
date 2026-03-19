<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import { marked } from 'marked';
  import katex from 'katex';
  import MonacoEditor from './MonacoEditor.svelte';
  import CellOutput from './CellOutput.svelte';
  import type { NotebookCell } from '../types/notebook';

  export let cell: NotebookCell;
  export let isSelected: boolean = false;
  export let isDraggedOver: boolean = false;
  export let dragPosition: 'above' | 'below' | null = null;

  const dispatch = createEventDispatcher();

  let editorRef: MonacoEditor;
  let isDragging = false;

  function handleContentChange(event: CustomEvent) {
    dispatch('contentChange', {
      cellId: cell.id,
      content: event.detail.value
    });
  }

  function handleRun() {
    if (cell.type === 'markdown') {
      isEditingMarkdown = false;
    }
    dispatch('run', { cellId: cell.id });
  }

  function handleRunAndAdvance() {
    if (cell.type === 'markdown') {
      isEditingMarkdown = false;
    }
    dispatch('runAndAdvance', { cellId: cell.id });
  }

  function handleEditMarkdown() {
    isEditingMarkdown = true;
    dispatch('select', { cellId: cell.id });
  }

  function handleCellClick() {
    dispatch('select', { cellId: cell.id });
  }

  function handleCellMouseDown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target && target.closest('.jmon-music-player-container')) {
      return;
    }
    dispatch('select', { cellId: cell.id });
    if (cell.type === 'code' && editorRef) {
      requestAnimationFrame(() => {
        try {
          editorRef.focus();
        } catch {
          // ignore focus failures
        }
      });
    }
  }

  function handleAddCell() {
    dispatch('addCell', { afterCellId: cell.id });
  }

  function handleDeleteCell() {
    dispatch('deleteCell', { cellId: cell.id });
  }

  function handleMoveUp() {
    dispatch('moveUp', { cellId: cell.id });
  }

  function handleMoveDown() {
    dispatch('moveDown', { cellId: cell.id });
  }

  function handleCellTypeChange(type: 'code' | 'markdown') {
    dispatch('typeChange', { cellId: cell.id, type });
  }

  function handleEditorFocus() {
    dispatch('select', { cellId: cell.id });
  }

  function handleToggleCollapse() {
    dispatch('toggleCollapse', { cellId: cell.id });
  }

  function handleToggleOutputCollapse() {
    dispatch('toggleOutputCollapse', { cellId: cell.id });
  }

  // Drag-and-drop handlers
  function onDragStart(event: DragEvent) {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', cell.id);
    isDragging = true;
    dispatch('dragstart', { cellId: cell.id });
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault();
    if (!event.dataTransfer) return;
    event.dataTransfer.dropEffect = 'move';

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = event.clientY < midY ? 'above' : 'below';
    dispatch('dragover', { cellId: cell.id, position });
  }

  function onDragEnd() {
    isDragging = false;
    dispatch('dragend');
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    dispatch('dragend');
  }

  // Rendered HTML for markdown preview
  let renderedMarkdown = '';
  let markdownPreview: any = null;
  let isEditingMarkdown = true;
  let markdownTextarea: HTMLTextAreaElement;

  function autoResizeTextarea(textarea: HTMLTextAreaElement) {
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.max(56, textarea.scrollHeight) + 'px';
    }
  }

  function handleMarkdownInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    autoResizeTextarea(target);
    handleContentChange({ detail: { value: target.value } });
  }

  $: if (markdownTextarea && cell.type === 'markdown') {
    autoResizeTextarea(markdownTextarea);
  }

  async function focusActiveContent() {
    await tick();
    if (!isSelected) return;

    if (cell.type === 'code' && editorRef) {
      editorRef.focus();
    } else if (cell.type === 'markdown') {
      if (isEditingMarkdown && markdownTextarea) {
        markdownTextarea.focus();
      } else if (markdownPreview) {
        markdownPreview.focus();
      }
    }
  }

  $: if (isSelected) {
    focusActiveContent();
  }

  // Listen for render-markdown event
  if (typeof window !== 'undefined') {
    window.addEventListener('render-markdown', (e: any) => {
      if (e.detail.cellId === cell.id && cell.type === 'markdown') {
        isEditingMarkdown = false;
      }
    });
  }

  $: {
    if (cell.type === 'markdown' && cell.content) {
      try {
        let md = cell.content || '';

        md = md.replace(/\$\$([\s\S]*?)\$\$/g, (m, expr) => {
          try {
            return katex.renderToString(expr, { throwOnError: false, displayMode: true });
          } catch (e) {
            return `<pre style="color: #dc2626;">${e.message}</pre>`;
          }
        });

        renderedMarkdown = marked(md) || '';
      } catch (e) {
        renderedMarkdown = `<pre style="color: #dc2626;">Markdown render error: ${e && e.message ? e.message : String(e)}</pre>`;
      }
    } else if (cell.type === 'markdown') {
      renderedMarkdown = '';
    }
  }

  // Execution order label
  $: execLabel = cell.executionOrder ? `[${cell.executionOrder}]` : '[ ]';
</script>

<div
  class="cell-wrapper {isSelected ? 'selected' : ''} {isDragging ? 'dragging' : ''}"
  class:drag-above={isDraggedOver && dragPosition === 'above'}
  class:drag-below={isDraggedOver && dragPosition === 'below'}
  data-testid="cell-{cell.id}"
  on:dragover={onDragOver}
  on:drop={onDrop}
>
  <!-- Left indicator bar (Observable style) -->
  <div class="cell-indicator {isSelected ? 'active' : ''}"></div>

  <div
    class="cell-container"
    on:mousedown|capture={handleCellMouseDown}
    on:click={handleCellClick}
    role="button"
    tabindex="0"
    on:keydown={(e) => e.key === 'Enter' && handleCellClick()}
  >
    <!-- Cell toolbar -->
    <div class="cell-toolbar" data-testid="cell-toolbar">
        <div class="toolbar-left">
          <!-- Drag handle -->
          <span
            class="drag-handle"
            draggable="true"
            on:dragstart={onDragStart}
            on:dragend={onDragEnd}
            title="Drag to reorder"
          >
            <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
              <circle cx="3" cy="3" r="1.5"/><circle cx="9" cy="3" r="1.5"/>
              <circle cx="3" cy="7" r="1.5"/><circle cx="9" cy="7" r="1.5"/>
              <circle cx="3" cy="11" r="1.5"/><circle cx="9" cy="11" r="1.5"/>
            </svg>
          </span>

          <button
            on:click|stopPropagation={handleRun}
            class="toolbar-btn run-btn"
            disabled={cell.isRunning}
            title="Run cell (Shift+Enter)"
            data-testid="run-cell-btn"
          >
            {#if cell.isRunning}
              <span class="loading-spinner"></span>
            {:else}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M3 2l9 5-9 5V2z"/>
              </svg>
            {/if}
          </button>

          {#if cell.type === 'code'}
            <span class="exec-order" title="Execution order">{execLabel}</span>
          {/if}

          <select
            value={cell.type}
            on:change={(e) => handleCellTypeChange(e.target.value)}
            class="cell-type-select"
            data-testid="cell-type-select"
          >
            <option value="code">Code</option>
            <option value="markdown">Markdown</option>
          </select>
        </div>

        <div class="toolbar-right">
          <!-- Collapse toggle -->
          <button
            on:click|stopPropagation={handleToggleCollapse}
            class="toolbar-btn"
            title={cell.collapsed ? 'Expand cell' : 'Collapse cell'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              {#if cell.collapsed}
                <path d="M4 6l3 3 3-3"/>
              {:else}
                <path d="M4 8l3-3 3 3"/>
              {/if}
            </svg>
          </button>

          {#if cell.output}
            <button
              on:click|stopPropagation={handleToggleOutputCollapse}
              class="toolbar-btn"
              title={cell.outputCollapsed ? 'Show output' : 'Hide output'}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                {#if cell.outputCollapsed}
                  <path d="M2 7h10M7 2v10"/>
                {:else}
                  <path d="M2 7h10"/>
                {/if}
              </svg>
            </button>
          {/if}

          <button
            on:click|stopPropagation={handleMoveUp}
            class="toolbar-btn"
            title="Move up"
            data-testid="move-up-btn"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M7 11V3M4 6l3-3 3 3"/>
            </svg>
          </button>

          <button
            on:click|stopPropagation={handleMoveDown}
            class="toolbar-btn"
            title="Move down"
            data-testid="move-down-btn"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M7 3v8M10 8l-3 3-3-3"/>
            </svg>
          </button>

          <button
            on:click|stopPropagation={handleAddCell}
            class="toolbar-btn"
            title="Add cell below"
            data-testid="add-cell-below-btn"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M7 3v8M3 7h8"/>
            </svg>
          </button>

          <button
            on:click|stopPropagation={handleDeleteCell}
            class="toolbar-btn delete-btn"
            title="Delete cell (Ctrl+Z to undo)"
            data-testid="delete-cell-btn"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 3l8 8M11 3l-8 8"/>
            </svg>
          </button>
        </div>
      </div>

    <!-- Cell content (collapsible) -->
    {#if !cell.collapsed}
      <div class="cell-content">
        {#if cell.type === 'code'}
          <MonacoEditor
            bind:this={editorRef}
            value={cell.content}
            language="javascript"
            height="auto"
            on:change={handleContentChange}
            on:run={handleRun}
            on:runAndAdvance={handleRunAndAdvance}
            on:editorFocus={handleEditorFocus}
            on:focus={handleEditorFocus}
          />
        {:else}
          <div class="markdown-wrapper">
            {#if isEditingMarkdown}
              <textarea
                bind:this={markdownTextarea}
                value={cell.content}
                on:input={handleMarkdownInput}
                on:focus={handleEditorFocus}
                class="markdown-editor"
                placeholder="Enter markdown..."
                data-testid="markdown-editor"
              ></textarea>
            {:else}
              <div
                class="markdown-preview rendered"
                bind:this={markdownPreview}
                on:click|stopPropagation={handleEditMarkdown}
                on:keydown|stopPropagation={(e) => e.key === 'Enter' && handleEditMarkdown()}
                tabindex="0"
                role="button"
                data-testid="markdown-preview"
              >
                {@html renderedMarkdown}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {:else}
      <div class="collapsed-indicator">
        <span class="collapsed-text">
          {cell.type === 'code' ? cell.content.split('\n')[0]?.substring(0, 80) || 'Empty cell' : 'Markdown cell'}
          {#if cell.content.split('\n').length > 1}...{/if}
        </span>
      </div>
    {/if}

    <!-- Cell output (collapsible) -->
    {#if cell.output && !cell.outputCollapsed}
      <CellOutput output={cell.output} />
    {:else if cell.output && cell.outputCollapsed}
      <div class="collapsed-output-indicator">
        <span>Output hidden ({cell.output.type})</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .cell-wrapper {
    position: relative;
    margin-bottom: 1.1rem;
    padding-left: 0.375rem;
    transition: all 0.2s ease;
  }

  .cell-wrapper.dragging {
    opacity: 0.5;
  }

  .cell-wrapper.drag-above {
    border-top: 3px solid #3b82f6;
    padding-top: 0;
  }

  .cell-wrapper.drag-below {
    border-bottom: 3px solid #3b82f6;
    padding-bottom: 0;
  }

  .cell-indicator {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background-color: transparent;
    border-radius: 2px;
    transition: all 0.2s ease;
  }

  .cell-indicator.active {
    background-color: #1a1a1a;
  }

  .cell-wrapper:hover .cell-indicator:not(.active) {
    background-color: #d0d0d0;
  }

  .cell-container {
    background-color: #ffffff;
    border-radius: 6px;
    transition: all 0.2s ease;
    position: relative;
    border: 1px solid transparent;
  }

  .cell-wrapper:hover .cell-container {
    background-color: #f9f9f9;
  }

  .cell-wrapper.selected .cell-container {
    background-color: #f7f7f7;
    border-color: #e0e0e0;
  }

  .cell-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.3rem 0.6rem 0.2rem;
  }

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .drag-handle {
    display: flex;
    align-items: center;
    cursor: grab;
    color: #c0c0c0;
    padding: 0.2rem;
    border-radius: 3px;
    transition: color 0.15s ease;
  }

  .drag-handle:hover {
    color: #6b6b6b;
    background-color: #f0f0f0;
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .exec-order {
    font-family: 'Fira Code', monospace;
    font-size: 0.7rem;
    color: #9ca3af;
    min-width: 2rem;
    text-align: center;
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.3rem;
    background-color: transparent;
    color: #6b6b6b;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .toolbar-btn:hover {
    background-color: #e8e8e8;
    color: #1a1a1a;
  }

  .toolbar-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .run-btn {
    background-color: #1a1a1a;
    color: white;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
  }

  .run-btn:hover:not(:disabled) {
    background-color: #000000;
  }

  .delete-btn:hover {
    background-color: #fee2e2;
    color: #dc2626;
  }

  .cell-type-select {
    font-size: 0.75rem;
    border: 1px solid #cccccc;
    border-radius: 4px;
    padding: 0.2rem 0.45rem;
    background-color: white;
    color: #4a4a4a;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .cell-type-select:hover {
    border-color: #a0a0a0;
  }

  .cell-type-select:focus {
    outline: none;
    border-color: #1a1a1a;
  }

  .cell-content {
    padding: 0.3rem 0.65rem 0.4rem;
    min-height: 0;
  }

  .collapsed-indicator {
    padding: 0.4rem 0.65rem;
    cursor: pointer;
  }

  .collapsed-text {
    font-family: 'Fira Code', monospace;
    font-size: 0.8rem;
    color: #9ca3af;
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }

  .collapsed-output-indicator {
    padding: 0.3rem 0.65rem;
    font-size: 0.75rem;
    color: #9ca3af;
    cursor: pointer;
    border-top: 1px solid #ededed;
  }

  .collapsed-output-indicator:hover {
    color: #6b6b6b;
    background-color: #f9f9f9;
  }

  .markdown-editor {
    width: 100%;
    min-height: 48px;
    padding: 0.6rem 0.7rem;
    border: 1px solid #e8e8e8;
    border-radius: 6px;
    resize: vertical;
    overflow: auto;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.9rem;
    line-height: 1.5;
    color: #1a1a1a;
    background-color: #fafafa;
    transition: all 0.15s ease;
    height: auto;
  }

  .markdown-editor:focus {
    outline: none;
    border-color: #1a1a1a;
    background-color: white;
  }

  .markdown-wrapper {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }

  .markdown-preview {
    border: 1px solid #e8e8e8;
    border-radius: 6px;
    padding: 0.6rem 0.7rem;
    background: #ffffff;
    color: #1a1a1a;
    min-height: 0;
    max-height: 600px;
    overflow: auto;
  }

  .markdown-preview.rendered {
    cursor: pointer;
    border: none;
    padding: 0.75rem;
    min-height: auto;
    max-height: none;
    background: transparent;
  }

  .markdown-preview.rendered:hover {
    background: #f5f5f5;
    border-radius: 6px;
  }

  .markdown-preview :global(h1) {
    font-size: 2rem;
    font-weight: 700;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    color: #1a1a1a;
  }

  .markdown-preview :global(h2) {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
    color: #1a1a1a;
  }

  .markdown-preview :global(h3) {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    color: #1a1a1a;
  }

  .markdown-preview :global(p) {
    margin-bottom: 1rem;
    line-height: 1.7;
    color: #4a4a4a;
  }

  .markdown-preview :global(ul),
  .markdown-preview :global(ol) {
    margin-left: 1.5rem;
    margin-bottom: 1rem;
  }

  .markdown-preview :global(li) {
    margin-bottom: 0.5rem;
    line-height: 1.6;
  }

  .markdown-preview :global(code) {
    background: #f5f5f5;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.875rem;
    color: #e11d48;
  }

  .markdown-preview :global(pre) {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 6px;
    overflow-x: auto;
    margin-bottom: 1rem;
  }

  .markdown-preview :global(pre code) {
    background: transparent;
    padding: 0;
    color: #1a1a1a;
  }

  .loading-spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
