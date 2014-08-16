/*
  NXT Controller
*/

var winston = require('winston'),
    chalk   = require('chalk'),
    nodeNxt = require('node-nxt');
    
module.exports = NxtController;

var portMap = {
  A: 1,
  B: 2,
  C: 3
}

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
    if( nxt ) {
      controller.nxt       = nxt;
      controller.connected = true;
    } else {
      winston.log('error', chalk.bgRed('NxtController :: Unable to connect to NXT @ ', controller.device) );
      throw new Error('NXT Connection Error');
    }

    if( callback && typeof callback === 'function' ) {
      callback( nxt );
    }
  });
}

NxtController.prototype.checkConnection = function () {
  if( !this.connected || !this.nxt ) {
    winston.log('error', chalk.bgRed('NxtController :: Attempted to call method that requires initialization'));
    throw new Error('NXT Connect First Error');
  }
}

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

  nxt.OutputSetSpeed(l, 32, speed);
  nxt.OutputSetSpeed(r, 32, speed);
}


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
}

/*

var NxtController = require('nxt/controller');

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
