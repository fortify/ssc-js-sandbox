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
 * An example "main" application script for invoking restClient .
 */
 "use strict";
import RestClient from './restClient';
const restClient = new RestClient();

if (process.env.DisableSSLSecurity) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

main()
  .then(data => console.log(data))
  .catch(err => console.error(err));

async function main() {
    await restClient.initialize().then((data) => {
        console.log("initialization status: " + data);
        return data;
    }).catch((err) => { 
        console.log("initialization failed", err);
        return err;
    });

    const rnd = Math.floor(Math.random() * 1000);
    const verName = "v " + rnd;
    const appName = "Bill Payment Processor";
    const existingVerId = 3;
  
    // check if application exists
    let pResponse = await restClient.testProject(appName).then((data) => {
        return data;
    }).catch((err) => { 
        console.log("failed to retrieve project", err);
        return err;
    });
    if (!pResponse.found) {
        console.log(`Application "${appName}" does not exist!`);
        return `Application "${appName}" does not exist!`;
    }

    // get application id
    let appId = await restClient.getProject(appName).then((data) => {
        return (data.length ? data[0].id : 0);
    }).catch((err) => { 
        console.log("failed to retrieve project", err);
        return err;
    });
    if (appId) {
        console.log(`Application Id of ${appName} is: ${appId}`);
    }   

    // check if project version to copy exists
    let pvResponse = await restClient.testProjectVersion(appName, verName).then((data) => {
        return data;
    }).catch((err) => { 
        console.log("failed to retrieve project version", err);
        return err;
    });
    if (pvResponse.found) {
        console.log(`Application version "${verName}" already exists!`);
        return `Application version "${verName}" already exists!`;
    }

    console.log("Copying existing version id: " + existingVerId)
    const verName2 = "v " + rnd+1;
    await restClient.copyVersion({
        name: verName,
        description: verName,
        appName: appName,
        appId: appId,
        appDesc: "Bill Payment Processor",
        issueTemplateId: "Prioritized-HighRisk-Project-Template",
        copyVersionId: existingVerId,
    }).then((version) => {
        console.log("Successfully created version:" + version.name);
        return "Successfully created version:" + version.name;
    }).catch((err) => {
        console.log("error creating version ", err);
        return err;
    });  

}    
 