#!/bin/env bash

pnpm exec turbo run build --filter='pintora-demo'
pushd website && pnpm run build && popd
cp -r demo/dist/ website/build/demo
