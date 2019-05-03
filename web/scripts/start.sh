#!/bin/sh

if [ "$NODE_ENV" = "production" ]; then
    node app.js; 
else 
    DEBUG=app,app:* nodemon app.js;
fi