var express = require('express'),
    async = require('async'),
    { MongoClient } = require('mongodb'),
    fs = require('node:fs'),
    cookieParser = require('cookie-parser'),
    app = express(),
    server = require('http').Server(app),
    io = require('socket.io')(server);

var port = process.env.PORT || 4000;

io.on('connection', function (socket) {

  socket.emit('message', { text : 'Welcome!' });

  socket.on('subscribe', function (data) {
    socket.join(data.channel);
  });
});

var currentCountArr = [];
var timeArr = [];
var chunksValueArr = [];
var filesValueArr = [];
var candidatesValueArr = [];
var clonesValueArr = [];
var oldTime = 0;
var previosChunkValue = 0;
var currentChunkValue = 0;
var previosFileValue = 0;
var currentFileValue = 0;
var previosCandidateValue = 0;
var currentCandidateValue = 0;
var previosCloneValue = 0;
var currentCloneValue = 0;
var noFiles = 0;
var noChunks = 0;
var noCandidates = 0;
var noClones = 0;
var noStatusUpdates = 0;


var monitorStatistics = true;



async function startMonitoring() {
  const uri = 'mongodb://dbstorage:27017/cloneDetector';
  var mongodbClient = new MongoClient(uri);

  var db = mongodbClient.db("cloneDetector");
  console.log("Connected to db");

  while (monitorStatistics){
    monitorStatistics = getData(); 

    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  async function getData() {

    let resultString = "Start monitoring";
   
    previosFileValue = noFiles;
    var files = db.collection("files").count();
    await files.then(function(result) {
      noFiles = result;
    });
    currentFileValue = noFiles;


    previosChunkValue = noChunks;
    var chunks = db.collection("chunks").count();
    await chunks.then(function(result) {
      noChunks = result;
    });
    currentChunkValue = noChunks;


    previosCandidateValue = noCandidates;
    var candidates = db.collection("candidates").count();
    await candidates.then(function(result) {
      noCandidates = result;
    });
    currentCandidateValue = noCandidates;


    previosCloneValue = noClones;
    var clones = db.collection("clones").count();
    await clones.then(function(result) {
      noClones = result;
    });
    currentCloneValue = noClones;


    var statusUpdates = db.collection("statusupdates").count();
    await statusUpdates.then(function(result) {
      noStatusUpdates = result;
    });

    
    var sampleTime = new Date();
    var currentCount = {"fileCount": noFiles, "chunkCount": noChunks, "candidateCount": noCandidates, "cloneCount": noClones, "statusUpdateCount": noStatusUpdates};
    
    
    if (currentCountArr.length == 0)
    {
      currentCountArr.push(currentCount);
      fs.writeFile('./monitoringResult.txt', resultString, err => {
        if (err) {
          console.error(err);
        }
        // file written successfully
      });
    }
    else
    {

      // ms to sec => number of files / second
      let fileVal = ((currentFileValue-previosFileValue)*1000)/(sampleTime-oldTime);
      filesValueArr.push(fileVal);
      timeArr.push(sampleTime);


      // ms to sec => number of files / second
      let chunkVal = ((currentChunkValue-previosChunkValue)*1000)/(sampleTime-oldTime);
      chunksValueArr.push(chunkVal);

      // ms to sec => number of files / second
      let candidateVal = ((currentCandidateValue-previosCandidateValue)*1000)/(sampleTime-oldTime);
      candidatesValueArr.push(candidateVal);

      // ms to sec => number of files / second
      let cloneVal = ((currentCloneValue-previosCloneValue)*1000)/(sampleTime-oldTime);
      clonesValueArr.push(cloneVal);


      resultString = "\n\nTime: " + timeArr + "\nFiles: " + filesValueArr + "\nChunks: " + chunksValueArr + "\nCandidates: " + candidatesValueArr + "\nClones: " + clonesValueArr + "\n\n***************************\n\n";

      oldTime = sampleTime;


      fs.appendFile('./monitoringResult.txt', resultString, err => {
        if (err) {
          console.error(err);
        }
        // file written successfully
      });


      if (currentCount == currentCountArr[currentCountArr.length-1])
      {
        return false;
      }
      else
      {
        currentCountArr.push(currentCount);
        io.sockets.emit("currentCount", JSON.stringify({"counts": currentCountArr}));
      }
    }
  
    return true; 
  }
}

startMonitoring();


app.use(cookieParser());
app.use(express.urlencoded());
app.use(express.static(__dirname + '/views'));

app.get('/', function (req, res) {
  res.sendFile(path.resolve(__dirname + '/views/index.html'));
});

server.listen(port, function () {
  var port = server.address().port;
  console.log('App running on port ' + port);
});
