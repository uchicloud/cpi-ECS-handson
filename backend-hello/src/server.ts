import express from 'express';

const PORT = process.env.PORT || 3000;

const app = express();
app.get('/health', (_req, res) => {
    res.status(200).send('OK');
}
);

app.get('/api/hello', (_req, res) => {
    res.status(200).json({ message: 'Hello from the server!' });
}
);


app.get('/api/proverb', async (_req, res) => {
    const proverbs = [
        '知足者常足。',
        '継続は力なり。',
        '失敗は成功のもと。',
        '百聞は一見に如かず。',
        '笑う門には福来る。'
    ];
    const proverb = proverbs[Math.floor(Math.random() * proverbs.length)];
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 遅延のシミュレート
    res.status(200).json({ message: proverb });
}
);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}
);
