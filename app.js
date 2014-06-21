var fs = require('fs'),
  util = require('util'),
  schedule = require('node-schedule'), // https://www.npmjs.org/package/node-schedule
  mongoose = require('mongoose'), // http://mongoosejs.com/docs/queries.html
  RSVP = require('rsvp'); // promise

// mongodb
var Schema = mongoose.Schema;
var Model = mongoose.model('Image', {
  imageName: String,
  timeStamp: Date,
  fileNameRAW: String,
  fileName: String,
  processed: Boolean,
  cameraMake: String,
  cameraModel: String,
  width: String,
  height: String,
  exposureMode: String,
  exposureTime: String,
  copyright: String,
  focalLength: String,
  apertureValue: String,
  whiteBalance: String
});
mongoose.connect('mongodb://localhost/vogon');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'mongodb connection error:'));
db.once('open', function callback() {});

initImage = {
  imageName: 'init',
  timeStamp: new Date(),
  fileNameRAW: 'foo.raw',
  fileName: 'foo.jpg',
  processed: true,
  cameraMake: null,
  cameraModel: null,
  width: null,
  height: null,
  exposureMode: null,
  exposureTime: null,
  copyright: null,
  focalLength: null,
  apertureValue: null,
  whiteBalance: null
};

var init = function() {
  return new RSVP.Promise(function(resolve, reject) {
    util.puts('running init...');
    Model.find({}, function(err, data) {
      if (err) reject(err);

      if (data.length) {
        resolve(data);
      } else {
        var img = new Model(initImage);
        img.save();

        resolve();
      }
    });
  });
};

var queryImages = function() {
  return new RSVP.Promise(function(resolve, reject) {
    util.puts('running query...');
    Model.find({
      'processed': true
    }, function(err, data) {
      if (err) reject(err);

      if (data.length) {
        resolve(data);
      }
    });
  });
};

var uploadImages = function(data) {
  return new RSVP.Promise(function(resolve, reject) {
    util.puts('running upload...');

    util.puts(data);
  });
};


// run promises
init().then(queryImages)
  .then(null, function() {
    util.puts('queryPromise error');
  })
  .then(uploadImages)
  .then(null, function() {
    util.puts('uploadPromise error');
  });


// configs.forEach(function(obj) {
//   if (obj.property !== 'configData') {
//     var value = payload[obj.property];
//     var property = obj.property;
//     Config.findOneAndUpdate({
//       property: property
//     }, {
//       value: value
//     }, function(err, data) {
//       if (err) reply = {
//         status: 0,
//         message: err.message
//       };
//       obj.value = value;
//     });
//   }
// });