#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EcrStack } from '../lib/ecr';
import { BackendHelloStack } from '../lib/backend-hello';
import { FrontendStack } from '../lib/frontend';

const app = new cdk.App();

// ECR リポジトリスタック
const ecrStack = new EcrStack(app, 'EcrStack');

// Backend Hello Fargate スタック
const backendStack = new BackendHelloStack(app, 'BackendHelloStack', {
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION,
  },
  repositoryUri: ecrStack.backendRepositoryUri,
});

// Frontend Fargate スタック
new FrontendStack(app, 'FrontendStack', {
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION,
  },
  repositoryUri: ecrStack.frontendRepositoryUri,
  backendEndpoint: backendStack.serviceLoadBalancerDns,
});
