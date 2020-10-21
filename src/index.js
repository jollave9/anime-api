const app = require('express')()
const puppeteer = require('puppeteer');

const host = 'https://my-ani-api.herokuapp.com'

// scrape kitsu
const get_anime_info = async (title) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`https://kitsu.io/anime/${title}/`);

    //getting the poster
    await page.waitForSelector('img.lazyloaded')
    const span = await page.$('span.media-poster')
    const poster = await span.$eval('img.lazyloaded', el => el.src)

    //getting the banner
    await page.waitForSelector('div.cover-photo')
    let cover = await page.$eval('div.cover-photo', el => el.style.backgroundImage)
    cover = cover.slice(cover.indexOf('\"') + 1, cover.indexOf('\")'))

    //getting the synopsis
    await page.waitForSelector('p')
    const section = await page.$('section.media-description')
    let description = await section.$eval('p', el => el.innerHTML)

    //getting the genres
    await page.waitForSelector('a')
    const section2 = await page.$('section.media--tags')
    let genres = await section2.$$eval('a', tags => tags.map(el => el.innerHTML))

    // getting the details
    await page.waitForSelector('span')
    await page.waitForSelector('strong')

    const div = await page.$('div.media--information')
    await (await div.$('a.more-link')).click()
    let details = await div.$$eval('li', arrayOfSpans => {

        let local_details = {}

        arrayOfSpans.forEach(el => {
            let key = el.children[0].innerHTML
            let value = el.children[1].innerHTML
            local_details[key] = value
        })

        return local_details
    })

    await browser.close();

    return {
        poster: poster,
        banner: cover,
        synopsis: description,
        genres,
        details
    }
}

const get_anime_schedule = async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`https://www.dubbedanime.vip/schedule`);

    await page.waitForSelector('span')
    await page.waitForSelector('div.schedule-list-item')

    const content = await page.$('.content')
    const schedules = await content.$$eval('.schedule-group', (schedule_groups, host) => {

        let local_schedules = {}

        schedule_groups.forEach(el => {
            let day = el.children[0].children[0].innerHTML
            let anime = Array.from(el.children[1].childNodes).map(el => {
                return {
                    anime_info: el.href.replace('https://www.dubbedanime.vip/anime/', `${host}/anime/slug/`),
                    title: el.children[0].innerHTML
                }
            })
            local_schedules[day] = anime
        })

        return local_schedules

    }, host)

    await browser.close();

    return schedules
}

const get_latest = async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`https://pantsubase.tv/`);

    await page.waitForSelector('time')
    await page.waitForSelector('.anio')

    let latest = {}
    const sections = await page.$$('.episode.cont.contio')

    const latest_episodes = await sections[0].$$eval('.list', list => {

        const arr = list.map(el => {

            let watch = el.children[1].href
            let name_episode = el.children[1].children[0].innerHTML
            let time = el.children[2].children[0].innerHTML

            return {
                note: 'watch link to be update to my own link',
                watch_link: watch,
                name_episode,
                time
            }
        })

        return arr
    })

    await browser.close();
    return latest_episodes
}

app.get('/', (req, res) => {
    res.json({
        current_route_available: {
            anime_info: `${host}/anime/:title`
        }
    })
})

app.get('/anime/slug/:title', async (req, res) => {

    try {
        let obj = await get_anime_info(req.params.title)
        res.status(200).json({
            status: 'found',
            data: obj
        })
    } catch (e) {
        console.log(e)
        res.status(400).json({
            msg: 'title not found based on kitsu. another source will be added soon'
        })
    }
})

app.get('/anime/schedule', async (req, res) => {

    try {
        let obj = await get_anime_schedule()
        res.status(200).json({
            status: 'success',
            data: obj
        })
    }
    catch (e) {
        console.log(e)
        res.status(500).json({
            msg: 'something went wrong'
        })
    }
})

app.get('/anime/latest', async (req, res) => {

    try {
        let obj = await get_latest()
        res.status(200).json({
            status: 'success',
            data: obj
        })
    }
    catch (e) {
        console.log(e)
        res.status(500).json({
            msg: 'something went wrong'
        })
    }
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`app running on port ${PORT}`)
})