'use strict';

var _ = require('lodash');
var async = require('async');

function RoomAbstract(room_id, first_peer) {
  if (!(this instanceof RoomAbstract)) return new RoomAbstract(room_id, first_peer);

  if (!(/^(\w|\-){1,30}$/).test(room_id)) {
    throw new Error('invalid-room-id');
  }

  this.id = room_id;
  this.peers = [];

  // TODO - have a room secret that makes someone an admin of the room
  if (!!first_peer) {
    this.addPeer(first_peer);
  }
}
RoomAbstract.prototype.addPeer = function(peer_id) {
  if (this.peers.length < 3) {
    if (this.peers.indexOf(peer_id) < 0)
      this.peers.push(peer_id);
  } else {
    throw new Error('room-full');
  }
}
RoomAbstract.prototype.removePeer = function(peer_id) {
  var idx = _.indexOf(this.peers, peer_id)
  if (idx >= 0) {
    this.peers.splice(idx, 1);
    return true;
  } else
    return false;
}
RoomAbstract.prototype.getPeers = function(exclude) {
  return _.without(this.peers, exclude);
}
RoomAbstract.prototype.getOtherPeers = RoomAbstract.prototype.getPeers;

RoomAbstract.prototype.isEmpty = function() {
  return !this.peers.length;
}

module.exports = RoomAbstract;