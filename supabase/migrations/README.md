# Supabase Migrations

このディレクトリは Supabase のスキーマ変更履歴を記録する。

## 命名規則
ファイル名は以下の形式:

  YYYYMMDDHHMMSS_description.sql

- YYYYMMDDHHMMSS: UTC タイムスタンプ
- description: スネークケースで変更内容を表す短い名前

## 運用ルール
1. 全てのスキーマ変更はこのディレクトリにマイグレーションファイルとして
   記録する
2. 本番 DB への適用は Supabase SQL Editor で手動実行する
3. マイグレーションファイルは「適用済み履歴」として保存する
   (既に適用したことを示すため、`IF NOT EXISTS` / `IF EXISTS` を使う)
4. 一度適用したマイグレーションファイルは原則編集しない
5. スキーマ変更を伴うコミットには必ずマイグレーションファイルを含める

## 過去のマイグレーション

- 20260418000001_status_redesign.sql - ステータス設計2軸分離
  詳細: docs/status-redesign.md
