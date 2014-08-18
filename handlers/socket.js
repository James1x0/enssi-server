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

  var connection = socketio(app);

  this.connection = connection;
  this.activeSockets = [];

  var self = this;

  connection.sockets.on('connection', function ( socket ) {
    winston.info( chalk.dim('User Connected.') );

    self.setupEvents( socket );

    self.activeSockets.push( socket );
  });

  connection.sockets.on('disconnect', function ( socket ) {

  });

  this.setupBot();
}

SocketController.prototype.setupEvents = function ( socket ) {
  var self = this;

  socket.on('bot-start', this.startEvent);
  socket.on('bot-stop',  this.stopEvent);

  socket.on('disconnect', function () {
    winston.info( chalk.dim('User Disconnected.') );

    _.pull( self.activeSockets, socket );
  });
}

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
    gBot = bot;
    self.botConnected = true;

    self.activeSockets.forEach(function ( socket ) {
      socket.emit('bot-connection');
    })
  });
}

SocketController.prototype.stopEvent = function ( ev ) {
  if( !gBot ) {
    return winston.log('error', chalk.bgRed('No bot connected.'));
  }

  gBot.stop();
}

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
}