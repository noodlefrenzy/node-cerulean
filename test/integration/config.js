'use strict';
module.exports = {
    accountName: process.env.CeruleanStorageAccountName,
    accountKey: process.env.CeruleanStorageAccountKey,
    containerName: process.env.CeruleanContainerName || 'integrationtests',
    blobName: process.env.CeruleanBlobName || 'testblob'
};
