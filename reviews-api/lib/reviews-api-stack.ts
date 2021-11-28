import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CognitoToApiGatewayToLambda } from '@aws-solutions-constructs/aws-cognito-apigateway-lambda';
import { LambdaToSqs } from '@aws-solutions-constructs/aws-lambda-sqs';
import { SqsToLambda } from '@aws-solutions-constructs/aws-sqs-lambda';
import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import { aws_apigateway as apigw } from 'aws-cdk-lib';
import { aws_cloudwatch as cw } from 'aws-cdk-lib';
import * as path from 'path';
import { Duration } from 'aws-cdk-lib';

export class ReviewsApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // CognitoToApiGatewayToLambda Solutions Construct
    const apiConstruct = new CognitoToApiGatewayToLambda(this, 'myAPI', {
      cognitoUserPoolClientProps: {
        authFlows: {
          custom: true,
          refreshToken: true,
          userPassword: true,
          userSrp: true,
        },
      },
      lambdaFunctionProps: {
        code: lambda.Code.fromAsset(path.join(__dirname, 'lambda/lambdatosqs')),
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'index.handler',
      },
      apiGatewayProps: {
        proxy: false,
        defaultMethodOptions: {
          authorizationType: apigw.AuthorizationType.COGNITO,
        },
      },
    });
    const reviewsResources =
      apiConstruct.apiGateway.root.addResource('reviews');
    reviewsResources.addMethod('POST');
    apiConstruct.addAuthorizers();

    // LambdaToSqs Solutions Construct
    const lambdaToSQSConstruct = new LambdaToSqs(this, 'async-queue', {
      existingLambdaObj: apiConstruct.lambdaFunction,
    });

    // SqsToLambda Solutions Construct
    const SQSToLambdaConstruct = new SqsToLambda(this, 'sqs-to-lambda', {
      existingQueueObj: lambdaToSQSConstruct.sqsQueue,
      lambdaFunctionProps: {
        code: lambda.Code.fromAsset(path.join(__dirname, 'lambda/sqstoddb')),
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'index.handler',
      },
    });

    // LambdaToDynamoDB Solutions Construct
    const lambdaToDynamoDBConstruct = new LambdaToDynamoDB(
      this,
      'lambda-to-dynamo',
      {
        existingLambdaObj: SQSToLambdaConstruct.lambdaFunction,
      }
    );

    // CloudWatch Dashboard

    const dashboard = new cw.Dashboard(this, 'myDashboard');

    const APIGatewayRequestsMetric = new cw.Metric({
      metricName: 'Count',
      namespace: 'AWS/ApiGateway',
      dimensionsMap: { ApiName: apiConstruct.apiGateway.restApiName },
      statistic: 'Sum',
      label: 'Total API Requests',
      period: Duration.minutes(1),
    });
    const lambdaDurationMetric = new cw.Metric({
      metricName: 'Duration',
      namespace: 'AWS/Lambda',
      dimensionsMap: {
        FunctionName: SQSToLambdaConstruct.lambdaFunction.functionName,
      },
      statistic: 'p99',
      label: 'SQS to Lambda P99',
      period: Duration.minutes(1),
    });
    const ApiGatewayLatencyMetric = new cw.Metric({
      metricName: 'Latency',
      namespace: 'AWS/ApiGateway',
      dimensionsMap: { ApiName: apiConstruct.apiGateway.restApiName },
      statistic: 'p99',
      label: 'API Latency P99',
      period: Duration.minutes(1),
    });
    const lambdaDurationAlarm = lambdaDurationMetric.createAlarm(
      this,
      'lambda-duration-alarm',
      {
        threshold: 500,
        evaluationPeriods: 1,
        alarmDescription: 'Alarm if P99 is over 500 ms',
      }
    );
    const APIGatewayAlarm = ApiGatewayLatencyMetric.createAlarm(
      this,
      'api-gateway-alarm',
      {
        threshold: 1000,
        evaluationPeriods: 1,
        alarmDescription: 'Alarm if P99 is over 1000 ms',
      }
    );
    const lambdaDurationWidget = new cw.GraphWidget({
      width: 12,
      title: 'Lambda Duration',
      left: [lambdaDurationMetric],
      leftAnnotations: [lambdaDurationAlarm.toAnnotation()],
    });
    const APILatencyWidget = new cw.GraphWidget({
      width: 12,
      title: 'API Latency',
      left: [ApiGatewayLatencyMetric],
      leftAnnotations: [APIGatewayAlarm.toAnnotation()],
    });
    const APICountWidget = new cw.GraphWidget({
      width: 24,
      title: 'API Requests',
      left: [APIGatewayRequestsMetric],
    });
    dashboard.addWidgets(APICountWidget);
    dashboard.addWidgets(lambdaDurationWidget, APILatencyWidget);
  }
}
