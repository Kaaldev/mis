const fs = require('fs')
class MusicService {
    constructor() { }
    static async getFiles() {
        const data = await fs.readdirSync('./music')
        return data
    }

}
module.exports = MusicService