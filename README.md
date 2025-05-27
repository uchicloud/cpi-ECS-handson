# リポジトリについて

この資料は 2025/5/30 に株式会社協栄情報で行われる有志勉強会のために作成しました。  
この勉強会ではマイクロサービスアーキテクチャを学び、複数コンテナの連携によるサービス提供をハンズオン形式で体験します。

# ディレクトリ構成

- **backend-hello**: TypeScript + Express ベースのサンプルサーバー  
- **frontend**: フロントエンドアプリケーション (作成予定)  
- **backend-chat**: API サービス (作成予定)

## 前提条件

### セットアップ

1. リポジトリルートで依存関係をインストール  
   ```bash
   npm install
   ```

### コンテナ動作確認

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

### AWS CLI のインストール

下記の手順で AWS CLI v2 をインストールします。

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install --bin-dir /usr/local/bin --install-dir /usr/local/aws-cli --update
```

### AWS 認証情報と環境変数設定

1. `aws configure` を実行  
2. Access Key ID を入力  
3. Secret Access Key を入力  
4. デフォルトリージョンを入力 (例: ap-northeast-1)  
5. 出力フォーマットを入力 (例: text)  

- **認証情報を持っていない場合**  
  AWS マネジメントコンソールで画面右上ユーザー用メニュー > 「セキュリティ認証情報」> 「アクセスキーを作成」

```bash
export OWNER=<自分とわかる文字列>    # ECRリポジトリ名のプレフィックス
```
```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```
```bash
export AWS_REGION=$(aws configure get region)
```

## 手順

### 1. **backend-hello** のコンテナイメージをECRにプッシュしてみよう

1. ECR リポジトリを作成  
   ```bash
   aws ecr create-repository \
     --repository-name ${OWNER}-backend-hello \
     --region $AWS_REGION
   ```
2. ECR にログイン  
   ```bash
   aws ecr get-login-password --region $AWS_REGION |
    docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
   ```
3. イメージをビルド  
   ```bash
   cd backend-hello
   docker build -t backend-hello:latest .
   cd ..
   ```
4. タグ付け＆プッシュ  
   ```bash
   docker tag backend-hello:latest \
     $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${OWNER}-backend-hello:latest

   docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${OWNER}-backend-hello:latest
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
│   ├── ecr.ts                 # ECR リポジトリ定義
│   ├── backend-hello.ts       # Backend Fargate サービス定義
│   ├── service-discovery.ts   # CloudMap サービスディスカバリ定義
│   └── frontend.ts            # Frontend Fargate サービス & ALB 定義
├── package.json
└── tsconfig.json
```

#### ステップ 1: 初期セットアップ (cdk ディレクトリ内で実行)

CDK 関連コマンドは必ず `cdk` ディレクトリに移動してから実行してください。

```bash
cd cdk
npm install
```

1. ECR リポジトリを作成  
   ```bash
   aws ecr create-repository \
     --repository-name ${OWNER}-backend-hello \
     --region $AWS_REGION
   ```

#### ステップ 2: ECR リポジトリの定義とデプロイ

※ `backend-hello` と `frontend` の ECR リポジトリは事前に作成済みの前提とします。  

1. `lib/ecr.ts` を作成し、以下を実装:  
   ```typescript
   import * as cdk from 'aws-cdk-lib';
   import { Construct } from 'constructs';
   import * as ecr from 'aws-cdk-lib/aws-ecr';

   export class EcrStack extends cdk.Stack {
     public readonly repositoryUri: string;

     constructor(scope: Construct, id: string, props?: cdk.StackProps) {
       super(scope, id, props);

       const repo = new ecr.Repository(this, 'BackendHelloRepo', {
         repositoryName: `${process.env.OWNER}-backend-hello`,
       });
       this.repositoryUri = repo.repositoryUri;
     }
   }
   ```
2. `bin/ecs-handson.ts` に `EcrStack` を追加:  
   ```typescript
   import 'source-map-support/register';
   import * as cdk from 'aws-cdk-lib';
   import { EcrStack } from '../lib/ecr';

   const app = new cdk.App();
   new EcrStack(app, 'EcrStack');
   ```
3. デプロイ:  
   ```bash
   npm run build && cdk deploy EcrStack
   ```
4. 出力された `repositoryUri` を控える

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
