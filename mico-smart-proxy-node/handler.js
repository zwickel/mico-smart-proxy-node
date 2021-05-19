"use strict"
// {"id": "0123456789101112", "returntopic": "car"}
// {"id": "2111019876543210", "correlationid": "0123456789101112", "returntopic": "smart-proxy"}

const redis = require("async-redis");

module.exports = async (context, callback) => {
    const cloudEvent = JSON.parse(context);
    let result = [];
    const client = redis.createClient(6379, "redis.mico-system");

    if (cloudEvent.hasOwnProperty("correlationid") && cloudEvent.correlationid != null && await client.get(cloudEvent.correlationid) != null) {
        // Message comes back from service and is sent back to requestor.
        // Get stored data.
        const stored = JSON.parse(await client.get(cloudEvent.correlationid));
        // Remove entry from store.
        await client.del(cloudEvent.correlationid);
        // Set message headers so it is returned to initial requestor.
        cloudEvent.routingslip = [[stored.returnAddress]];
        cloudEvent.correlationid = stored.corId;
        cloudEvent.returntopic = null;
    } else {
        // Message comes from requestor and will be forwarded to service.
        // Store return address.
        const msgId = cloudEvent.id;
        const returnAddress = cloudEvent.returntopic;
        await client.set(msgId, JSON.stringify({ corId: msgId, returnAddress: returnAddress }));

        // Prepare message to send to service.
        cloudEvent.routingslip = [['service-in']];
        cloudEvent.returntopic = 'smart-proxy';
    }

    client.quit();
    result.push(cloudEvent);
    return result;
}
