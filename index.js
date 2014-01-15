
/**
 * Module dependencies
 */
var Resource      = require('deployd/lib/resource'),
    util          = require('util'),
    gcm           = require('node-gcm');

/**
 * Module setup.
 */
function Gcm( options ) {
  Resource.apply(this, arguments);

  // see https://github.com/ToothlessGear/node-gcm
  // and http://devgirl.org/2013/07/17/tutorial-implement-push-notifications-in-your-phonegap-application/

  // GCM API Server Key
  this.sender = new gcm.Sender(this.config.gcmApiServerKey);

  // the payload data to send...
  this.message = new gcm.Message();
  this.message.addData('title', this.config.defaultTitle || 'Notification' );
  this.message.addData('message',this.config.defaultMessage || 'Hi, something came up!' );
  this.message.timeToLive = this.config.defaultTTL || 3000;
  // other possible defaults:
  //this.message.addData('msgcnt','1');
  //this.message.addData('soundname','beep.wav');
  //this.message.collapseKey = 'demo';
  //this.message.delayWhileIdle = true;
}

util.inherits( Gcm, Resource );

Gcm.prototype.clientGeneration = true;

Gcm.basicDashboard = {
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
Gcm.prototype.handle = function ( ctx, next ) {

  if ( ctx.req && (ctx.req.method !== 'POST' || !ctx.body.registrationIds || !ctx.body.registrationIds.length == 0)) {
    return next();
  }

  var registrationIds = ctx.body.registrationIds;

  if (ctx.body.title) {
    this.message.addData('title', ctx.body.title);
  }
  if (ctx.body.message) {
    this.message.addData('message', ctx.body.message);
  }
  if (ctx.body.msgcnt) {
    this.message.addData('msgcnt', ctx.body.msgcnt);
  }
  if (ctx.body.soundname) {
    this.message.addData('soundname', ctx.body.soundname);
  }
  if (ctx.body.collapseKey) {
    this.message.collapseKey = ctx.body.collapseKey;
  }
  if (ctx.body.delayWhileIdle) {
    this.message.delayWhileIdle = ctx.body.delayWhileIdle;
  }
  if (ctx.body.timeToLive) {
    this.message.timeToLive = ctx.body.timeToLive;
  }

  /**
   * Parameters: message-literal, registrationIds-array, No. of retries, callback-function
   */
  this.sender.send(this.message, registrationIds, 4, function (err, result) {
    if (err) {
      ctx.done(err);
    } else {
      ctx.done(null, result);
    }
  });
};

/**
 * Module export
 */
module.exports = Gcm;