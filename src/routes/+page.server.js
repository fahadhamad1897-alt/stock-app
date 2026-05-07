const FMP_KEY = 'VPcxV6OwUUvn1orNx6p4pQwiYI1unAY6';
const ALPHA_VANTAGE_KEY = 'WPGSA9GYK3LL716Y';
import Parser from 'rss-parser';

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
});

/** @type {any} */
let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // ✅ 15 دقيقة فقط بدلاً من ساعتين

// ============================================================
// أداة مساعدة: جلب بيانات سهم من Yahoo Finance
// ============================================================
/** @param {string} ticker */
async function getYahooQuote(ticker) {
    try {
        const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
            { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) return null;
        return {
            symbol: ticker,
            price: meta.regularMarketPrice,
            change: meta.regularMarketPrice - meta.previousClose,
            changesPercentage: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
            volume: meta.regularMarketVolume,
            name: ticker
        };
    } catch(e) { return null; }
}

// ============================================================
// جلب Gainers/Losers/Active من Yahoo Finance Screener
// ============================================================
async function fetchMarketMovers() {
    /** @param {string} scrUrl */
    const fetchScreener = async (scrUrl) => {
        try {
            const res = await fetch(scrUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });
            const data = await res.json();
            const quotes = data?.finance?.result?.quotes || 
                          data?.finance?.result?.[0]?.quotes || [];
            return quotes;
        } catch(e) { return []; }
    };

    const [gainersRaw, losersRaw, activeRaw] = await Promise.all([
        fetchScreener('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_gainers&count=25&fields=symbol,shortName,regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume'),
        fetchScreener('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_losers&count=25&fields=symbol,shortName,regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume'),
        fetchScreener('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives&count=25&fields=symbol,shortName,regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume')
    ]);

    console.log('Yahoo gainers:', gainersRaw.length, '| losers:', losersRaw.length, '| active:', activeRaw.length);

    /** @param {any[]} list */
    const processYahoo = (list) => list
        .filter(s => parseFloat(s.regularMarketPrice || 0) >= 2)
        .slice(0, 20)
        .map(s => ({
            ticker: s.symbol,
            name: s.shortName || s.longName || s.symbol,
            price: parseFloat(s.regularMarketPrice || 0).toFixed(2),
            changeAmount: parseFloat(s.regularMarketChange || 0).toFixed(2),
            change: parseFloat(s.regularMarketChangePercent || 0).toFixed(2),
            volume: formatVolume(parseInt(s.regularMarketVolume || 0))
        }));

    const gainers = processYahoo(gainersRaw);
    const losers = processYahoo(losersRaw);
    const active = processYahoo(activeRaw);

    // إذا Yahoo نجح
    if (gainers.length > 0) {
        console.log('✅ Yahoo Screener يعمل');
        return { gainers, losers, active };
    }

    // Fallback: Alpha Vantage
    console.log('🔄 Yahoo فشل، التحويل لـ Alpha Vantage...');
    try {
        const res = await fetch(`https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${ALPHA_VANTAGE_KEY}`);
        const data = await res.json();
        const activeRaw = data.most_actively_traded || [];
        const gainersRaw = data.top_gainers || [];
        const losersRaw = data.top_losers || [];

        /** @param {any[]} list */
        const processAV = (list) => list
            .filter(s => parseFloat(s.price || 0) >= 2 && parseInt(s.volume || 0) >= 500000)
            .slice(0, 20)
            .map(s => ({
                ticker: s.ticker,
                name: s.ticker,
                price: parseFloat(s.price || 0).toFixed(2),
                changeAmount: parseFloat(s.change_amount || 0).toFixed(2),
                change: (s.change_percentage || '0').replace('%', ''),
                volume: formatVolume(parseInt(s.volume || 0))
            }));

        return {
            gainers: processAV(gainersRaw),
            losers: processAV(losersRaw),
            active: processAV(activeRaw)
        };
    } catch(e) {
        console.log('❌ Alpha Vantage فشل أيضاً');
    }

    return { gainers: [], losers: [], active: [] };
}

// ============================================================
// Trending من Yahoo Finance Trending Tickers
// ============================================================
async function fetchTrending() {
    try {
        const res = await fetch(
            'https://query1.finance.yahoo.com/v1/finance/trending/US?count=25',
            { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        const data = await res.json();
        const tickers = (data?.finance?.result?.[0]?.quotes || [])
            .map((/** @type {any} */ q) => q.symbol)
            .filter(Boolean)
            .slice(0, 15)
            .join(',');

        console.log('Yahoo Trending tickers:', tickers);

        if (!tickers) throw new Error('لا توجد رموز');

        // جلب أسعارها من Yahoo مباشرة
        const priceRes = await fetch(
            `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers}`,
            { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        const priceData = await priceRes.json();
        const quotes = priceData?.quoteResponse?.result || [];

        if (quotes.length > 0) {
            console.log('✅ Yahoo Trending يعمل، عدد:', quotes.length);
            return quotes.map((/** @type {any} */ s) => ({
                ticker: s.symbol,
                name: s.shortName || s.longName || s.symbol,
                price: parseFloat(s.regularMarketPrice || 0).toFixed(2),
                changeAmount: parseFloat(s.regularMarketChange || 0).toFixed(2),
                change: parseFloat(s.regularMarketChangePercent || 0).toFixed(2),
                volume: formatVolume(parseInt(s.regularMarketVolume || 0))
            }));
        }
    } catch(e) {
        console.log('❌ Yahoo Trending فشل:', e);
    }

    // Fallback ثابت
    const fallback = 'AAPL,TSLA,NVDA,AMD,AMZN,META,GOOGL,MSFT,PLTR,COIN,NFLX,UBER,DIS,BABA,SOFI';
    try {
        const res = await fetch(
            `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${fallback}`,
            { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        const data = await res.json();
        const quotes = data?.quoteResponse?.result || [];
        return quotes
            .sort((/** @type {any} */ a, /** @type {any} */ b) => (b.regularMarketVolume || 0) - (a.regularMarketVolume || 0))
            .map((/** @type {any} */ s) => ({
                ticker: s.symbol,
                name: s.shortName || s.longName || s.symbol,
                price: parseFloat(s.regularMarketPrice || 0).toFixed(2),
                changeAmount: parseFloat(s.regularMarketChange || 0).toFixed(2),
                change: parseFloat(s.regularMarketChangePercent || 0).toFixed(2),
                volume: formatVolume(parseInt(s.regularMarketVolume || 0))
            }));
    } catch(e) {
        console.log('❌ Fallback فشل أيضاً');
    }

    return [];
}

// ============================================================
// 📰 جلب الأخبار (نفس المنطق + مصدر إضافي)
// ============================================================
async function fetchNews() {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    /** @type {any[]} */
    let allNews = [];

    const sources = [
        {
            url: 'https://news.google.com/rss/search?q=site:finance.yahoo.com+stock+market&hl=en-US&gl=US&ceid=US:en',
            source: 'Yahoo Finance',
            clean: (/** @type {string} */ t) => t.replace(/ - Yahoo Finance.*/, '').replace(/ - Yahoo.*/, '')
        },
        {
            url: 'https://www.investing.com/rss/news_25.rss',
            source: 'Investing.com',
            clean: (/** @type {string} */ t) => t
        },
        {
            url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US',
            source: 'Market News',
            clean: (/** @type {string} */ t) => t
        }
    ];

    await Promise.allSettled(sources.map(async ({ url, source, clean }) => {
        try {
            const feed = await parser.parseURL(url);
            const items = feed.items
                .filter(item => item.pubDate && new Date(item.pubDate).getTime() >= twentyFourHoursAgo)
                .map(item => ({
                    title: clean(item.title || ''),
                    link: item.link,
                    pubDate: item.pubDate || new Date().toISOString(),
                    source
                }));
            allNews.push(...items);
        } catch (e) {
            console.log(`فشل جلب ${source}`);
        }
    }));

    // إزالة المكررات وترتيب من الأحدث للأقدم
    const seen = new Set();
    return allNews
        .filter(item => {
            const key = item.title.slice(0, 40);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}

// ============================================================
// 📊 دالة التقرير اليومي (تُرسَل عند 12 منتصف الليل)
// ============================================================

/**
 * @typedef {Object} Stock
 * @property {string} ticker
 * @property {string} name
 * @property {string} price
 * @property {string|number} change
 * @property {string} changeAmount
 * @property {string} volume
 */

/**
 * @typedef {Object} NewsItem
 * @property {string} title
 * @property {string} source
 * @property {string} [link]
 * @property {string} [pubDate]
 */

/**
 * @param {{ active: Stock[], gainers: Stock[], losers: Stock[] }} stocks
 * @param {NewsItem[]} news
 */
export async function generateDailyReport(stocks, news) {
    const topActive = stocks.active.slice(0, 5);
    const topGainers = stocks.gainers.slice(0, 5);
    const topLosers = stocks.losers.slice(0, 5);
    const topNews = news.slice(0, 10);

    const date = new Date().toLocaleDateString('ar-SA', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    let report = `📊 **تقرير السوق اليومي - ${date}**\n\n`;

    report += `🔥 **الأكثر نشاطاً:**\n`;
    topActive.forEach((/** @type {Stock} */ s) => {
        report += `• ${s.ticker} (${s.name}) | $${s.price} | ${Number(s.change) >= 0 ? '▲' : '▼'}${Math.abs(Number(s.change))}% | Vol: ${s.volume}\n`;
    });

    report += `\n📈 **الأكثر ارتفاعاً:**\n`;
    topGainers.forEach((/** @type {Stock} */ s) => {
        report += `• ${s.ticker} (${s.name}) | $${s.price} | ▲${s.change}% | Vol: ${s.volume}\n`;
    });

    report += `\n📉 **الأكثر انخفاضاً:**\n`;
    topLosers.forEach((/** @type {Stock} */ s) => {
        report += `• ${s.ticker} (${s.name}) | $${s.price} | ▼${Math.abs(Number(s.change))}% | Vol: ${s.volume}\n`;
    });

    report += `\n📰 **أهم الأخبار:**\n`;
    topNews.forEach((/** @type {NewsItem} */ n, /** @type {number} */ i) => {
        report += `${i + 1}. ${n.title} (${n.source})\n`;
    });

    return report;
}

// ============================================================
// ⏰ جدولة التقرير اليومي (12 منتصف الليل بتوقيت السعودية = 9 PM ET)
// ============================================================
let reportScheduled = false;
function scheduleDailyReport() {
    if (reportScheduled) return;
    reportScheduled = true;

    const scheduleNext = () => {
        const now = new Date();
        // 12 منتصف الليل توقيت السعودية = UTC+3 = 21:00 UTC
        const target = new Date();
        target.setUTCHours(21, 0, 0, 0); // 12 مساء (منتصف الليل) بتوقيت السعودية
        if (target <= now) target.setDate(target.getDate() + 1);

        const msUntilTarget = target.getTime() - now.getTime();
        console.log(`⏰ التقرير اليومي سيُرسَل بعد ${Math.round(msUntilTarget / 60000)} دقيقة`);

        setTimeout(async () => {
            try {
                const { stocks, news } = cachedData || {};
                if (stocks && news) {
                    const report = await generateDailyReport(stocks, news);
                    console.log('='.repeat(60));
                    console.log('📧 التقرير اليومي جاهز للإرسال:');
                    console.log(report);
                    console.log('='.repeat(60));
                    // هنا يمكنك إضافة إرسال عبر واتساب/إيميل/تيليجرام
                }
            } catch (e) {
                console.error('فشل إنشاء التقرير اليومي:', e);
            }
            scheduleNext(); // جدولة اليوم التالي
        }, msUntilTarget);
    };

    scheduleNext();
}

// ============================================================
// 🚀 الدالة الرئيسية
// ============================================================
export async function load({ url }) {
    scheduleDailyReport();

    // 🔍 اختبار مباشر — احذفه بعد التشخيص
    try {
        const test = await fetch(`https://financialmodelingprep.com/api/v3/stock_market/gainers?apikey=${FMP_KEY}`);
        const testData = await test.json();
        console.log('FMP STATUS:', test.status);
        console.log('FMP RESPONSE:', JSON.stringify(testData).slice(0, 300));
    } catch(e) {
        console.log('FMP ERROR:', e);
    }

    const currentTime = Date.now();
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    if (!forceRefresh && cachedData && (currentTime - lastFetchTime < CACHE_DURATION)) {
        return {
            stocks: cachedData.stocks,
            news: cachedData.news,
            lastUpdated: lastFetchTime
        };
    }

    console.log("🔄 جلب بيانات جديدة...");

    // جلب كل شيء بالتوازي
    const [movers, trending, news] = await Promise.allSettled([
        fetchMarketMovers(),
        fetchTrending(),
        fetchNews()
    ]);

    const stocks = {
        ...(movers.status === 'fulfilled' ? movers.value : { gainers: [], losers: [], active: [] }),
        trending: trending.status === 'fulfilled' ? trending.value : []
    };

    const newsData = news.status === 'fulfilled' ? news.value : [];

    cachedData = { stocks, news: newsData };
    lastFetchTime = currentTime;

    return { stocks, news: newsData, lastUpdated: lastFetchTime };
}

/** @param {any} vol */
function formatVolume(vol) {
    if (!vol) return '0';
    if (vol >= 1e9) return (vol / 1e9).toFixed(1) + 'B';
    if (vol >= 1e6) return (vol / 1e6).toFixed(1) + 'M';
    if (vol >= 1e3) return (vol / 1e3).toFixed(1) + 'K';
    return vol.toString();
}