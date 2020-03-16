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
import RestClient from '../src/restClient';
import configLoader from '../config';
const chalk = require('chalk')
const CommonTestUtils = require('../src/commonTestsUtils');
const commonTestsUtils = new CommonTestUtils();
const restClient = new RestClient();
const config = configLoader.loadEnv();

/**
 * testing usage of the SSC REST API for version creating and management
 */
describe('Audit Assistant configuration ', function () {

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
   * Gets Audit Assistant configuration
   */
  it('gets Audit Assistant enabled setting', function (done) {
    const groupName = config.auditAssistantConfigGroup;
    const key = config.auditAssistantEnabledKey;

    restClient.getConfiguration(groupName).then((config) => {
      const enabledProperty = config.properties.find((property) => {
        return property.name === key;
      });
      if (enabledProperty.value === "false") {
        console.log(chalk.red("Audit Assistant is not enabled"));
      } else {
        console.log(chalk.green("Audit Assistant is enabled"));
      }
      done();
    }).catch((err) => {
      console.log(chalk.red("error getting configuration "), err)
      done(err);
    });
  });
 
});