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
  this.currentUser   = {};
  this.nextUser      = {};

  var self = this;

  connection.sockets.on('connection', function ( socket ) {
    winston.info( chalk.dim( 'User Connected ::', socket.request.connection.remoteAddress ) );

    self.setupEvents( socket );

    self.activeSockets.push( socket );

    socket.emit('users-update', self.users);
  });

  this.setupBot();

  this._resetQueueInterval();

  return this;
}

SocketController.prototype.setupEvents = function ( socket ) {
  var self = this;

  var context = {
    socket:     socket,
    controller: self
  };

  socket.on('bot-start', this.startEvent.bind( context ));
  socket.on('bot-stop',  this.stopEvent.bind( context ));
  socket.on('username',  this.addUsername.bind( context ));

  socket.on('disconnect', function () {
    winston.info( chalk.dim('User Disconnected.') );

    _.pull( self.activeSockets, socket );
    _.pull( self.users, socket.__username );

    delete self.userSockets[ socket.__username ];

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
    return winston.log('info', chalk.dim('No users to queue'));
  }

  users.forEach(function ( user, index ) {
    if( user === self.nextUser.name ) {
      userIndex = index;
    }
  });

  userIndex = ( typeof userIndex === 'number' ) ? userIndex : -1;

  userIndex++;

  if( userIndex + 1 > users.length ) {
    userIndex = 0;
  }

  this.currentUser = this.nextUser;
  this.nextUser = {
    name:           users[ userIndex ],                       // Username
    ballsRemaining: 1,                                        // Shooter Balls Default
    socketId:       this.userSockets[ users[ userIndex ] ].id // User's Socket id
  };

  if( !this.currentUser && this.nextUser && this.nextUser.socketId ) {
    this._resetQueueInterval();
    this._queueTick();
  }

  winston.log('info', chalk.dim('Current user is', this.currentUser.name, 'and next user is', this.nextUser.name));

  this.didUpdateCurrentUser();
};

SocketController.prototype.didUpdateCurrentUser = function () {
  this.stopEvent();
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
  console.log('ev');
  if( this.controller.currentUser.socketId !== this.socket.id ) {
    return this.socket.emit('queue-error', {
      message: 'You are not the current active user in queue'
    });
  }
  console.log('running');
  if( !gBot ) {
    return winston.log('error', chalk.bgRed('No bot connected.'));
  }

  var type = ev.eventType;

  console.log(ev);
  this.controller._emitMessage.call( this.controller, type, 'event triggered by', this.socket.__username );

  switch ( type ) {
    case 'move':
      gBot.move( ev.eventDirection, ev.speed, ev.ratio );
      break;
    case 'turn':
      gBot.turn( ev.eventDirection, ev.speed );
      break;
    case 'turnPrecise':
      gBot.spin( ev.eventDirection, ev.speed, ev.eventDegrees );
      break;
    case 'shoot':
      if( this.controller.currentUser.ballsRemaining < 1 ) {
        return this.socket.emit('event-error', {
          message: 'No balls remaining'
        });
      }

      this.controller.currentUser.ballsRemaining--;

      gBot.shoot( 100 );
  }
};

SocketController.prototype._emitMessage = function ( msg ) {
  console.log(msg);
  var args = Array.prototype.slice.call(arguments);

  if( args.length > 0 ) {
    msg = args.join(' ');
  }
  console.log(msg);

  this.connection.emit('new-message', msg);
};

SocketController.prototype._resetQueueInterval = function () {
  if( this.queueInterval ) {
    clearInterval( this.queueInterval );
  }

  this.queueInterval = setInterval( this._queueTick.bind( this ), 1000 * 10 ); // 30 Second Turns
};
