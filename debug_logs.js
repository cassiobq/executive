import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.text().includes('DEBUG')) {
            console.log(`[Browser Console]: ${msg.text()}`);
        }
    });

    await page.goto('http://localhost:5181');

    // Wait for the dropdowns to load
    await page.waitForSelector('select');

    // Select Bom Dia Goiás
    await page.selectOption('select:nth-of-type(1)', { label: 'BOM DIA GOIÁS' });
    await page.waitForTimeout(1000); // Give react time to update

    // Select Secundagem
    const selects = await page.$$('select');
    if (selects.length >= 3) {
        await selects[2].selectOption({ label: '5' });
    }

    await page.waitForTimeout(2000); // Wait for the logs to print
    await browser.close();
})();
