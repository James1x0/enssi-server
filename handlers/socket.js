/*
  WebSocket Handler
*/

var winston = require('winston'),
    chalk   = require('chalk'),
    _       = require('lodash');

var socketio = require('socket.io'),
    NxtController = require('../nxt/controller'),
    gBot;

module.exports = SocketController;

function SocketController ( app ) {

  var connection = socketio( app );

  this.connection    = connection;
  this.activeSockets = [];
  this.users         = [];

  var self = this;

  connection.sockets.on('connection', function ( socket ) {
    winston.info( chalk.dim( 'User Connected ::', socket.request.connection.remoteAddress ) );

    self.setupEvents( socket );

    self.activeSockets.push( socket );

    socket.emit('users-update', self.users);
  });

  this.setupBot();
}

SocketController.prototype.setupEvents = function ( socket ) {
  var self = this;

  var addUsername = this.addUsername.bind({
    socket:     socket,
    controller: self
  });

  socket.on('bot-start', this.startEvent);
  socket.on('bot-stop',  this.stopEvent);
  socket.on('username',  addUsername);

  socket.on('disconnect', function () {
    winston.info( chalk.dim('User Disconnected.') );

    _.pull( self.activeSockets, socket );
    _.pull( self.users, socket.__username );

    self.updateUsers.call( self );
  });
  socket.on('error', function (err) {
  if (err.description) throw err.description;
  else throw err; // Or whatever you want to do
});
};

SocketController.prototype.addUsername = function ( data ) {
  this.socket.__username = data;

  this.controller.users.push( data );
  this.controller.updateUsers.call( this.controller );
};

SocketController.prototype.updateUsers = function () {
  console.log('updating users', this.users);
  this.connection.emit('users-update', this.users);
};

SocketController.prototype.setupBot = function () {
  var bot = new NxtController({
    device: process.env.NXT_DEVICE,
    motors: {
      left:  'A',
      right: 'B',
      aux:   'C'
    }
  });

  var self = this;

  bot.connect(function ( connection ) {
    gBot              = bot;
    self.botConnected = true;

    self.activeSockets.forEach(function ( socket ) {
      socket.emit('bot-connection');
    });
  });
};

SocketController.prototype.stopEvent = function ( ev ) {
  if( !gBot ) {
    return winston.log('error', chalk.bgRed('No bot connected.'));
  }

  gBot.stop();
};

SocketController.prototype.startEvent = function ( ev ) {
  if( !gBot ) {
    return winston.log('error', chalk.bgRed('No bot connected.'));
  }

  var type = ev.eventType;

  console.log(ev);

  switch ( type ) {
    case 'move':
      gBot.move( ev.eventDirection, 100 );
      break;
    case 'turn':
      gBot.turn( ev.eventDirection, 100 );
      break;
    case 'turnPrecise':
      gBot.spin( ev.eventDirection, 100, ev.eventDegrees );
      break;
    case 'shoot':
      gBot.shoot( 100 );
  }
};
