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

/**
 * REST wrapper around the swagger generated code for SSC.
 */
"use strict";
const dotenv = require('dotenv').config();//must be before config
import configLoader from '../config';
import Swagger from 'swagger-client';
import async from 'async';
import request from 'request'
import fs from "fs";
import http from 'http';
import https from 'https';

const config = configLoader.loadEnv();

/**
 * return the options to be passed to swagger
 * @param {*} token - FortifyToken to be used for all communications with SSC
 */
function getClientAuthTokenObj(token) {
    return {
        requestContentType: 'application/json',
        responseContentType: 'application/json',
        clientAuthorizations: {
            'Authorization': 'FortifyToken ' + token,
            'FortifyToken':  'FortifyToken ' + token
        }
    }
}

/** basic download file */
function downloadFile(url, folder, filename, cb) {
    var file = fs.createWriteStream(folder + "/" + filename);
    let moduleRef = http;
    if (url.startsWith("https")) {
        moduleRef = https;
    }
    var request = moduleRef.get(url, function (response) {
        response.pipe(file);
        file.on('finish', function () {
            file.close(cb);
        });
    }).on('error', function (err) { // Handle errors
        fs.unlink(folder);
        if (cb) cb(err.message);
    });
}

/**
 * create this directory if does not exist
 * @param {*} dir
 */
function createDirectoryIfNoExist(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

/**
 * helper function to get expiration date in ISO 8601 format for tokens
 * returns current date + 1 day.
 */
function getExpirationDateString() {
    const dt = new Date();
    dt.setDate(dt.getDate() + 1);
    return dt.toISOString();
}

/**
 * wraps swagger calls for convinience
 */
export default class restClient {
    constructor() {
        this.api = undefined;
    }
    /**
     * will authenticate based on config.js (root) parameters adn the attempt to make a call to features API to test for hearbeat.
     */
    initialize() {
        const restClient = this;
        return new Promise((resolve, reject) => {
            const that = this;
            new Swagger({
                url: `${config.sscAPIBase}/spec.json`,
                usePromise: true,
            }).then((api) => {
                console.log("Successfully loaded swagger spec. Attempting to call heartbeat /features ");
                that.api = api.apis;
                async.waterfall([
                    function getSwaggerClient(callback) {
                        const endpoint = `${config.sscAPIBase}/spec.json`;
                        /**
                         * Set up the Swagger endpoint and make .basicApi property available to use when calling API with basic auth
                         */
                        Swagger(endpoint, 
                            {authorizations: {
                                Basic: { username: config.user, password: config.password },
                              }})
                            .then( client => {
                                restClient.basicApi = client.apis;
                                callback(null, client);
                            });
                    },
                    function getToken(client, callback) {
                        /* do not create token again if we already have one.
                         * In general, for automations either use a short-lived (<1day) token such as "UnifiedLoginToken"
                         * or preferably, use a long-lived token such as "AnalysisUploadToken"/"JenkinsToken" (lifetime is several months)
                         * and retrieve it from persistent storage. DO NOT create new long-lived tokens for every run!!  */

                        restClient.generateToken("UnifiedLoginToken")
                            .then((token) => {
                                callback(null, token);
                            }).catch((error) => {
                                callback(error);
                            });
                    },
                    function getSwaggerClientWithTokenAuth(token, callback) {
                        /**
                         * Set up the Swagger endpoint and make .api property available to use when calling API with token auth
                         */
                        const endpoint = `${config.sscAPIBase}/spec.json`;
                        Swagger(endpoint, 
                            {authorizations: {
                                'FortifyToken':  'FortifyToken ' + token
                              }})
                            .then( client => {
                                restClient.api = client.apis;
                                callback(null, client);
                            });
                    },

                    function heartbeat(token, callback) {
                        restClient.api["feature-controller"].listFeature({}, getClientAuthTokenObj(token)).then((features) => {
                            callback(null, token);
                        }).catch((error) => {
                            callback(error);
                        });
                    }
                ], function onDoneHandler(err, token) {
                    if (err) {
                        reject(err);
                    } else {
                        that.token = token; //save token
                        resolve("success");
                    }
                });

            }).catch((err) => {
                reject(err);
            });

        })
    }
    /**
     * returns an array of {name: "controller name", apis: ["apifunc1", "apifunc2"...]}
     */
    getControllers() {
        const restClient = this;
        //get list of controllers
        const controllersNames = Object.keys(restClient.api).filter((item) => {
            if (restClient.api[item] === null) {
                return false; //type of null is object
            }
            if (typeof restClient.api[item] === 'object' && restClient.api[item].apis) {
                return true;
            }
            return false;
        })
        //attach to each controller list of funcitons.
        const result = controllersNames.map((name) => {
            let res = { name: name, apis: [] };
            const attr = Object.keys(restClient.api[name]).filter((attr) => {
                if (typeof restClient.api[name][attr] === 'function' && attr !== 'help') {
                    return true;
                }
                return false;
            });
            res.apis = attr;
            return res;
        })
        return result;
    }

    /**
     * Gets configuration for the specified group
     * @param {*} groupName
     */
    getConfiguration(groupName) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            if (!restClient.api) {
                return reject("restClient not initialized! make sure to call initialize before using API");
            }

            restClient.api["configuration-controller"].getConfiguration({group: groupName},
                getClientAuthTokenObj(restClient.token))
            .then((resp) => {
                if (resp.obj.responseCode !== 200) {
                    reject(new Error(resp.obj.data.message));
                } else {
                    resolve(resp.obj.data);
                }
            }).catch((error) => {
                reject(error);
            });;
        });
    }

    /**
     * send for Audit Assistant training
     * @param {*} versionId
     */
    sendForTraining(versionId) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            if (!restClient.api) {
                return reject("restClient not initialized! make sure to call initialize before using API");
            }
            restClient.api["project-version-controller"].trainAuditAssistantProjectVersion(
                {resource: {"projectVersionIds": [versionId]}},
                getClientAuthTokenObj(restClient.token))
            .then((resp) => {
                if (resp.obj.data.message.indexOf("failed") !== -1) {
                    //legacy
                    reject(new Error(resp.obj.data.message));
                } else {
                    resolve(resp);
                }
            }).catch((error) => {
                reject(error);
            });;
        });
    }

    sendForPrediction(versionId) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            if (!restClient.api) {
                return reject("restClient not initialized! make sure to call initialize before using API");
            }
            restClient.api["project-version-controller"].auditByAuditAssistantProjectVersion(
                {resource: {"projectVersionIds": [versionId]}},
                getClientAuthTokenObj(restClient.token))
            .then((resp) => {
                if (resp.obj.data.message.indexOf("failed") !== -1) {
                    //legacy
                    reject(new Error(resp.obj.data.message));
                } else {
                    resolve(resp);
                }
            }).catch((error) => {
                reject(error);
            });;
        });
    }
    /**
     * create a version. At the minimum this requires 3 steps
     * 1. create version and app (project) resource
     * 2. assign attributes (required ones at least)
     * 3. commit version to make it usable
     * Note: a bulk request can be used to send one request to the server that contains more than one.
     * This sample will use an async waterfall call to do them one after the other.
     * @param {*} options { name,
     *                      description,
     *                      appName,
     *                      appDesc,
     *                      issueTemplateId,
     *
     *                      // if passed, issues from config.samppleVersionId  will be copied to newly
     *                      // created version (background job will be started on server)
     *                      copyCurrentState (true/false)
     *
     *                      //attributes can be multi options - use values
     *                      //single select such as boolean use value.
     *                      attributes: [
     *                          { attributeDefinitionId: 5, values: [{ guid: "New" }], value: null },
     *                          { attributeDefinitionId: 6, values: [{ guid: "Internal" }], value: null },
     *                          { attributeDefinitionId: 7, values: [{ guid: "internalnetwork" }], value: null },
     *                          { attributeDefinitionId: 1, values: [{ guid: "High" }], value: null }
     *                      ]}
     */
    createVersion(options) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            //collect all function for waterfall dispatching.
            const waterfallFunctionArray = [
                function createAppAndVersionResource(callback) {
                    restClient.api["project-version-controller"].createProjectVersion({
                        resource: {
                            "name": options.name,
                            "description": options.description,
                            "active": true,
                            "committed": false,
                            "project": {
                                "name": options.appName,
                                "description": options.appDesc,
                                "issueTemplateId": options.issueTemplateId
                            },
                            "issueTemplateId": options.issueTemplateId
                        }
                    }, getClientAuthTokenObj(restClient.token)).then((resp) => {
                        callback(null, resp.obj.data);
                    }).catch((err) => {
                        callback(err);
                    });
                },
                function assignAttributes(version, callback) {
                    restClient.api["attribute-of-project-version-controller"].updateCollectionAttributeOfProjectVersion({
                        parentId: version.id,
                        data: options.attributes
                    }, getClientAuthTokenObj(restClient.token)).then((resp) => {
                        callback(null, version, resp.obj.data);
                    }).catch((err) => {
                        callback(err);
                    });
                },
                function commit(version, attrs, callback) {
                    restClient.api["project-version-controller"].updateProjectVersion({
                        id: version.id,
                        resource: { "committed": true }
                    }, getClientAuthTokenObj(restClient.token)).then((resp) => {
                        callback(null, resp.obj.data);
                    }).catch((err) => {
                        callback(err);
                    });
                }
            ];
            //if copyCurrentState is passed then add a funnction to copy state
            //this will activate a background process on the server to copy over issues.
            if (options.copyCurrentState === true) {
                waterfallFunctionArray.push(function (version, callback) {
                    restClient.api["project-version-controller"].doActionProjectVersion({
                        "id": version.id, resourceAction: {
                            "type": "COPY_CURRENT_STATE",
                            values: { projectVersionId: version.id, previousProjectVersionId: config.sampleVersionId, copyCurrentStateFpr: true }
                        }
                    }, getClientAuthTokenObj(restClient.token)).then((resp) => {
                        if (resp.obj.data.message.indexOf("failed") !== -1) {
                            //legacy
                            callback(new Error(resp.obj.data.message))
                        } else {
                            callback(null, version);
                        }
                    }).catch((error) => {
                        callback(error);
                    });;
                });
            }
            //Fire the functions one by one
            async.waterfall(waterfallFunctionArray, function allDone(err, version) {
                if (err) {
                    return reject(err);
                }
                console.log("version " + options.name + " created successfully!");
                resolve(version);
            });
        });
    }


    /**
     * create attribute definition
     * @param {*} definition - attribute definition json payload (see config.js)
     */
    createAttributeDefinition(definition) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            if (!restClient.api) {
                return reject("restClient not initialized! make sure to call initialize before using API");
            }
            restClient.api["attribute-definition-controller"].createAttributeDefinition({
                resource: definition
            }, getClientAuthTokenObj(restClient.token)).then((resp) => {
                console.log("attribute " + resp.obj.data.id + " created successfully!");
                resolve(resp.obj.data); //return attribute definition object
            }).catch((err) => {
                reject(err);
            });
        });
    }

    /**
     * creates new custom tag
     * @param {*} customTag - json payload (see config.js)
     */
    createCustomTag(customTag) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            if (!restClient.api) {
                return reject("restClient not initialized! make sure to call initialize before using API");
            }
            restClient.api["custom-tag-controller"].createCustomTag({
                data: customTag
            }, getClientAuthTokenObj(restClient.token)).then((resp) => {
                console.log("custom tag " + resp.id + " created successfully!");
                resolve(resp.obj.data);
            }).catch((err) => {
                reject(err);
            });
        });
    }

    /**
     * Assign an attribute to a version with value
     * @param {*} versionId
     * @param {*} attributes
     */
    assignAttribute(versionId, attributes) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            if (!restClient.api) {
                return reject("restClient not initialized! make sure to call initialize before using API");
            }
            restClient.api["attribute-of-project-version-controller"].updateCollectionAttributeOfProjectVersion({
                parentId: versionId,
                data: attributes
            }, getClientAuthTokenObj(restClient.token)).then((resp) => {
                console.log("versionid " + versionId + " updated successfully!");
                resolve(versionId);
            }).catch((err) => {
                reject(err);
            });
        });
    }

    /**
     * Generates a DISA STIG report
     * @param {*} name - report name to be saved under
     * @param {*} notes - notes to add to report
     * @param {*} stigDefName - name of the definition file saved in SSC (used to query for id)
     * @param {*} format - PDF / XLS / CSV
     * @param {*} projectId - project id (a.k.a Application Id)
     * @param {*} versionId - version Id
     */
    generateDISASTIGReport(name, notes, stigDefName, format, projectId, versionId) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            if (!restClient.api) {
                return reject("restClient not initialized! make sure to call initialize before using API");
            }
            async.waterfall([
                /**
                 * query the server for the definition id based on the name of the report definition uploaded to SSC (default is usaully "DISA STIG")
                 */
                function getDefinition(callback) {
                    restClient.api["report-definition-controller"].listReportDefinition({ q: "name:" + stigDefName },
                        getClientAuthTokenObj(restClient.token)).then((result) => {
                            if (result.obj.data && Array.isArray(result.obj.data) && result.obj.data.length === 1) {
                                callback(null, result.obj.data[0]);
                            } else {
                                callback(new Error("Could not find " + stigDefName + " report definition on the server, look in the report definition in the admin section"));
                            }
                        }).catch((err) => {
                            callback(err);
                        });
                },
                /**
                 * generate the report by composing the resource object that includes values for all parameters defined in the
                 * definition file retrieved in the previous call
                 */
                function generateReport(definition, callback) {

                    const requestData = {
                        "name": name, "note": notes, "type": "ISSUE", "reportDefinitionId": definition.id, "format": format,
                        "project": { "id": projectId, "version": { "id": 3 } }, "inputReportParameters": []
                    };
                    //go through report definition parameters and fill in some data
                    requestData.inputReportParameters = definition.parameters.map((paramDefinition) => {
                        const param = {
                            name: paramDefinition.name,
                            identifier: paramDefinition.identifier,
                            type: paramDefinition.type
                        };
                        switch (paramDefinition.type) {
                            case "SINGLE_SELECT_DEFAULT":
                                //find the report param option that has order 0 (most recent)
                                param.paramValue = paramDefinition.reportParameterOptions.find(option => option.order === 0).reportValue;
                                break;
                            case "SINGLE_PROJECT":
                                param.paramValue = versionId
                                break;
                            case "BOOLEAN":
                                //send false for all values for the sake of example and speed of processing.
                                //this could be turned into another switch case based on parameter identifier
                                //such as SecurityIssueDetails or IncludeSectionDescriptionOfKeyTerminology
                                param.paramValue = false;
                                break;
                        }
                        return param;
                    });
                    restClient.api["saved-report-controller"].createSavedReport({
                        resource: requestData
                    }, getClientAuthTokenObj(restClient.token)).then((resp) => {
                        callback(null, resp.obj.data);
                    }).catch((error) => {
                        callback(error);
                    });;
                }
            ], function allDone(err, savedReport) {
                if (err) {
                    reject(err);
                } else {
                    resolve(savedReport);
                }
            });

        });
    }
    /**
     * gets the saved report entity that includes status for gived saved report id
     * @param {*} id
     */
    getSavedReportEntity(id) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            if (!restClient.api) {
                return reject("restClient not initialized! make sure to call initialize before using API");
            }
            restClient.api["saved-report-controller"].readSavedReport({ id: id }, getClientAuthTokenObj(restClient.token)).then((resp) => {
                resolve(resp.obj.data);
            }).catch((error) => {
                reject(error);
            });;
        });
    }
    /**
     * get job entity with status
     * @param {*} name - job name
     */
    getJob(name) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            if (!restClient.api) {
                return reject("restClient not initialized! make sure to call initialize before using API");
            }
            restClient.api["job-controller"].readJob({ jobName: name }, getClientAuthTokenObj(restClient.token)).then((resp) => {
                resolve(resp.obj.data);
            }).catch((error) => {
                reject(error);
            });;
        });
    }
    /**
     * download a report file from SSC
     * @param {*} reportId
     * @param {*} filename //filename to save it under. will get saved to [project root]/[config.downloadFolder]
     */
    downloadReport(reportId, filename) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            async.waterfall([
                /**
                 * get the single upload token
                 */
                function getFileToken(callback) {
                    restClient.generateToken("ReportFileTransferToken").then((token) => {
                        callback(null, token);
                    }).catch((error) => {
                        callback(error);
                    });
                },
                /**
                 * use a simple file download pipe from response to save to downloads folder
                 */
                function downloadReport(token, callback) {
                    //download the file - for more info on this in SSC navigate to [SSC URL]/<app context>/html/docs/docs.html#/fileupdownload
                    const url = config.sscReportDownloadURL + "?mat=" + token + "&id=" + reportId;
                    try {
                        let destFolder = __dirname + "/.." + config.downloadFolder;
                        createDirectoryIfNoExist(destFolder);
                        downloadFile(url, destFolder, filename, (err) => {
                            if (err) {
                                callback(e);
                            } else callback(null, destFolder + "/" + filename);
                        });
                    } catch (e) {
                        callback(e);
                    }

                }
            ], function onDoneDownload(err, dest) {
                if (err) {
                    return reject(err);
                }
                resolve(dest);
            });

        });
    }
    /**
     * generates an authentication token
     *
     * @param {*} type - type of token
     * possible values: AnalysisDownloadToken, AnalysisUploadToken, AuditToken, UploadFileTransferToken, DownloadFileTransferToken, ReportFileTransferToken, CloudCtrlToken,
     * CloudOneTimeJobToken, WIESystemToken, WIEUserToken, UnifiedLoginToken, ReportToken, PurgeProjectVersionToken
     * NOTE: these can be modiefied and there could be custom tokens created by customers inside SSC.
     * To see the complete list look in the serviceContex.xml file in the SSC web app deployment.
     */
    generateToken(type) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            restClient.basicApi["auth-token-controller"].createAuthToken({ authToken: { "terminalDate": getExpirationDateString(), "type": type } })
            .then((data) => {
                //got it so pass along
                resolve(data.obj.data.token)
            }).catch((error) => {
                reject(error);
            });
        });

    }
    /*
    * clears all tokens belonging to test user
    * **Do not use this method if you are using a long-lived token for your authentication!**
    * (In the 17.20 release, clearing an individual token by value is not supported by the "auth-token-controller" endpoint.
    * To delete individual tokens, the 'fortifyclient' tool can be used.)
    */
    clearTokensOfUser() {
        const restClient = this;
        return new Promise((resolve, reject) => {
            const auth = 'Basic ' + Buffer.from(config.user + ':' + config.password).toString('base64');

            if (!restClient.api) { // api was never initialized (eg. problem connecting to server)
                return reject(new Error("restClient not initialized! make sure to call initialize before using API"));
            }
            restClient.basicApi["auth-token-controller"].multiDeleteAuthToken({ all: true })
            .then((data) => {
                //got it so pass along
                resolve(data.obj.data); // will be 'true' but we don't really care about return value.
            }).catch((error) => {
                reject(error);
            });
        });
    }
    /**
     * uploads a single FPR to a version based on ID
     * @param {*} versionId (version id to upload to)
     * @param {*} fprPath (relative path of fpr from root of app, i.e root of repo)
     * returns - resolves and returns the JOB_ARTIFACTUPLOAD id for the uploaded FPR.
     */
    uploadFPR(versionId, fprPath) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            async.waterfall([
                /**
                 * get the single upload token
                 */
                function getFileToken(callback) {
                    restClient.generateToken("UploadFileTransferToken").then((token) => {
                        callback(null, token);
                    }).catch((error) => {
                        callback(error);
                    });
                },
                function uploadFile(token, callback) {
                    //upload the file - for more info on this in SSC navigate to [SSC URL]/<app context>/html/docs/docs.html#/fileupdownload
                    const url = config.sscFprUploadURL + "?mat=" + token + "&entityId=" + versionId;
                    try {
                        const formData = {
                            files: [
                                fs.createReadStream(__dirname + "/../" + fprPath),
                            ]
                        };
                        request.post({ url: url, formData: formData }, function optionalCallback(err, httpResponse, body) {
                            if (err) {
                                callback(err);
                            } else {
                                if (body && body.toLowerCase().indexOf(':code>-10001') !== -1) {
                                    callback(null, body);
                                } else {
                                    callback(new Error("error uploading FPR: " + body))
                                }

                            }
                        });
                    } catch (e) {
                        callback(e);
                    }

                }
            ], function onDoneUpload(err, xml) {
                if (err) {
                    return reject(err);
                }
                //get job id from fpr upload response
                const matched = xml.match(/.*:id>JOB_ARTIFACTUPLOAD([^<]+)/);
                let jobid = '';
                if (matched.length > 1) {
                    jobid = `JOB_ARTIFACTUPLOAD${matched[1]}`;
                }
                if (jobid === '') {
                    return reject(new Error("Response ok but no JOB_ARTIFACTUPLOAD id"));
                }
                resolve(jobid);
            });

        });
    }
    /**
     * downloads a single FPR from a version based on ID
     * @param {*} artifactId (version id to upload to)
     * returns - resolves and returns the JOB_ARTIFACTUPLOAD id for the uploaded FPR.
     */
    downloadFPR(artifactId, filename) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            async.waterfall([
                /**
                 * get the single download token
                 */
                function getFileToken(callback) {
                    restClient.generateToken("DownloadFileTransferToken").then((token) => {
                        callback(null, token);
                    }).catch((error) => {
                        callback(error);
                    });
                },
                /**
                 * use a simple file download pipe from response to save to downloads folder
                 */
                function downloadFPR(token, callback) {
                    const url = config.sscFprDownloadURL + "?mat=" + token + "&id=" + artifactId;
                    try {
                        let destFolder = __dirname + "/.." + config.downloadFolder;
                        createDirectoryIfNoExist(destFolder);
                        downloadFile(url, destFolder, filename, (err) => {
                            if (err) {
                                callback(err);
                            } else callback(null, destFolder + "/" + filename);
                        });
                    } catch (e) {
                        callback(e);
                    }

                }
            ], function onDoneDownload(err, dest) {
                if (err) {
                    return reject(err);
                }
                resolve(dest);
            });
        });
    }


    /**
    * Creates a new local user
    * @param {*} username - user name
    * @param {*} firstName - first name
    * @param {*} lastName - last name
    */
    createLocalUser(localUser) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            if (!restClient.api) {
                return reject("restClient not initialized! make sure to call initialize before using API");
            }
            restClient.api["local-user-controller"].createLocalUser({
                user: localUser
            }, getClientAuthTokenObj(restClient.token)).then((resp) => {
                resolve(resp.obj.data);
            }).catch((error) => {
                reject(error);
            });
        });
    }
    /**
    * Assigns a user to project version
    */
    assignUserToVersions(userId, requestData) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            if (!restClient.api) {
                return reject("restClient not initialized! make sure to call initialize before using API");
            }
            restClient.api["project-version-of-auth-entity-controller"].assignProjectVersionOfAuthEntity({
                parentId: userId,
                resource: requestData
            }, getClientAuthTokenObj(restClient.token)).then((resp) => {
                resolve(resp.obj.data);
            }).catch((error) => {
                reject(error);
            });
        });
    }
    /*
    *  Retrieve list of auth entities assigned to a given application version.
    * [
    *    {id:.., isLdap:true/false, type:..., entityName:..., displayName, firstName:..., lastName:..., email:...},
    *    ...
    * ]
    */
    getAuthEntitiesOfAppVersion(pvId) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            if (!restClient.api) {
                return reject(INIT_MESSAGE);
            }
            restClient.api["auth-entity-of-project-version-controller"].listAuthEntityOfProjectVersion({ parentId: pvId }, getClientAuthTokenObj(restClient.token))
                .then((resp) => {
                    resolve(resp.obj.data);
                }).catch((error) => {
                    reject(error);
                })
        })
    }

    /*
    *  Assigns one or more authentities (users or ldapentities) to a given application version
    */
    assignAppVersionToAuthEntities(pvId, arrayOfAuthEntities) {
        const restClient = this;
        return new Promise((resolve, reject) => {
            if (!restClient.api) {
                return reject(INIT_MESSAGE);
            }
            restClient.api["auth-entity-of-project-version-controller"].updateCollectionAuthEntityOfProjectVersion({
                parentId: pvId,
                data: arrayOfAuthEntities
            }, getClientAuthTokenObj(restClient.token)
            ).then((resp) => {
                resolve(resp.obj.data);
            }).catch((error) => {
                reject(error);
            })
        })
    }

    /**
     *  Get a list of issues
     * @param {*} versionId
     * @param {*} start = where to start if paginating
     * @param {*} filterby - optional filterby statement.
     * @param {*} limit - offset for pagination or limit issues
     */
    getIssues(versionId, start, filterby, limit = 20) {
        const controller = this.api["issue-of-project-version-controller"];
        let config = {
            'parentId': versionId,
            'limit': limit
        };
        if (filterby) {
            config.filter = filterby;
        }

        return controller.listIssueOfProjectVersion(config, getClientAuthTokenObj(this.token))
    }
    /**
     * gets all issues of a version in batches of 'limit' and call batch call back for each param
     * when all done promise will resolve with total count.
     * @param {*} versionId
     * @param {*} limit
     * @param {*} batchCB
     */
    getAllIssueOfVersion(versionId, limit, batchCB) {
        const controller = this.api["issue-of-project-version-controller"];
        let allIssues = 0;
        let getIssues = (start) => {
            return controller.listIssueOfProjectVersion({ 'parentId': versionId, 'limit': limit, 'start': start }, getClientAuthTokenObj(this.token)).then((response) => {
                allIssues += response.obj.data.length;
                batchCB(response.obj.data);
                if (response.obj.count > allIssues) {
                    return getIssues(allIssues);
                } else {
                    return allIssues;
                }
            });
        }
        return getIssues(0);
    }

    /**
     * gets all custom tags for a project version
     * @param {*} versionId
     */
    getAllCustomTagsOfVersion(versionId) {
        const controller = this.api["custom-tag-of-project-version-controller"];
        return controller.listCustomTagOfProjectVersion({ 'parentId': versionId }, getClientAuthTokenObj(this.token)).then((response) => {
            return response.obj.data;
        });
    }

    /**
     * gets a custom tag from an ID
     * @param {*} customTagId
     */
    getCustomTag(customTagId) {
        const controller = this.api["custom-tag-controller"];
        return controller.readCustomTag({ 'id': customTagId }, getClientAuthTokenObj(this.token)).then((response) => {
            return response;
        });
    }

    /**
     * update custom tags list of a project version
     * @param {*} versionId
     * @param {*} customTagList
     */
    updateCustomTagsOfVersion(versionId, customTagList) {
      const controller = this.api["custom-tag-of-project-version-controller"];
      return controller.updateCollectionCustomTagOfProjectVersion({ 'parentId': versionId, 'data': customTagList}, getClientAuthTokenObj(this.token)).then((response) => {
          return response;
      });
    }
}
