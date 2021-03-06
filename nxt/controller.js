/*
  NXT Controller
*/

var winston = require('winston'),
    chalk   = require('chalk'),
    nodeNxt = require('node-nxt'),
    _       = require('lodash');
    
module.exports = NxtController;

var portMap = {
  A: 1,
  B: 2,
  C: 3
};

function NxtController ( options ) {
  this.device    = options.device || '/dev/cu.usbmodem1411';
  this.connected = false;

  if( !options.motors || !options.motors.left || !options.motors.right ) {
    winston.log('error', chalk.bgRed('NxtController :: Need motors left and right'));
    throw new Error('NXT Setup Error');
  }

  for ( var key in options.motors ) {
    var v = options.motors[ key ];

    options.motors[ key ] = portMap[ v ];
  }

  this.motors = options.motors;
}

NxtController.prototype.connect = function ( callback ) {
  var controller = this;

  winston.log( chalk.dim('NxtController :: Connecting...') );

  nodeNxt.connect(this.device, function ( nxt ) {
    console.log('fin');
    console.log(nxt);
    if( nxt ) {
      controller.nxt       = nxt;
      controller.connected = true;
    } else {
      winston.log('error', chalk.bgRed('NxtController :: Unable to connect to NXT @ ', controller.device) );
      throw new Error('NXT Connection Error');
    }

    nxt.OutputSetRegulation( 1, 1, 1 );
    nxt.OutputSetRegulation( 2, 1, 1 );
    nxt.OutputSetRegulation( 3, 1, 1 );

    if( callback && typeof callback === 'function' ) {
      callback( nxt );
    }
  });
};

NxtController.prototype.checkConnection = function () {
  if( !this.connected || !this.nxt ) {
    winston.log('error', chalk.bgRed('NxtController :: Attempted to call method that requires initialization'));
    throw new Error('NXT Connect First Error');
  }
};

/*
  Move Method

  @direction: String -> 'FWD' or 'BWD'
  @speed:     Integer -> 0-100
*/
NxtController.prototype.move = function ( direction, speed, turnRatio, callback ) {
  this.checkConnection();

  var fwd = ( direction === 'FWD' ),
      l   = this.motors.left,
      r   = this.motors.right,
      nxt = this.nxt,
      speedm;

  if( !fwd ) {
    speed = 0 - speed;
  }
  console.log(turnRatio);
  if( turnRatio ) {
    speedm = {
      l: ( turnRatio < 0 ) ? speed : speed * turnRatio,
      r: ( turnRatio > 0 ) ? speed : speed * Math.abs( turnRatio )
    };
  } else {
    speedm = {
      l: speed,
      r: speed
    };
  }

  console.log(speedm);

  nxt.OutputSetSpeed( l, 32, speedm.l );
  nxt.OutputSetSpeed( r, 32, speedm.r );
};

NxtController.prototype.moveAuxPrecise = function ( speed, degrees, callback ) {
  this.movePrecise( this.motors.aux, speed, degrees, callback );
};

NxtController.prototype.movePrecise = function ( port, speed, degrees, callback ) {
  this.checkConnection();

  var nxt = this.nxt;

  port = ( typeof port === 'number' ) ? port : portMap[ port ];

  nxt.OutputSetSpeed( port, 32, speed, degrees );

  if( callback && typeof callback === 'function' ) {
    callback();
  }
};

NxtController.prototype.movePreciseInverse = function ( port, inversePort, speed, degrees ) {
  this.checkConnection();

  this.movePrecise( port, speed, degrees );
  this.movePrecise( inversePort, 0 - speed, degrees );
};

NxtController.prototype.moveInverse = function ( port, inversePort, speed ) {
  this.checkConnection();

  var nxt = this.nxt;

  nxt.OutputSetSpeed( port, 32, speed );
  nxt.OutputSetSpeed( inversePort, 32, 0 - speed );
};

NxtController.prototype.spin = function ( direction, speed, botDegrees ) {
  var multiplier = 5.40,
      deg        = Math.round( botDegrees * multiplier ),
      portI      = this.motors[ direction ],
      port       = ( portI === this.motors.left ) ? this.motors.right : this.motors.left;

  console.log(deg, port, portI);

  this.movePreciseInverse( port, portI, speed, deg );
};

NxtController.prototype.turn = function ( direction, speed ) {
  var portI = this.motors[ direction ],
      port  = ( portI === this.motors.left ) ? this.motors.right : this.motors.left;

  this.moveInverse( port, portI, speed );
};

/*
  Shoot Method

  Shooter bot function, uses aux port. Could use prototype.moveAuxPrecise instead.
*/
NxtController.prototype.shoot = function ( speed, callback ) {
  this.moveAuxPrecise( speed, 360, callback );
};

/*
  Stop Method

  Stops all movement on Left/Right Motors
*/
NxtController.prototype.stop = function () {
  this.checkConnection();

  var l   = this.motors.left,
      r   = this.motors.right,
      nxt = this.nxt;

  nxt.OutputSetSpeed(l, 32, 0);
  nxt.OutputSetSpeed(r, 32, 0);

  if( this.isDancing ) {
    clearInterval( this.danceInterval );
    this.isDancing = false;
  }
};

/*
  Dance Method
*/
NxtController.prototype.dance = function () {
  this.checkConnection();
  console.log('setting up dance');
  this.isDancing = true;
  this.danceInterval = setInterval(this._danceTick.bind( this ), 500);
  this._danceTick();
};

NxtController.prototype._danceTick = function () {
  console.log('dancetick');
  var genRand = function ( min, max ) {
    return Math.floor( Math.random() * ( max - min + 1 ) + min );
  };

  var randSwitch = function () {
    return Math.random() > 0.49;
  };

  var randDec    = Math.random(),
      direction  = ( randSwitch() ) ? 'FWD' : 'BWD',
      turnRatio  = ( randSwitch() ) ? 0 - randDec : randDec,
      speed      = genRand( 60, 100 );
  console.log(direction, speed, turnRatio);
  this.nxt.OutputSetSpeed(this.motors.left, 32, 0);
  this.nxt.OutputSetSpeed(this.motors.right, 32, 0);
  this.move( direction, speed, turnRatio );
};

/*

var NxtController = require('./nxt/controller');

var bot = new NxtController({
  device: process.env.NXT_DEVICE,
  motors: {
    left:  'A',
    right: 'B',
    aux:   'C'
  }
});

bot.connect(function ( connection ) {
console.log('connected');
});

*/
