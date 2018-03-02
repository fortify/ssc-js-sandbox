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
const assert = require('assert');
const expect = require('chai').expect;
const chalk = require('chalk')
const CommonTestUtils = require('../../src/commonTestsUtils');
const commonTestsUtils = new CommonTestUtils();
import RestClient from '../../src/restClient';
const restClient = new RestClient();

/**
 * perform any global cleanups after the test sequence. 
 * If you run any tests individually, you may also want to run this test manually to cleanup. 
 */
describe('run last and clean up after the full sequence of tests', function () {

  before(function (done) {
    //override NodeJS security for SSC (unprotected)
    if (process.env.DisableSSLSecurity) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
    /**
     * initialize and authenticate
     */
    restClient.initialize().then(() => {
      done()
    }).catch((err) => { done(err) });
  });

  after(function () {

  });

  /**
   * clear tokens
   */
  it('clears all tokens owned by the test user', function (done) {
    
    restClient.clearTokensOfUser().then((status) => {
      console.log(chalk.green("successfully cleared all tokens owned by test user "));
      done();
    }).catch((err) => {
      console.log(chalk.red("error clearing tokens owned by test user"), err)
      done(err);
    });
  });
});
