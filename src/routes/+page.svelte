<script>
    import { locale, t } from '$lib/i18n/store.js';
    
    /** @type {{ data: any }} */
    let { data } = $props();

    const toggleLanguage = () => {
        locale.update((/** @type {string} */ l) => {
            const nextLang = l === 'ar' ? 'en' : 'ar';
            if (nextLang === 'en') {
                translateAllNews();
            }
            return nextLang;
        });
    };

    let stocks = $derived(data.stocks);
    let news = $derived(data.news);
    let showPopup = $state(false);

/**
     * @param {Event} event
     * @param {string} link
     */
    const handleNewsClick = (event, link) => {
        if (link === '#') {
            event.preventDefault();
            openPopup('تنبيه', 'هذا الخبر عبارة عن بيانات تجريبية ولا يحتوي على رابط فعلي للانتقال إليه.');
        }
    };
    let popupTitle = $state('');
    let popupContent = $state('');
    let popupStock = $derived(
        (stocks && stocks.active && stocks.active.find((/** @type {any} */ s) => s.ticker === popupTitle)) ||
        (stocks && stocks.gainers && stocks.gainers.find((/** @type {any} */ s) => s.ticker === popupTitle)) ||
        (stocks && stocks.losers && stocks.losers.find((/** @type {any} */ s) => s.ticker === popupTitle)) ||
        null
    );

    /**
     * @param {string} title
     * @param {string} content
     */
    const openPopup = (title, content) => {
        popupTitle = title;
        popupContent = content;
        showPopup = true;
    };

    const closePopup = () => {
        showPopup = false;
    };

    let activeMainTab = $state('stocks');
    let activeStockTab = $state('active');
    let activeNewsTab = $state('investing');
    let isDarkMode = $state(true);
    /** @type {any[]} */
    let translatedNews = $state([]);
    let isTranslating = $state(false);

    const translateAllNews = async () => {
        if (translatedNews.length > 0 || isTranslating) return;
        isTranslating = true;
        try {
            const newsToTranslate = [...news];
            const promises = newsToTranslate.map(async (item) => {
                const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(item.title)}&langpair=en|ar`);
                const result = await res.json();
                return { ...item, title: result.responseData.translatedText || item.title };
            });
            translatedNews = await Promise.all(promises);
        } catch (e) {
            openPopup('تنبيه', 'فشل الاتصال بخدمة الترجمة، يرجى المحاولة لاحقاً');
        } finally {
            isTranslating = false;
        }
    };

    let filteredNews = $derived(
        (() => {
            const sourceNews = ($locale === 'en' && translatedNews.length > 0) ? translatedNews : news;
            return sourceNews ? sourceNews.filter((/** @type {any} */ item) => {
                if (activeNewsTab === 'yahoo') return item.source === 'Yahoo Finance';
                if (activeNewsTab === 'investing') return item.source === 'Investing.com';
                return true;
            }) : [];
        })()
    );

    const toggleTheme = () => {
        isDarkMode = !isDarkMode;
        if (typeof document !== 'undefined') {
            document.body.style.transition = 'background-color 0.8s ease';
            // الخلفية تصبح أزرق ملكي في الثيم النهاري، وتعود للكحلي في الليلي
            document.body.style.backgroundColor = isDarkMode ? '#020617' : '#1e3a8a'; 
            document.body.style.color = isDarkMode ? '#e2e8f0' : '#ffffff';
        }
    };

    // إعادة ألوان القوائم للوضع السابق (الرمادي/Slate المريح)
    let cardClass = $derived(isDarkMode 
        ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-lg' 
        : 'bg-slate-200 border-slate-300 text-slate-900 shadow-md');
        
    let subTextClass = $derived(isDarkMode ? 'text-slate-400' : 'text-slate-600');
    
    // الهيدر والناف بار يعودان لألوان الـ Slate السابقة
    let headerClass = $derived(isDarkMode 
        ? 'bg-slate-900/60 border-slate-800/40 backdrop-blur-xl text-slate-100' 
        : 'bg-white/40 border-white/20 backdrop-blur-xl text-slate-900');

    let navClass = $derived(isDarkMode 
        ? 'bg-slate-900/70 border-slate-800/40 backdrop-blur-2xl' 
        : 'bg-white/50 border-white/30 backdrop-blur-2xl shadow-2xl');

    let subBtnClass = $derived(isDarkMode
        ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-md text-slate-200'
        : 'bg-white/40 border-white/40 backdrop-blur-md text-slate-800');
    let popupBgClass = $derived(isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-300');

    let greenText = $derived(isDarkMode ? 'text-emerald-400' : 'text-emerald-600');
    let redText = $derived(isDarkMode ? 'text-rose-400' : 'text-rose-600');
</script>

<div class="p-4 max-w-lg mx-auto pb-40 pt-24 transition-colors duration-500">
    <header class="fixed top-0 left-0 right-0 z-50 max-w-lg mx-auto p-4 border-b transition-all duration-700 shadow-sm {headerClass}">
        <div class="flex justify-between items-center">
            <h1 class="text-xl font-extrabold tracking-wide">{$t('app_title')}</h1>
            <div class="flex items-center gap-3">
                <button 
                    onclick={toggleTheme}
                    class="relative w-16 h-8 rounded-full transition-all duration-500 focus:outline-none flex items-center px-1 shadow-inner {isDarkMode ? 'bg-slate-800/80' : 'bg-blue-500/50'}"
                    dir="ltr"
                >
                    <div class="absolute inset-0 flex justify-between items-center px-2.5 pointer-events-none">
                        <svg class="w-4 h-4 transition-opacity duration-500 {isDarkMode ? 'opacity-100 text-yellow-200' : 'opacity-0'}" viewBox="0 0 24 24" fill="currentColor"><path d="M12.14 2.14a1 1 0 00-1.09.18 8.94 8.94 0 00-2.51 7.1 8.89 8.89 0 0010.5 7.41 1 1 0 00.49-1.52 7.14 7.14 0 01-1.66-11.12 1 1 0 00-.73-1.05zM19.1 4.9a1 1 0 100-2 1 1 0 000 2zM15.5 3.5a.5.5 0 100-1 .5.5 0 000 1zm6 4a.5.5 0 100-1 .5.5 0 000 1z"/></svg>
                        <svg class="w-4 h-4 transition-opacity duration-500 {isDarkMode ? 'opacity-0' : 'opacity-100 text-amber-500'}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>
                    </div>
                    <div class="w-6 h-6 rounded-full bg-white shadow-lg z-10 transform transition-transform duration-500 {isDarkMode ? 'translate-x-8' : 'translate-x-0'}"></div>
                </button>
                
                <button onclick={toggleLanguage} aria-label="ترجمة الأخبار" class="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-bold shadow-md active:scale-90 transition-transform duration-200">
                    {$t('switch_lang')}
                </button>
            </div>
        </div>
    </header>

    {#key activeMainTab + activeStockTab + activeNewsTab}
        <div class="space-y-3 fade-content">
            {#if activeMainTab === 'stocks'}
                
                {#if activeStockTab === 'active'}
                    {#if stocks && stocks.active && stocks.active.length > 0}
                        {#each stocks.active as stock}
                            <button onclick={() => openPopup(stock.ticker, stock.name)} class="w-full text-start p-4 rounded-2xl border flex justify-between items-center active:scale-[0.98] transition-all duration-300 {cardClass}">
                                <div class="flex-1 overflow-hidden pr-2">
                                    <div class="font-black text-indigo-500 uppercase text-lg tracking-wider">{stock.ticker}</div>
                                    <div class="text-xs mt-1 font-bold truncate w-full {subTextClass}">{stock.name}</div>
                                </div>
                                <div class="text-right shrink-0">
                                    <div class="font-black text-lg">${stock.price}</div>
                                    <div class="flex items-center justify-end gap-1.5 mt-1 text-xs font-bold" dir="ltr">
                                        <span class={Number(stock.change) >= 0 ? greenText : redText}>
                                            {Number(stock.change) >= 0 ? '+' : ''}{stock.changeAmount}
                                        </span>
                                        <span class={Number(stock.change) >= 0 ? greenText : redText}>
                                            ({Number(stock.change) >= 0 ? '+' : ''}{stock.change}%)
                                        </span>
                                    </div>
                                </div>
                            </button>
                        {/each}
                    {:else}
                        <div class="text-center py-6 rounded-2xl border text-sm font-bold {cardClass}">جاري جلب البيانات...</div>
                    {/if}

                {:else if activeStockTab === 'gainers'}
                    {#if stocks && stocks.gainers && stocks.gainers.length > 0}
                        {#each stocks.gainers as stock}
                            <button onclick={() => openPopup(stock.ticker, stock.name)} class="w-full text-start p-4 rounded-2xl border flex justify-between items-center active:scale-[0.98] transition-all duration-300 {cardClass}">
                                <div class="flex-1 overflow-hidden pr-2">
                                    <div class="font-black text-emerald-500 uppercase text-lg tracking-wider">{stock.ticker}</div>
                                    <div class="text-xs mt-1 font-bold truncate w-full {subTextClass}">{stock.name}</div>
                                </div>
                                <div class="text-right shrink-0">
                                    <div class="font-black text-lg">${stock.price}</div>
                                    <div class="flex items-center justify-end gap-1.5 mt-1 text-xs font-bold" dir="ltr">
                                        <span class={Number(stock.change) >= 0 ? greenText : redText}>
                                            +{stock.changeAmount}
                                        </span>
                                        <span class={Number(stock.change) >= 0 ? greenText : redText}>
                                            (+{stock.change}%)
                                        </span>
                                    </div>
                                </div>
                            </button>
                        {/each}
                    {:else}
                        <div class="text-center py-6 rounded-2xl border text-sm font-bold {cardClass}">لا توجد بيانات حالياً</div>
                    {/if}

                {:else if activeStockTab === 'losers'}
                    {#if stocks && stocks.losers && stocks.losers.length > 0}
                        {#each stocks.losers as stock}
                            <button onclick={() => openPopup(stock.ticker, stock.name)} class="w-full text-start p-4 rounded-2xl border flex justify-between items-center active:scale-[0.98] transition-all duration-300 {cardClass}">
                                <div class="flex-1 overflow-hidden pr-2">
                                    <div class="font-black text-rose-500 uppercase text-lg tracking-wider">{stock.ticker}</div>
                                    <div class="text-xs mt-1 font-bold truncate w-full {subTextClass}">{stock.name}</div>
                                </div>
                                <div class="text-right shrink-0">
                                    <div class="font-black text-lg">${stock.price}</div>
                                    <div class="flex items-center justify-end gap-1.5 mt-1 text-xs font-bold" dir="ltr">
                                        <span class={Number(stock.change) >= 0 ? greenText : redText}>
                                            {stock.changeAmount}
                                        </span>
                                        <span class={Number(stock.change) >= 0 ? greenText : redText}>
                                            ({stock.change}%)
                                        </span>
                                    </div>
                                </div>
                            </button>
                        {/each}
                    {:else}
                        <div class="text-center py-6 rounded-2xl border text-sm font-bold {cardClass}">لا توجد بيانات حالياً</div>
                    {/if}
                {/if}

            {:else if activeMainTab === 'news'}
                {#if filteredNews && filteredNews.length > 0}
                {#if isTranslating}
                    <div class="text-center py-6 rounded-2xl border text-sm font-bold {cardClass}">جاري ترجمة العناوين...</div>
                {/if}
                    {#each filteredNews as item}
                        <a href={item.link} target="_blank" onclick={(e) => handleNewsClick(e, item.link)} class="block p-5 rounded-2xl border active:scale-[0.98] transition-all duration-300 relative overflow-hidden {cardClass}">
                            <div class="absolute right-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                            <h3 class="text-sm font-bold leading-relaxed mb-3">{item.title}</h3>
                            <div class="text-[11px] flex justify-between items-center font-medium mt-2 {subTextClass}">
                                <span class="bg-indigo-500/10 px-2 py-1 rounded-md text-indigo-500">{item.source}</span>
                                <span dir="ltr">{new Date(item.pubDate).toLocaleString($locale, { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </a>
                    {/each}
                {:else}
                    <div class="text-center py-6 rounded-2xl border text-sm font-bold {cardClass}">جاري جلب الأخبار أو لا يوجد أخبار في هذا القسم...</div>
                {/if}
            {/if}
        </div>
    {/key}

    {#if showPopup}
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-300">
            <div class="border w-full max-w-sm rounded-3xl p-6 shadow-2xl transform transition-all duration-300 scale-100 {popupBgClass}">
                
                {#if popupTitle === 'تنبيه'}
                    <div class="text-center mb-6">
                        <h3 class="text-xl font-black text-indigo-500 mb-2">{popupTitle}</h3>
                        <p class="text-sm leading-relaxed {isDarkMode ? 'text-slate-300' : 'text-slate-600'}">{popupContent}</p>
                    </div>
                {:else}
                    <div class="text-center mb-6">
                        <div class="inline-block bg-indigo-500 text-white px-4 py-1 rounded-full text-xs font-bold mb-3">تفاصيل السهم</div>
                        <h3 class="text-3xl font-black text-indigo-500 mb-1" dir="ltr">{popupTitle}</h3>
                        <p class="text-xs font-bold mb-5 {isDarkMode ? 'text-slate-400' : 'text-slate-500'}">رمز الشركة في الأسواق المالية</p>
                        
                        {#if popupStock}
                            <div class="rounded-2xl p-4 mb-5 border shadow-inner {isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}">
                                <div class="flex justify-between items-center mb-3 border-b pb-3 {isDarkMode ? 'border-slate-700' : 'border-slate-200'}">
                                    <span class="text-sm font-bold {isDarkMode ? 'text-slate-400' : 'text-slate-600'}">السعر الحالي</span>
                                    <span class="text-xl font-black" dir="ltr">${popupStock.price}</span>
                                </div>
                                <div class="flex justify-between items-center mb-3 border-b pb-3 {isDarkMode ? 'border-slate-700' : 'border-slate-200'}">
                                    <span class="text-sm font-bold {isDarkMode ? 'text-slate-400' : 'text-slate-600'}">نسبة التغير</span>
                                    <span class="text-lg font-black {Number(popupStock.change) >= 0 ? greenText : redText}" dir="ltr">
                                        {Number(popupStock.change) >= 0 ? '+' : ''}{popupStock.change}%
                                    </span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm font-bold {isDarkMode ? 'text-slate-400' : 'text-slate-600'}">حجم التداول</span>
                                    <span class="text-lg font-black" dir="ltr">{popupStock.volume || 'غير متوفر'}</span>
                                </div>
                            </div>

                            <div class="w-full rounded-2xl overflow-hidden mb-5 border shadow-inner {isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}" style="height: 280px; transform: translateZ(0);">
                                <iframe 
                                    src="https://s.tradingview.com/widgetembed/?symbol={popupTitle}&interval=D&symboledit=0&saveimage=0&toolbarbg=f1f3f6&studies=%5B%5D&theme={isDarkMode ? 'dark' : 'light'}&style=3&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=0&hide_top_toolbar=1&hide_legend=1" 
                                    style="width: 100%; height: 100%; border: none;" 
                                    title="مخطط السهم"
                                    loading="lazy"
                                ></iframe>
                            </div>
                            
                            <a href="https://finance.yahoo.com/quote/{popupTitle}" target="_blank" class="block w-full py-3.5 mb-3 bg-slate-700 text-white font-bold rounded-2xl text-center active:scale-95 transition-transform duration-200 text-sm shadow-md">
                                عرض ملف الشركة والأخبار
                            </a>
                        {/if}
                    </div>
                {/if}

                <button onclick={closePopup} class="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-2xl active:scale-95 transition-transform duration-200 shadow-md">
                    اغلاق
                </button>
            </div>
        </div>
    {/if}
</div>

<div class="fixed bottom-0 left-0 right-0 w-full z-40 transition-colors duration-500">
    <!-- خلفية التغبيش التدريجي خلف الأزرار العليا -->
    <div class="absolute inset-x-0 bottom-full h-32 pointer-events-none backdrop-blur-sm [mask-image:linear-gradient(to_top,black,transparent)]"></div>

    <div class="max-w-lg mx-auto w-full relative border-t {navClass}">
        <!-- أزرار التبويبات الفرعية الطائرة بتنسيق BLUR -->
        <div class="absolute -top-14 left-0 right-0 px-4 flex justify-center gap-3">
            {#if activeMainTab === 'stocks'}
                <button 
                    onclick={() => activeStockTab = 'active'}
                    class="px-5 py-2.5 rounded-full font-bold text-sm shadow-lg transition-all duration-300 border {activeStockTab === 'active' ? 'bg-indigo-500 text-white scale-105 border-indigo-400' : subBtnClass}"
                >
                    {$t('most_active')}
                </button>
                <button 
                    onclick={() => activeStockTab = 'gainers'}
                    class="px-5 py-2.5 rounded-full font-bold text-sm shadow-lg transition-all duration-300 border {activeStockTab === 'gainers' ? 'bg-emerald-500 text-white scale-105 border-emerald-400' : subBtnClass}"
                >
                    {$t('top_gainers')}
                </button>
                <button 
                    onclick={() => activeStockTab = 'losers'}
                    class="px-5 py-2.5 rounded-full font-bold text-sm shadow-lg transition-all duration-300 border {activeStockTab === 'losers' ? 'bg-rose-500 text-white scale-105 border-rose-400' : subBtnClass}"
                >
                    {$t('top_losers')}
                </button>
            {:else if activeMainTab === 'news'}
                <button 
                    onclick={() => activeNewsTab = 'yahoo'}
                    class="px-5 py-2.5 rounded-full font-bold text-sm shadow-lg transition-all duration-300 border {activeNewsTab === 'yahoo' ? 'bg-indigo-600 text-white scale-105 border-indigo-500' : subBtnClass}"
                >
                    Yahoo finance
                </button>
                <button 
                    onclick={() => activeNewsTab = 'investing'}
                    class="px-5 py-2.5 rounded-full font-bold text-sm shadow-lg transition-all duration-300 border {activeNewsTab === 'investing' ? 'bg-indigo-600 text-white scale-105 border-indigo-500' : subBtnClass}"
                >
                    investing
                </button>
            {/if}
        </div>

        <!-- الأزرار الرئيسية في الأسفل -->
        <div class="flex">
            <button 
                onclick={() => {activeMainTab = 'stocks'; activeStockTab = 'active';}}
                class="flex-1 py-5 text-center font-black text-base transition-colors duration-300 relative {activeMainTab === 'stocks' ? 'text-indigo-500' : (isDarkMode ? 'text-slate-400' : 'text-slate-600')}"
            >
                {$t('market_movers')}
                {#if activeMainTab === 'stocks'}
                    <div class="absolute top-0 left-1/4 right-1/4 h-1 bg-indigo-500 rounded-b-full shadow-[0_0_15px_rgba(99,102,241,0.6)]"></div>
                {/if}
            </button>
            
            <div class="w-px bg-slate-500/20 my-4"></div>

            <button 
                onclick={() => {activeMainTab = 'news';}}
                class="flex-1 py-5 text-center font-black text-base transition-colors duration-300 relative {activeMainTab === 'news' ? 'text-indigo-500' : (isDarkMode ? 'text-slate-400' : 'text-slate-600')}"
            >
                {$t('economic_news')}
                {#if activeMainTab === 'news'}
                    <div class="absolute top-0 left-1/4 right-1/4 h-1 bg-indigo-500 rounded-b-full shadow-[0_0_15px_rgba(99,102,241,0.6)]"></div>
                {/if}
            </button>
        </div>
    </div>
</div>

<style>
    :global(html[dir="rtl"]) .text-right { text-align: left; }

    .fade-content {
        animation: smoothFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    @keyframes smoothFade {
        0% { opacity: 0; transform: translateY(15px); }
        100% { opacity: 1; transform: translateY(0); }
    }

    :global(body) {
        margin: 0;
        padding: 0;
        /* هذا يضمن أن الخلفية تنساب خلف الهيدر الثابت */
        background-attachment: fixed;
    }
</style>