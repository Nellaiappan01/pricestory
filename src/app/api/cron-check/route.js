// server-only Playwright fetch (copy-paste)
import { chromium } from "playwright";

async function fetchHtmlWithPlaywright(url) {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  // optional: set proxy via context if you have proxies
  // const context = await browser.newContext({ proxy: { server: 'http://username:password@host:port' } });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  // wait for price selector if known, e.g. await page.waitForSelector("._30jeq3", { timeout: 5000 }).catch(()=>{});
  const html = await page.content();
  await browser.close();
  return html;
}
