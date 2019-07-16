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
 * testing usage of the SSC REST API for token generation
 */
describe('generate tokens by type', function () {

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
      done(new Error("2. restClient.initialize() failed: " + JSON.stringify(err)));
    });
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
  it('generates a token ', function (done) {
    //generate a CloudOneTimeJobToken by default or look in env for override
    let type = 'CloudOneTimeJobToken';
    //AnalysisDownloadToken, AnalysisUploadToken, AuditToken, UploadFileTransferToken, DownloadFileTransferToken, ReportFileTransferToken, CloudCtrlToken,
    //CloudOneTimeJobToken, WIESystemToken, WIEUserToken, UnifiedLoginToken, ReportToken, PurgeProjectVersionToken
    if (process.env.FORTIFY_TOKEN_TYPE) {
      type = process.env.FORTIFY_TOKEN_TYPE;
    }
    restClient.generateToken(type).then((token) => {
      console.log(chalk.green("successfully generated " + type + " token " + token));
      done();
    }).catch((err) => {
      done(new Error("restClient.generateToken() failed: " + JSON.stringify(err)));
    });
  });
});