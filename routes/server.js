var express  = require('express');

module.exports = function(app) {
  var serverRouter = express.Router();

  serverRouter.get('/', function(req, res) {
    res.send({server:[]});
  });

  app.use('/api/server', serverRouter);
};