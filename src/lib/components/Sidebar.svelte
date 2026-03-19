<script lang="ts">
  // Minimal Sidebar placeholder. Menu moved to App.svelte.
  let { collapsed = false }: { collapsed?: boolean } = $props();
</script>

<div class="sidebar-placeholder" aria-hidden="true"></div>

<style>
  .sidebar-placeholder { display: none; }
</style>
