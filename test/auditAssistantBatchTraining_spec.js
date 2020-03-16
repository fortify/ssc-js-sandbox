/**
 * (c) Copyright [2017] Micro Focus or one of its affiliates
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*  http://www.apache.org/licenses/LICENSE-2.0
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/
import configLoader from '../config';
const CommonTestUtils =  require('../src/commonTestsUtils');
const commonTestsUtils = new CommonTestUtils();
const dotenv = require('dotenv').config();//must be before config
const config = configLoader.loadEnv();
const chalk = require('chalk');

describe('batch predicts audit assistant', function () {

  before(function () {
    //override NodeJS security for SSC (unprotected)
    if (process.env.DisableSSLSecurity) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
  });

  after(function (done) {
    if (config.skipAA) {
      done();
    } else {
      /* Perform any cleanups. currently clears all tokens of test user.
      * Do not call this method below if you plan on re-using a long-lived token for your authentication.
      */
      commonTestsUtils.doCleanup(done);
    }
  });

  it('validates all properties exist', function (done) {
    if (config.skipAA) {
      console.log(chalk.red('Audit Assistant is not enabled. Skipping test'));
      done();
    } else {
      commonTestsUtils.validateConfigurationAndAuth(done);
    }
  });

  it('batch trains on given list of versions ', function (done) {
    if (config.skipAA) {
      console.log(chalk.red('Audit Assistant is not enabled. Skipping test'));
      done();
    } else {
      commonTestsUtils.batchAPIActions(done, "sendForTraining");
    }
  });
});