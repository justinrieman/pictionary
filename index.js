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

    socket.broadcast.emit('new user', `${name} has joined the game!`);
    socket.emit('welcome', `Welcome ${name}!`);

    console.log(users);
    updateUsers();
  });

  // Send message to all clients
  socket.on('chat message', (msg) => {
    io.emit('chat message', { msg: msg, name: socket.nickname });
  });

  // Send drawing to all clients not drawing
  socket.on('drawing', (data) => {
    socket.broadcast.emit('drawing', data);
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    io.emit('user left', `${socket.nickname} left the game.`);

    // Remove disconnect user from users array
    users = users.filter((e) => e.name !== socket.nickname);

    console.log(users);

    updateUsers();
  });
});

http.listen(3000, () => {
  console.log('listening on port 3000');
});
