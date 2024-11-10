const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 4000;

// Allow CORS from the specific frontend domain
const allowedOrigins = ['https://the-florida-bar-frontend.vercel.app', 'https://the-florida-bar-frontend-sai-sandeep-ks-projects.vercel.app'];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
};

// Use CORS middleware
app.use(cors(corsOptions));
app.use(express.json());

const instance = axios.create({
    baseURL: 'https://www.floridabar.org',
    proxy: false,
    httpsAgent: new (require('https').Agent)({ keepAlive: true }),
});

// Function to decode Cloudflare email protection
const decodeEmail = (encodedEmail) => {
    const r = parseInt(encodedEmail.substr(0, 2), 16);
    let email = '';
    for (let n = 2; n < encodedEmail.length; n += 2) {
        const code = parseInt(encodedEmail.substr(n, 2), 16) ^ r;
        email += String.fromCharCode(code);
    }
    return email;
};

app.get('/api/scrape', async (req, res) => {
    try {
        const page = req.query.page || 1;
        const url = `directories/find-afah/?sdx=N&pageNumber=${page}&pageSize=50`;

        const { data } = await instance.get(url);
        const $ = cheerio.load(data);

        const listings = [];
        $('.profile-compact').each((i, elem) => {
            const name = $(elem).find('.profile-name').first().text().trim();
            const nickname = $(elem).find('.profile-name').eq(1).text().trim();
            const barNumber = $(elem).find('.profile-bar-number span').text().trim();
            const practice = $(elem).find('.eligibility').text().trim();
            const address = $(elem).find('.profile-contact p').first().text().trim();
            const officePhone = $(elem).find('a[href^="tel:"]').first().text().trim();
            const cellPhone = $(elem).find('a[href^="tel:"]').last().text().trim();

            let email = '';
            const emailElement = $(elem).find('.icon-email .__cf_email__');
            if (emailElement.length > 0) {
                const encodedEmail = emailElement.attr('data-cfemail');
                email = decodeEmail(encodedEmail);
            }

            const imageUrl = $(elem).find('.profile-image img').attr('src');

            listings.push({ name, nickname, barNumber, practice, address, officePhone, cellPhone, email, imageUrl });
        });

        res.json({ listings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error scraping data' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
