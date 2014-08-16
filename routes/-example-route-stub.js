var express        = require('express'),
    exampleHandler = require('../handlers/example');

module.exports = function (app) {
  var exampleRouter = express.Router();

  exampleRouter.get('/', exampleHandler.fetchAll);
  exampleRouter.get('/:id', exampleHandler.fetchByID);

  exampleRouter.post('/', exampleHandler.create);

  exampleRouter.put('/:id', exampleHandler.update);

  exampleRouter.delete('/:id', exampleHandler.del);
  
  app.use('/api/example', exampleRouter);
};
