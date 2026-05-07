const ALPHA_VANTAGE_KEY = 'WPGSA9GYK3LL716Y';
const FMP_KEY = 'VPcxV6OwUUvn1orNx6p4pQwiYI1unAY6';
import Parser from 'rss-parser';

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
});

/** @type {any} */
let cachedData = null;
let lastFetchTime = 0;
const TWO_HOURS = 2 * 60 * 60 * 1000;

    export async function load({ url }) {
        const currentTime = Date.now();
        const forceRefresh = url.searchParams.get('refresh') === 'true';

        // 1. التحقق من التخزين المؤقت
        if (!forceRefresh && cachedData && cachedData.stocks && cachedData.stocks.active.length > 0 && (currentTime - lastFetchTime < TWO_HOURS)) {
        return { 
            stocks: cachedData.stocks, 
            news: cachedData.news,
            lastUpdated: lastFetchTime 
        };
    }

    /** @type {{ active: any[], gainers: any[], losers: any[] }} */
    let stocks = { active: [], gainers: [], losers: [] };
    
    /** @type {any[]} */
    let news =[];

    // 2. جلب البيانات من المصادر (Alpha Vantage للقوائم و FMP للأسماء)
    try {
        console.log("جاري جلب البيانات الموحدة...");
        const response = await fetch(`https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${ALPHA_VANTAGE_KEY}`);
        const data = await response.json();

        const activeRaw = data.most_actively_traded || [];
        const gainersRaw = data.top_gainers || [];
        const losersRaw = data.top_losers || [];

        // جمع كل الرموز من القوائم الثلاث في قائمة واحدة بدون تكرار لجلب أسمائها بطلب واحد فقط
        const allTickers = [...new Set([
            ...activeRaw.map((/** @type {any} */ s) => s.ticker),
            ...gainersRaw.map((/** @type {any} */ s) => s.ticker),
            ...losersRaw.map((/** @type {any} */ s) => s.ticker)
        ])].join(',');

        /** @type {Record<string, string>} */
        let nameMap = {};

        // طلب واحد فقط لـ FMP لجلب أسماء كل الشركات المذكورة أعلاه
        if (allTickers && FMP_KEY) {
            try {
                const fmpRes = await fetch(`https://financialmodelingprep.com/api/v3/quote/${allTickers}?apikey=${FMP_KEY}`);
                const fmpData = await fmpRes.json();
                if (Array.isArray(fmpData)) {
                    fmpData.forEach((/** @type {any} */ q) => {
                        nameMap[q.symbol] = q.name || q.symbol;
                    });
                }
            } catch (e) {
                console.error("خطأ في جلب الأسماء من FMP");
            }
        }

        // وظيفة داخلية لتوزيع البيانات والأسماء على القوائم
        /** @param {any[]} list */
        const processList = (list) => list.slice(0, 50).map(s => ({
            ticker: s.ticker,
            name: nameMap[s.ticker] || s.ticker,
            price: parseFloat(s.price).toFixed(2),
            changeAmount: parseFloat(s.change_amount || "0").toFixed(2),
            change: s.change_percentage.replace('%', ''),
            volume: formatVolume(parseInt(s.volume))
        }));

        stocks.active = processList(activeRaw);
        stocks.gainers = processList(gainersRaw);
        stocks.losers = processList(losersRaw);

        console.log("تم تحديث كافة البيانات والأسماء بطلبات موحدة");
    } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
    }

    // 3. جلب الأخبار من Yahoo و Investing معاً خلال 24 ساعة
    try {
        console.log("جاري جلب الأخبار من عدة مصادر...");
        
        /** @type {any[]} */
        let yahooNews = [];
        
        /** @type {any[]} */
        let investingNews =[];

        // حساب الوقت الحالي ناقص 24 ساعة (بالميلي ثانية)
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

        // جلب من Yahoo Finance
        try {
            // تم استخدام Google News كوسيط مستقر لجلب أخبار Yahoo Finance لتخطي الحظر
            const yahooFeed = await parser.parseURL('https://news.google.com/rss/search?q=site:finance.yahoo.com&hl=en-US&gl=US&ceid=US:en');
            yahooNews = yahooFeed.items
                .filter((/** @type {any} */ item) => item.pubDate && new Date(item.pubDate).getTime() >= twentyFourHoursAgo)
                .map((/** @type {any} */ item) => ({
                    // تنظيف العنوان من اسم المصدر الذي يضيفه جوجل تلقائياً
                    title: item.title ? item.title.replace(/ - Yahoo Finance.*/, '').replace(/ - Yahoo.*/, '') : '',
                    link: item.link,
                    pubDate: item.pubDate || new Date().toISOString(),
                    source: 'Yahoo Finance'
                }));
        } catch (e) {
            console.error("خطأ في جلب أخبار Yahoo");
        }

        // جلب من Investing
        try {
            const investingFeed = await parser.parseURL('https://www.investing.com/rss/news_25.rss');
            investingNews = investingFeed.items
                .filter((/** @type {any} */ item) => item.pubDate && new Date(item.pubDate).getTime() >= twentyFourHoursAgo)
                .map((/** @type {any} */ item) => ({
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate || new Date().toISOString(),
                    source: 'Investing.com'
                }));
        } catch (e) {
            console.error("خطأ في جلب أخبار Investing");
        }

        // دمج الأخبار من المصدرين وترتيبها من الأحدث للأقدم
        news =[...yahooNews, ...investingNews].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        
        console.log("تم جلب الأخبار بنجاح. العدد الإجمالي:", news.length);
    } catch (error) {
        console.error("فشل دمج الأخبار:", error);
    }

    if (news.length === 0) {
        console.log("تفعيل أخبار الطوارئ...");
        news =[
            { title: 'الأسواق العالمية تترقب قرارات الفائدة القادمة', link: '#', pubDate: new Date().toISOString(), source: 'تحديثات السوق' },
            { title: 'ارتفاع ملحوظ في قطاع التكنولوجيا بقيادة الذكاء الاصطناعي', link: '#', pubDate: new Date().toISOString(), source: 'أخبار اقتصادية' }
        ];
    }

    // 5. تحديث التخزين
    cachedData = { stocks, news };
    lastFetchTime = currentTime;

    return { stocks, news, lastUpdated: lastFetchTime };
}

/** @param {any} vol */
function formatVolume(vol) {
    if (!vol) return '0';
    if (vol >= 1e9) return (vol / 1e9).toFixed(1) + 'B';
    if (vol >= 1e6) return (vol / 1e6).toFixed(1) + 'M';
    if (vol >= 1e3) return (vol / 1e3).toFixed(1) + 'K';
    return vol.toString();
}