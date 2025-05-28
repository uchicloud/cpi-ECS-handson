#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
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
const ecrStack = new EcrStack(app, `${owner}-EcrStack`, {
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION,
  },
  owner,
});

// Backend スタック
const backendStack = new BackendHelloStack(app, `${owner}-BackendHelloStack`, {
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION,
  },
  repositoryUri: ecrStack.backendRepositoryUri,
});

// Backend Chat スタック
const backendChatStack = new BackendChatStack(app, `${owner}-BackendChatStack`, {
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION,
  },
  repositoryUri: ecrStack.backendChatRepositoryUri,
  vpc: backendStack.cluster.vpc,
  cluster: backendStack.cluster,
  cloudMapNamespace: backendStack.cloudMapNamespace,
  environment,
});

// frontendコンテナの環境変数NEXT_PUBLIC_API_BASE_URLに
// backendChatServiceNameを設定してビルドする
const backendServiceName = backendStack.backendServiceName;
const backendChatServiceName = backendChatStack.backendChatServiceName;


const frontendStack = new FrontendStack(app, `${owner}-FrontendStack`, {
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION,
  },
  repositoryUri: ecrStack.frontendRepositoryUri,
  cluster: backendStack.cluster,
  cloudMapNamespace: backendStack.cloudMapNamespace,
  backendServiceName: backendServiceName,
  backendChatServiceName: backendChatServiceName,
});