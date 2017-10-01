/**
 * (c) Copyright [2017] EntIT Software LLC
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
const chalk = require('chalk');
import configLoader from '../config';
import RestClient from '../src/restClient';
const restClient = new RestClient();
const config = configLoader.loadEnv();


/**
 * testing usage of the SSC REST API for downloading an FPR
 */
describe('downloads an FPR and tracks processsing to completion', function () {
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

  after(function () {

  });
  let artifactJobid, jobEntity = undefined;
  /**
   * downloads an FPR
   */
  it('downloads an FPR', function (done) {
    const filename = `Artifact_${config.sampleArtifactId}.fpr`;
    restClient.downloadFPR(config.sampleArtifactId, filename).then((dest) => {      
      console.log(chalk.green(`successfully downloaded FPR to ${dest}`));
      done();
    }).catch((err) => {
      console.log(chalk.red(`error downloading FPR ${filename}`), err)
      done(err);
    });
  });
  
});