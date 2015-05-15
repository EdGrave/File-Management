/**
 * Created by edward.grave on 28/04/2015.
 */
var mongoose = require('mongoose');

var ConnectionsSchema = new mongoose.Schema({
    userName: String,
    password: String,
    port: String,
    host: String
});

mongoose.model('Connection', ConnectionsSchema);