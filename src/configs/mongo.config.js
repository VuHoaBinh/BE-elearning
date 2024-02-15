const mongoose = require('mongoose');

module.exports = function ConnectMongoDB(mongo_uri) {
    mongoose.connect(mongo_uri, {})
        .then(result => console.log('> Connect mongoDB successful ', mongo_uri))
        .catch(err => console.log(`> Error while connecting to mongoDB : >> : ${err.message}`));
}