# npm run build --workspace=demo
# npm run build --workspace=website

# pushd demo && npm run build && popd
# pushd website && npm run build && popd
# cp -r demo/dist/ website/build/demo

npx turbo run build
cp -r demo/dist/ website/build/demo
