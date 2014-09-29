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
  this.userSockets   = {};

  var self = this;

  connection.sockets.on('connection', function ( socket ) {
    winston.info( chalk.dim( 'User Connected ::', socket.request.connection.remoteAddress ) );

    self.setupEvents( socket );

    self.activeSockets.push( socket );

    socket.emit('users-update', self.users);
  });

  this.setupBot();

  this.queueInterval = setInterval( this._queueTick, 1000 * 30 ); // 30 Second Turns

  return this;
}

SocketController.prototype.setupEvents = function ( socket ) {
  var self = this;

  var context = {
    socket:     socket,
    controller: self
  };

  socket.on('bot-start', this.startEvent.bind( context ));
  socket.on('bot-stop',  this.stopEvent);
  socket.on('username',  this.addUsername.bind( context ));

  socket.on('disconnect', function () {
    winston.info( chalk.dim('User Disconnected.') );

    _.pull( self.activeSockets, socket );
    _.pull( self.users, socket.__username );

    delete userSockets[ socket.__username ];

    self.updateUsers.call( self );
  });

  socket.on('error', function ( err ) {
    winston.log('error', chalk.bgRed( err ));
  });
};

SocketController.prototype.addUsername = function ( data ) {
  if( this.controller.users.indexOf( data ) > -1 ) {
    return this.socket.emit('username-taken');
  }

  this.socket.__username = data;

  this.controller.users.push( data );

  this.controller.userSockets[ data ] = this.socket;

  this.controller.updateUsers.call( this.controller );
};

SocketController.prototype.updateUsers = function () {
  console.log( this.users );
  this.connection.emit('users-update', this.users);
};

SocketController.prototype._queueTick = function () {
  var users = this.users,
      self  = this,
      userIndex;

  if( !_.isArray( users ) || users.length < 1 ) {
    return;
  }

  users.forEach(function ( user, index ) {
    if( user === self.currentUser.name ) {
      userIndex = index;
    }
  });

  userIndex = ( typeof userIndex === 'number' ) ? userIndex : -1;

  userIndex++;

  if( userIndex > this.users.length )

  this.currentUser = this.nextUser;

  this.nextUser = {
    name:           users[ userIndex ],                       // Username
    ballsRemaining: 1,                                        // Shooter Balls Default
    socketId:       this.userSockets[ users[ userIndex ] ].id // User's Socket id
  };

  this.didUpdateCurrentUser();
};

SocketController.prototype.didUpdateCurrentUser = function () {
  var striped = {
    current: this.currentUser,
    next:    this.nextUser
  };

  delete striped.current.socketId;
  delete striped.next.socketId;

  this.connection.emit('queue-update', {
    current: this.currentUser,
    next:    this.nextUser
  });
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

    self.connection.emit('bot-connection');
  });
};

SocketController.prototype.stopEvent = function ( ev ) {
  if( !gBot ) {
    return winston.log('error', chalk.bgRed('No bot connected.'));
  }

  gBot.stop();
};

SocketController.prototype.startEvent = function ( ev ) {
  if( this.controller.currentUser.socketId !== this.socket.id ) {
    return socket.emit('queue-error', {
      message: 'You are not the current active user in queue'
    });
  }

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
      if( this.currentUser.ballsRemaining < 1 ) {
        return this.socket.emit('event-error', {
          message: 'No balls remaining'
        });
      }

      this.currentUser.ballsRemaining--;

      gBot.shoot( 100 );
  }
};
