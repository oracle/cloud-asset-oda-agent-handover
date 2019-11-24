/*
** Copyright © 2019, Oracle and/or its affiliates. All rights reserved.
** Licensed under the Universal Permissive License v 1.0 as shown at http://oss.oracle.com/licenses/upl
*/

// EC Base URL, for example https://myEcInstance.mydomain.com
module.exports.EC_URI = "https://myEcInstance.mydomain.com";

// FA user Credentials (service user) that has access to "EC chat consumer APIs"
module.exports.CREDENTIALS_FA_SERVICE_USER = "USER_NAME";
module.exports.CREDENTIALS_FA_SERVICE_USER_PASSWORD = "PASSWORD";

// Default Authenticate Chat properties, for details check section (3. Authenticate explained here https://docs.oracle.com/en/cloud/saas/engagement/19b/facoe/c_chat_quick_start.html)
// Note: You can only (optionally) change the below values.
module.exports.CHAT_AUTHENTICATE_INTERFACE_ID = 1;
module.exports.CHAT_AUTHENTICATE_QUEUE_ID = 1;
module.exports.CHAT_AUTHENTICATE_PRODUCT_ID = null;
module.exports.CHAT_AUTHENTICATE_INCIDENT_ID = null;
module.exports.CHAT_AUTHENTICATE_INCIDENT_TYPE = null;
module.exports.CHAT_AUTHENTICATE_RESUME_TYPE = "RESUME";
module.exports.CHAT_AUTHENTICATE_MEDIA_LIST = "CHAT";

// Default Polling time (in milliseconds) to get new messages from Engagement Cloud. Default value is 3 seconds
//                       convert to milliseconds * seconds
module.exports.CHAT_LISTENER_POL_INTERVAL = 1000 * 3;