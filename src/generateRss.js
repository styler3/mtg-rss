const fs = require('node:fs'); 
const createDOMPurify = require('dompurify');
const { Feed } = require('feed');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const DOMPurify = createDOMPurify(new JSDOM('').window);

/**
 * Base URL for the Magic: The Gathering website.
 * @readonly
 */
const BASE_URL = 'https://magic.wizards.com';
/**
 * Site language.
 * @readonly
 */
const LANGUAGE_PATH = 'en';
/**
 * Path to the root news page.
 * @readonly
 */
const NEWS_PATH = 'news';

/**
 * Generates an RSS feed for the Magic: The Gathering website.
 * @param {string} filepath The path to output the RSS file
 * @return {void}
 */
async function generateRss(pathname) {
    const url = new URL([LANGUAGE_PATH, NEWS_PATH].join('/'), BASE_URL);
    const data = await fetch(url)
        .then(response => response.text())
    const dom = new JSDOM(data);
    const { document } = dom.window;
    const articles = document.querySelectorAll('article');
    let rssEntries = [];
    for (const article of articles) {
        rssEntries.push(await getEntryFromArticle(article));
    }
    const feed = new Feed({
        title: 'MTG News',
        description: '',
        link: url.toString(),
        language: LANGUAGE_PATH,
        generator: 'https://github.com/styler3/mtg-rss'
    });
    rssEntries.forEach(entry => {
        feed.addItem({
            title: entry.item,
            id: entry.link,
            link: entry.link,
            description: entry.excerpt,
            content: entry.content,
            date: entry.date,
            author: [{ name: entry.byline }]
        })
    });
    const feedContent = feed.rss2();
    fs.writeFile('feed.xml', feedContent, (error) => console.error(error));
}

/**
 * Take an article element and exract the necessary data to create an RSS entry.
 * @param {JSDOM.article} article 
 * @return {object} An object containing the data for an RSS entry.
 */
async function getEntryFromArticle(article) {
    // Article links all have this data element.
    const linkElement = article.querySelector('a[data-navigation-type=client-side]');
    const link = new URL(linkElement.href, BASE_URL).toString();
    const pageContent = await fetch(link)
        .then(response => response.text());
    const pageDom = new JSDOM(pageContent, { url: BASE_URL });
    const dateText = pageDom.window.document.querySelector('time').innerHTML; // The first time will be publish date
    const date = new Date(dateText);
    const { content, title, byline, excerpt } = new Readability(pageDom.window.document).parse();
    return {
        content: DOMPurify.sanitize(content),
        date,
        title,
        byline,
        excerpt,
        link: link.toString()
    };
}

module.exports = generateRss;