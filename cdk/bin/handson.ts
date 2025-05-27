#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { EcrStack } from '../lib/ecr';
import { BackendHelloStack } from '../lib/backend-hello';
import { BackendChatStack } from '../lib/backend-chat';
import { FrontendStack } from '../lib/frontend';

const app = new cdk.App();

const owner = process.env.OWNER;
if (!owner) {
  throw new Error('環境変数 OWNER が設定されていません');
}

const environment = process.env.ENVIRONMENT || 'dev';

// ECR スタック
const ecrStack = new EcrStack(app, 'EcrStack', {
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION,
  },
  owner,
});

// Backend スタック
const backendStack = new BackendHelloStack(app, 'BackendStack', {
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION,
  },
  repositoryUri: ecrStack.backendRepositoryUri,
});

// Backend Chat スタック（新規追加）
const backendChatStack = new BackendChatStack(app, 'BackendChatStack', {
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION,
  },
  repositoryUri: ecrStack.backendChatRepositoryUri,
  cluster: backendStack.cluster,
  cloudMapNamespace: backendStack.cloudMapNamespace,
  environment,
});

// frontendコンテナの環境変数NEXT_PUBLIC_API_BASE_URLに
// backendChatServiceNameを設定してビルドする
const backendServiceName = backendStack.backendServiceName;
const backendChatServiceName = backendChatStack.backendChatServiceName;
const frontendImage = ecs.ContainerImage.fromAsset('../frontend', {
  buildArgs: {
    // ビルド時にbackend-chatサービス名を注入
    NEXT_PUBLIC_API_BASE_URL: `http://${backendChatServiceName}:3001`,
    NEXT_PUBLIC_BACKEND_SERVICE: backendServiceName,
    NEXT_PUBLIC_BACKEND_CHAT_SERVICE: backendChatServiceName,
  },
});

// Frontend スタック
const frontendStack = new FrontendStack(app, 'FrontendStack', {
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION,
  },
  image: frontendImage,
  repositoryUri: ecrStack.frontendRepositoryUri,
  cluster: backendStack.cluster,
  cloudMapNamespace: backendStack.cloudMapNamespace,
  backendServiceName: backendStack.backendServiceName,
});

// 出力: Backend と Frontend の ALB DNS 名
// new cdk.CfnOutput(app, 'BackendLoadBalancerDns', {
//   value: backendStack.serviceLoadBalancerDns,
//   description: 'Backend Hello Fargate Service Load Balancer DNS',
//   exportName: 'BackendLoadBalancerDns',
// });
// new cdk.CfnOutput(app, 'FrontendLoadBalancerDns', {
//   value: frontendStack.serviceLoadBalancerDns,
//   description: 'Frontend Fargate Service Load Balancer DNS',
//   exportName: 'FrontendLoadBalancerDns',
// });
