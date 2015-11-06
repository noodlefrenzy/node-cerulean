'use strict';

var Azure = require('azure-storage'),
    Promise = require('bluebird'),
    debug = require('debug')('cerulean:lease');

function Lease(storageAccount, storageKey, container, blob) {
    var connectionString = 'DefaultEndpointsProtocol=https;AccountName=' + storageAccount + ';AccountKey=' + storageKey;
    this.blobService = Azure.createBlobService(connectionString);
    this.storageAccount = storageAccount;
    this.container = container;
    this.blob = blob;
    this.fullUri = 'https://' + storageAccount + '.blob.core.windows.net/' + container + '/' + blob;
    debug('Full lease path: ' + this.fullUri);
}

// Errors
Lease.NotHeldError = 'Lease not held';

Lease.prototype.ensureContainerExists = function() {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.blobService.createContainerIfNotExists(self.container, function (error, result, response) {
            if (error) {
                reject(error);
            } else {
                resolve({ created: result, details: response });
            }
        });
    });
};

// Close enough.
Lease._BeginningOfTime = new Date(1990, 1, 1).toUTCString();

Lease.prototype.ensureBlobExists = function() {
    var self = this;
    return new Promise(function (resolve, reject) {
        // Honestly, there's no better way to say "hey, make sure this thing exists?"
        var options = { accessConditions: { 'if-unmodified-since': Lease._BeginningOfTime } };
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

Lease.prototype.acquire = function(options) {
    var self = this;
    return self.ensureContainerExists().then(function() {
        return self.ensureBlobExists();
    }).then(function ()
    {
       return new Promise(function (resolve, reject) {
           self.blobService.acquireLease(self.container, self.blob, options, function(error, result, response){
               if (error) {
                   reject(error);
               } else {
                   self.leaseId = result.id;
                   debug('Acquired lease ' + self.leaseId, result);
                   resolve(self);
               }
           });
       });
    });
};

Lease.prototype.renew = function(options) {
    var self = this;
    return new Promise(function (resolve, reject) {
       if (!self.leaseId) {
           reject(Lease.NotHeldError);
       } else {
           self.blobService.renewLease(self.container, self.blob, self.leaseId, options, function(error, result, response) {
               if (error) {
                   reject(error);
               } else {
                   debug('Renewed lease ' + self.leaseId, result);
                   resolve(self);
               }
           });
       }
    });
};

Lease.prototype.release = function(options) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (!self.leaseId) {
            reject(Lease.NotHeldError);
        } else {
            self.blobService.releaseLease(self.container, self.blob, self.leaseId, options, function(error, result, response) {
                if (error) {
                    reject(error);
                } else {
                    debug('Released lease ' + self.leaseId, result);
                    delete self.leaseId;
                    resolve(self);
                }
            })
        }
    })
};

module.exports = Lease;
