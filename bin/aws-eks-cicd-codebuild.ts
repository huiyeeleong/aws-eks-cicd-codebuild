#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsEksCicdCodebuildStack } from '../lib/aws-eks-cicd-codebuild-stack';

const app = new cdk.App();

//deploy default region where it define
const env = {
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  account: process.env.CDK_DEFAULT_ACCOUNT,
};

new AwsEksCicdCodebuildStack(app, 'AwsEksCicdCodebuildStack', {
});