import express from 'express';
import crypto from 'crypto';
import cors from 'cors';

const PORT = process.env.PORT || 5200;

const app = express();
app.use(cors({
    origin: '*', // Allow all origins for simplicity, adjust as needed
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.get('/health', (_req, res) => {
    res.status(200).send('OK');
});

const sendMessage = async (content: string) => {
    const secret = process.env.DING_SECRET;
    let endpoint = process.env.DING_ENDPOINT;
    if (!secret || !endpoint) {
        throw new Error('DING_SECRET and DING_ENDPOINT must be set');
    }

    if (secret) {
        const calcHmac = (time: number) => {
            const sign = `${time}\n${secret}`;
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(sign);
            const digest = hmac.digest('base64');
            return encodeURIComponent(digest);
        }
        const now = Date.now();
        endpoint += `&timestamp=${now}&sign=${calcHmac(now)}`;
    }
    const message = {
        msgtype: 'text',
        text: {
            content
        }
    };

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'charset': 'utf-8',
        },
        body: JSON.stringify(message)
    });

    if (!res.ok) {
        throw new Error(`Failed to send message: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

app.post('/chat', express.json(), async (req, res) => {
    const { message } = req.body;
    if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
    }

    await sendMessage(message)
    res.status(200).json({ reply: `You said: ${message}` });
});

app.listen(PORT, () => {
    console.log('Server is running on port', PORT);
});