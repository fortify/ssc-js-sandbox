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
 * get information about API
 */
describe('api info', function () {

  before(function (done) {
    //override NodeJS security for SSC (unprotected)
    if (process.env.DisableSSLSecurity) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
    /**
     * initialize and authenticate
     */
    restClient.initialize().then(() => {
      done();
    }).catch((err) => { 
      done(new Error("1. restClient.initialize() failed: " + JSON.stringify(err)));
    });
  });

  after(function (done) {
    /* Perform any cleanups. 
     * Do not call this method below if you plan on re-using a long-lived token for your authentication.
     */
    commonTestsUtils.doCleanup(done, restClient);
  });

  /**
   * print a list of controllers.
   */
  it('lists api endpoints and all their methods ', function (done) {
    const controllers = restClient.getControllers();
    controllers.sort((a,b)=>{
      if(a.name.toLowerCase() > b.name.toLowerCase()) {
        return -1;
      } 
      if(a.name.toLowerCase() < b.name.toLowerCase()) {
        return 1;
      } 
      return 0;
    });
    const csv = controllers.map((item)=>{
      return `${item.name}, ${item.apis.join(',')} `
    });
    console.log(`Total: ${controllers.length}`);
    console.log(csv.join("\n"));
    done();
  });
   
});