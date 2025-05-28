import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import * as ec2 from 'aws-cdk-lib/aws-ec2'; // 追加

export interface FrontendStackProps extends cdk.StackProps {
  /** ECR にプッシュされたフロントエンドイメージの URI */
  repositoryUri: string;
  /** Backend と同一の ECS クラスター */
  cluster: ecs.ICluster;
  /** CloudMap ネームスペース */
  cloudMapNamespace: servicediscovery.INamespace;
  /** Backend サービス名 (CloudMap 登録時の name) */
  backendServiceName: string;
  backendChatServiceName?: string;
}

export class FrontendStack extends cdk.Stack {
  public readonly serviceLoadBalancerDns: string;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const { repositoryUri, cluster, cloudMapNamespace, backendServiceName, backendChatServiceName } = props; // vpc追加

    // タスク実行ロールに ECR プル権限を付与
    const execRole = new iam.Role(this, 'FrontendExecRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
      ],
    });
    // Frontend Fargate サービスを作成し、ALB と CloudMap を設定
    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'FrontendService', {
      cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      cloudMapOptions: {
        name: 'frontend',
        cloudMapNamespace, 
      },
      taskImageOptions: {
        executionRole: execRole,
        image: ecs.ContainerImage.fromRegistry(repositoryUri),
        containerPort: 3000,
        environment: {
          NEXT_PUBLIC_API_BASE_URL: `http://${backendServiceName}.${cloudMapNamespace.namespaceName}:3000`,
          DING_URL: backendChatServiceName &&`http://${backendChatServiceName}.${cloudMapNamespace.namespaceName}:3001` || '',
        },
      },
      publicLoadBalancer: true,
    });

    // ヘルスチェック設定: /health をチェック
    fargateService.targetGroup.configureHealthCheck({
      path: '/',
      healthyHttpCodes: '200',
    });

    // ALB の DNS 名をエクスポート
    this.serviceLoadBalancerDns = fargateService.loadBalancer.loadBalancerDnsName;
    
    new cdk.CfnOutput(this, 'FrontendServiceLoadBalancerDns', {
      value: this.serviceLoadBalancerDns,
      description: 'フロントエンドALBのDNS名',
      exportName: `${this.stackName}-FrontendServiceLoadBalancerDns`,
    });
  }
}
