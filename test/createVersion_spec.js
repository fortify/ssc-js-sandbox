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

/**
 * testing usage of the SSC REST API for version creating and management
 */
describe('creates an Application version (a.k.a Project version)', function () {

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
   * create a version
   */
  it('creates a version and copy issues from config.sampleVersionId', function (done) {
    const rnd = Math.floor(Math.random() * 1000);
    const verName = "Node App Test Version" + rnd;
    const appName = "Node App Test" + rnd;
    restClient.createVersion({
      name: verName,
      description: "Node Mocha test version",
      appName: appName,
      appDesc: "Node Mocha test App",
      issueTemplateId: "Prioritized-HighRisk-Project-Template",
      //turn this on to copy issues from config.sampleVersionId.
      copyCurrentState: false,
      attributes: [
        { attributeDefinitionId: 5, values: [{ guid: "New" }], value: null },
        { attributeDefinitionId: 6, values: [{ guid: "Internal" }], value: null },
        { attributeDefinitionId: 7, values: [{ guid: "internalnetwork" }], value: null },
        { attributeDefinitionId: 1, values: [{ guid: "High" }], value: null }
      ]
    }).then((version) => {
      console.log(chalk.green("successfully created version " + version.name));
      done();
    }).catch((err) => {
      console.log(chalk.red("error creating version "), err)
      done(err);
    });
  });
 
});