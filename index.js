const express = require('express');
const path = require('path');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(path.join(__dirname, '/public')));

let users = [];

function updateUsers() {
  io.emit('update users', users);
}

io.on('connection', (socket) => {
  // Updates users to show all players to somebody joining
  updateUsers();

  // Broadcast new user to all sockets but the one whos joining
  socket.on('new user', (name) => {
    // Save all users in users object
    socket.nickname = name;
    let obj = {};
    if (users.length === 0) {
      obj = {
        name: name,
        id: socket.id,
        isTurn: true,
      };

      users.push(obj);
    } else {
      obj = {
        name: name,
        id: socket.id,
        isTurn: false,
      };

      users.push(obj);
    }

    updateUsers();

    socket.broadcast.emit('new user', `${name} has joined the game!`);
    socket.emit('welcome', `Welcome ${name}!`);
  });

  // Send message to all clients
  socket.on('chat message', (msg) => {
    io.emit('chat message', { msg: msg, name: socket.nickname });
  });

  socket.on('random word', (randomWord) => {
    console.log(randomWord);
    io.emit('random word', randomWord);
  });

  // Send drawing to all clients not drawing
  socket.on('drawing', (data) => {
    socket.broadcast.emit('drawing', data);
  });

  socket.on('winner', (winner) => {
    // Remove isTurn from drawer
    // Give isTurn to winner
    users.forEach((user) => {
      if (user.id === winner.id) {
        user.isTurn = true;
      } else {
        user.isTurn = false;
      }
    });

    updateUsers();

    io.emit('winner', winner);
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    io.emit('user left', `${socket.nickname} left the game.`);

    // Remove disconnect user from users array
    users = users.filter((e) => e.name !== socket.nickname);

    updateUsers();
  });
});

http.listen(3000, () => {
  console.log('listening on port 3000');
});
