const youtube = require('youtube-api')
var express = require('express');
const CREDENTIALS = require('../../credentials.json')


const oAuth = youtube.authenticate({
    type: 'oauth',
    client_id: CREDENTIALS.web.client_id,
    client_secret: CREDENTIALS.web.client_secret,
    redirect_url: express().get('env') !== 'production' ? CREDENTIALS.web.redirect_uris[0] : CREDENTIALS.web.redirect_uris[1]
})

module.exports = { oAuth, youtube }