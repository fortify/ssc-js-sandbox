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
 * testing usage of the SSC REST API for listing issues of a project version
 */
describe('Explore issue-of-project-version-controller', function () {

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

  it('get all issues with batching', function (done) {
    restClient.getAllIssueOfVersion(config.sampleVersionId, 20, (issues) => {
      //This is where we could save to a file or something like that.
      console.log("next batch received: \n");
      console.log("-----------------------");
      console.log(issues.map(elem => elem.primaryLocation).join(", "));
      console.log("-----------------------");
    }).then((allCount) => {
      console.log(chalk.green("successfully got a total of = " + allCount + " issues"));
      done();
    }).catch((err) => {
      console.log(chalk.red("error listing issues"), err)
      done(err);
    });
  });

  /**
   * get issues filtered
   *  filter=TYPE[typeid]:val,TYPE2[typeid]:val
   * filter=CUSTOMTAG%5B87f2364f-dcd4-49e6-861d-f8d3f351686b%5D:4,ISSUE%5B11111111-1111-1111-1111-111111111165%5D:SQL+Injection
   */
  it('should filter issues ', function (done) {
    restClient.getIssues(config.sampleVersionId, 0, "CUSTOMTAG[87f2364f-dcd4-49e6-861d-f8d3f351686b]:4,ISSUE[11111111-1111-1111-1111-111111111165]:SQL Injection").then((response) => {
      console.log('filter found:' + (response.obj.data ? response.obj.data.length : 0) + ' issues');
      done();
    }).catch((err) => {
      console.log(chalk.red("error filtering issues"), err)
      done(err);
    });
  });
});