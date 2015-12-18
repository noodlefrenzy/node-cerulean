'use strict';

var Lease = require('../../lib/index').Lease,
  LeaseManager = require('../../lib/index').LeaseManager,
  config = require('./config'),
  expect = require('chai').expect,
  uuid = require('uuid');

describe('LeaseManager', function () {
  var assertConfig = function () {
    expect(config.accountName).to.exist;
    expect(config.accountKey).to.exist;
  };
  it('should allow lease takeover', function (done) {
    assertConfig();
    var blobName = uuid.v4();
    var lease = Lease.fromNameAndKey(config.accountName, config.accountKey, config.containerName, blobName);
    var m1 = new LeaseManager({leaseDuration: 15});
    var managedByM1 = false;
    m1.on(LeaseManager.Acquired, function () {
      managedByM1 = true;
      expect(lease.isHeld()).to.eql(true);
      m1.unmanageLease(lease);
    });
    var m2 = new LeaseManager({leaseDuration: 15});
    m2.on(LeaseManager.Acquired, function () {
      expect(lease.isHeld()).to.eql(true);
      m2.unmanageLease(lease);
    });
    m2.on(LeaseManager.Released, function () {
      expect(managedByM1).to.be.true;
      done();
    });
    setTimeout(function () {
      m2.manageLease(lease);
    }, 2000);
    m1.manageLease(lease);
  });
  it('should manage several leases', function (done) {
    assertConfig();
    var blobNameRoot = uuid.v4();
    var leases = [];
    var mgr = new LeaseManager({leaseDuration: 15});
    mgr.on(LeaseManager.Acquired, function (l) {
      expect(l.isHeld()).to.eql(true);
      leases[l.idx].held = true;
      if (leases.every(function (x) { return x.held; })) {
        leases.forEach(function (_l) { mgr.unmanageLease(_l.lease); });
        done();
      }
    });
    for (var idx=0; idx < 20; ++idx) {
      var details = {};
      details.blobName = blobNameRoot + idx;
      details.lease = Lease.fromNameAndKey(config.accountName, config.accountKey, config.containerName, details.blobName);
      details.lease.idx = idx;
      leases.push(details);
      mgr.manageLease(details.lease);
    }
  });
});
