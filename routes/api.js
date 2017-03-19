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

'use strict';

const express = require('express');
const router = express.Router();
const sqlite = require('sqlite3').verbose();

var db = new sqlite.Database('./db/iWatchman.db');
// var pushnotifications = require('./controllers/pushnotifications');

router.get('/', function(req, res) {
  res.json({ message: 'hooray! welcome to our api!' });
});

router.get('/getAllEvents', (req, res) => {
  db.all("SELECT * FROM events", function(err, rows) {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    res.send(rows);
  });
});

router.get('/getVideoClip/:event_id', (req, res) => {
  res.sendfile('./video_clips/clip' + req.params.event_id +'.mp4', {root: './' })
});

router.post('/reportEvent', function(req, res) {
  if (!req || !req.files.videoClip || !req.files)
  return res.status(500).send('No file was uploaded.');

  let uploadedFile = req.files.videoClip;

  db.all("SELECT * FROM events WHERE id = (SELECT MAX(id)  FROM events);", function(err, rows) {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }

    var eventID = (rows[0].id + 1);
    uploadedFile.mv('./video_clips/clip' + eventID + '.mp4', function(err) {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }

      try {
        db.run("INSERT into events(id, date, camera_name) VALUES ('" + eventID
        + "','" + req.body.date + "','" + req.body.cameraName + "')");
      } catch(err) {
        console.log(err);
        return res.status(500).send(err);
      }

      // send push notification with the id of the video clip
      //pushnotifications.sendPushNotification(eventID)

      res.send('File uploaded!');
    });
  });
});

router.post('/registerDevice', function(req, res) {
  if (!req)
  return res.status(500)

  try {
    db.run("INSERT into client_devices(deviceToken) VALUES ('" + req.body.deviceToken + "')");
  } catch(err) {
    console.log(err);
    return res.status(500).send(err);
  }

  res.send('Device registered!');

});

module.exports = router;
