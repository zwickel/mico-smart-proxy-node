"use strict"
// {"id": 1, "time": 11111, "source": "someSource", "data": { "timestamp": 1111, "customerRating": 9, "customerName": "Chris", "serviceType": "standard"}}

const redis = require("async-redis");

module.exports = async (context, callback) => {
    const cloudEvent = JSON.parse(context);
    let result = [];
    const client = redis.createClient(6379, "redis.mico-system");

    if (cloudEvent.hasOwnProperty("correlationid") && cloudEvent.correlationid != null && await client.get(cloudEvent.correlationid) != null) {
        // Message comes back from service and is sent back to requestor.
        // Get stored data.
        const stored = await client.get(cloudEvent.correlationid);
        // Set message headers so it is returned to initial requestor.
        cloudEvent[["routingslip"]] = [[stored.returnAddress]];
        cloudEvent[["correlationid"]] == stored.corId;
        // Remove entry from store.
        await client.del(cloudEvent.correlationid);
    } else {
        // Message comes from requestor and will be forwarded to service.
        // Store return address.
        const msgId = cloudEvent.id;
        const returnAddress = cloudEvent.returntopic;
        await client.set(msgId, { "corId": msgId, "returnAddress": returnAddress });

        // Prepare message to send to service.
        cloudEvent[["routingslip"]] = [['service-in']];
        cloudEvent[["returntopic"]] = [['smart-proxy']];
    }

    client.quit();
    result.push(cloudEvent);
    return result;
}
