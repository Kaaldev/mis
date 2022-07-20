const fetch = require('node-fetch')
const fs = require('fs')
const express = require('express')
const app = express()
const ytdl = require('ytdl-core')
const extractAudio = require('ffmpeg-extract-audio')
const port = process.env.PORT || 3000
const MusicService = require('./svc/MusicService.js')
const ScraperService = require('./svc/ScraperService.js')

const music = []
function updateMusic() {
    const files = MusicService.getFiles()
    files.then((data) => {
        data.forEach((file) => {
            const fileArray = file.split('-')
            music.push({
                artist: fileArray[0].trim(),
                title: fileArray[1].trim(),
                fileName: file,
                filePath: `./music/${file}`
            })
        })
    })
}
updateMusic()



app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({
    extended: true
}))

app.get('/', (req, res ) => {
    res.render('index')
})
app.post('/music/find', async (req, res) => {
    const filter = req.body.filter.toLowerCase().trim()
    let foundMusic = music.filter((item) => {
        const fieldsToFilter = Object.keys(item)
        const searchObject = fieldsToFilter.map((field) => {
            return item[`${field}`].toLowerCase().includes(filter)
        })
        if (searchObject.includes(true)) {
            return item
        }
    })
    res.send(foundMusic)
})

app.post('/music/find/online', async (req, res) => {
    const searchString = req.body.filter.replace(' ', '+')
    const scraper = new ScraperService(`https://www.youtube.com/results?search_query=${searchString}`)
    const data = await scraper.fetchUrlWithPuppeteer()
    res.send(data)
    
})


app.post('/music/play', (req, res) => {
    const searchArray = req.body.data.split('-')
    console.log(searchArray);
    const searchPath = music.filter((item) => {
        if (item.title.toLowerCase().trim() == searchArray[0].toLowerCase().trim() && item.artist.toLowerCase().trim() == searchArray[1].toLowerCase().trim()) {
            return item
        }
    })
    console.log(searchPath);
    res.send({audioFile: fs.readFileSync(searchPath[0].filePath)})

})
app.post('/', async (req, res) => {
    const { url } = req.body
    try { 
        const videoData = await createVideoFile(url)
        setTimeout(async () => {
            await convertMp4ToMp3(videoData.title)
            const file = `${videoData.title}.mp3`;
            res.download(file);
        }, 3000)
        setTimeout(async () => {
            fs.renameSync(`${videoData.title}.mp3`,`./music/${videoData.title}.mp3`, (err, res) => {
                if(err) console.log(err)
                console.log('res');
            })
            updateMusic()
        }, 15000)
    } catch (err) {
        console.log(err);
    }
    res.send('New Music added: ')
})

async function createVideoFile(url) {
    try{
        const info = await ytdl.getBasicInfo(url)
        const title = info.player_response.videoDetails.title
        const data = await ytdl(url)
        const file = await data.pipe(fs.createWriteStream('video.mp4'));
        return { title, file}
    }catch(e){
        console.log(e);
    }   
}
async function convertMp4ToMp3(title) {
    try{
        await extractAudio({
            input: 'video.mp4',
            output: `${title}.mp3`
        })
    }catch(e) {
        console.log(e);
    }
    fs.unlinkSync('./video.mp4')
}



app.listen(port,() => { console.log('listening') })

