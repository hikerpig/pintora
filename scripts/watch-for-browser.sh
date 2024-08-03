pnpm exec turbo run watch --concurrency=10 \
  --no-cache --continue --parallel \
  --filter="@pintora/renderer" \
  --filter="@pintora/diagrams" \
  --filter="@pintora/core" \
  --filter="@pintora/test-shared" \
  --filter="@pintora/standalone"
