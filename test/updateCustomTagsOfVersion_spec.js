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
 * add new custom tag to project version
 */
describe('add an existing custom tag to project version', function () {

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
   * Update the list of custom tags for a project version
   */
  let customTags = [];
  it('get all the custom tags for a project', function (done) {
    restClient.getAllCustomTagsOfVersion([config.sampleVersionId]).then((response) => {
      customTags = response;
      console.log(chalk.green(`successfully got all the custom tags for the project version with ID ${config.sampleVersionId}`));
      done();
    }).catch((err) => {
      console.log(chalk.red("error getting all the custom tags for the project version with ID:" + config.sampleVersionId), err)
      done(err);
    });
  });

  it('get the specific custom tag that we want to add and append to final list or create a new custom tag', function (done) {
    let customTagId = config.sampleCustomTagId;
    if (config.sampleCustomTagId < 0) {
      const customTag = config.sampleCustomTag;
      customTag.name = 'Custom tag for version id ' + config.sampleVersionId + ' ' + Math.floor(Math.random() * 1000);
      restClient.createCustomTag(customTag).then((newCustomTag) => {
        console.log(chalk.green("successfully created custom tag " + newCustomTag.name + " with id " + newCustomTag.id));
        restClient.getCustomTag([newCustomTag.id]).then((response) => {
          customTags.push(response.obj.data);
          console.log(chalk.green(`IDs of custom tag list with new appended element: ` + customTags.map(elem => elem.id).join(", ")));
          done();
        }).catch((err) => {
          console.log(chalk.red("error appending the selected custom tag to the list"), err)
          done(err);
        });
      }).catch((err) => {
        console.log(chalk.red("error creating version "), err)
        done(err);
      });
    }
  });

  it('update the list of custom tags', function (done) {
    restClient.updateCustomTagsOfVersion([config.sampleVersionId], customTags).then((response) => {
      console.log(chalk.green(`successfully got all the custom tags for the project version with ID ${config.sampleVersionId}`));
      done();
    }).catch((err) => {
      console.log(chalk.red("error updating the list of custom tags for the project version with ID:" + config.sampleVersionId), err)
      done(err);
    });
  });
 });
