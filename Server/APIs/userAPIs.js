const exp = require('express')
const app = exp.Router()
const expressasynchandler = require('express-async-handler')
const bcrypt = require('bcryptjs')
const jwt = require("jsonwebtoken")
const user = require('../models/userModel')

// Create User
app.post('/create-user', expressasynchandler(async(req, res) => {
   
    let newUser = req.body; 
    const hashpw = await bcrypt.hash(newUser.password, 10); 
    newUser.password = hashpw; 
    const doc = new user(newUser); 
    await doc.save(); 
    const CurrUser = await user.findOne({
        $or: [{ username: newUser.username }, { email: newUser.username }]
    });
    const accessToken = jwt.sign(
        { id: CurrUser._id, username: CurrUser.username },
        process.env.ACCESS_SECRET_TOKEN,
        { expiresIn: "30m" }
    );

    const refreshToken = jwt.sign(
        { id: CurrUser._id },
        process.env.REFRESH_SECRET_TOKEN,
        { expiresIn: "7d" }
    );
    CurrUser.refreshTokenArr.push(refreshToken);
    await CurrUser.save();
    res.json({message: "user created", accessToken: accessToken, refreshToken: refreshToken});
}))

// Login User
app.post('/login-user', expressasynchandler(async(req, res) => {
    const data = req.body;
    const CurrUser = await user.findOne({
        $or: [{ username: data.username }, { email: data.username }]
    });
    if(CurrUser === null){
        res.send({message: "user not found"});
    }else{
        const Res = await bcrypt.compare(data.password, CurrUser.password);
        if(Res === false){
            res.send({message: "Invalid password"});
        }else{
            const accessToken = jwt.sign(
                { id: CurrUser._id, username: CurrUser.username },
                process.env.ACCESS_SECRET_TOKEN,
                { expiresIn: "30m" }
            );

            const refreshToken = jwt.sign(
                { id: CurrUser._id },
                process.env.REFRESH_SECRET_TOKEN,
                { expiresIn: "7d" }
            );
            CurrUser.refreshTokenArr.push(refreshToken);
            await CurrUser.save();
            res.json({message: "login success", accessToken: accessToken, refreshToken: refreshToken});
        }
    }
}))

// REFRESH ACCESS TOKEN
app.post('/token', expressasynchandler(async (req, res) => {
    const refreshToken = req.body.token;
    if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token missing" });
    }
    const CurrUser = await user.findOne({
        refreshTokenArr: refreshToken
    });
    if (!CurrUser) {
        return res.status(403).json({ message: "Invalid refresh token" });
    }
    jwt.verify(
        refreshToken,
        process.env.REFRESH_SECRET_TOKEN,
        (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: "Refresh token expired or invalid" });
            }
            // generate NEW access token
            const accessToken = jwt.sign(
                { username: CurrUser.username, id: CurrUser._id },
                process.env.ACCESS_SECRET_TOKEN,
                { expiresIn: "30m" }
            );
            res.json({ accessToken });
        }
    );
}));

// LogOut 
app.delete('/logout', expressasynchandler(async (req, res) => {
    const refreshToken = req.body.token;
    if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token missing" });
    }

    const CurrUser = await user.findOne({ refreshTokenArr: refreshToken });
    if (!CurrUser) {
        return res.status(403).json({ message: "Invalid refresh token" });
    }
    
    CurrUser.refreshTokenArr = [];
    await CurrUser.save();

    res.json({ message: "Logout successful. All sessions cleared." });
}));


module.exports = app;
