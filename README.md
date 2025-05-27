# リポジトリについて

この資料は 2025/5/30 に株式会社協栄情報で行われる有志勉強会のために作成しました。  
この勉強会ではマイクロサービスアーキテクチャを学び、複数コンテナの連携によるサービス提供をハンズオン形式で体験します。

# ディレクトリ構成

- **backend-hello**: TypeScript + Express ベースのサンプルサーバー  
- **frontend**: フロントエンドアプリケーション (作成予定)  
- **backend-chat**: API サービス (作成予定)

## 前提条件
このリポジトリはLinux環境で動かすことを想定しています。  
WindowsユーザーはWSLの設定を完了させてください。  
VSCodeで開発する場合は **WSLエクステンション** をインストールしてください。

### セットアップ

1. リポジトリルートで依存関係をインストール  
   ```bash
   npm install
   ```
2. backend-hello をビルド & 起動  
   ```bash
   cd backend-hello
   npm run build
   npm start
   cd ..
   ```

# AWS ECR へのプッシュ手順

ハンズオンでは標準の **AWS CLI**（システムインストール）を用いた手順を実行します。  

## 前提条件

- AWS CLI インストール  
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

## AWS 認証情報と環境変数設定

- **認証情報持ってない場合**  
  AWS マネジメントコンソールで 画面右上ユーザー用メニュー > 「セキュリティ認証情報」> 「アクセスキーを作成」

1. aws configure を実行  
2. Access Key ID を入力  
3. Secret Access Key を入力  
4. デフォルトリージョンを入力 (例: ap-northeast-1)  
5. 出力フォーマットを入力 (例: text)  

```bash
export OWNER=<自分とわかる文字列>    # ECRリポジトリ名プレフィックス
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=$(aws configure get region)
```

## 手順

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
