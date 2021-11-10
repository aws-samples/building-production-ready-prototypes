const AWS = require('aws-sdk');
const sqs = new AWS.SQS();

function validateMessage(message) {
    
    if (!message.productid || !message.title || !message.text || !message.rating) {
        return false
    }
    return true
}

async function writeQueueMessage(message) {
    var params = {
        // MessageBody: JSON.stringify(message),
        MessageBody: message,
        QueueUrl: process.env.SQS_QUEUE_URL,
    }

    await sqs.sendMessage(params).promise()
}

exports.handler = async (event) => {
    try {
        if (!validateMessage(JSON.parse(event.body))) {
            throw new Error("Invalid Review Data");
        }

        await writeQueueMessage(event.body);

        return {
            statusCode : 200,
            body : "Review Accepted"
        }
    } catch (e) {
        return {
            statusCode : 400,
            body : e.message
        };
    }
};
