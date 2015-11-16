'use strict';

var Lease = require('../../lib/index').Lease,
    config = require('./config'),
    expect = require('chai').expect;

describe('Lease', function () {
   var assertConfig = function() {
       expect(config.accountName).to.exist;
       expect(config.accountKey).to.exist;
   };
   it('should grab and release a lease', function(done) {
       assertConfig();
       var lease = new Lease(config.accountName, config.accountKey, config.containerName, config.blobName);

       lease.acquire({ leaseDuration: 15 }).then(function() {
           return lease.updateContents('Testing update');
       }).then(function() {
           return lease.getContents();
       }).then(function (contents) {
           expect(contents).to.eql('Testing update');
           return lease.release()
       }).then(function() {
           done();
       });
   });
});
