/**
 * Created by edward.grave on 28/04/2015.
 */
var app = angular.module('fileManagement', ['ui.router']);

app.config([
    '$stateProvider',
    '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('home', {
                url: '/home',
                templateUrl: '/home.html',
                controller: 'MainCtrl',
                resolve: {
                    postPromise: ['FolderFactory', function(FolderFactory){
                        return FolderFactory.getAll();
                    }]
                }
            });

        $urlRouterProvider.otherwise('home');
}]);

app.factory('FolderFactory', ['$http', function($http) {
    var factory = {
        serverFolders : [], 
        localFolders : [],
        dldirectory : './Downloads/',
        host : '',
        username : '',
        password : '',
        port : '',
        loading: true
    };

    var findFile = function(folder, file){
        var foundFolder = _.find(factory.serverFolders, function(factFolder){
                if(folder.filename == factFolder.filename) return factFolder;
            });
            return _.find(foundFolder.files, function(factFile){
                if(factFile.filename == file.filename) return factFile;
            });
    };

    var checkAgainstRecords = function(data){
        var serverFolders = [];
        angular.copy(data, serverFolders);
        //Get records from DB
        $http.get('../getFolderRecords')
        .success(function(data){
            var folderRecords = [];
            angular.copy(data, folderRecords);
            //Compare files to records and decide what is already downloaded.
            _.each(serverFolders, function(serverFolder){                        
                _.each(serverFolder.files, function(file){
                    var foundName = false;
                    _.each(folderRecords, function(folderRecord){
                        if (file.filename == folderRecord.filename && serverFolder.filename == folderRecord.parentFolder) {
                            foundName = true;
                        }
                    });
                    if (foundName == true) {
                        file.downloaded = 'true';
                    }
                    else {
                        file.downloaded = 'false';
                    }                            
                });                
                var foundFolder = _.find(factory.serverFolders, function(folder){
                    if(folder.filename == serverFolder.filename) return folder;
                });
                var index = factory.serverFolders.indexOf(foundFolder);
                if (index > -1) {
                    factory.serverFolders.splice(index, 1);
                }
                factory.serverFolders.splice(index, 0, serverFolder);
                serverFolder.expand = true;
            });                    
        });
    };
        
    factory.getAll = function(){
        //Get files from sftp server
        $http.get('../getServerFolderNames')
            .success(function(data){
                var serverFolders = [];
                angular.copy(data, serverFolders);
                _.each(serverFolders, function(serverFolder){
                    serverFolder.expanded = false;
                    factory.serverFolders.push(serverFolder);   
                });
            }).finally(function () {
              // Hide loading spinner whether our call succeeded or failed.
              factory.loading = false;
            });
        //Get files from local system
        $http.post('../getLocalFolderNames', {dldirectory : factory.dldirectory})
            .success(function(data){
                var localFolders = [];
                angular.copy(data, localFolders);
                _.each(localFolders, function(localFolder){
                    var folder = {};
                    folder.expanded = false;
                    folder.filename = localFolder;
                    folder.displayname = localFolder;
                    factory.localFolders.push(folder);   
                });            
            });
    };

    factory.choose = function(folder, file){
        var foundFile = findFile(folder, file);
        if(foundFile && foundFile.downloaded != "true") foundFile.downloaded = "waiting";
    };

    factory.getFilesForServerFolder = function(folder){
        var files = [];
        if(folder.files)
        {
            if(folder.expand == true)folder.expand = false;
            else folder.expand = true;
        }
        else{
            $http.post('../getFilesForServerFolder', folder)
            .success(function(data){
                angular.copy(data, files);
                folder.files = [];
                _.each(files, function(file){
                    var displayname = file.filename.match(/.*S[0-9]{2}E[0-9]{2}/i)[0];
                    if(displayname) file.displayname = displayname;
                    else file.displayname = file.filename;
                    
                    folder.files.push(file);                
                });
                checkAgainstRecords([folder], false);
            });
        }
    };

    factory.getFilesForLocalFolder = function(folder){
        var files = [];
        if(folder.files)
        {
            if(folder.expand == true)folder.expand = false;
            else folder.expand = true;
        }
        else{
            $http.post('../getFilesForLocalFolder', {dldirectory : factory.dldirectory, folder: folder})
            .success(function(data){
                angular.copy(data, files);                
                _.find(factory.localFolders, function(localFolder){
                    if(localFolder.filename == folder.filename) 
                    {
                        localFolder.files = []; 
                        localFolder.expand = true;
                        _.each(files, function(file){
                            var newFile = {
                                displayname : file,  
                                filename : file 
                            };                             
                            localFolder.files.push(newFile);                
                        });                        
                    }
                }); 
            });

        }
    };

    factory.chooseAll = function(folder){
        _.each(folder.files, function(file){if(file.downloaded != "true")file.downloaded = "waiting";});        
    };

    factory.download = function(){        
        _.each(factory.serverFolders, function(folder){
            _.each(folder.files, function(file){
                if(file.downloaded == "waiting")
                {
                    var recordFile =  {};
                    angular.copy(file, recordFile);
                    recordFile.parentFolder = folder.filename;
                    //Make request to download it
                    return $http.post('/downloadFile', {downloadFile: recordFile, downloadDir: factory.dldirectory}).success(function(data){
                        //Update the record to say it's been downloaded
                        return $http.post('/insertFolderRecord', recordFile).success(function(data){
                            file.downloaded = "true";                            
                        });                        
                    });
                }
            });
        });        
    };

    return factory;
}]);

app.controller('MainCtrl', ['$scope','FolderFactory', function($scope, FolderFactory){  
    $scope.loading = FolderFactory.loading;
    $scope.dldirectory = FolderFactory.dldirectory;  
    $scope.serverFolders = FolderFactory.serverFolders;
    $scope.localFolders = FolderFactory.localFolders;
    $scope.choose = function(folder, file){FolderFactory.choose(folder, file);};
    $scope.download = function(){ FolderFactory.loading = true, FolderFactory.download();};
    $scope.chooseAll = function(folder){ FolderFactory.chooseAll(folder);};
    $scope.getFilesForServerFolder = function(folder){FolderFactory.getFilesForServerFolder(folder);};
    $scope.getFilesForLocalFolder = function(folder){FolderFactory.getFilesForLocalFolder(folder);};
}]);

