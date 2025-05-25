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

1. AWS CLI インストーラーをダウンロード
2. アーカイブを解凍
3. 指定ディレクトリにインストール

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install --bin-dir /usr/local/bin --install-dir /usr/local/aws-cli --update
```

### AWS 認証情報と環境変数設定

1. aws configure を実行  
2. Access Key ID を入力  
3. Secret Access Key を入力  
4. デフォルトリージョンを入力 (例: ap-northeast-1)  
5. 出力フォーマットを入力 (例: text)  

- **認証情報持ってない場合**  
  AWS マネジメントコンソールで 画面右上ユーザー用メニュー > 「セキュリティ認証情報」> 「アクセスキーを作成」

```bash
export OWNER=<自分とわかる文字列>    # ECRリポジトリ名プレフィックス
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=$(aws configure get region)
```

## 手順
### 1. **backend-hello** のコンテナイメージをECRにプッシュしてみよう
1. ECR リポジトリの作成  
   ```bash
   aws ecr create-repository \
     --repository-name ${OWNER}-backend-hello \
     --region $AWS_REGION
   ```

2. ECR ログイン  
   ```bash
   aws ecr get-login-password --region $AWS_REGION |
   docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
   ```

3. Docker イメージのビルド  
   ```bash
   cd backend-hello
   docker build -t backend-hello:latest .
   cd ..
   ```

4. イメージにタグ付け & プッシュ  
   - イメージにタグ付け: ローカルイメージにECR用タグを付与  
   ```bash
   docker tag \
     backend-hello:latest \
     $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${OWNER}-backend-hello:latest

   docker push \
     $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${OWNER}-backend-hello:latest
   ```

5. ECS Fargateを使ってコンテナを起動してみよう
// 手順がわかるように少しずつコマンドを実行していく

### 2. CDKを使って自動化されたデプロイワークフローを作成してみよう
#### 前提

`cdk`ディレクトリに最小構成のCDKコードが用意されています。  
現在はまだ何もデプロイしません。少しずつコードを追加しながらこのシステム全体をAWS上にデプロイしていきましょう。

#### CDK デプロイ手順

1. cdk ディレクトリに移動して依存関係をインストール  
   ```bash
   cd cdk
   npm install
   ```
2. CDK を AWS アカウントにブートストラップ  
   ```bash
   cdk bootstrap aws://${AWS_ACCOUNT_ID}/${AWS_REGION}
   ```
3. CDK スタックに ECR リポジトリを追加  
   `cdk/lib/cdk-stack.ts` を開き、以下を追加:  
   ```typescript
   import * as ecr from 'aws-cdk-lib/aws-ecr';

   const repo = new ecr.Repository(this, 'BackendHelloRepo', {
     repositoryName: `${OWNER}-backend-hello`
   });
   ```
4. CDK スタックに Fargate サービスを追加  
   ```typescript
   import * as ecs from 'aws-cdk-lib/aws-ecs';
   import * as ec2 from 'aws-cdk-lib/aws-ec2';
   import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';

   const vpc = new ec2.Vpc(this, 'VPC');  
   const cluster = new ecs.Cluster(this, 'Cluster', { vpc });  
   new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'BackendService', {
     cluster,
     taskImageOptions: {
       image: ecs.ContainerImage.fromEcrRepository(repo, 'latest'),
       containerPort: 3000,
     },
   });
   ```
5. CDK スタックをデプロイ  
   ```bash
   cdk deploy
   ```

1. コンテナイメージをECRにプッシュします。  
次のコードをxxxファイルに追記してください。
```typescript
// ECRにコンテナイメージをプッシュするコード
```

2. 起動済みのbackend-helloに対してfrontendが接続できるように、CloudMapを使って関連付けます。

3. frontendをECS Fargateで起動します。

4. シンプルなサービスディスカバリーを構成し、frontendからbackend-helloへのコンテナ間通信を実施する。
- frontendとbackend-helloは同じクラスターの中に異なるサービスとして登録
- CDKによって実現する

5. ALBを設定し、frontendサーバーを公開
