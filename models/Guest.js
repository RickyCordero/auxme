const mongoose = require('mongoose');

// Guest Schema
const GuestSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    pin: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: "guest"
    }
});

const Guest = mongoose.model('Guest', GuestSchema);

module.exports = Guest;