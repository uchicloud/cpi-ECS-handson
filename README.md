# リポジトリについて
この資料は2025/5/30に株式会社協栄情報で行われる有志勉強会のために作成しました。
この勉強会では複数のコンテナを強調させて1つのサービスを提供するマイクロサービスアーキテクチャについてハンズオン形式で学んでいきます。

# ディレクトリ

# AWSサービス

## Docker

バックエンドサービス (backend-hello) の Docker イメージビルドと実行方法:

```bash
docker build -t backend-hello:latest -f backend-hello/Dockerfile .
docker run -d -p 3000:3000 --name backend-hello backend-hello:latest
```
