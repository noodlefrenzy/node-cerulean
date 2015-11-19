# node-cerulean

[![Build Status](https://secure.travis-ci.org/noodlefrenzy/node-cerulean.svg?branch=master)](https://travis-ci.org/noodlefrenzy/node-cerulean) 
[![Dependency Status](https://david-dm.org/noodlefrenzy/node-cerulean.svg)](https://david-dm.org/noodlefrenzy/node-cerulean) 
[![Code Climate](https://codeclimate.com/github/noodlefrenzy/node-cerulean/badges/gpa.svg)](https://codeclimate.com/github/noodlefrenzy/node-cerulean) 
[![Test Coverage](https://codeclimate.com/github/noodlefrenzy/node-cerulean/badges/coverage.svg)](https://codeclimate.com/github/noodlefrenzy/node-cerulean)
[![npm version](https://badge.fury.io/js/cerulean.svg)](http://badge.fury.io/js/cerulean)

Wrappers, utilities, etc. for making working with Azure and Azure Storage even easier in Node.js

## Introduction

The goal of this module is to provide wrappers, extensions and other utilities that make it easier to work with the Azure Node.js SDK, the storage SDK, and the cli. It is structured as follows:

* `/lib`: Contains all wrappers and helpers. All exposed via `/lib/index.js`.
* `/examples`: Contains specific examples on how to accomplish various common tasks, either using the vanilla SDK or using the wrappers herein.
* `/test/integration`: Any additions to `/lib` should provide integration tests against the Azure framework.

Contributors could easily start out with an example of a common task in `/examples`, and if that was sufficiently complex it would motivate wrappers/helpers in `/lib`.

## Azure Storage

### Blob Leases

The initial release focuses on making it easier to work with leases in Azure Blob Storage. The `Lease` class provides a promise-based API for the acquisition, renewal, and release of leases, as well as an easy way to use the resulting lease for updating blob contents. The `LeaseManager` class makes it easy to manage a long-term lease on a blob (or a number of blobs), providing an event-based model that triggers on lease acquisition and loss. This makes it easy to do concurrent management tasks like leader election.

Both are described on my blog at [.../leader-election-in-node-js-using-azure-blob-storage](http://www.mikelanzetta.com/2015/11/leader-election-in-node-js-using-azure-blob-storage/). An example of using the `LeaseManager` for leader election is at `./examples/leader_followers.js`.
