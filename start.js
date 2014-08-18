var winston = require('winston'),
    chalk   = require('chalk');

winston.info( chalk.dim('Starting server...') );

var express = require('express'),
    app     = require('./index').init( express() ),
    server  = require('http').Server(app),
    SocketController = require('./handlers/socket');

var port = process.env.PORT || 3000;

var socketController = new SocketController( server );

server.listen(port, function () {
  winston.info( chalk.green('Server listening on port', port, '...') );
});
