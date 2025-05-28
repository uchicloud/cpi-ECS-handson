// import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class SharedVpcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 最小構成のVPCを作成
    const vpc = new ec2.Vpc(this, 'HandsOnVpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2, // 2つのアベイラビリティゾーン
      natGateways: 1, // ECSタスクがインターネットアクセスするため最小限の1個
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'PrivateSubnet',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }
      ]
    });

    cdk.Tags.of(vpc).add('Name', 'HandsOn-VPC');
    cdk.Tags.of(vpc).add('Project', 'ECS-HandsOn');

    // ハンズオン参加者が参照できるよう、重要な値をエクスポート
    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID for HandsOn',
      exportName: 'HandsOn-VpcId',
    });

    new cdk.CfnOutput(this, 'VpcCidr', {
      value: vpc.vpcCidrBlock,
      description: 'VPC CIDR Block',
      exportName: 'HandsOn-VpcCidr',
    });

    // パブリックサブネットID（ALB用）
    vpc.publicSubnets.forEach((subnet, index) => {
      new cdk.CfnOutput(this, `PublicSubnet${index + 1}Id`, {
        value: subnet.subnetId,
        description: `Public Subnet ${index + 1} ID for ALB`,
        exportName: `HandsOn-PublicSubnet${index + 1}Id`,
      });
    });

    // プライベートサブネットID（ECSタスク用）
    vpc.privateSubnets.forEach((subnet, index) => {
      new cdk.CfnOutput(this, `PrivateSubnet${index + 1}Id`, {
        value: subnet.subnetId,
        description: `Private Subnet ${index + 1} ID for ECS Tasks`,
        exportName: `HandsOn-PrivateSubnet${index + 1}Id`,
      });
    });

    // アベイラビリティゾーン情報
    new cdk.CfnOutput(this, 'AvailabilityZones', {
      value: vpc.availabilityZones.join(','),
      description: 'Available Availability Zones',
      exportName: 'HandsOn-AvailabilityZones',
    });

    // デフォルトセキュリティグループID
    new cdk.CfnOutput(this, 'DefaultSecurityGroupId', {
      value: vpc.vpcDefaultSecurityGroup,
      description: 'Default Security Group ID',
      exportName: 'HandsOn-DefaultSecurityGroupId',
    });
  }
}

const app = new cdk.App();
new SharedVpcStack(app, 'HandsOn-VpcStack', {
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION,
  },
  tags: {
    Project: 'ECS-HandsOn',
    Environment: 'Development',
    Purpose: 'Educational',
  }
});
