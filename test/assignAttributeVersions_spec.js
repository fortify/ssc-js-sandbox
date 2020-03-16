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
const chalk = require('chalk');
import configLoader from '../config';
const CommonTestUtils = require('../src/commonTestsUtils');
const commonTestsUtils = new CommonTestUtils();
import RestClient from '../src/restClient';
const restClient = new RestClient();
const config = configLoader.loadEnv();

/**
 * testing usage of the SSC REST API for assiging an attribute to an application version
 */
describe('Creates a new Attribute of type text and assigns a value this attribute to a list of versions from csv', function () {

  before(function () {
    //override NodeJS security for SSC (unprotected)
    if (process.env.DisableSSLSecurity) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
  });

  after(function (done) {
    /* Perform any cleanups. currently clears all tokens of test user.
     * Do not call this method below if you plan on re-using a long-lived token for your authentication.
     */
    commonTestsUtils.doCleanup(done, commonTestsUtils.restClient);
  });

  it('validates all properties exist', function (done) {
    commonTestsUtils.validateConfigurationAndAuth(done);
  });

  let attributeDefinition;

  /**
   * create a version
   */
  it('creates a single input (text) attribute', function (done) {
    let sampleAttributeDefinition = config.sampleAttributeDefinition;
    sampleAttributeDefinition.name = "company guid " + Math.floor(Math.random()*100);
    commonTestsUtils.restClient.createAttributeDefinition(sampleAttributeDefinition).then((attrDef) => {
      console.log(chalk.green("successfully created attribute definition " + attrDef.name + " /id = " + attrDef.id));
      attributeDefinition = attrDef;
      done();
    }).catch((err) => {
      console.log(chalk.red("error creating attribute definition "), err)
      done(err);
    });
  });

  it('batch assigns a value to an attribute on multiple versions', function (done) {
    if(!attributeDefinition) {
      done(new Error("attributeDefinition was not created in previous step"));
      return;
    }
    config.sampleAttributeValue[0].attributeDefinitionId = attributeDefinition.id;
    config.sampleAttributeValue[0].value = "#sandbox_sample_guid";
    commonTestsUtils.batchAPIActions(done, "assignAttribute", config.sampleAttributeValue);
  });

});