'use strict';

var Azure = require('azure-storage'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    debug = require('debug')('cerulean:lease-manager');

function LeaseManager() {
    this.leases = {};
}

util.inherits(LeaseManager, EventEmitter);

// Events
LeaseManager.Acquired = 'lease:acquired';
LeaseManager.Lost = 'lease:lost';
LeaseManager.Released = 'lease:released';

LeaseManager.DefaultLeaseDuration = 60; // seconds

LeaseManager.prototype.manageLease = function(lease) {
    var renewalInterval = 1000 * (LeaseManager.DefaultLeaseDuration / 2);
    this.leases[lease.fullUri] = { lease: lease };
    this._acquire(lease);
};

LeaseManager.prototype.unmanageLease = function(lease) {
    var self = this;
    if (this.leases[lease.fullUri].interval) {
        this._unmanage(lease);
        lease.release().then(function() {
            self.emit(LeaseManager.Released, lease);
        });
    }
};

LeaseManager.prototype._acquire = function(lease) {
    var self = this;
    self.leases[lease.fullUri].interval = setInterval(function() {
        lease.acquire({leaseDuration: LeaseManager.DefaultLeaseDuration}).then(function () {
            self._unmanage(lease);
            self.leases[lease.fullUri].expires = Date.now() + (LeaseManager.DefaultLeaseDuration * 1000);
            self._maintain(lease);
            self.emit(LeaseManager.Acquired, lease);
        }).catch(function (error) {
            debug('Failed to acquire lease for "' + lease.fullUri + '": ' + error + '. Will retry.');
        });
    }, LeaseManager.DefaultLeaseDuration * 1000);
};

LeaseManager.prototype._maintain = function(lease) {
    var self = this;
    var renewPeriod = (LeaseManager.DefaultLeaseDuration / 4) * 1000;
    self.leases[lease.fullUri].interval = setInterval(function() {
        lease.renew({ leaseDuration: LeaseManager.DefaultLeaseDuration }).then(function() {
            self.leases[lease.fullUri].expires = Date.now() + (LeaseManager.DefaultLeaseDuration * 1000);
        }).catch(function (error) {
            if (self.leases[lease.fullUri].expires < Date.now() + renewPeriod) {
                // We'll expire before next renewal comes in.
                // Alert a lease loss, delay a bit, and then queue up a re-acquire.
                self._unmanage(lease);
                self.emit(LeaseManager.Lost, lease);
                setTimeout(function() {
                    debug('Lease "' + lease.fullUri + '" lost. Attempting to re-acquire.');
                    self._acquire(lease);
                }, renewPeriod * 2);
            } else {
                debug('Failed to renew lease for "' + lease.fullUri + '": ' + error + '. Will retry.');
            }
        });
    }, renewPeriod);
};

LeaseManager.prototype._unmanage = function(lease) {
    clearInterval(self.leases[lease.fullUri].interval);
    delete self.leases[lease.fullUri].interval;
};

module.exports = LeaseManager;
