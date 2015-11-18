
var accountName = '<redacted>';
var accountKey = '<redacted>';

var Lease = require('./lib/index').Lease,
    LeaseManager = require('./lib/index').LeaseManager;

var lease = new Lease(accountName, accountKey, 'mycontainer', 'myblob1');

lease.acquire({ leaseDuration: 60 }).then(function() {
    return lease.updateContents('Testing update');
}).then(function() {
    return lease.getContents();
}).then(function (contents) {
    console.log('Read "' + contents + '"');
    setTimeout(function() {
        lease.release().then(function() {
            console.log('Acquired and released.');
        });
    }, 5 * 1000);
});
