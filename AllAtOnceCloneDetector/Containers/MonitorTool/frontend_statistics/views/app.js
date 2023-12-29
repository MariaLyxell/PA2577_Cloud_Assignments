var app = angular.module('cljstatistics', []);
var socket = io.connect();


app.controller('statsCtrl', function($scope){
  $scope.files = 0;
  $scope.candidates = 0;
  $scope.clones = 0;
  $scope.statusUpdates = 0;
  
  var updateStatistics = function(){
    socket.on('currentCount', function (json) {

      data = JSON.parse(json);
      for (let i=0; i < data.counts.length; i++)
      {
        var fileCount = data.counts[i].fileCount;
        var chunkCount = data.counts[i].chunkCount;
        var candidateCount = data.counts[i].candidateCount;
        var clonesCount = data.counts[i].cloneCount;
        var statusUpdateCount = data.counts[i].statusUpdateCount;

        $scope.$apply(function () {
        $scope.files = fileCount;
        $scope.chunks = chunkCount;
        $scope.candidates = candidateCount;
        $scope.clones = clonesCount;
        $scope.statusUpdates = statusUpdateCount;
        });
      } 
    });
  };

  var init = function(){
    document.body.style.opacity=1;
    updateStatistics();
  };
  socket.on('message',function(data){
    init();
  });
});
