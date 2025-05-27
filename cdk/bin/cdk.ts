#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EcrStack } from '../lib/ecr';
import { BackendHelloStack } from '../lib/backend-hello';
import { FrontendStack } from '../lib/frontend';

const app = new cdk.App();

const owner = process.env.OWNER;
if (!owner) {
  throw new Error('環境変数 OWNER が設定されていません');
}

// ECR リポジトリスタック: 既存リポジトリ参照用
const ecrStack = new EcrStack(app, 'EcrStack', { owner });

// Backend Hello Fargate スタック
const backendStack = new BackendHelloStack(app, 'BackendHelloStack', {
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION,
  },
  repositoryUri: ecrStack.backendRepositoryUri,
});

const frontendProps = {
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION,
  },
  repositoryUri: ecrStack.frontendRepositoryUri,
  cluster: backendStack.cluster,
  cloudMapNamespace: backendStack.cloudMapNamespace,
  backendServiceName: backendStack.backendServiceName,
} as const;

new FrontendStack(app, 'FrontendStack', frontendProps);
