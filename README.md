# cloudflare-workers-starter

Cloudflare Workers + D1 (`workers-starter-db`) のカウンターと、ローカル専用のDBビューア。

## 起動方法

DockerとDocker Composeを用意し、リポジトリのルートで実行します。npmはすべてコンテナ内で実行します。

```bash
docker compose up --build -d workers admin-db
```

- アプリ: http://localhost:8787/
- DBビューア: http://localhost:8080/

起動時にローカルDBへマイグレーションを適用します。停止は `docker compose down`。DBは名前付きボリュームに保存され、`down -v` で削除されます。

## 編集する場所

- アプリ画面: `source/public/`
- アプリAPI: `source/src/index.ts`
- DBスキーマ: `source/migrations/`
- DBビューア: `source-db-admin/src/`、`source-db-admin/public/`
- Worker設定: 各ディレクトリの `wrangler.jsonc`
- Docker設定: `docker-compose.yml`、`docker/`

ソース変更はホットリロードされます。依存関係を変更したら対象コンテナで `npm install` を実行し、`docker compose up --build -d` で再ビルドします。

型は `wrangler types` が生成する `worker-configuration.d.ts` を使用します。以下で型を再生成してチェックします。

```bash
docker compose exec workers npm run check
docker compose exec admin-db npm run check
```

スキーマ変更は新しいマイグレーションSQLに追加し、ローカルへ手動適用する場合は次を実行します。

```bash
docker compose stop admin-db workers
docker compose run --rm --no-deps workers npm run db:migrate:local
docker compose up -d workers admin-db
```

## デプロイ方法

※ `workers-starter-db` はDB名の例です。利用者が用途に合う名前を決めてください。別名にする場合は、以下のコマンド、両方の `wrangler.jsonc` の `database_name`、`source/package.json` の `db:migrate:local`・`db:migrate:remote` を同じ名前に揃えます。

本番用D1を `docker compose exec workers npx wrangler d1 create workers-starter-db` で作成し、発行された `database_id` を両方の `wrangler.jsonc` に設定します。

Cloudflareの「アプリケーションをセットアップする」画面でGitHubリポジトリを選び、以下を設定します。

| 項目 | 設定値 |
| --- | --- |
| プロジェクト名 | `cloudflare-workers-starter`（`source/wrangler.jsonc` の `name` と一致させる） |
| ビルドコマンド | 空欄 |
| デプロイコマンド | 下記のコマンド |
| プレビューコマンド | `npx wrangler preview` |
| プレビュービルドを有効化 | 本番だけを配信する場合はオフ |
| Cloudflare Accessで保護 | 公開ページとして使う場合はオフ |
| 詳細設定 → パス | `source` |
| 詳細設定 → APIトークン | 下記の権限を持つ、このアカウントのユーザートークン |
| 環境変数 | このスターターでは追加不要 |

```bash
npx wrangler d1 migrations apply workers-starter-db --remote && npx wrangler deploy
```

APIトークン欄の「新しいトークンを作成する」を使うか、既存トークンを選択します。自動作成されたトークンの既定権限は残し、[My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) で以下を確認・追加してください。アカウントの対象はデプロイ先に合わせます。

| アカウントの権限 | 用途 |
| --- | --- |
| Workers Scripts → Edit | Workerのデプロイ |
| D1 → Edit | 本番DBへのマイグレーション適用 |
| Artifacts → Read | 警告の `artifacts_read` に対応 |
| Artifacts → Edit | 警告の `artifacts_write` に対応 |

Workersの新しい権限画面では、デプロイ先Workerの `Editor` を指定します。トークンで新規Workerも作成する場合は `Admin` が必要です。[Workersの権限](https://developers.cloudflare.com/workers/authorization/workers/)。

`artifacts_read`・`artifacts_write` の不足が表示された場合は、上記のArtifacts権限を追加してトークンを再選択します。Artifactsの書き込み権限は画面では `Edit` と表記されます。[Artifactsの認証](https://developers.cloudflare.com/artifacts/guides/authentication/)。

プレビュービルドを有効にする場合は、プレビュー用のD1バインディングとテーブルを別途設定してください。[Preview設定](https://developers.cloudflare.com/workers/previews/get-started/)。[ビルド画面の設定項目](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)。

手動デプロイは `docker compose exec workers npm run deploy`。`source-db-admin/` はローカル専用です。
