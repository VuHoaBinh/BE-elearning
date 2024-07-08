const app = require('./app')
const port = process.env.PORT || 3000
const ConnectMongoDB = require('./src/configs/mongo.config')

const server = app.listen(port, async () => {
  const dev = app.get('env') !== 'production'
  // connect mongo db
  const MONGO_URI = process.env.MONGO_URI
  ConnectMongoDB(MONGO_URI)
  console.log('> Server is up and running on port : ' + port)
})
