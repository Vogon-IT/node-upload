var fs = require('fs'),
  util = require('util'),
  request = require('request'), // https://github.com/mikeal/request
  jsdom = require('jsdom').jsdom, // https://www.npmjs.org/package/jsdom
  schedule = require('node-schedule'), // https://www.npmjs.org/package/node-schedule
  mongoose = require('mongoose'), // http://mongoosejs.com/docs/queries.html
  RSVP = require('rsvp'); // promise https://www.npmjs.org/package/rsvp

var request = request.defaults({
  jar: true
});

var config = require('./config');

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

var initMongoDB = function() {
  return new RSVP.Promise(function(resolve, reject) {
    util.puts('running init...');
    Model.find({}, function(err, data) {
      if (err) reject(err);

      if (!data.length) {
        var img = new Model(initImage);
        img.save();
      }

      resolve();
    });
  });
};

var cleanUp = function(image) {
  return new RSVP.Promise(function(resolve, reject) {
    util.puts('running cleanup...');

    image.processed = true;
    image.save();

    if (!config.keepImage) {
      fs.unlink(config.imageFolder + data.fileName, function(err) {
        if (err) reject(err);
      });
    }

    resolve();
  });
};

var queryNextImage = function() {
  return new RSVP.Promise(function(resolve, reject) {
    util.puts('running query...');
    Model.findOne({
      'processed': false
    }, function(err, data) {
      if (err) reject(err);
      resolve(data);
    });
  });
};

var getToken = function(data) {
  return new RSVP.Promise(function(resolve, reject) {
    util.puts('running token...');
    var options = {
      uri: config.uri + 'users/sign_in',
      method: 'GET'
    };

    request.get(options, function(error, res, body) {
      if (error) {
        reject(error);
      }

      var doc = jsdom(body),
        meta = doc.querySelector("meta[name=csrf-token]");

      config.token = meta.getAttribute("content");

      resolve(config.token);
    });
  });
};

var signOut = function() {
  return new RSVP.Promise(function(resolve, reject) {
    request.del({
      uri: config.uri + 'users/sign_out',
      json: {
        'utf8': '✓',
        'authenticity_token': config.token,
      }
    }, function(error, res, body) {
      if (error) reject(error);

      resolve();
    });
  });
};

var signIn = function() {
  return new RSVP.Promise(function(resolve, reject) {
    util.puts('running signin...');
    var options = {
      uri: config.uri + 'users/sign_in.json',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      json: {
        'utf8': '✓',
        'authenticity_token': config.token,
        'user': {
          'username': config.username,
          'password': config.password,
          'remember_me': 1
        }
      }
    };

    request(options, function(error, res, body) {
      if (error) {
        reject(error);
      }

      resolve();
    });
  });
};

var uploadImage = function(data) {
  return new RSVP.Promise(function(resolve, reject) {
    util.puts('running upload...');

    if (data === null) {
      return;
    }
    var imagePath = config.imageFolder + data.fileName;
    var image = data;

    fs.readFile(imagePath, function(err, data) {

      var r = request.post(config.uri + 'images.json', function optionalCallback(err, res, body) {
        util.puts(res.statusCode);

        if (err) {
          return util.puts('upload failed:', err);
        }

        if (res.statusCode === 401) {
            signOut().then(signIn).then(queryNextImage).then(uploadImage).then(null, function(error) {
              util.puts(error);
            });
        } else if (res.statusCode === 201) {
          cleanUp(image)
            .then(queryNextImage)
            .then(uploadImage).then(null, function(error) {
              util.puts(error);
            });

          resolve(image);
        } else {
          reject(res.statusCode);
        }
      });

      var form = r.form();
      form.append('utf8', '✓');
      form.append('authenticity_token', config.token);
      form.append('image[image]', fs.createReadStream(imagePath));
    });
  });
};

// run init promises
initMongoDB().then(null, function() {
  util.puts('initMongoDB error');
}).then(signOut).then(null, function() {
  util.puts('signOut error');
}).then(getToken).then(null, function() {
  util.puts('getToken error');
}).then(queryNextImage).then(null, function() {
  util.puts('query error');
}).then(uploadImage).then(null, function() {
  util.puts('upload error');
});

// Run upload process every 10 minutes
var rule = new schedule.RecurrenceRule();
rule.minute = 1;

var j = schedule.scheduleJob(rule, function() {
    queryNextImage().then(null, function() {
      util.puts('query error');
    }).then(uploadImage).then(null, function() {
      util.puts('upload error');
    });
});

// var json = {
//   'utf8': '✓',
//   'authenticity_token': config.token,
//   'weather': {
//     'weather_timestamp': new Date(),
//     'temperature': 23
//   }
// };