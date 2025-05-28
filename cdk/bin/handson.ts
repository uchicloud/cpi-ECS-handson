#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();

const owner = process.env.OWNER;
if (!owner) {
  throw new Error('環境変数 OWNER が設定されていません');
}

const environment = process.env.ENVIRONMENT || 'dev';
