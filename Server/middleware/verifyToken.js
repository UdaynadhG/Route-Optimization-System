
const jwt = require("jsonwebtoken");

function authenticate(req, res, next){
    const authHeader = req.headers['authorization'];
    //Bearer TOKEN
    const token = authHeader && authHeader.split(' ')[1];
    if(token === null) return res.sendStatus(403);
    jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
        if (err) {
            if (err.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Access token expired" });
            }
            return res.status(403).json({ message: "Invalid token" });
        }
        req.user = decoded;
        next();
    });
}

module.exports = authenticate;