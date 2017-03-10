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
// var pushnotifications = require('./controllers/pushnotifications');

router.get('/', function(req, res) {
  res.json({ message: 'hooray! welcome to our api!' });
});

router.get('/getVideoClip/:clip_id', (req, res) => {
  res.json({ message: 'This api will return the video for id: ' + req.params.clip_id });
});

router.post('/uploadVideoClip', function(req, res) {
  if (!req || !req.files.videoClip || !req.files)
  return res.status(400).send('No file was uploaded.');

  let uploadedFile = req.files.videoClip;

  // TODO: Give a different name to each clip with an ID appended
  uploadedFile.mv('./video_clips/clip2.jpg', function(err) {
    if (err)
    return res.status(500).send(err);

    // send push notification with the id of the video clip
    //pushnotifications.sendPushNotification(id)

    res.send('File uploaded!');
  });
});

module.exports = router;
