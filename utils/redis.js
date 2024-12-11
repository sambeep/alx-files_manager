import { createClient } from 'redis';

class RedisClient {
    /**
     * a constructor that creates a client to Redis
     * any error of the redis client must be displayed in the console
     */
  constructor() {
    this.client = createClient();

    this.client.on('error', (error) => {
      console.error('Redis client error:', error);
    });
  }
  /**
   * a function isAlive 
   * returns true when the connection to Redis is a success otherwise, false
   */
  isAlive() {
    return this.client.connected;
  }
  /**
   * an asynchronous function get that takes a string key as argument
   * returns the Redis value stored for this key
   */
  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (error, value) => {
        if (error) {
          reject(error);
        } else {
          resolve(value);
        }
      });
    });
  }
  /**
   * asynchronous function set
   * @param {string} key 
   * @param {*} value 
   * @param {second} duration 
   * store it in Redis (with an expiration set by the duration argument)
   */
  async set(key, value, duration) {
    return new Promise((resolve, reject) => {
      this.client.setex(key, duration, value, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }
  /**
   * asynchronous function del
   * @param {*} key 
   *  remove the value in Redis for this key
   */

  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }
}

const redisClient = new RedisClient();

export default redisClient;