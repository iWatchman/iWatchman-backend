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
const router = express.Router();
const mysql = require('mysql');
const thumbler = require('video-thumb');

// var pushnotifications = require('./controllers/pushnotifications');

var config = {
  user: 'root',
  password: 'iwatchman',
  database: 'iwatchman',
  host: '35.185.43.144'
};

const dbconnection = mysql.createConnection(config);

router.get('/', function(req, res) {
  res.json({ message: 'hooray! welcome to our api!' });
});

router.get('/getAllEvents', (req, res) => {
  dbconnection.query('SELECT * FROM events', function(err, rows, fields) {
    if (err) {
      console.error(err);
      return res.status(500).send(err);
    }
    res.send(rows);
  });
});

router.get('/getVideoClip/:event_id', (req, res) => {
  res.sendfile('./video_clips/clip' + req.params.event_id +'.mp4', {root: './' })
});

router.get('/getVideoThumbnail/:event_id', (req, res) => {
  res.sendfile('./video_thumbnails/clip' + req.params.event_id + 'thumbnail.png', {root: './' })
});

router.post('/reportEvent', function(req, res) {
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
    uploadedFile.mv('./video_clips/clip' + eventID + '.mp4', function(err) {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }

      // Genrate the thumbnail
      thumbler.extract('./video_clips/clip' + eventID + '.mp4', './video_thumbnails/clip' + eventID + 'thumbnail.png', '00:00:01', '200x125', function(){
        console.log('snapshot saved to snapshot.png (200x125) with a frame at 00:00:01');
      });

      // Save the event in the database
      var event = { id: eventID, date: req.body.date, cameraName: req.body.cameraName };
      dbconnection.query('INSERT into events SET ?', event, (err) => {
        if (err) {
          console.error(err);
          return res.status(500).send(err);
        }
      });

      // Send the push notification
      sendPushNotification(eventID);

      res.send('File uploaded!');
    });
  });
});

router.post('/registerDevice', function(req, res) {
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

function sendPushNotification(id) {
  dbconnection.query('SELECT DISTINCT deviceToken FROM client_devices', function(err, rows, fields) {
    if (err) {
      console.error(err);
      return res.status(500).send(err);
    }

    rows.forEach(function (row) {
      // console.log(row.deviceToken);
      // send push notification with the id of the video clip
      //pushnotifications.sendPushNotification(eventID, row.deviceToken);
    });
  });
}

module.exports = router;
