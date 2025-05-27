import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export interface EcrStackProps extends cdk.StackProps {
  /** リポジトリ名プレフィックス */
  owner: string;
}

export class EcrStack extends cdk.Stack {
  public readonly backendRepositoryUri: string;
  public readonly frontendRepositoryUri: string;
  public readonly backendChatRepositoryUri: string; // 追加

  constructor(scope: Construct, id: string, props: EcrStackProps) {
    super(scope, id, props);

    const owner = props.owner;

    // 既存の Backend Hello 用 ECR リポジトリを参照
    const backendRepo = ecr.Repository.fromRepositoryName(
      this,
      'BackendHelloRepo',
      `${owner}-backend-hello`
    );
    this.backendRepositoryUri = backendRepo.repositoryUri;

    // 既存の Frontend 用 ECR リポジトリを参照
    const frontendRepo = ecr.Repository.fromRepositoryName(
      this,
      'FrontendRepo',
      `${owner}-frontend`
    );
    this.frontendRepositoryUri = frontendRepo.repositoryUri;

    // Backend Chat 用 ECR リポジトリを参照
    const backendChatRepo = ecr.Repository.fromRepositoryName(
      this,
      'BackendChatRepo',
      `${owner}-backend-chat`
    );
    this.backendChatRepositoryUri = backendChatRepo.repositoryUri;
  }
}
