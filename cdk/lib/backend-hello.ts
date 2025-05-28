import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';

export interface BackendHelloStackProps extends cdk.StackProps {
  repositoryUri: string;
}

export class BackendHelloStack extends cdk.Stack {
  public readonly serviceLoadBalancerDns: string;
  public readonly cluster: ecs.ICluster;
  public readonly cloudMapNamespace: servicediscovery.INamespace;
  public readonly backendServiceName: string;

  constructor(scope: Construct, id: string, props: BackendHelloStackProps) {
    super(scope, id, props);

      // 共有VPCから値をインポート
    const vpc = ec2.Vpc.fromLookup(this, 'SharedVpc', {
      tags: {
        Name: 'HandsOn-VPC',
        Project: 'ECS-HandsOn',
      },
    });
    // ECS クラスターを作成
    const cluster = new ecs.Cluster(this, 'BackendCluster', { vpc });
    this.cluster = cluster;

    // CloudMap namespace を作成
    const namespace = cluster.addDefaultCloudMapNamespace({ name: 'svc.local' });
    this.cloudMapNamespace = namespace;

    // タスク実行ロールに ECR プル権限を付与
    const execRole = new iam.Role(this, 'BackendExecRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
      ],
    });

    // Fargate サービスを作成し、ALB と CloudMap を設定
    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'BackendHelloService', {
      cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      cloudMapOptions: {
        name: 'backend-hello',
        dnsRecordType: servicediscovery.DnsRecordType.A,
        dnsTtl: cdk.Duration.seconds(30),
        cloudMapNamespace: namespace,
      },
      taskImageOptions: {
        executionRole: execRole,
        image: ecs.ContainerImage.fromRegistry(props.repositoryUri),
        containerPort: 3000,
      },
      publicLoadBalancer: true,
    });
    fargateService.service.connections.allowFrom(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(3000),
      'Allow traffic from VPC to backend service',
    );

    this.backendServiceName = 'backend-hello';

    // ヘルスチェックを /health に設定
    fargateService.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
    });

    // ALB の DNS 名をエクスポート
    this.serviceLoadBalancerDns = fargateService.loadBalancer.loadBalancerDnsName;
  }
}
