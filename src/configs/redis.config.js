const redis = require('redis');
const redis_client = redis.createClient({ url: process.env.REDIS_URI });

async function ConnectRedis() {
    redis_client.on('error', (err) => console.log('Redis Client Error', err));
    await redis_client.connect();
    console.log('> Redis Connected');
    return redis_client
}

module.exports = ConnectRedis