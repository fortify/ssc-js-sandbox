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
const config = {
    versionIdCSV: "aa-version-sample.csv", //filename with comma seperated application version ids
    batchSize: 2, //rest call parrallel batch size - how many version to call in parallel in one batch (batches executed sequentually)
    sampleFPR: '/fpr/Log1.3_splc-20.1.0.fpr',
    sampleAppId: 1,
    sampleVersionId: 1,//sample app version id
    sampleCustomTagId: -1,//sample custom tag id, or -1 to create a new custom tag before adding
    sampleSecondaryVersionId: 4,
    sampleArtifactId: 10, // sample fpr id
    downloadFolder: "/downloads", //relative to root project, wil be created if non existant
    sampleUserId: 4,
    sampleAuthEntities: [{"id": 12, "isLdap": false}, {"id": 9, "isLdap": false}, {"id": 6, "isLdap": false}],
    sampleAttributeDefinition: {"name": "", "description": "Created by SSC-js-sandbox", "category": "ORGANIZATION", "type": "TEXT", "appEntityType": "PROJECT_VERSION"},
    sampleCustomTag: {"name": "", "description": "Created by SSC-js-sandbox", "valueType": "TEXT", "customTagType": "CUSTOM"},
    sampleAttributeValue: [{"attributeDefinitionId":undefined,"values":null,"value":undefined}],
    auditAssistantConfigGroup: 'auditassistant',
    auditAssistantEnabledKey: 'auditassistant.enabled'
}
module.exports = {
    /**
     * loads the environment variables to configure (either in .env file in root or on OS)
     */
    loadEnv: () => {
        //sscAPIBase: "http[s]://[host]:[port]/[ssc context]/api/v1", //based url to API with version
        config.sscAPIBase = process.env.SSC_URL+"/api/v1"; //base url to API with version
        //sscFprUploadURL: "http[s]://[host]:[port]/[ssc context]/upload/resultFileUpload.html",
        config.sscFprUploadURL = process.env.SSC_URL+"/upload/resultFileUpload.html";
        //sscFprDownloadURL: "http[s]://[host]:[port]/[ssc context]/download/artifactDownload.html",
        config.sscFprDownloadURL = process.env.SSC_URL+"/download/artifactDownload.html";
        //sscReportDownloadURL: "http[s]://[host]:[port]/[ssc context]/transfer/reportDownload.html",
        config.sscReportDownloadURL = process.env.SSC_URL+"/transfer/reportDownload.html";
        config.user = process.env.SSC_USERNAME; //ssc username
        config.password =  process.env.SSC_PASSWORD; //ssc password
        config.skipAA = process.env.SKIP_AA_TESTS; // bypass Audit Assistant tests if not enabled
        return config;
    }
}
