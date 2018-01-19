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


describe('assign authenticated entities (users and ldap entities) to an  appversion', function () {
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
  
  const pvId = config.sampleSecondaryVersionId;
  let originalAuthEntities = [];

  it('get authentities (users and ldap entities) currently assigned to an appversion.', function(done){
    restClient.getAuthEntitiesOfAppVersion(pvId).then((resp) => {
      console.log(chalk.green(`successfully retrieved ${resp.length} authentities currently assigned to an appversion [id = ${pvId}]`));
      originalAuthEntities = resp;
      done();
    }).catch((err) => {
      console.log(chalk.red("Error retrieving authentities assigned to an appversion!"), err)
      done(err);
    });
  });

it('Assign given authenticated entities (users and ldap entities) to an appversion. Note that user "admin" will always be assigned by ssc even if it is not present in the request data.', function (done) {
    //get from config the new auth entities (users/groups local or ldap) to assign to the sample version.
    const requestData = config.sampleAuthEntities;
    restClient.assignAppVersionToAuthEntities(pvId,requestData).then((resp) => {
      console.log(chalk.green(`successfully assigned ${resp.length} authentities to an appversion [id = ${pvId}]`));
      done();
    }).catch((err) => {
      console.log(chalk.red("Error assigning authentities to an appversion!"), err)
      done(err);
    });
  }); 

  it('Revert to the original authenticated entities (users and ldap entities) assigned to an appversion.', function (done) {
    const requestData = originalAuthEntities;
    restClient.assignAppVersionToAuthEntities(pvId,requestData).then((resp) => {
      console.log(chalk.green(`successfully reverted ${resp.length} authentities to an appversion [id = ${pvId}]`));
      done();
    }).catch((err) => {
      console.log(chalk.red("Error reverting authentities to an appversion!"), err)
      done(err);
    });
  }); 
  

});