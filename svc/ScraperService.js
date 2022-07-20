const axios = require('axios');
const $ = require('cheerio');
const fs = require('fs');
const puppeteer = require('puppeteer');

class Scraper {
  constructor(url) {
    this.url = url;
  }

  async fetchUrlWithPuppeteer() {
    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(this.url);
      const html = await page.content();
      const videoTitles = [];
      await $('#video-title', html).each(function () {
        if (videoTitles.length <= 3) {
          return videoTitles.push($(this).text().trim().replace('\n','').replace('+',''));
        }
        return false;
      });
      const videoUrls = [];
      await $('#video-title', html).each(function () {
        if (videoUrls.length <= 3) {
          return videoUrls.push(`https://youtube.com/${$(this).attr('href')}`);
        }
        return false;
      });
      const videoImgs = [];
      let count = 0;
      await $('img', html).each(function () {
        if (count <= 3) {
          if ($(this).attr('width') == 360) {
            videoImgs.push($(this).attr('src'));
            return count++
          }
          return count 
        }
        return false;
      });
      const data = [];
      videoImgs.forEach((img, i) => {
        data.push({img: img, url: videoUrls[i], title: videoTitles[i]})
      })
      return data
    } catch (err) {
      console.log(err);
    }
  }

  async fetchUrl() {
    try {
      const response = await axios(this.url);
      return response.data;
    } catch (error) {
      console.log(error);
    }
  }

  getBandLinks(html) {
    const foundHrefs = $('.wikitable > tbody > tr > td > a', html);
    const wikiUrls = Object.values(foundHrefs).map((item) => (item.attribs ? `https://en.wikipedia.org${item.attribs.href}` : ''));
    return wikiUrls;
  }

  async getBandInfo(url) {
    try {
      const response = await axios(url);
      const html = response.data;
      const bandMemberNodes = $('th:contains("Members")', html).next().text();
      const bandMembers = bandMemberNodes.split(/(?<=[a-z])(?=[A-Z])/);
      const origin = $('th:contains("Origin")', html).next().text();
      const website = $('th:contains("Website")', html).next().text();
      const bandName = $('h1', html).text();
      const data = {
        bandName, bandMembers, origin, website,
      };
      return data;
    } catch (e) {
      console.log(e);
    }
  }

  async fileCreate(bandLinks) {
    const file = fs.createWriteStream('bands.txt');
    await bandLinks.map(async (link) => {
      const data = await this.getBandInfo(link);
      if (data) {
        fs.appendFileSync('infobands.txt', `${JSON.stringify(data).replace(',', '\n').replace('{', '').replace('}', '')
          .replace('"\n', '\n')}\n\n`, 'utf-8');
      }
      return data;
    });
  }
}
module.exports = Scraper