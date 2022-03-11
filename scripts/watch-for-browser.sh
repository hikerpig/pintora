pnpx turbo run watch --concurrency=10 \
  --no-cache --no-deps --continue --parallel \
  --scope="@pintora/renderer" \
  --scope="@pintora/diagrams" \
  --scope="@pintora/core" \
  --scope="@pintora/test-shared" \
  --scope="@pintora/standalone"
