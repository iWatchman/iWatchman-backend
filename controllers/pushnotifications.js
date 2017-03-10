var apn = require('apn');

var apnProvider = new apn.Provider({
  token: {
    key: 'apns.p8', // Path to the key p8 file
    keyId: 'ABCDE12345', // The Key ID of the p8 file (available at https://developer.apple.com/account/ios/certificate/key)
    teamId: 'ABCDE12345', // The Team ID of your Apple Developer Account (available at https://developer.apple.com/account/#/membership/)
  },
  production: false // Set to true if sending a notification to a production iOS app
});

var self = module.exports = {
  var deviceToken = 'xxxxxxxxxxxxxxxxxx'; // Dvice token
  var notification = new apn.Notification();
  notification.topic = 'my.bundle.id'; // iOS app's Bundle ID
  notification.expiry = Math.floor(Date.now() / 1000) + 3600;
  notification.badge = 3;
  notification.sound = 'ping.aiff';
  notification.alert = 'Hello World \u270C';

  sendPushNotification: function(id) {
    notification.payload = {videoClipId: id};
    apnProvider.send(notification, deviceToken).then(function(result) {
      console.log(result);
    });
  }
};
