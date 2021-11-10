const AWS = require('aws-sdk')
exports.handler = async (event) => {
console.log("MB SDK Version:", AWS.VERSION);
};

exports.handler = (event) => {

// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');

// Create the DynamoDB service object
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

    console.log("Full Request:", JSON.stringify(event, undefined, 2));
    event.Records.forEach(record => {
    
    var fullrecord = record;
    console.log("body: ", fullrecord.body);
    var bodyobj = JSON.parse(fullrecord.body);
    console.log("title: ", bodyobj.title);
    console.log("Table name:", process.env.DDB_TABLE_NAME);
    console.log("SDK Version: ", AWS.VERSION);

    var params = {
              TableName: process.env.DDB_TABLE_NAME,
              Item: { 
                id: { S: bodyobj.productid } ,
                title: { S: bodyobj.title } ,
                text: { S: bodyobj.text },
                rating: { S: bodyobj.rating.toString() }
              }
    };
    
     // Call DynamoDB to add the item to the table
    ddb.putItem(params, function(err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        console.log("Success", data);
      }
    });

    });
  return {};
};
