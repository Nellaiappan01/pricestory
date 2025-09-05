// test-playwright-price.js
const { chromium } = require('playwright');

async function extractNumberFromString(s){
  if(!s) return null;
  const m = String(s).match(/₹\s?([\d,]{2,})/);
  if(m) return Number(m[1].replace(/,/g,''));
  const m2 = String(s).match(/([\d,]{2,})/);
  if(m2) return Number(m2[1].replace(/,/g,''));
  return null;
}

(async ()=>{
  const url = "https://www.flipkart.com/hercules-hank-27-5-t-inch-mountain-cycle/p/itm3ce91236dc4ca?pid=CCEH7WW2KSYXRQBG&lid=LSTCCEH7WW2KSYXRQBGDZ2EKU&marketplace=FLIPKART&store=abc%2Fulv%2Fixt&srno=b_1_1&otracker=browse&fm=organic&iid=en_GkbivRLO8LADqisFCeAv77m3WeOiyuPKhP7yWuuJwBlODcxz7dVNFfLkE1PwG3709P_5FHGbiKPwS9Nig0pDGg%3D%3D&ppt=browse&ppn=browse&ssid=a1n63degao0000001757098862157";

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    viewport: { width: 1200, height: 900 },
  });

  const page = await context.newPage();
  try {
    console.log("Navigating to:", url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // small wait for JS-rendered content
    await page.waitForTimeout(2000);

    // 1) Try Flipkart price selectors
    const flipSelectors = ['._30jeq3', '._25b18c', '._1vC4OE', "div._30jeq3._16Jk6d"];
    for(const sel of flipSelectors){
      const el = await page.$(sel);
      if(el){
        const text = await page.$eval(sel, el=>el.innerText || el.textContent || '');
        console.log("Found by selector", sel, "=> raw:", text);
        const n = extractNumberFromString(text);
        console.log("Parsed number:", n);
      }
    }

    // 2) Fallback: search page content
    const content = await page.content();
    const fallback = content.match(/₹\s?([\d,]{2,})/);
    console.log("Fallback regex match:", fallback ? fallback[0] : null);

    // 3) Detect reCAPTCHA/block page by typical words
    if (/recaptcha|are you a human|verify|confirming/i.test(content)){
      console.error("Site returned reCAPTCHA / bot page — blocked for scraping from this IP.");
    }

  } catch(e){
    console.error("Playwright error:", e && (e.message || e));
  } finally {
    await browser.close();
    process.exit();
  }
})();
