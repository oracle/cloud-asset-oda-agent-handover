/*
** Copyright © 2019, Oracle and/or its affiliates. All rights reserved.
** Licensed under the Universal Permissive License v 1.0 as shown at http://oss.oracle.com/licenses/upl
*/

// Digital Assistance Webhook channel details
module.exports.DA_WEBHOOK_URL = "ODA_WEBHOOK_URL";
module.exports.DA_WEBHOOK_SECRET = "ODA_WEBHOOK_SECRET";

/**
 * Webhook HTTP port.
 * If you are running on ACCS, port value is set automatically using environment variable process.env.PORT
 * If you are running locally, default HTTP port is set to 4444.
 */
module.exports.PORT = process.env.PORT || 4444;

/**
 * Name of the agent implementation file without the extension.
 * This file exists under oda_agent_handover/src/agentImpl folder
 */
module.exports.AGENT_IMPL_FILE = "mockAgent"; 