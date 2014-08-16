var winston = require('winston'),
    chalk   = require('chalk');

winston.info( chalk.dim('Starting server...') );

var express = require('express'),
    app     = require('./index').init(express());

var port = process.env.PORT || 3000;

app.listen(port, function () {
  winston.info( chalk.green('Server listening on port', port, '...') );
});


