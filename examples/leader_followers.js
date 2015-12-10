var cerulean = require('./../lib/index');
var Lease = cerulean.Lease;
var LM = cerulean.LeaseManager;

var storageConnectionString = '<redacted>';
var container = 'locks';
var blob = 'leadertest';

var name = process.argv[2];
var timeToWait = process.argv[3];
if (!name) throw new Error('Must provide name');
if (!timeToWait) throw new Error('Must provide number of seconds to wait');

timeToWait = 1000 * parseInt(timeToWait);

var lease = new Lease(storageConnectionString, container, blob);
var lm = new LM();
lm.on(LM.Acquired, function () {
  console.log('Lease acquired by ' + name);
  lease.updateContents(JSON.stringify({leader: name, acquired_on: new Date().toISOString()}));
}).on(LM.Lost, function () {
  console.log('Lease lost by ' + name);
}).on(LM.Released, function () {
  console.log('Lease released by ' + name);
});

setTimeout(function () {
  console.log(name + ' waited ' + (timeToWait / 1000) + ' seconds. Releasing lease.');
  lm.unmanageLease(lease);
}, timeToWait);

lm.manageLease(lease);
