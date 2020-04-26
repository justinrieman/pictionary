const canvas = document.getElementById('canvas');
const c = canvas.getContext('2d');

const menuToggle = document.querySelector('.menu-toggle');
const selection = document.querySelector('.selection');
const eraser = document.getElementById('eraser');

menuToggle.addEventListener('click', function () {
  selection.classList.toggle('open');
});
///////////// Variables /////////////

let isDrawing = false;
let color = 'rgb(100,200,150)';
let thickness = 7;
let players = [];
let currentPlayer, randomWord;
const words = ['dog', 'cat', 'coffee mug', 'snow globe'];

///////////// Event Listeners /////////////

canvas.addEventListener('mousedown', startPosition);
canvas.addEventListener('mouseup', endPosition);
canvas.addEventListener('mousemove', draw);

// Change color
eraser.addEventListener('click', function () {
  eraser.classList.add('active-color');
  color = 'black';
});

// Change thickness
// Couldn't get size from iterating over node list like the colors
const small = document.querySelector('.small');
const medium = document.querySelector('.medium');
const large = document.querySelector('.large');

small.addEventListener('click', function () {
  thickness = 7;
  small.classList.add('active-size');
  medium.classList.remove('active-size');
  large.classList.remove('active-size');
});

medium.addEventListener('click', function () {
  thickness = 12;
  medium.classList.add('active-size');
  small.classList.remove('active-size');
  large.classList.remove('active-size');
});

large.addEventListener('click', function () {
  thickness = 20;
  large.classList.add('active-size');
  small.classList.remove('active-size');
  medium.classList.remove('active-size');
});

///////////// Socket.io /////////////

const socket = io();

const form = document.querySelector('.guess-form');
const input = document.querySelector('.guess-input');

form.addEventListener('submit', function (e) {
  let msg = e.target.elements.msg.value;
  e.preventDefault();

  socket.emit('chat message', msg);

  if (msg.includes(randomWord)) {
    let winner = players.filter((e) => e.id === socket.id);
    socket.emit('winner', winner[0]);
  }

  e.target.elements.msg.value = '';
  e.target.elements.msg.focus();
});

const chatContainer = document.querySelector('.chat-container');

socket.on('chat message', function (data) {
  displayChat(data.msg, data.name);
});

function displayChat(message, name) {
  const div = document.createElement('div');
  div.classList.add('chat-box');

  const user = document.createElement('p');
  user.classList.add('chat-box-user');
  user.innerHTML = name;

  const text = document.createElement('p');
  text.classList.add('chat-box-text');
  text.innerHTML = message;

  chatContainer.appendChild(div);
  div.appendChild(user);
  div.appendChild(text);

  chatContainer.scrollTop = chatContainer.scrollHeight;
}

///////////// Functions /////////////

function startPosition() {
  isDrawing = true;
}

function endPosition() {
  isDrawing = false;
  c.beginPath();
}

function draw(e) {
  if (!isDrawing) return;
  if (socket.id === currentPlayer[0].id) {
    c.lineWidth = thickness;
    c.lineCap = 'round';
    c.strokeStyle = color;
    c.beginPath();
    c.lineTo(e.clientX - canvas.offsetLeft, e.clientY - canvas.offsetTop);
    c.stroke();
    c.beginPath();
    c.moveTo(e.clientX - canvas.offsetLeft, e.clientY - canvas.offsetTop);

    socket.emit('drawing', {
      x: e.clientX,
      y: e.clientY,
      w: thickness,
      co: color,
    });
  }
}

socket.on('drawing', (data) => {
  c.fillStyle = data.co;
  c.beginPath();
  c.arc(
    data.x - canvas.offsetLeft,
    data.y - canvas.offsetTop,
    data.w / 2,
    0,
    Math.PI * 2,
    true
  );
  c.closePath();
  c.fill();
});

/////////////// Color Picker ///////////////////

const pickr = Pickr.create({
  el: '.pickr',
  theme: 'classic', // or 'monolith', or 'nano'
  default: 'white',
  swatches: ['red', 'orange', 'yellow', 'green', 'blue', 'purple'],
  comparison: false,

  components: {
    // Main components
    preview: true,
    opacity: true,
    hue: true,

    // Input / output Options
    interaction: {
      hex: false,
      rgba: false,
      hsla: false,
      hsva: false,
      cmyk: false,
      input: true,
      clear: false,
      save: true,
    },
  },
});

pickr.on('change', (c) => {
  color = c.toRGBA().toString();
  eraser.classList.remove('active-color');
});

pickr.on('save', (c) => {
  pickr.addSwatch(c.toRGBA().toString());
});

/////////////// Handle Users /////////////////////

// form to determine username
const nicknameForm = document.querySelector('.nickname-form');
const nicknameInput = document.querySelector('.nickname-input');
const nicknameBtn = document.querySelector('.nickname-btn');

// on submit, hide form, emit user name, push to users on connection

nicknameForm.addEventListener('submit', function (e) {
  e.preventDefault();
  socket.emit('new user', e.target.elements.nickname.value);
  nicknameForm.style.display = 'none';
});

// Broadcast new user to all sockets but the one whos joining

socket.on('new user', (name) => {
  displayChat(name, 'Friendly Bot');
});

// Display welcome message only to socket that joins

socket.on('welcome', (name) => {
  displayChat(name, 'Friendly Bot');
  getRandomWord();
});

socket.on('random word', (word) => {
  randomWord = word;
});
// Update the user section when someone leaves or joins

socket.on('update users', (users) => {
  updateUsers(users);
});

socket.on('winner', (winner) => {
  displayChat(
    `${winner.name} has guessed correctly! Their turn to draw!`,
    'Friendly Bot'
  );
  getRandomWord();
});

// Display Chat to everyone when someone leaves

socket.on('user left', (msg) => {
  displayChat(msg, 'Friendly Bot');
});

// display users in the user section

function updateUsers(users) {
  players = users;

  currentPlayer = players.filter((e) => e.isTurn === true);
  const div = document.querySelector('.users');
  div.innerHTML = '';
  users.forEach((user) => {
    const p = document.createElement('p');
    const i = document.createElement('i');
    i.classList.add('fas', 'fa-user');

    p.appendChild(i);
    p.innerHTML += user.name;

    div.appendChild(p);
  });
}

function getRandomWord() {
  const display = document.querySelector('.random-word');

  if (socket.id === currentPlayer[0].id) {
    randomWord = words[Math.floor(Math.random() * words.length)];
    display.innerHTML = randomWord;
    socket.emit('random word', randomWord);
  } else {
    display.innerHTML = 'Guess the Word';
  }
}
