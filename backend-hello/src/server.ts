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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}
);