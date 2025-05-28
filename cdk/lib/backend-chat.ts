import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export interface BackendChatStackProps extends cdk.StackProps {
  repositoryUri: string;
  vpc: ec2.IVpc;
  cluster: ecs.ICluster;
  cloudMapNamespace: servicediscovery.INamespace;
  environment?: string;
}

export class BackendChatStack extends cdk.Stack {
  public readonly backendChatServiceName: string;

  constructor(scope: Construct, id: string, props: BackendChatStackProps) {
    super(scope, id, props);

    const { repositoryUri, vpc, cluster, cloudMapNamespace, environment = 'dev' } = props;

    // タスク実行ロールに ECR プル権限を付与
    const execRole = new iam.Role(this, 'BackendChatExecRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
      ],
    });

    // シークレット用のタスクロール
    const taskRole = new iam.Role(this, 'BackendChatTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // backend-chat用のシークレットを作成（DING_SECRET, DING_ENDPOINTを含む）
    const chatSecrets = new secretsmanager.Secret(this, 'BackendChatSecrets', {
      description: `Backend Chat service secrets for ${environment} environment`,
      secretName: `backend-chat-secrets-${environment}`,
      secretObjectValue: {
        DING_SECRET: cdk.SecretValue.unsafePlainText('placeholder-secret'), // デプロイ後に手動更新
        DING_ENDPOINT: cdk.SecretValue.unsafePlainText('https://ding.endpoint.placeholder'), // デプロイ後に手動更新
      },
    });

    // タスクロールにシークレット読み取り権限を付与
    chatSecrets.grantRead(taskRole);

    // Fargate サービスを作成し、ALB と CloudMap を設定
    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'BackendChatService', {
      cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      cloudMapOptions: {
        name: 'backend-chat',
        dnsRecordType: servicediscovery.DnsRecordType.A,
        dnsTtl: cdk.Duration.seconds(30),
        cloudMapNamespace,
      },
      taskImageOptions: {
        executionRole: execRole,
        taskRole: taskRole,
        image: ecs.ContainerImage.fromRegistry(repositoryUri),
        containerPort: 3001, // backend-chatのポート
        secrets: {
          // AWS Secrets Managerからシークレットを注入
          DING_SECRET: ecs.Secret.fromSecretsManager(chatSecrets, 'DING_SECRET'),
          DING_ENDPOINT: ecs.Secret.fromSecretsManager(chatSecrets, 'DING_ENDPOINT'),
        },
        environment: {
          NODE_ENV: 'production',
          PORT: '3001',
        },
      },
      publicLoadBalancer: false,
    });
    fargateService.service.connections.allowFrom(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(3001),
      'Allow traffic from VPC to backend service',
    );

    this.backendChatServiceName = 'backend-chat';

    // ヘルスチェック設定
    fargateService.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });
  }
}