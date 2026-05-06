<script>
    import "./layout.css";
    import { locale } from '$lib/i18n/store.js';
    
    // استخدام Svelte 5 Runes
    let { children } = $props();
    
    // تحويل الاتجاه إلى النوع الصحيح ليرضى عنه الـ TypeScript
    let dir = $derived(/** @type {"ltr" | "rtl"} */ ($locale === 'ar' ? 'rtl' : 'ltr'));
</script>

<svelte:head>
    <html {dir} lang={$locale}></html>
</svelte:head>

<div class="min-h-screen font-sans transition-colors duration-500">
    <!-- طريقة عرض المحتوى في Svelte 5 -->
    {@render children()}
</div>

<style>
    :global(body) {
        font-family: 'IBM Plex Sans Arabic', sans-serif;
        background-color: #020617;
        margin: 0;
        padding: 0;
        color: #e2e8f0;
        transition: background-color 0.8s ease;
    }
</style>