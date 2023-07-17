const generateRss = require('./generateRss');

try {
    generateRss('');
} catch (error) {
    console.error(error);
}