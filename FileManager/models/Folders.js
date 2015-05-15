var mongoose = require('mongoose');

var FolderSchema = new mongoose.Schema({
    parentFolder: String,
    filename: String,
    displayname: String,
    downloaded: String
});

mongoose.model('Folder', FolderSchema);