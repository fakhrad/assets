/**
 * Module dependencies.
 */

var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var connections = require('../db/connections')
/**
 * Schema definitions.
 */

const space = new Schema({
  name: {
    type: String,
    required: true,
    max: 150,
    min: 3
  },
  description: {
    type: String,
    max: 256
  },
  image: {
    type: Object
  },
  type: {
    type: String
  },
  notification_email: {
    type: String
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "AdminUsers",
    required: true
  },
  roles: [],
  locales: [],
  webhooks: [],
  storage: {
    type: String,
    enum: ['file', 'database', 's3'],
    default: 'database'
  }
});

space.methods.viewModel = function (cb) {
  return {
    id: this._id,
    roles: this.roles,
    locales: this.locales,
    name: this.name,
    description: this.description,
    webhooks: this.webhooks,
    notification_email: this.notification_email
  };
};
module.exports = connections.authDb.model("Space", space);