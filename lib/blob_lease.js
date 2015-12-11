'use strict';

var Azure = require('azure-storage'),
  Promise = require('bluebird'),
  _ = require('lodash'),
  debug = require('debug')('cerulean:lease');

function Lease(storageConnectionString, container, blob) {
  this.blobService = Azure.createBlobService(storageConnectionString);
  this.storageAccount = (storageConnectionString.match('AccountName=([^;]*);') || [])[1];
  this.container = container;
  this.blob = blob;
  this.fullUri = 'https://' + this.storageAccount + '.blob.core.windows.net/' + container + '/' + blob;
  this._isHeld = false;
  debug('Full lease path: ' + this.fullUri);
}

Lease.fromNameAndKey = function (storageAccount, storageKey, container, blob) {
  var connectionString = 'DefaultEndpointsProtocol=https;AccountName=' + storageAccount + ';AccountKey=' + storageKey;
  return new Lease(connectionString, container, blob);
};

// Errors
Lease.NotHeldError = 'Lease not held';

Lease.prototype.ensureContainerExists = function () {
  var self = this;
  return new Promise(function (resolve, reject) {
    self.blobService.createContainerIfNotExists(self.container, function (error, result, response) {
      if (error) {
        reject(error);
      } else {
        resolve({created: result, details: response});
      }
    });
  });
};

// Close enough.
Lease._BeginningOfTime = new Date(1990, 1, 1).toUTCString();

Lease.prototype.ensureBlobExists = function () {
  var self = this;
  return new Promise(function (resolve, reject) {
    // Honestly, there's no better way to say "hey, make sure this thing exists?"
    var options = {accessConditions: {'if-unmodified-since': Lease._BeginningOfTime}};
    self.blobService.createBlockBlobFromText(self.container, self.blob, '', options, function (error, result, response) {
      if (error) {
        if (error.statusCode === 412) {
          // Blob already exists.
          resolve();
        } else {
          reject(error);
        }
      } else {
        resolve();
      }
    });
  });
};

/**
 * Returns the best-guess as to whether the lease is still held. May not be accurate if lease has expired.
 *
 * @method isHeld
 *
 * @returns {boolean}
 */
Lease.prototype.isHeld = function() {
  return this._isHeld;
};

/**
 * Since others may manage lease renewal/acquisition, this allows them to tell the lease whether they believe it is held or not.
 * For instance, if the LeaseManager fails to renew the lease once, the lease may still be held, but after multiple times,
 * the hold might expire. The LeaseManager may choose to tell the lease that it has lost the hold before that has actually occurred.
 *
 * The lease is normally pretty good about managing this itself (on acquire/renew/release success), but for special cases (like the above)
 * this method might be required.
 *
 * @param isItHeld
 */
Lease.prototype.setIsHeld = function(isItHeld) {
  this._isHeld = isItHeld;
};

Lease.prototype.acquire = function (options) {
  var self = this;
  return self.ensureContainerExists().then(function () {
    return self.ensureBlobExists();
  }).then(function () {
    return new Promise(function (resolve, reject) {
      self.blobService.acquireLease(self.container, self.blob, options, function (error, result, response) {
        if (error) {
          reject(error);
        } else {
          self.leaseId = result.id;
          debug('Acquired lease ' + self.leaseId, result);
          self._isHeld = true;
          resolve(self);
        }
      });
    });
  });
};

Lease.prototype.renew = function (options) {
  var self = this;
  return new Promise(function (resolve, reject) {
    if (!self.leaseId) {
      reject(Lease.NotHeldError);
    } else {
      self.blobService.renewLease(self.container, self.blob, self.leaseId, options, function (error, result, response) {
        if (error) {
          reject(error);
        } else {
          debug('Renewed lease ' + self.leaseId, result);
          self._isHeld = true;
          resolve(self);
        }
      });
    }
  });
};

Lease.prototype.release = function (options) {
  var self = this;
  return new Promise(function (resolve, reject) {
    if (!self.leaseId) {
      reject(Lease.NotHeldError);
    } else {
      self.blobService.releaseLease(self.container, self.blob, self.leaseId, options, function (error, result, response) {
        if (error) {
          reject(error);
        } else {
          debug('Released lease ' + self.leaseId, result);
          delete self.leaseId;
          self._isHeld = false;
          resolve(self);
        }
      });
    }
  });
};

Lease.prototype.updateContents = function (text, options) {
  var self = this;
  return new Promise(function (resolve, reject) {
    if (!self.leaseId) {
      reject(Lease.NotHeldError);
    } else {
      var opts = _.defaults({leaseId: self.leaseId}, options || {});
      self.blobService.createBlockBlobFromText(self.container, self.blob, text, opts, function (error, result, response) {
        if (error) {
          reject(error);
        } else {
          debug('Updated blob contents with ' + self.leaseId, result);
          resolve(self);
        }
      });
    }
  });
};

Lease.prototype.getContents = function (options) {
  var self = this;
  return new Promise(function (resolve, reject) {
    if (!self.leaseId) {
      reject(Lease.NotHeldError);
    } else {
      var opts = _.defaults({leaseId: self.leaseId}, options || {});
      self.blobService.getBlobToText(self.container, self.blob, opts, function (error, text, result, response) {
        if (error) {
          reject(error);
        } else {
          debug('Fetched blob contents with ' + self.leaseId, text, result);
          resolve(text);
        }
      });
    }
  });
};

module.exports = Lease;
