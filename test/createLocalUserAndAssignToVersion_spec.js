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
const assert = require('assert');
const expect = require('chai').expect;
const chalk = require('chalk')
const CommonTestUtils = require('../src/commonTestsUtils');
const commonTestsUtils = new CommonTestUtils();
const restClient = new RestClient();
const config = configLoader.loadEnv();

/**
 * testing usage of the SSC REST API for creating a new local user and assigning to a project version
 */
describe('create a new local user and assign to a project version', function () {
  this.timeout(180000);
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
   * create local user
   */
  let localUserEntity = undefined;
  it('create a local user', function (done) {
      const timeStamp = Math.floor(Date.now() / 1000);
      const localUser = {
        "requirePasswordChange": false,
        "userName": "newuser-"+timeStamp,
        "firstName": "new",
        "lastName": "user" +timeStamp,
        "email": "newuser" + +timeStamp + "@test.com",
        "clearPassword": "Admin_12%superStrong!$",
        "passwordNeverExpire": true,
        "roles": [{
            "id": "securitylead"
        },
        {
            "id": "manager"
        },
        {
            "id": "developer"
        }]
    };
    restClient.createLocalUser(localUser).then((localUser) => {
      console.log(chalk.green(`successfully created new local user ${localUser.userName}`));
      localUserEntity = localUser;
      done();
    }).catch((err) => {
      console.log(chalk.red("Error creating new local user!"), err)
      done(err);
    });
  });
  /**
   * Assign user to version
   */
  it('assign user to version', function (done) {
    const requestData = {"projectVersionIds": [config.sampleVersionId]};
    if(!localUserEntity) {
      return done(new Error("No local user created."));
    }
    let userId = localUserEntity.id;
    restClient.assignUserToVersions(userId,requestData).then((resp) => {
      console.log(chalk.green(`successfully assigned user to version  ${config.sampleVersionId}`));
      done();
    }).catch((err) => {
      console.log(chalk.red("Error assigning user to versions!"), err)
      done(err);
    });
  });
});