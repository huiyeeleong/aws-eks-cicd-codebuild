import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';
import {
  Stack, App, CfnOutput,
  aws_codebuild as codebuild,
  aws_codecommit as codecommit,
  aws_ec2 as ec2,
  aws_ecr as ecr,
  aws_eks as eks,
  aws_events_targets as targets,
  aws_iam as iam,
} from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-ecs';
import { DefaultCapacityType } from 'aws-cdk-lib/aws-eks';

export class AwsEksCicdCodebuildStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    function getOrCreateVpc(scope: Construct): ec2.IVpc {
      // use an existing vpc or create a new one
      return scope.node.tryGetContext('use_default_vpc') === '1'
        || process.env.CDK_USE_DEFAULT_VPC === '1' ? ec2.Vpc.fromLookup(scope, 'Vpc', { isDefault: true }) :
        scope.node.tryGetContext('use_vpc_id') ?
          ec2.Vpc.fromLookup(scope, 'Vpc', { vpcId: scope.node.tryGetContext('use_vpc_id') }) :
          new ec2.Vpc(scope, 'Vpc', { maxAzs: 3, natGateways: 1 });
    }
    
    const vpc = getOrCreateVpc(this);
    const cluster = new eks.Cluster(this, 'Cluster',{
      vpc,
      version: eks.KubernetesVersion.V1_23,
      defaultCapacity:2,
    });

    //fetch current stack name
    const stackName = Stack.of(this).stackName;

    const ecrRepo = new ecr.Repository(this , 'EcrRepo');

    const repository = new codecommit.Repository(this, 'CodeCommitRepo', {
      repositoryName: `${stackName}-repo`,
    });

    const project = new codebuild.Project(this, 'MyProject',{
      projectName: `${stackName}`,
      source: codebuild.Source.codeCommit({ repository }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.fromAsset(this, 'CustomImage', {
          directory: path.join(__dirname, '../dockerAssets.d'),
        }),
        privileged: true,
      },
      environmentVariables: {
        CLUSTER_NAME: {
          value: `${cluster.clusterName}`,
        },
        ECR_REPO_URI:{
          value: `${ecrRepo.repositoryUri}`,
        },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build:{
            commands: [
              'env',
              'export TAG=${CODEBUILD_RESOLVED_SOURCE_VERSION}',
            ]
          }
        }
      })

    })


  }
}
