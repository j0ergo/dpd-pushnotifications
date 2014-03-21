
/**
 * Module dependencies
 */
var Resource      = require('deployd/lib/resource'),
    util          = require('util'),
    mongoose      = require('mongoose'),
    gcm           = require('node-gcm'),
    apn           = require('apn');

/**
 * Module setup.
 */
function Pushnotifications( options ) {
  Resource.apply(this, arguments);

  // see https://github.com/ToothlessGear/node-gcm
  // and https://github.com/argon/node-apn

  this.gcmSender = new gcm.Sender(this.config.gcmApiServerKey);

  var options = {
    "gateway": (this.config.apnGateway || "gateway.sandbox.push.apple.com"),
    "cert": (this.config.certPemLocation || __dirname + "/../../config/cert.pem"),
    "key": (this.config.keyPemLocation || __dirname + "/../../config/key.pem")
  };
  this.apnConnection = new apn.Connection(options);


  // mongodb connection string

  var connectionString = "mongodb://"
  if (process.env.MONGO_DB_USERNAME && process.env.MONGO_DB_PASSWORD) {
    connectionString += (process.env.MONGO_DB_USERNAME + ":" + process.env.MONGO_DB_PASSWORD + "@");
  }
  connectionString += (process.env.MONGO_DB_HOST || '127.0.0.1');
  if (process.env.MONGO_DB_PORT) {
    connectionString += ":" + process.env.MONGO_DB_PORT;
  }
  connectionString += "/";
  if (process.env.MONGO_DB_NAME) {
      connectionString += process.env.MONGO_DB_NAME;
  } else {
    if (process.env.NODE_ENV === 'development') {
      connectionString += this.config.developmentDbName;
    } else {
      connectionString += this.config.productionDbName;
    }
  }

  mongoose.connect(connectionString);

  var db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', function callback () {
    this.pushNotificationSchema = mongoose.Schema({
        title: String,
        message: String,
        registrationIds: Array,
        apnToken: String
    });
    this.pushNotificationModel = mongoose.model('PushNotification', this.pushNotificationSchema);
    this.pushNotificationModel.find(function (err, pushNotifications) {
      if (err) return console.error(err);
      console.log(pushNotifications);
    })

  });
}

util.inherits( Pushnotifications, Resource );

Pushnotifications.prototype.clientGeneration = true;

Pushnotifications.basicDashboard = {
  settings: [
    {
      name        : 'gcmApiServerKey',
      type        : 'string',
      description : 'GCM API Server Key'
    },
    {
      name        : 'apnGateway',
      type        : 'string',
      description : 'APN Gateway. Defaults to sandbox'
    },
    {
      name        : 'defaultTitle',
      type        : 'string',
      description : 'Default title of the push notification. Defaults to \'Notification\''
    },
    {
      name        : 'defaultMessage',
      type        : 'string',
      description : 'Default message of the push notification. Defaults to \'Hi, something came up!\''
    },
    {
      name        : 'defaultTTL',
      type        : 'number',
      description : 'Default time to live of the push notification. Defaults to 3000 seconds'
    },
    {
      name        : 'certPemLocation',
      type        : 'string',
      description : 'Location of the cert.pem-File. Defaults to file named cert.pem in the config-directory of the app.'
    },
    {
      name        : 'keyPemLocation',
      type        : 'string',
      description : 'Location of the key.pem-File. Defaults to file named key.pem in the config-directory of the app.'
    },
    {
      name        : "developmentDbName",
      type        : 'string',
      description : 'Name of the MongoDB in development environment.'
    },
    {
      name        : "productionDbName",
      type        : 'string',
      description : 'Name of the MongoDB in production environment.'
    }
  ]
};

/**
 * Module methodes
 */
Pushnotifications.prototype.handle = function ( ctx, next ) {

  if (ctx.body.gcmRegistrationIds) {
    var registrationIds = ctx.body.gcmRegistrationIds;

    // the payload data to send...
    var message = new gcm.Message();

    var titleData;
    if (ctx.body.title) {
      titleData = ctx.body.title;
    } else {
      titleData = this.config.defaultTitle || 'Notification';
    }
    message.addData('title', titleData);

    var messageData;
    if (ctx.body.message) {
      messageData = ctx.body.message;
    } else {
      messageData = this.config.defaultMessage || 'Hi, something came up!';
    }
    message.addData('message', messageData);

    if (ctx.body.timeToLive) {
      message.timeToLive = ctx.body.timeToLive;
    } else {
      message.timeToLive = this.config.defaultTTL || 3000;
    }

    if (ctx.body.msgcnt) {
      message.addData('msgcnt', ctx.body.msgcnt);
    }
    if (ctx.body.soundname) {
      message.addData('soundname', ctx.body.soundname);
    }
    if (ctx.body.collapseKey) {
      message.collapseKey = ctx.body.collapseKey;
    }
    if (ctx.body.delayWhileIdle) {
      message.delayWhileIdle = ctx.body.delayWhileIdle;
    }

    /**
     * Parameters: message-literal, registrationIds-array, No. of retries, callback-function
     */
    this.gcmSender.send(message, registrationIds, 4, function (err, result) {
      if (err) {
        ctx.done(err);
      } else {
        ctx.done(null, result);
      }
    });

    (new this.pushNotificationModel({ message: messageData, title: titleData })).save();
  }

  if (ctx.body.apnTokens) {
    var index = 0,
        token = "",
        device = {},
        note = {};
    for (; index < ctx.body.apnTokens.length; index++) {
      token = ctx.body.apnTokens[index];
      device = new apn.Device(token);
      note = new apn.Notification();

      if (ctx.body.timeToLive) {
        note.expiry = ctx.body.timeToLive;
      } else {
        note.expiry = this.config.defaultTTL || 3000;
      }

      if (ctx.body.msgcnt) {
        note.badge = ctx.body.msgcnt;
      } else {
        note.badge = 1;
      }

      if (ctx.body.soundname) {
        note.sound = ctx.body.soundname;
      }

      if (ctx.body.message) {
        note.alert = ctx.body.message;
      } else {
        note.alert = this.config.defaultMessage || 'Hi, something came up!';
      }
      //note.payload = {'messageFrom': 'Caroline'};

      this.apnConnection.pushNotification(note, device);

      (new this.pushNotificationModel({ message: note.alert, apnToken: token })).save();
    }
  }

};

/**
 * Module export
 */
module.exports = Pushnotifications;