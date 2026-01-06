const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
    username: {
        type : String,
        required : true,
        minLength: 3,
        maxLength: 8,
        unique: true
    },
    name: {
        type : String,
        required : true
    },
    email: {
        type : String,
        match: /.+@.+\.com$/,
        required : true,
        unique: true
    },
    password: {
        type : String,
        required: true
    },
    refreshTokenArr:{
        type: [String]
    }
});

const userModel = new mongoose.model('User', userSchema);

module.exports = userModel;