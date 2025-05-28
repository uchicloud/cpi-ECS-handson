# リポジトリについて

この資料は 2025/5/30 に株式会社協栄情報で行われる有志勉強会のために作成しました。  
この勉強会ではマイクロサービスアーキテクチャを学び、複数コンテナの連携によるサービス提供をハンズオン形式で体験します。

# ディレクトリ構成

- **backend-hello**: TypeScript + Express ベースのサンプルサーバー  
- **frontend**: フロントエンドアプリケーション (作成予定)  
- **backend-chat**: API サービス (作成予定)

## 前提条件
このドキュメントに記載したコマンドは**bash**または**powershell**での動作を想定しています。  
コンテナを起動するためWindowsユーザーはWSLの設定を完了させてください。  

### インストール
- node

  *Linux*
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  source ~/.bashrc
  nvm install --lts
  nvm use --lts
  ```

  *Windows*
  ```pwsh
  winget install --id OpenJS.NodeJS
  ```

- aws cli

  *Linux*
  ```bash
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
  unzip awscliv2.zip
  sudo ./aws/install --bin-dir /usr/local/bin --install-dir /usr/local/aws-cli --update
  ```

  *Windows*
  ```pwsh
  msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
  ```

- Docker Desktop
  - [Docker公式サイト](https://www.docker.com/products/docker-desktop/)

### npmパッケージのインストール

1. リポジトリルートで依存関係をインストール  
   ```bash
   npm install
   ```

### コンテナ動作確認
今回のハンズオンでデプロイする簡易なウェブシステムを一度ローカルで動かしてみましょう。

- 準備  
  Docker Desktopを起動してDockerエンジンが動作していることを確認してください。  
  backend-chat/.env.exampleを`.env.local`にリネームする
  ```bash
  cp backend-chat/.env.example backend-chat/.env.local
  ```

1. リポジトリルートで以下を実行:  
   ```bash
   docker-compose up -d
   ```
2. サービスの起動状況を確認:  
   ```bash
   docker-compose ps
   ```
3. バックエンドのヘルスチェック:  
   ```bash
   curl -f http://localhost:3000/health
   ```
4. フロントエンドの確認:  
   ブラウザで http://localhost:3001 にアクセス
5. 終了するには:  
   ```bash
   docker-compose down
   ```

### AWS 認証情報と環境変数設定

1. `aws configure` を実行  
2. Access Key ID を入力  
3. Secret Access Key を入力  
4. デフォルトリージョンを入力 (例: ap-northeast-1)  
5. 出力フォーマットを入力 (例: text)  

- **認証情報を持っていない場合**  
  AWS マネジメントコンソールで画面右上ユーザー用メニュー > 「セキュリティ認証情報」> 「アクセスキーを作成」

*Linux*
```bash
export OWNER=<自分とわかる文字列>

export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

export AWS_REGION=$(aws configure get region)
```
*Windows*
```pwsh
$env:OWNER="<自分とわかる文字列>"

$env:AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

$env:AWS_REGION=$(aws configure get region)
```

## 手順

### 1. **backend-hello** のコンテナイメージをECRにプッシュしてみよう

1. ECR リポジトリを作成

    *Linux*
    ```bash
    aws ecr create-repository \
      --repository-name ${OWNER}-backend-hello \
      --region $AWS_REGION
    ```
    *Windows*
    ```pwsh
    aws ecr create-repository `
      --repository-name $env:OWNER-backend-hello `
      --region $env:AWS_REGION
    ```

2. ECR にログイン

    *Linux*
    ```bash
    aws ecr get-login-password --region $AWS_REGION |
    docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    ```
    *Windows*
    ```pwsh
    aws ecr get-login-password --region $env:AWS_REGION |
    docker login --username AWS --password-stdin $env:AWS_ACCOUNT_ID.dkr.ecr.$env:AWS_REGION.amazonaws.com
    ```

3. イメージをビルド

    ```bash
    cd backend-hello
    docker build -t backend-hello:latest .
    cd ..
    ```

4. タグ付け＆プッシュ

    *Linux*
    ```bash
    docker tag backend-hello:latest \
      $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${OWNER}-backend-hello:latest

    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${OWNER}-backend-hello:latest
    ```
    *Windows*
    ```bash
    docker tag backend-hello:latest `
      $env:AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${env:OWNER}-backend-hello:latest

    docker push $env:AWS_ACCOUNT_ID.dkr.ecr.$env:AWS_REGION.amazonaws.com/${env:OWNER}-backend-hello:latest
    ```

### フロントエンドのコンテナイメージをECRにプッシュしてみよう
1. ECR リポジトリを作成  
   ```bash
   aws ecr create-repository \
     --repository-name ${OWNER}-frontend \
     --region $AWS_REGION
   ```
2. イメージをビルド  
   ```bash
   cd frontend
   docker build -t frontend:latest .
   cd ..
   ```
3. タグ付け＆プッシュ  
   ```bash
   docker tag frontend:latest \
     $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${OWNER}-frontend:latest

   docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${OWNER}-frontend:latest
   ```

### 2. CDKを使って自動化されたデプロイワークフローを作成してみよう

> **注意**: 以下の CDK コマンドは必ず `cdk` ディレクトリ内で実行してください。

#### 前提

- 環境変数（OWNER, AWS_ACCOUNT_ID, AWS_REGION）が設定済みであること  
- `cdk` ディレクトリに初期 CDK プロジェクトが用意されていること  

#### CDK プロジェクト構成

```
cdk/
├── bin/
│   └── cdk.ts                 # CDK アプリケーションのエントリポイント
├── lib/
│   ├── backend-chat.ts        # backend-chat Fargate サービス定義: Dingチャットのメッセージ送信エンドポイントを叩く
│   ├── backend-hello.ts       # backend-hello Fargate サービス定義: 単純なjsonを返す
│   ├── ecr.ts                 # ECR リポジトリ定義
│   └── frontend.ts            # frontend Fargate サービス 定義
└── cdk.json
```

#### ステップ 1: 初期セットアップ (cdk ディレクトリ内で実行)

CDK 関連コマンドは必ず `cdk` ディレクトリに移動してから実行してください。

```bash
cd cdk
npm install
```

#### ステップ 2: ECR リポジトリの定義とデプロイ

※ `backend-hello` と `frontend` の ECR リポジトリは事前に作成済みの前提とします。  

1. `bin/ecs-handson.ts` に `EcrStack` を追加:  
  ```typescript
   import { EcrStack } from '../lib/ecr';
   ...
  // ECR スタック
  const ecrStack = new EcrStack(app, `${owner}-EcrStack`, {
    env: {
      account: process.env.AWS_ACCOUNT_ID,
      region: process.env.AWS_REGION,
    },
    owner,
  });
  ```
3. デプロイ:  
   ```bash
   npx cdk deploy EcrStack
   ```

#### ステップ 3: Backend-hello Fargate サービスの構築

1. `lib/backend-hello.ts` を作成し、以下のコードを追加:  
   ```typescript
   import * as cdk from 'aws-cdk-lib';
   import { Construct } from 'constructs';
   import * as ec2 from 'aws-cdk-lib/aws-ec2';
   import * as ecs from 'aws-cdk-lib/aws-ecs';
   import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
   import { EcrStack } from './ecr';

   interface BackendHelloStackProps extends cdk.StackProps {
     repositoryUri: string;
   }

   export class BackendHelloStack extends cdk.Stack {
     constructor(scope: Construct, id: string, props: BackendHelloStackProps) {
       super(scope, id, props);

       // VPC と ECS クラスターを作成
       const vpc = new ec2.Vpc(this, 'Vpc');
       const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

       // Fargate サービスを作成し、ロードバランサーを設定
       new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'BackendHelloService', {
         cluster,
         taskImageOptions: {
           image: ecs.ContainerImage.fromRegistry(props.repositoryUri),
           containerPort: 3000,
         },
         desiredCount: 1,
       });
     }
   }
   ```
2. `bin/ecs-handson.ts` を開き、`EcrStack` の後に `BackendHelloStack` を追加:  
   ```typescript
   import { BackendHelloStack } from '../lib/backend-hello';

   const app = new cdk.App();
   const ecrStack = new EcrStack(app, 'EcrStack');

   new BackendHelloStack(app, 'BackendHelloStack', {
     env: {
       account: process.env.AWS_ACCOUNT_ID,
       region: process.env.AWS_REGION,
     },
     repositoryUri: ecrStack.repositoryUri,
   });
   ```
3. ビルドとデプロイ:  
   ```bash
   cd cdk
   npm run build
   cdk deploy BackendHelloStack
   ```
4. デプロイ完了後、出力された ALB の DNS 名をコピーし、ブラウザまたは `curl` で `/health` エンドポイントにアクセスしてステータス 200 が返ることを確認  
   ```bash
   curl -f http://<ALB_DNS>/health
   ```

#### ステップ 4: CloudMap サービスディスカバリの追加

1. `lib/service-discovery.ts` で CloudMap namespace を作成  
2. 各サービスに `cloudMapOptions` を付与  
3. `bin/ecs-handson.ts` に `ServiceDiscoveryStack` を追加  
4. デプロイ:  
   ```bash
   npm run build && cdk deploy ServiceDiscoveryStack
   ```

#### ステップ 5: Frontend Fargate サービスと ALB の構築

1. `lib/frontend.ts` で Application Load Balancer と Frontend Fargate サービスを定義  
2. `bin/ecs-handson.ts` に `FrontendStack` を追加  
3. デプロイ:  
   ```bash
   npm run build && cdk deploy FrontendStack
   ```
4. ALB の DNS 名をブラウザで開き、フロントエンド表示を確認

以上の手順で、ECR→Backend→サービスディスカバリ→Frontend→ALB の順に少しずつ AWS 上に構築し、各ステップで成果物を体感できます。

#### ステップ6: Backend-chat Fargate サービスの構築

1. **Backend-chat用ECRリポジトリの作成**
   ```bash
   aws ecr create-repository \
     --repository-name ${OWNER}-backend-chat \
     --region $AWS_REGION
   ```

2. **Backend-chatのコンテナイメージをビルド＆プッシュ**
   ```bash
   cd backend-chat
   docker build -t backend-chat:latest .
   cd ..
   
   docker tag backend-chat:latest \
     $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${OWNER}-backend-chat:latest

   docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${OWNER}-backend-chat:latest
   ```

3. **lib/ecr.ts にbackend-chat用ECRリポジトリ参照を追加**
   ```typescript
   // 既存コードに追加
   export class EcrStack extends cdk.Stack {
     public readonly backendRepositoryUri: string;
     public readonly frontendRepositoryUri: string;
     public readonly backendChatRepositoryUri: string; // 追加

     constructor(scope: Construct, id: string, props: EcrStackProps) {
       super(scope, id, props);

       const owner = props.owner;

       // 既存のBackend Hello用ECRリポジトリを参照
       const backendRepo = ecr.Repository.fromRepositoryName(
         this,
         'BackendHelloRepo',
         `${owner}-backend-hello`
       );
       this.backendRepositoryUri = backendRepo.repositoryUri;

       // 既存のFrontend用ECRリポジトリを参照
       const frontendRepo = ecr.Repository.fromRepositoryName(
         this,
         'FrontendRepo',
         `${owner}-frontend`
       );
       this.frontendRepositoryUri = frontendRepo.repositoryUri;

       // Backend Chat用ECRリポジトリを参照 (新規追加)
       const backendChatRepo = ecr.Repository.fromRepositoryName(
         this,
         'BackendChatRepo',
         `${owner}-backend-chat`
       );
       this.backendChatRepositoryUri = backendChatRepo.repositoryUri;
     }
   }
   ```

4. **lib/backend-chat.ts を作成**
   ```typescript
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
     cluster: ecs.ICluster;
     cloudMapNamespace: servicediscovery.INamespace;
     environment?: string;
   }

   export class BackendChatStack extends cdk.Stack {
     public readonly serviceLoadBalancerDns: string;
     public readonly backendChatServiceName: string;

     constructor(scope: Construct, id: string, props: BackendChatStackProps) {
       super(scope, id, props);

       const { repositoryUri, cluster, cloudMapNamespace, environment = 'dev' } = props;

       // タスク実行ロール
       const execRole = new iam.Role(this, 'BackendChatExecRole', {
         assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
         managedPolicies: [
           iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
           iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
         ],
       });

       // タスクロール
       const taskRole = new iam.Role(this, 'BackendChatTaskRole', {
         assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
       });

       // Backend-chat用シークレット作成
       const chatSecrets = new secretsmanager.Secret(this, 'BackendChatSecrets', {
         description: `Backend Chat service secrets for ${environment} environment`,
         secretName: `backend-chat-secrets-dev-${environment}`,
         secretObjectValue: {
           DING_SECRET: cdk.SecretValue.unsafePlainText('placeholder-secret'),
           DING_ENDPOINT: cdk.SecretValue.unsafePlainText('https://ding.endpoint.placeholder'),
         },
       });

       chatSecrets.grantRead(taskRole);

       // Fargateサービス作成
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
           containerPort: 3001,
           secrets: {
             DING_SECRET: ecs.Secret.fromSecretsManager(chatSecrets, 'DING_SECRET'),
             DING_ENDPOINT: ecs.Secret.fromSecretsManager(chatSecrets, 'DING_ENDPOINT'),
           },
           environment: {
             NODE_ENV: 'production',
             PORT: '3001',
           },
         },
         publicLoadBalancer: true,
       });

       this.backendChatServiceName = 'backend-chat';

       // ヘルスチェック設定
       fargateService.targetGroup.configureHealthCheck({
         path: '/health',
         healthyHttpCodes: '200',
       });

       this.serviceLoadBalancerDns = fargateService.loadBalancer.loadBalancerDnsName;

       // 出力
       new cdk.CfnOutput(this, 'ChatSecretsArn', {
         value: chatSecrets.secretArn,
         description: 'Backend Chat Secrets Manager ARN',
       });

       new cdk.CfnOutput(this, 'BackendChatLoadBalancerDNS', {
         value: this.serviceLoadBalancerDns,
         description: 'Backend Chat Load Balancer DNS Name',
       });
     }
   }
   ```

5. **lib/frontend.ts にbackendChatServiceNameパラメータを追加**
   ```typescript
   export interface FrontendStackProps extends cdk.StackProps {
     repositoryUri: string;
     cluster: ecs.ICluster;
     cloudMapNamespace: servicediscovery.INamespace;
     backendServiceName: string;
     backendChatServiceName: string; // 追加
   }

   export class FrontendStack extends cdk.Stack {
     constructor(scope: Construct, id: string, props: FrontendStackProps) {
       const { repositoryUri, cluster, cloudMapNamespace, backendServiceName, backendChatServiceName } = props;
       
       // 環境変数にbackend-chatサービス名も追加
       environment: {
         NODE_ENV: 'production',
         NEXT_PUBLIC_BACKEND_SERVICE: backendServiceName,
         NEXT_PUBLIC_BACKEND_CHAT_SERVICE: backendChatServiceName, // 追加
       },
     }
   }
   ```

6. **bin/handson.ts にBackendChatStackを追加**
   ```typescript
   import { BackendChatStack } from '../lib/backend-chat';

   // Backend Chat スタック（新規追加）
   const backendChatStack = new BackendChatStack(app, 'BackendChatStack', {
     env: {
       account: process.env.AWS_ACCOUNT_ID,
       region: process.env.AWS_REGION,
     },
     repositoryUri: ecrStack.backendChatRepositoryUri,
     cluster: backendStack.cluster,
     cloudMapNamespace: backendStack.cloudMapNamespace,
     environment,
   });

   // Frontend スタックにbackendChatServiceNameを追加
   const frontendStack = new FrontendStack(app, 'FrontendStack', {
     env: {
       account: process.env.AWS_ACCOUNT_ID,
       region: process.env.AWS_REGION,
     },
     repositoryUri: ecrStack.frontendRepositoryUri,
     cluster: backendStack.cluster,
     cloudMapNamespace: backendStack.cloudMapNamespace,
     backendServiceName: backendStack.backendServiceName,
     backendChatServiceName: backendChatStack.backendChatServiceName, // 追加
   });
   ```

7. **ビルドとデプロイ**
   ```bash
   cd cdk
   npm run build
   cdk deploy BackendChatStack
   ```

#### Appendix:
このハンズオンを実施する時点でDingチャットの認証情報はAWS Secrets Managerに保存されている。

1. シークレットの確認
```bash
# シークレット一覧を表示
aws secretsmanager list-secrets --region $AWS_REGION

# 特定のシークレットの詳細を確認
aws secretsmanager describe-secret \
  --secret-id backend-chat-secrets-dev \
  --region $AWS_REGION
```

2. シークレットの登録
```bash
aws secretsmanager create-secret \
  --name backend-chat-secrets-dev \
  --description "Backend Chat service secrets for dev environment" \
  --secret-string '{
    "DING_SECRET": "your-actual-ding-secret",
    "DING_ENDPOINT": "https://your-actual-ding-endpoint"
  }' \
  --region $AWS_REGION
```

3. シークレットの更新
```bash
aws secretsmanager update-secret \
  --secret-id backend-chat-secrets-dev \
  --secret-string '{
    "DING_SECRET": "your-actual-ding-secret",
    "DING_ENDPOINT": "https://your-actual-ding-endpoint"
  }' \
  --region $AWS_REGION
```