/*
  Example - Server Data Model
*/

var mongoose =   require('mongoose'),
    Schema =     mongoose.Schema,
    momentDate = require('../utils/moment-date');

var exampleSchema = new Schema({
  example: { type: Schema.Types.ObjectId, ref: 'Example' },
  some: String,
  time_stamp: { type: String, default: new momentDate() }
});

module.exports = mongoose.model('Example', exampleSchema);