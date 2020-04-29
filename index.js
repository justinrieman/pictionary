const express = require('express');
const path = require('path');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(path.join(__dirname, '/public')));

let users = [];
let word;

function updateUsers() {
  io.emit('update users', users);
}

io.on('connection', (socket) => {
  io.emit('random word', word);

  // Updates users to show all players to somebody joining
  updateUsers();

  // Broadcast new user to all sockets but the one whos joining
  socket.on('new user', (name) => {
    // Save all users in users object
    socket.nickname = name;
    let obj = {};
    // give the first person to join drawing power with isTurn being true
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
    word = randomWord;
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

    //if user disconnected was the drawer, make someone else drawer

    const indexOfUser = users.findIndex((i) => i.name === socket.nickname);

    //if player leaving is drawer and theres at least 2 players

    if (users[indexOfUser].isTurn && users.length > 1) {
      const oldDrawer = users[indexOfUser]; // Leaving Player
      users = users.filter((e) => e.name !== socket.nickname); // Take player out of users

      const newDrawer = users[Math.floor(Math.random() * users.length)];
      newDrawer.isTurn = true; // Assign a random player drawing power
      updateUsers();
      io.emit('new drawer', { oldDrawer, newDrawer });
    } else {
      // else just remove the player from users
      users = users.filter((e) => e.name !== socket.nickname);
      updateUsers();
    }
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log('listening on port 3000');
});
