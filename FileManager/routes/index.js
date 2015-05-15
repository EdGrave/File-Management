var express = require('express');
var mongoose = require('mongoose');
var Folder = mongoose.model('Folder');
var Connections = mongoose.model('Connection');


var router = express.Router();

var connectiondetails = {
        host: '*****',
        port: 22,
        username: '******',
        password: '******'
    };

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/getFolderRecords', function(req, res, next){
  Folder.find(function(err, folders){
    if(err){return next(err);}
    res.json(folders);
  });
});

router.post('/insertFolderRecord', function(req,res,next) {
    var folder = new Folder(req.body);
    folder.save(function (err, post) {
        if (err) {
            return next(err);
        }
        res.status(200).json(folder);
    });
});

router.post('/downloadFile', function(req,res,next){    
    //Return a list of files retrieved from an SFTP server
    var downloadFolder = req.body.downloadDir;
    var file = req.body.downloadFile;
    var Client = require('ssh2').Client; 
    var conn = new Client();
    var remoteDirectory = 'private/rtorrent/data/TV/'+file.parentFolder + '/' +  file.filename;
    var localDirectory =  downloadFolder + '/'+ file.parentFolder + '/' + file.filename.match(/.*S[0-9]{2}E[0-9]{2}/i);
    var fs = require('fs'); 
    fs.mkdir(downloadFolder + '/'+ file.parentFolder, function(){
        //did an error happen?
    });
    conn.on('ready', function() {
        conn.sftp(function (err, sftp) {
            if ( err ) {                           
                res.status(500).json(err);
                process.exit( 2);
            }          
            //Download file form remote directory and save tolocal Directory
            sftp.fastGet(remoteDirectory, localDirectory,{ step: function(total_transferred,chunk,total){
                console.log("total transfered:" + total_transferred);

            }}, function(err){
                if(err) console.log(err); return res.status(500).json(err);                           
                return res.status(200).json("all done!");
            });         
            
        });
    });
    conn.on('continue', function(){
            console.log("still waiting?")
        }
    );
    conn.on(
        'error',
        function (err) {
            res.status(500).json(err);
            console.log( "- connection error: %s", err );
            process.exit( 1 );
        }
    );     
    conn.on(
        'end',
        function () {
            process.exit( 0 );
        }
    );
    conn.connect(connectiondetails);    
});

router.get('/getServerFolderNames', function(req, res, next){
    //Return a list of files retrieved from an SFTP server
    var Client = require('ssh2').Client; 
    var conn = new Client();
    conn.on('ready', function() {
      console.log('Client :: ready');
      conn.sftp(function(err, sftp) {
        if (err) return res.status(400).json(err);
        sftp.readdir('private/rtorrent/data/TV', function(err, list) {
          if (err) return res.status(400).json(err);
          res.status(200).json(list);
          conn.end();
        });
      });
    }).connect(connectiondetails);    
});

router.post('/getLocalFolderNames', function(req, res, next){
    //Return a list of files retrieved from an SFTP server   
    var downloadFolder = req.body.dldirectory;
    var fs = require('fs'); 
    fs.readdir(downloadFolder, function(err, files){
        if (err) return res.status(400).json(err);
        res.status(200).json(files);
    });
});

router.post('/getFilesForServerFolder', function(req, res,next){
    var folder = req.body;
    var Client = require('ssh2').Client; 
    var conn = new Client();
    conn.on('ready', function() {
      conn.sftp(function(err, sftp) {
        if (err) return res.status(400).json(err);
        sftp.readdir('private/rtorrent/data/TV/'+ folder.filename, function(err, list) {
          if (err) return res.status(400).json(err);         
          res.status(200).json(list);
          conn.end();
        });
      });
    }).connect(connectiondetails);    
});

router.post('/getFilesForLocalFolder', function(req, res,next){
    var downloadFolder = req.body.dldirectory;
    var folder = req.body.folder;
    var fs = require('fs'); 
    fs.readdir(downloadFolder + folder.filename, function(err, files){
        if (err) return res.status(400).json(err);
        res.status(200).json(files);
    });
});

module.exports = router;
