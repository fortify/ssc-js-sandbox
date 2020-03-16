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
import { expect } from 'chai';
import * as csv from 'csv';
const chalk = require('chalk');
require('console.table');
import configLoader from '../config';
import fs from 'fs';
import { Sequence } from 'sequence';
import async from 'async';
import RestClient from '../src/restClient';
const restClient = new RestClient();
const config = configLoader.loadEnv();

/**
 * shared code for common testing patterns such as batch actions
 */
class CommonTestUtils {
    constructor() {
        this.restClient = restClient;//make public for test usage.
    }


    /**
     * Validates that all properties in configuraiton file exist and tried to authenitcate agains SSC with creds.
     * throws and error is auth failed or missing configuration params
     */
    validateConfigurationAndAuth(done) {
        console.info("Validating configuration:\n" + JSON.stringify(config, null, 2));
        expect(config).to.exist;
        expect(config.sscAPIBase).to.exist;
        expect(config.versionIdCSV).to.exist;
        expect(config.user).to.exist;
        expect(config.password).to.exist;
        expect(config.batchSize).to.exist;
        expect(fs.existsSync(config.versionIdCSV)).to.be.true;

        restClient.initialize().then((data) => {
            console.log("initialization status: " + data)
            done();
        }).catch((err) => {
            console.log("initialization failed", err)
            done(new Error("authentication failed, check your user and password: " + JSON.stringify(err)));
        });
    }
    
    /* Perform any cleanups. currently clears all tokens of test user.
     * Do not call this method if you plan on re-using a long-lived token for your authentication.
     */
    doCleanup(done, myRestClient) {
        // assumes initialized restClient
        let client; 
        if (!myRestClient) {
            myRestClient = restClient;
        }
        myRestClient.clearTokensOfUser().then(() => {
            done();
        }).catch((err) => { 
            done(new Error("doCleanup:" + JSON.stringify(err)));
        });
    }

    /**
     * does a batch submission of API calls in chunks.
     * Follows this algorithm:
     * create n batches based on config.batchSize and number of csv elements.
     * For each batch:
     *  Fire in parallel calls to restClient[restActionFunctionName] passing the csv value.
     * print a summary about all success and and all failures 
     * @param {*} done - callback for completion
     * @param {*} restActionFunctionName  - name of funciton to be called on restClient. i.e restClient.sendForTraining
     * @param {*} payload - if a POST or PUT this is the payload sent otherwise undefined.
     */
    batchAPIActions(done, restActionFunctionName, payload) {
        const data = fs.readFileSync(config.versionIdCSV, 'utf8');
        let promises = [];
        const sequence = Sequence.create();
        /**
         * collect success and error results from each batch.
         * item looks like:
         * {ok: [{versionId: 2, status: 200}], error: [{versionId: 3, status: 409, message: "failed for some reason"}]}
         */
        const summary = []; 
        /*Parse CSV and create a wrapping promise for each call to send to training*/
        csv.parse(data, (err, data) => {
            csv.transform(data, (data) => {
                return data.map(function (versionId) {
                    //each "cell" in csv, no matter rows.
                    const p = new Promise((resolve, reject) => {
                        //make call to SSC to send for training.
                        if (restClient[restActionFunctionName] && typeof restClient[restActionFunctionName] === 'function') {
                            restClient[restActionFunctionName](versionId, payload).then((data) => {
                                resolve({ data: data, err: undefined, version: versionId });
                            }).catch((err) => {
                                console.error(err);
                                resolve({ data: undefined, err: err, version: versionId });
                            })
                        } else {
                            console.log("error, function " + restActionFunctionName + " does not exist in restClient");
                        }
                    });
                    //collect promises to do the API call.
                    promises.push(p);
                });
            }, (err, data) => {
                //all promises gathered
                //do batch calls in chunks
                let lastPromise = sequence; //use the sequence library to do one batch at a time
                /*Split to batches of wrapping promises again*/
                for (let i = 0, j = promises.length; i < j; i += config.batchSize) {
                    let batchPromises = promises.slice(i, i + config.batchSize);
                    //batchPromises now has a slice of the full promises array.
                    lastPromise = lastPromise.then((next) => {
                        console.log("starting next batch " + batchPromises.length + " versions");
                        /*Fire current batch of promises in parallel*/
                        Promise.all(batchPromises).then((values) => {
                            // all promises fulfilled
                            // Promises always resolve (no reject) so that we can collect in one place all success and failures.
                            //err object on result will tell if it was succesfull or not.
                            let errors = [];
                            let ok = [];
                            values.forEach((result) => {
                                if (result.err) {
                                    errors.push(result);
                                } else {
                                    ok.push(result);
                                }
                            })

                            const formattedErrors = errors.map(item => {
                                return {
                                    versionId: item.version,
                                    status: item.err.responseCode,
                                    message: item.err.message
                                }
                            });
                            const formattedOk = ok.map(item => {
                                return {
                                    versionId: item.version,
                                    status: item.data.status
                                }
                            });
                            summary.push({ ok: formattedOk, error: formattedErrors });

                            next();//next sequence of batch
                        }).catch(reason => {
                            console.error(reason);
                            next();//next sequence of batch
                        });
                    })

                }
                lastPromise.then((next) => {
                    console.log(chalk.blue("DONE ALL BATCHES"));
                    summary.forEach((batch, i) => {
                        console.table(chalk.green("Batch " + i + " succeeded"), batch.ok);
                    })
                    done();
                })

            });
        });
    }
}

module.exports = CommonTestUtils;