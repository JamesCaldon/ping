var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + "\\pong.html");
});

app.get('/pong.js', function(req, res){
    res.sendFile(__dirname + "\\pong.js");
});

http.listen(process.env.PORT || 3000, function(){
  console.log('listening on *:' + PORT);
});

sockets = new Map();
availableSlots = [1,0];

function getFirstAvailableSlot() {
  if (availableSlots.size === 0) return -1;
  return availableSlots.pop();
}

gameStarted = false;

io.on('connection', function(socket){
  console.log('a user connected');


  if (sockets.size == 2) {
    socket.disconnect();
    return;
  }
  sockets.set(socket, new createPlayer(getFirstAvailableSlot()));
  socket.emit('ServerPlayerPaddleIndex', sockets.get(socket).paddle);
  socket.on('disconnect', function(){
    console.log('user disconnected');
    availableSlots.push(sockets.get(socket).paddle);
    availableSlots.sort();
    availableSlots.reverse();
    sockets.delete(socket);
  });

  socket.on('ClientPaddleMoveUp', function(){
    socket.broadcast.emit('ServerPaddleMoveUp', sockets.get(socket).paddle);
  });

  socket.on('ClientPaddleMoveDown', function(){
    socket.broadcast.emit('ServerPaddleMoveDown', sockets.get(socket).paddle);
  });

  socket.on('ClientPaddleStopMoveUp', function(){
    socket.broadcast.emit('ServerPaddleStopMoveUp', sockets.get(socket).paddle);
  });

  socket.on('ClientPaddleStopMoveDown', function(){
    socket.broadcast.emit('ServerPaddleStopMoveDown', sockets.get(socket).paddle);
  });

  socket.on('ClientSync', function(ballx, bally, paddley) {
    socket.broadcast.emit('ServerSync', sockets.get(socket).paddle, ballx, bally, paddley);
  });

  socket.on('ClientNextRound', function(winner) {
    if (sockets.get(socket).paddle != 0) return;
    io.emit('ServerNextRound', winner);
  });

  if (sockets.size == 2) {
    console.log("Game Commencing");
    io.emit('GameReady');
    gameStarted = true;
  }

});

function createPlayer(size) {
  return {
    slot: size,
    paddle: size,
    host: false
  }
}