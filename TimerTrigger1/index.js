const { MongoClient } = require("mongodb")
const { chromium } = require("playwright-chromium");

module.exports = async function (context, myTimer) {

 const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://lolesports.com/schedule?leagues=superliga');

    while (true) {
        let previousHeight = await page.evaluate('document.body.scrollHeight');
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.waitForTimeout(2000);
        const newHeight = await page.evaluate('document.body.scrollHeight');

        if (newHeight === previousHeight) {
            break;
        }
    }

    const data = await page.evaluate(() => {

        const eventDivs = Array.from(document.querySelectorAll('.Event'));

        let scrapeData = [];
        let currentDate = null;
        let currentMatches = [];

        for (let div of eventDivs) {

            Array.from(div.children).forEach((child) => {

                if (child.classList.contains('EventDate')) {

                    if (currentDate && currentMatches.length > 0) {
                        scrapeData.push({ date: currentDate, matches: currentMatches });
                        currentMatches = [];
                    }
                    2
                    const dateElems = Array.from(child.querySelectorAll('.date'));
                    const date = dateElems.map((dateElem) => {
                        const dayElem = dateElem.querySelector('.weekday');
                        const monthElem = dateElem.querySelector('.monthday');
                        const weekday = dayElem ? dayElem.innerText : null;
                        const monthday = monthElem ? monthElem.innerText : null;
                        return { weekday, monthday };
                    });
                    currentDate = date;
                }

                if (child.classList.contains('EventMatch')) {

                    const timeElems = Array.from(child.querySelectorAll('.EventTime .time'));
                    const time = timeElems.map((timeElem) => {
                        const hourElem = timeElem.querySelector('.hour');
                        const minuteElem = timeElem.querySelector('.minute');
                        const hour = hourElem ? hourElem.innerText : null;
                        const minute = minuteElem ? minuteElem.innerText : null;
                        return { hour, minute };
                    });

    
                    const leagueElems = Array.from(child.querySelectorAll('.league'));
                    const league = leagueElems.map((leagueElem) => {
                        const nameElem = leagueElem.querySelector('.name');
                        const strategyElem = leagueElem.querySelector('.strategy');
                        const name = nameElem ? nameElem.innerText.toLowerCase() : null;
                        const strategy = strategyElem ? strategyElem.innerText.toLowerCase() : null;
                        return { name, strategy };
                    });

                    const teamElems = Array.from(child.querySelectorAll('.teams .team'));
                    const teams = teamElems.map((teamElem) => {
                        const nameElem = teamElem.querySelector('.name');
                        const tricodeElem = teamElem.querySelector('.tricode');
                        const winlossElem = teamElem.querySelector('.winloss');

                        const name = nameElem ? nameElem.innerText : null;
                        const tricode = tricodeElem ? tricodeElem.innerText : null;
                        const winloss = winlossElem ? winlossElem.innerText : null;
                        return { name, tricode, winloss };
                    });

                    const scoreElems = Array.from(child.querySelectorAll('.teams .score'));
                    const score = scoreElems.map((scoreElem) => {
                        const score = scoreElem ? scoreElem.innerText : null;
                        if (score) { return score.replace(/\n/g, '').trim(); }
                        return { score };
                    });
                    currentMatches.push({ league, time, teams, score});
                }
            });
        }

        if (currentDate && currentMatches.length > 0) {
            scrapeData.push({ date: currentDate, matches: currentMatches });
        }
        return scrapeData;

    });

    await browser.close();

    
    const client = new MongoClient(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    try {

        await client.connect();
        context.log("Conectado correctamente al servidor de MongoDB Atlas");

        const db = client.db('squedules');
        const collection = db.collection('superliga');
        

        for( let item of data) {
            await collection.updateOne(
                { date: item.date },
                { $set: item },
                { upsert: true }
            );
        }

        context.log("Datos guardados correctamente en MongoDB Atlas");

    } catch (err) {
        context.log(err.stack);
    } finally {
        await client.close();
    }

};