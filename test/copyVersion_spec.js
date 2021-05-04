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
const CommonTestUtils = require('../src/commonTestsUtils');
const commonTestsUtils = new CommonTestUtils();
import RestClient from '../src/restClient';
const restClient = new RestClient();
import configLoader from '../config';

const config = configLoader.loadEnv();

/**
 * testing usage of the SSC REST API for version copying
 */
describe('copies an Application version (a.k.a Project version)', function () {

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

  after(function (done) {
    /* Perform any cleanups. currently clears all tokens of test user.
     * Do not call this method below if you plan on re-using a long-lived token for your authentication.
     */
    commonTestsUtils.doCleanup(done, restClient);
  });
  
  /**
   * copies an existing version
   */
  it('copies the version from config.sampleVersionId', function (done) {
    const rnd = Math.floor(Math.random() * 1000);
    const verName = "Node App Test Version" + rnd;
    const appName = "Node App Test" + rnd;
    restClient.copyVersion({
      name: verName,
      description: "Node Mocha test version",
      appName: appName,
      appId: config.sampleAppId,
      appDesc: "Node Mocha test App",
      issueTemplateId: "Prioritized-HighRisk-Project-Template",
      copyVersionId: config.sampleVersionId
    }).then((version) => {
      console.log(chalk.green("successfully copied version " + version.name));
      done();
    }).catch((err) => {
      console.log(chalk.red("error copying version "), err)
      done(err);
    });
  });
 
});