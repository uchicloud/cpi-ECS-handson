# リポジトリについて

この資料は 2025/5/30 に株式会社協栄情報で行われる有志勉強会のために作成しました。  
この勉強会では実際にウェブアプリをデプロイしながらECS Fargateやその周辺ツールに入門します。

# ディレクトリ構成

- **frontend**: フロントエンドサーバー (Next.js)
- **backend-hello**: ハードコードされたjsonを返す (Express.js) 
- **backend-chat**: ユーザー入力を受付け、外部と通信する (Express.js)

## 前提条件
このドキュメントに記載したコマンドは**bash**または**powershell**での動作を想定しています。  
コンテナを起動するためWindowsユーザーはWSLの設定を完了させてください。  

### インストール
- Node.js

  *Linux*
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v1.1.3/install.sh | bash
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
  sudo apt install -y unzip
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_1.zip" -o "awscliv1.zip"
  unzip awscliv1.zip
  sudo ./aws/install --bin-dir /usr/local/bin --install-dir /usr/local/aws-cli --update
  ```

  *Windows*
  ```pwsh
  msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV1.msi
  ```

- Docker Desktop
  - [Docker公式サイト](https://www.docker.com/products/docker-desktop/)

### npmパッケージのインストール

1. ディレクトリのルートで依存関係をインストール

    ```bash
    npm install
    ```

### AWS 認証情報と環境変数設定

1. `aws configure` を実行  
1. Access Key ID を入力  
1. Secret Access Key を入力  
1. デフォルトリージョンを入力 (ap-northeast-1)  
1. 出力フォーマットを入力 (例: text)  

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

## コンテナにトライ
今回のハンズオンでECS上にデプロイする簡易なウェブシステムを一度ローカルで動かしてみましょう。

- 準備

  > Docker Desktopを起動してDockerエンジンが動作していることを確認  
  > backend-chat/.env.exampleを`.env.local`にリネーム
  ```bash
  cp backend-chat/.env.example backend-chat/.env.local
  ```

1. リポジトリルートで以下を実行:

    ```bash
    docker-compose up -d
    ```
1. サービスの稼働状態を確認:

    ```bash
    docker-compose ps
    ```
1. バックエンドのヘルスチェック:

    ```bash
    curl -f http://localhost:3000/health
    ```
1. フロントエンドの確認:

   ブラウザで http://localhost:3001 にアクセス
1. 終了するには:

   ```bash
   docker-compose down
   ```
- **まとめ**

    dockerエンジンによってコンテナイメージが実行状態に保たれる  
    一連のコマンドでコンテナの起動と終了、ヘルスチェックを手動で行った  
   
    >絶対に止めてはいけないコンテナがあったり、ヘルスチェックのエンドポイントがバラバラだったら大変すぎ   
    >**ECS**はそういうマネージメントを自動化し、状況に合わせてコンテナを増減してくれるすごいやつ


## ハンズオン手順

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

1. ECR にログイン

    *Linux*
    ```bash
    aws ecr get-login-password --region $AWS_REGION |
    docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    ```
    *Windows*
    ```pwsh
    aws ecr get-login-password --region $env:AWS_REGION |
    docker login --username AWS --password-stdin "$env:AWS_ACCOUNT_ID.dkr.ecr.$env:AWS_REGION.amazonaws.com"
    ```

1. イメージをビルド

    ```bash
    cd backend-hello
    docker build -t backend-hello:latest .
    cd ..
    ```

1. タグ付け＆プッシュ

    *Linux*
    ```bash
    docker tag backend-hello:latest \
      $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${OWNER}-backend-hello:latest

    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${OWNER}-backend-hello:latest
    ```
    *Windows*
    ```bash
    docker tag backend-hello:latest `
      "$env:AWS_ACCOUNT_ID.dkr.ecr.$env:AWS_REGION.amazonaws.com/${env:OWNER}-backend-hello:latest"

    docker push "$env:AWS_ACCOUNT_ID.dkr.ecr.$env:AWS_REGION.amazonaws.com/${env:OWNER}-backend-hello:latest"
    ```

### フロントエンドのコンテナイメージをECRにプッシュしてみよう
1. ECR リポジトリを作成

    *Linux*
    ```bash
    aws ecr create-repository \
      --repository-name ${OWNER}-frontend \
      --region $AWS_REGION
    ```
    *Windows*
    ```pwsh
    aws ecr create-repository `
      --repository-name ${env:OWNER}-frontend `
      --region $env:AWS_REGION
    ```

1. イメージをビルド

    ```bash
    cd frontend
    docker build -t frontend:latest .
    cd ..
    ```
1. タグ付け＆プッシュ

    *Linux*
    ```bash
    docker tag frontend:latest \
      $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${OWNER}-frontend:latest

    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${OWNER}-frontend:latest
    ```
    *Windows*
    ```pwsh
    docker tag frontend:latest `
      "$env:AWS_ACCOUNT_ID.dkr.ecr.$env:AWS_REGION.amazonaws.com/${env:OWNER}-frontend:latest"

    docker push "$env:AWS_ACCOUNT_ID.dkr.ecr.$env:AWS_REGION.amazonaws.com/${env:OWNER}-frontend:latest"
    ```


### CDKを使って自動化されたデプロイワークフローを作成してみよう

> **注意**: 以下の CDK コマンドは必ず `cdk` ディレクトリ内で実行してください。

#### 前提

- 環境変数（OWNER, AWS_ACCOUNT_ID, AWS_REGION）が設定済みであること  
- `cdk` ディレクトリに初期 CDK プロジェクトが用意されていること  

#### CDK プロジェクト構成

```
cdk/
├── bin/
│   └── handson.ts          # CDK アプリケーションのエントリポイント
├── lib/
│   ├── backend-chat.ts     # backend-chat Fargate サービス定義: Dingチャット用
│   ├── backend-hello.ts    # backend-hello Fargate サービス定義: 単純なjsonを返す
│   ├── ecr.ts              # ECR リポジトリ定義
│   └── frontend.ts         # frontend Fargate サービス 定義
└── cdk.json
```

#### ステップ 1: 初期セットアップ (cdk ディレクトリ内で実行)

```bash
cd cdk
npm install
```

#### ステップ 2: ECRリポジトリの構成

1. `bin/handson.ts` に `EcrStack` を追加:

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

1. デプロイ:

    *Linux*
    ```bash
    npx cdk deploy $OWNER-EcrStack
    ```
    *Windows*
    ```pwsh
    npx cdk deploy $env:OWNER-EcrStack
    ```

    この`ユーザー名-EcrStack`というスタックは、先ほどプッシュした各種コンテナイメージへの参照を提供します。

#### ステップ 3: Backend-hello Fargate サービスの構築

1. `bin/handson.ts` を開き、`EcrStack` の後に `BackendHelloStack` を追加:  

    ```typescript
    import { BackendHelloStack } from '../lib/backend-hello';
      ...


    // Backend スタック
    const backendStack = new BackendHelloStack(app, `${owner}-BackendHelloStack`, {
      env: {
        account: process.env.AWS_ACCOUNT_ID,
        region: process.env.AWS_REGION,
      },
      repositoryUri: ecrStack.backendRepositoryUri,
    });
    ```

1. ビルドとデプロイ:

    *Linux*
    ```bash
    npx cdk deploy $OWNER-BackendHelloStack
    ```
    *Windows*
    ```pwsh
    npx cdk deploy $env:OWNER-BackendHelloStack
    ```

#### ステップ 4: Cloud Map サービスディスカバリの確認

先ほどデプロイした`ユーザー名-BackendHelloStack`に対して、frontend Fargateサービスから経路を作成することを考えてみてください。  
コンテナ間ではIPアドレスやドメイン名を使って接続先を指定する必要があります。  

このように分散したサービス同士の探索と接続の解決を図るプロセスを**サービスディスカバリ**と呼び、AWSでは**Cloud Map**というサービスがこれのために提供されています。  

>`lib/backend-hello.ts`を見てみましょう。  
Cloud Mapの内部用DNSとインスタンスの自動追加を設定しています。

#### ステップ 5: Frontend Fargate サービスの構築

1. `bin/handson.ts` を開き、`BackendHelloStack` の後に `FrontendStack` を追加:

    ```typescript
    import { FrontendStack } from '../lib/frontend';
      ...


    const backendServiceName = backendStack.backendServiceName;

    // Frontend スタック
    const frontendStack = new FrontendStack(app, `${owner}-FrontendStack`, {
      env: {
        account: process.env.AWS_ACCOUNT_ID,
        region: process.env.AWS_REGION,
      },
      repositoryUri: ecrStack.frontendRepositoryUri,
      cluster: backendStack.cluster,
      cloudMapNamespace: backendStack.cloudMapNamespace,
      backendServiceName: backendServiceName,
    });
    ```
1. デプロイ:

    *Linux*
    ```bash
    npx cdk deploy $OWNER-FrontendStack
    ```
    *Windows*
    ```pwsh
    npx cdk deploy $env:OWNER-FrontendStack
    ```

1. ALB の DNS 名をブラウザで開き、フロントエンド表示を確認

 ここまでで、
 1. イメージのプッシュ(ECR)
 1. Fargateサービスの追加(ECS)
 1. サービスディスカバリ(Cloud Map)
 
 という手順をなぞってきました。  
 次はコンテナからDingチャットの送信エンドポイントを叩いてみます。

#### ステップ6: Backend-chat Fargate サービスの構築

1. **Backend-chat用ECRリポジトリの作成**

    *Linux*
    ```bash
    aws ecr create-repository \
      --repository-name ${OWNER}-backend-chat \
      --region $AWS_REGION
    ```
    *Windows*
    ```pwsh
    aws ecr create-repository `
      --repository-name ${env:OWNER}-backend-chat `
      --region $env:AWS_REGION
    ```

1. **Backend-chatのコンテナイメージをビルド＆プッシュ**

    *Linux*
    ```bash
    cd backend-chat
    docker build -t backend-chat:latest .
    cd ..

    docker tag backend-chat:latest \
      $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${OWNER}-backend-chat:latest

    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${OWNER}-backend-chat:latest
    ```
    *Windows*
    ```pwsh
    cd backend-chat
    docker build -t backend-chat:latest .
    cd ..

    docker tag backend-chat:latest `
      "$env:AWS_ACCOUNT_ID.dkr.ecr.$env:AWS_REGION.amazonaws.com/${env:OWNER}-backend-chat:latest"

    docker push "$env:AWS_ACCOUNT_ID.dkr.ecr.$env:AWS_REGION.amazonaws.com/${env:OWNER}-backend-chat:latest"
    ```

1. **bin/handson.ts にBackendChatStackを追加**

    ```typescript
    import { BackendChatStack } from '../lib/backend-chat';
      ...
    

    // Backend Chat スタック（新規追加）
    const backendChatStack = new BackendChatStack(app, `${owner}-BackendChatStack`, {
      env: {
        account: process.env.AWS_ACCOUNT_ID,
        region: process.env.AWS_REGION,
      },
      repositoryUri: ecrStack.backendChatRepositoryUri,
      vpc: backendStack.cluster.vpc,
      cluster: backendStack.cluster,
      cloudMapNamespace: backendStack.cloudMapNamespace,
      environment,
    });

    // frontendコンテナの環境変数NEXT_PUBLIC_API_BASE_URLに
    // backendChatServiceNameを設定してビルドする
    const backendServiceName = backendStack.backendServiceName;
    const backendChatServiceName = backendChatStack.backendChatServiceName;

    // Frontend スタックにbackendChatServiceNameを追加
    const frontendStack = new FrontendStack(app, `${owner}-FrontendStack`, {
      env: {
        account: process.env.AWS_ACCOUNT_ID,
        region: process.env.AWS_REGION,
      },
      repositoryUri: ecrStack.frontendRepositoryUri,
      cluster: backendStack.cluster,
      cloudMapNamespace: backendStack.cloudMapNamespace,
      backendServiceName: backendServiceName,
      backendChatServiceName: backendChatServiceName, // 追加
    });
    ```

1. **ビルドとデプロイ**

    *Linux*
    ```bash
    cd cdk
    npx cdk deploy $OWNER-BackendChatStack $OWNER-FrontendStack
    ```
    *Windows*
    ```pwsh
    cd cdk
    npx cdk deploy $env:OWNER-BackendChatStack $env:OWNER-FrontendStack
    ```

実は今まで機能していなかったメッセージ送信ボタンが動くようになりました。  
テキスト入力欄に好きなメッセージを入れて「Send」ボタンでbotアカウントにしゃべらせることができます。

### 後片付け
CDKコードはCloudForamtionのスタックとしてAWS上で管理されています。  
スタックを削除するとその構成リソースも全て削除されるため、簡単に不要リソースを処分できます。

#### 削除コマンド
```bash
cd cdk
echo y | npx cdk destroy --all
```
>手動で作ったECRリポジトリの削除

お疲れさまでした。
### Appendix:
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

1. シークレットの登録
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

1. シークレットの更新
```bash
aws secretsmanager update-secret \
  --secret-id backend-chat-secrets-dev \
  --secret-string '{
    "DING_SECRET": "your-actual-ding-secret",
    "DING_ENDPOINT": "https://your-actual-ding-endpoint"
  }' \
  --region $AWS_REGION
```

また、全員で共有するリソースについては`init-cdk`にてCDKコードを作成し、デプロイを実行済み
