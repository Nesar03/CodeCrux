require('dotenv').config();
const express = require("express");
const cookieParser = require('cookie-parser');
const cors = require('cors');
const main = require('./config/db');
const redisClient = require('./config/redis');
const authRouter = require("./routes/userAuth");
const problemRouter = require("./routes/problemCreator");
const submitRouter = require("./routes/submit");
const aiRouter = require("./routes/aiChatting");
const videoRouter = require("./routes/videoCreator");

const app = express();
app.set('trust proxy', 1);

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/user', authRouter);
app.use('/problem', problemRouter);
app.use('/submission', submitRouter);
app.use('/ai', aiRouter);
app.use('/video', videoRouter);

app.get('/health', (req, res) => res.json({ ok: true }));

// Fallback error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.statusCode || 500).send("Internal Server Error");
});

const PORT = process.env.PORT || 5000;

const InitalizeConnection = async () => {
    try {
        await Promise.all([main(), redisClient.connect()]);
        console.log("DB Connected");
        app.listen(PORT, () => {
            console.log("Server listening at port number: " + PORT);
        });
    } catch (err) {
        console.log("Error: " + err);
        process.exit(1);
    }
};

InitalizeConnection();
