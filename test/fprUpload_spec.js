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
import configLoader from '../config';
import RestClient from '../src/restClient';
const restClient = new RestClient();
const config = configLoader.loadEnv();


/**
 * testing usage of the SSC REST API for uploading and FPR to an application version.
 */
describe('uploads and FPR and tracks processsing to completion', function () {
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

  let artifactJobid, jobEntity = undefined;
  /**
   * create a version
   */
  it('uploads an FPR', function (done) {

    restClient.uploadFPR(config.sampleVersionId, config.sampleFPR).then((jobid) => {
      artifactJobid = jobid;
      console.log(chalk.green(`successfully uploaded FPR ${config.sampleFPR} to ${config.sampleVersionId}, job id: ${jobid}`));
      done();
    }).catch((err) => {
      console.log(chalk.red("error uploading FPR version "), err)
      done(err);
    });
  });

  /**
   * Poll the uploaded FPR in previous test for processing status
   */
  it('poll for status ', function (done) {
    
    if (!artifactJobid) {
      return done(new Error("previous upload FPR failed.\n"+
      "Most likley a timeout has been reached for Mocha test framework. See the top of this test suite to make the timeout longer (i.e this.timeout(180000)\n"+
      "Timeout needs to cover processing time on the server"));
    }
    /*
    * callback for setTimeout. Will use restClient to get the fpr status and then based on returned status either set another timer or stop execution.
    */
    function checkStatus() {
      const timeoutSec = 2;
      restClient.getJob(artifactJobid).then((job) => {
        jobEntity = job; //update for next test
        let msg;
        switch (jobEntity.state) {
          case "FAILED":
            msg = console.log(`${artifactJobid} failed! project version name: project version id: ${jobEntity.projectVersionId} artifact id: ${jobEntity.jobData.PARAM_ARTIFACT_ID}`);
            console.log(chalk.red(msg));
            done(new Error(msg));
            break;
          case "CANCELLED":
            msg = console.log(`${artifactJobid} canceled! project version id: ${jobEntity.projectVersionId} artifact id: ${jobEntity.jobData.PARAM_ARTIFACT_ID}`);
            console.log(chalk.red(msg));
            done(new Error(msg));
            break;
          case "RUNNING":
          case "WAITING_FOR_WORKER":
          case "PREPARED":
            console.log(`${artifactJobid} ongoing!`);
            setTimeout(checkStatus, timeoutSec * 1000);
            break;
          case "FINISHED":
            console.log(chalk.green(`${artifactJobid} completed successfully, project version id: ${jobEntity.projectVersionId} artifact id: ${jobEntity.jobData.PARAM_ARTIFACT_ID}`));
            done();
            break;
        }
      }).catch((err) => {
        let msg = `${artifactJobid} ongoing!`;
        console.log(chalk.red(msg));
        done(err);
      });
    }
    checkStatus();
  });

});