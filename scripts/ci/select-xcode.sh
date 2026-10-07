#!/bin/bash
set -euo pipefail
requested="${NAILMOODS_XCODE_VERSION:-26.3}"
path="/Applications/Xcode_${requested}.app/Contents/Developer"
if [[ ! -d "$path" ]]; then
  echo "Required Xcode $requested is unavailable; update IOS_XCODE_VERSION after checking Apple and runner requirements."
  exit 1
fi
sudo xcode-select --switch "$path"
xcodebuild -version
sdk="$(xcrun --sdk iphoneos --show-sdk-version)"
if [[ "${sdk%%.*}" -lt 26 ]]; then echo "iOS SDK 26+ is required"; exit 1; fi
echo "iOS SDK $sdk"
