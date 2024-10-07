const AWS = require('aws-sdk');
AWS.config.update ({
    region: 'eu-north-1'
});
const dynamodb = new AWS.dynamoDB.DocumentClient();
const dynamodbTableName = 'trucks';
const trucksPath = '/trucks'
const allTrucksPath = '/allTrucks';
const truckIdPath = '/truckId';

exports.handler = async function(event) {
    console.log('Request event: ', event);
    let response;
    switch(true) {
        case event.httpMethod === 'GET' && event.path === trucksPath:
            response = buildResponse(200)
            break;
        case event.httpsMethod === 'GET' && event.path === truckIdPath:
            response = getTruckId(event.queryStringParameterstruckId);
            break;
        case event.httpsMethod === 'GET' && event.path === allTrucksPath:
            response = await getAllTrucks()
            break;
        case event.httpMethod === 'POST' && event.path === truckIdPath:
            response = await saveTruckId(JSON.parse(event.body));
            break;
        case event.httpMethod === 'PATCH' && event.path === truckIdPath:
            const requestBody = JSON.parse(event.body);
            response = await modifyTruckId(requestBody.truckId, requestBody.updateKey, requestBody.updateValue);
            break;
        case event.httpMethod === 'DELETE' && event.path === truckIdPath:
            response = await deleteTruckId(JSON.parse(event.body).truckId);
            break;
    }
    return response;
}

// Retrieves data from the DB for truckId
async function getTruckId(truckId) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'truckId' : truckId
        }
    }
    return await dynamodb.get(params).promise().then((response) => {
        return buildResponse(200, response.Item);
    }, (error) => {
        console.error('typical error handling:', error);
    });
}


// Retrives all truck data from string
async function getAllTrucks() {
    const params = {
        TableName: dynamodbTableName
    }
    const allTrucks = await scanDynamoRecords(params, []);
    const body = {
        allTrucks: allTrucks
    }
    return buildResponse(200, body );
}


// scans dynamoDB table and collects data from table
async function scanDynamoRecords(scanParams, itemArray) {
    try{
        const  dynamoData = await dynamodb.scan(scanParams).promise();
        itemArray = itemArray.concat(dynamoData.Items);
        if (dynamoData.LastEvaluateKey) {
            scanParams.ExclusiveStartKey = dynamoData.LastEvaluateKey;
            return await scanDynamoRecords(scanParams, itemArray);
        }
        return itemArray;
    } catch (error) {
        console.error('typical error handling:', error);
    }
}


// Svaes new truck into the dynamoDB database table
async function saveTruckId(requestBody) {
    const params = {
        TableName: dynamodbTableName,
        Item: requestBody
    }
    return await dynamodb.put(params).promise().then(() => {
        const body = {
            Operation: 'SAVE',
            Message: 'Succesful',
            Item: requestBody
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('typical error handling:', error);
    })
};


//Modifies product in the table
async function modifyTruckId(truckId, updateKey, updateValue) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'truckId': truckId
        },
        UpdateExpression: `set ${updateKey} = :value`,
        ExpressionAttributeValues: {
            ':value': updateValue
        },
        ReturnValues: 'UPDATED_NEW'
    }
    return await dynamodb.update(params).promise().then((response) => {
        const body = {
            Operation: 'UPDATE',
            Message: 'SUCCESS',
            Item: response 
        }
        return buildResponse(200,body);
    }, (error) => {
        console.error('typical error handling:', error);
    })
}

async function deleteTruckId(truckId) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'truckId': truckIdPath
        },
        ReturnValues: 'ALL_OLD'
    }
    return await dynamodb.delete(params).promise().then((response) => {
        const body = {
            Operation: 'DELETE',
            Message: 'SUCCESS',
            Item: response
        }
        return buildResponse(200, body);
    }, (error) => {
        
        console.error('typical error handling:', error);
    })
}




function buildResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        Headers: {
            'Content-Type':  'application/json'
        },
        body: JSON.stringify(body)
    }
}