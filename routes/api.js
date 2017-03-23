/**
* Copyright 2016, Google, Inc.
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

/**
* Command to run the proxy
* ./cloud_sql_proxy -instances=test-project-156600:us-east1:iwatchman-db=tcp:3306\
*                  -credential_file=Test-Project-82970989ad1a.json &
*/

'use strict';

const express = require('express');
const mysql = require('mysql');
const thumbler = require('video-thumb');
const getDuration = require('get-video-duration');
const apn = require('apn');

const router = express.Router();

const config = {
  user: 'root',
  password: 'iwatchman',
  database: 'iwatchman',
  host: '35.185.43.144'
};

const dbconnection = mysql.createConnection(config);

const apnProvider = new apn.Provider({
  token: {
    key: './apn_key/APNsAuthKey_QBPJZP5JKB.p8', // Path to the key p8 file
    keyId: 'QBPJZP5JKB', // The Key ID of the p8 file (available at https://developer.apple.com/account/ios/certificate/key)
    teamId: 'LLVD2YCLN9', // The Team ID of your Apple Developer Account (available at https://developer.apple.com/account/#/membership/)
  },
  production: false // Set to true if sending a notification to a production iOS app
});

router.get('/', function(req, res) {
  console.info('Parameters: ' + JSON.stringify(req.params) +'\nBody: ' + JSON.stringify(req.body))
  res.json({ message: 'hooray! welcome to our api!' });
});

router.get('/testPushNotification', function(req, res) {
  var cameraName = 'camera 2';
  var date = '2017-03-22T21:17:19Z';
  sendPushNotification(2, date, cameraName);
  res.json({ message: 'hooray! welcome to our api!' });
});

router.get('/getAllEvents', (req, res) => {
  console.info('Parameters: ' + JSON.stringify(req.params) +'\nBody: ' + JSON.stringify(req.body))

  dbconnection.query('SELECT * FROM events', function(err, rows, fields) {
    if (err) {
      console.error(err);
      return res.status(500).send(err);
    }
    res.send(rows);
  });
});

router.get('/getVideoClip/:event_id', (req, res) => {
  console.info('Parameters: ' + JSON.stringify(req.params) +'\nBody: ' + JSON.stringify(req.body))

  dbconnection.query('SELECT * FROM events WHERE id = ' + req.params.event_id, function(err, rows, fields) {
    if (err) {
      console.error(err);
      return res.status(500).send(err);
    }

    if (rows.length < 1) {
      return res.status(500).send('Invalid ID');
    }

    res.sendfile('./video_clips/clip' + req.params.event_id +'.mp4', {root: './' });
  });
});

router.get('/getVideoThumbnail/:event_id', (req, res) => {
  console.info('Parameters: ' + JSON.stringify(req.params) +'\nBody: ' + JSON.stringify(req.body))

  dbconnection.query('SELECT * FROM events WHERE id = ' + req.params.event_id, function(err, rows, fields) {
    if (err) {
      console.error(err);
      return res.status(500).send(err);
    }

    if (rows.length < 1) {
      return res.status(500).send('Invalid ID');
    }

    res.sendfile('./video_thumbnails/clip' + req.params.event_id + 'thumbnail.png', {root: './' });
  });
});

router.post('/reportEvent', function(req, res) {
  console.info('Parameters: ' + JSON.stringify(req.params) +'\nBody: ' + JSON.stringify(req.body))

  if (!req || !req.files || !req.files.videoClip)
  return res.status(500).send('No file attached');

  let uploadedFile = req.files.videoClip;

  // Find the last id on the database
  dbconnection.query('SELECT * FROM events WHERE id = (SELECT MAX(id)  FROM events)', function(err, rows, fields) {
    if (err) {
      console.error(err);
      return res.status(500).send(err);
    }

    var eventID = 1;
    if (rows.length > 0) {
      eventID = (rows[0].id + 1);
    }
    // Move the file to the local folder
    var videoFilePath = './video_clips/clip' + eventID + '.mp4'
    uploadedFile.mv(videoFilePath, function(err) {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }

      getDuration(videoFilePath).then(function (duration) {
        console.log('Full length of the video: ' + duration + ' seconds');
        var thumbnailTimeStamp = '01';
        if (Math.round(duration) > 60) {
          thumbnailTimeStamp = '59';
        } else if (Math.round(duration) > 9) {
          thumbnailTimeStamp = '' + (Math.round(duration) - 5);
        }

        var thumbnailTimeStampString = '00:00:' + thumbnailTimeStamp;

        // Genrate the thumbnail
        thumbler.extract(videoFilePath, './video_thumbnails/clip' + eventID + 'thumbnail.png', thumbnailTimeStampString, '400x250', function(){
          console.log('Thumbnail saved to clip' + eventID + 'thumbnail.png (400x250) with a frame at ' + thumbnailTimeStampString);
        });
      });

      // Save the event in the database
      var event = { id: eventID, date: req.body.date, cameraName: req.body.cameraName, accuracy: req.body.accuracy, confidence: req.body.confidence};
      dbconnection.query('INSERT into events SET ?', event, (err) => {
        if (err) {
          console.error(err);
          return res.status(500).send(err);
        }
        console.log('Event successfully saved on the database');
      });

      // Send the push notification
      sendPushNotification(eventID, req.body.date, req.body.cameraName, req.body.accuracy, req.body.confidence);

      res.send('File uploaded!');
    });
  });
});

router.post('/registerDevice', function(req, res) {
  console.info('Parameters: ' + JSON.stringify(req.params) +'\nBody: ' + JSON.stringify(req.body))

  if (!req)
  return res.status(500)

  var device = { deviceToken: req.body.deviceToken };
  dbconnection.query('INSERT into client_devices SET ?', device, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send(err);
    }
    res.send('Device registered!');
  });
});

function sendPushNotification(eventID, givenDate, givenCameraName, givenAccuracy, givenConfidence) {
  dbconnection.query('SELECT DISTINCT deviceToken FROM client_devices', function(err, rows, fields) {
    if (err) {
      console.error(err);
      return res.status(500).send(err);
    }

    rows.forEach(function (row) {
      var notification = new apn.Notification();
      notification.topic = 'co.tejasd.iWatchman'; // iOS app's Bundle ID
      notification.expiry = Math.floor(Date.now() / 1000) + 3600;
      notification.sound = 'ping.aiff';
      notification.badge = 1;
      notification.alert = `\u2757 Alert on ${givenCameraName}`

      notification.payload = {id: eventID, date: givenDate, cameraName: givenCameraName, accuracy: givenAccuracy, confidence: givenConfidence};
      apnProvider.send(notification, row.deviceToken).then(function(result) {
        console.log(result);
      });
    });
  });
}

module.exports = router;
