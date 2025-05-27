import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';

export interface FrontendStackProps extends cdk.StackProps {
  /** ECR にプッシュされたフロントエンドイメージの URI */
  repositoryUri: string;
  /** Backend と同一の ECS クラスター */
  cluster: ecs.ICluster;
  /** CloudMap ネームスペース */
  cloudMapNamespace: servicediscovery.INamespace;
  /** Backend サービス名 (CloudMap 登録時の name) */
  backendServiceName: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const { repositoryUri, cluster, cloudMapNamespace, backendServiceName } = props;

    // Frontend Fargate サービスを作成し、ALB と CloudMap を設定
    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'FrontendService', {
      cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      cloudMapOptions: {
        name: 'frontend',
        cloudMapNamespace, 
      },
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry(repositoryUri),
        containerPort: 3000,
        environment: {
          NEXT_PUBLIC_API_BASE_URL: `http://${backendServiceName}.${cloudMapNamespace.namespaceName}:3000`,
        },
      },
      publicLoadBalancer: true,
    });

    // ヘルスチェック設定: /health をチェック
    service.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
    });
  }
}
