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
 * testing usage of the SSC REST API for generaeting, tracking and downloading a report
 */
describe('generate a report and tracks status to completion', function () {
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

  let savedReportEntity = undefined;
  /**
   * generate report
   */
  it('generates a report ', function (done) {
    const reportName = "Fortify JS Sandbox DISA STIG " + Math.floor(Date.now() / 1000);
    restClient.generateDISASTIGReport(reportName, "My excellent notes", "DISA STIG", "PDF", config.sampleAppId, config.sampleVersionId).then((savedReport) => {
      console.log(chalk.green("successfully generated DISA STIG " + JSON.stringify(savedReport)));
      savedReportEntity = savedReport;
      done();
    }).catch((err) => {
      console.log(chalk.red("error generating report"), err)
      done(err);
    });
  });

  /**
   * Poll the report created in previous test for processing status
   */
  it('poll for status ', function (done) {

    if (!savedReportEntity) {
      return done(new Error("previous report generation failed"));
    }
    /*
    * callback for setTimeout. Will use restClient to get the report status and then based on returned status either set another timer or stop execution.
    */
    function checkStatus() {
      const timeoutSec = 2;
      restClient.getSavedReportEntity(savedReportEntity.id).then((savedReport) => {
        savedReportEntity = savedReport; //update for next test
        switch (savedReport.status) {
          case "PROCESSING":
            console.log(`${savedReport.name} id(${savedReport.id}) still processing! will check again in ${timeoutSec} seconds`);
            setTimeout(checkStatus, timeoutSec * 1000);
            break;
          case "ERROR_PROCESSING":
            let msg = `${savedReport.name} id(${savedReport.id}) failed!`;
            console.log(chalk.red(msg));
            done(new Error(msg));
            break;
          case "SCHED_PROCESSING":
            console.log(`${savedReport.name} id(${savedReport.id}) still scheduled! will check again in ${timeoutSec} seconds`);
            setTimeout(checkStatus, timeoutSec * 1000);
            break;
          case "PROCESS_COMPLETE":
            console.log(chalk.green(`${savedReport.name} id(${savedReport.id}) completed successfully`));
            done();
            break;
        }
      }).catch((err) => {
        // let msg = `${savedReport.name} id(${savedReport.id}) failed! ` + err.message;
        console.log("Error generating report: " + JSON.stringify(err));
        done(err);
      });
    }
    checkStatus();
  });
  //33
  /**
   * It should download report
   */
  it('download report ', function (done) {

    if (savedReportEntity.status !== "PROCESS_COMPLETE") {
      return done(new Error("Download aborted due to error processing in previous test.\n"+
      " Most likley a timeout has been reached for Mocha test framework. See the top of this test suite to make the timeout longer (i.e this.timeout(180000)\n"+
      "Timeout needs to cover processing time on the server"));
    }
    restClient.downloadReport(savedReportEntity.id, savedReportEntity.name + "." + savedReportEntity.format).then((dest) => {
      console.log(chalk.green("successfully downloaded report to " + dest));
      done();
    }).catch((err) => {
      console.log(chalk.red("error generating report"), err)
      done(err);
    });
  });

});