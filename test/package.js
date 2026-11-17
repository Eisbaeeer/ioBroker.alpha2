'use strict';

const path = require('node:path');
const { tests } = require('@iobroker/testing');

// checks package.json and io-package.json
tests.packageFiles(path.join(__dirname, '..'));
