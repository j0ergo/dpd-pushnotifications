
/**
 * Module dependencies
 */
var Resource      = require('deployd/lib/resource'),
    util          = require('util'),
    gcm           = require('node-gcm'),
    apn           = require('apn');

/**
 * Module setup.
 */
function Pushnotifications( options ) {
  Resource.apply(this, arguments);

  // see https://github.com/ToothlessGear/node-gcm,
  // http://devgirl.org/2013/07/17/tutorial-implement-push-notifications-in-your-phonegap-application/
  // and https://github.com/argon/node-apn

  this.gcmSender = new gcm.Sender(this.config.gcmApiServerKey);

  var options = { "gateway": "gateway.sandbox.push.apple.com" };
  console.log(__dirname);
  this.apnConnection = new apn.Connection(options);
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
    if (ctx.body.title) {
      message.addData('title', ctx.body.title);
    } else {
      message.addData('title', this.config.defaultTitle || 'Notification' );
    }
    if (ctx.body.message) {
      message.addData('message', ctx.body.message);
    } else {
      message.addData('message',this.config.defaultMessage || 'Hi, something came up!' );
    }
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
    }
  }

};

/**
 * Module export
 */
module.exports = Pushnotifications;