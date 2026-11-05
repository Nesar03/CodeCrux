const redisClient = require("../config/redis");
const User = require("../models/user");
const validate = require('../utils/validator');
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const Submission = require("../models/submission");

const ONE_HOUR = 60 * 60;

const isProd = process.env.NODE_ENV === 'production';

const cookieOptions = () => ({
    maxAge: ONE_HOUR * 1000,
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
});

const publicUser = (user) => ({
    firstName: user.firstName,
    emailId: user.emailId,
    _id: user._id,
    role: user.role
});

const signToken = (user) =>
    jwt.sign({ _id: user._id, emailId: user.emailId, role: user.role }, process.env.JWT_KEY, { expiresIn: ONE_HOUR });

const register = async (req, res) => {
    try {
        validate(req.body);
        const { firstName, lastName, emailId, password, age } = req.body;

        // Whitelist fields: nobody can self-assign a role
        const user = await User.create({
            firstName,
            lastName,
            emailId,
            age,
            password: await bcrypt.hash(password, 10),
            role: 'user'
        });

        res.cookie('token', signToken(user), cookieOptions());
        res.status(201).json({ user: publicUser(user), message: "Registered Successfully" });
    } catch (err) {
        if (err && err.code === 11000)
            return res.status(400).send("Error: Email already registered");
        res.status(400).send("Error: " + (err.message || err));
    }
};

const login = async (req, res) => {
    try {
        const { emailId, password } = req.body;

        if (!emailId || !password || typeof emailId !== 'string' || typeof password !== 'string')
            throw new Error("Invalid Credentials");

        const user = await User.findOne({ emailId: emailId.trim().toLowerCase() });
        if (!user)
            throw new Error("Invalid Credentials");

        const match = await bcrypt.compare(password, user.password);
        if (!match)
            throw new Error("Invalid Credentials");

        res.cookie('token', signToken(user), cookieOptions());
        res.status(200).json({ user: publicUser(user), message: "Logged In Successfully" });
    } catch (err) {
        res.status(401).send("Error: " + err.message);
    }
};

const logout = async (req, res) => {
    try {
        const { token } = req.cookies;
        const payload = jwt.decode(token);

        if (payload && payload.exp) {
            await redisClient.set(`token:${token}`, 'Blocked');
            await redisClient.expireAt(`token:${token}`, payload.exp);
        }

        const { maxAge, ...clearOpts } = cookieOptions();
        res.clearCookie("token", clearOpts);
        res.send("Logged Out Successfully");
    } catch (err) {
        res.status(503).send("Error: " + err.message);
    }
};

const adminRegister = async (req, res) => {
    try {
        if (req.result.role !== 'admin')
            throw new Error("Invalid Credentials");

        validate(req.body);
        const { firstName, lastName, emailId, password, age } = req.body;

        await User.create({
            firstName,
            lastName,
            emailId,
            age,
            password: await bcrypt.hash(password, 10),
            role: 'admin'
        });

        // Do NOT replace the calling admin's cookie with the new account's token
        res.status(201).send("Admin Registered Successfully");
    } catch (err) {
        if (err && err.code === 11000)
            return res.status(400).send("Error: Email already registered");
        res.status(400).send("Error: " + (err.message || err));
    }
};

const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.result._id)
            .select('firstName lastName emailId age role problemSolved createdAt')
            .populate({ path: 'problemSolved', select: '_id title difficulty tags' });
        res.status(200).json({ user });
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
};

const deleteProfile = async (req, res) => {
    try {
        const userId = req.result._id;
        const { token } = req.cookies;

        await User.findByIdAndDelete(userId);
        await Submission.deleteMany({ userId });

        const payload = jwt.decode(token);
        if (payload && payload.exp) {
            await redisClient.set(`token:${token}`, 'Blocked');
            await redisClient.expireAt(`token:${token}`, payload.exp);
        }

        const { maxAge, ...clearOpts } = cookieOptions();
        res.clearCookie("token", clearOpts);
        res.status(200).send("Deleted Successfully");
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
};

module.exports = { register, login, logout, adminRegister, deleteProfile, getProfile };
