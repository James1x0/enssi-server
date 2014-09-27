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
      nxt = this.nxt;

  if( !fwd ) {
    speed = 0 - speed;
  }

  nxt.OutputSetSpeed( l, 32, speed );
  nxt.OutputSetSpeed( r, 32, speed );
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
};


/*
  Private Methods
*/
// Broken
NxtController.prototype._runMotors = function ( portArray ) {
  this.checkConnection();

  if( typeof portArray !== 'object' || !_.isArray( portArray ) ) {
    throw new Error('You must pass ports to the _runMotors method');
  }

  var outputs = [],
      nxt     = this.nxt;

  for ( var key in portArray ) {
    var o = portArray[ key ],
        args = [ o.port, 32, o.speed ];

    if( o.degrees ) {
      args.push( o.degrees );
    }

    outputs.push( args );
  }

  outputs.forEach(function ( argArray ) {
    console.log( argArray );
    nxt.OutputSetSpeed( this, argArray );
  });
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
