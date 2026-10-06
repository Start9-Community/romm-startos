ARCHES := x86 arm
TS_CHECK := npx tsc --noEmit && npm run test:types
include node_modules/@start9labs/start-sdk/s9pk.mk

.PHONY: check-cli-version
check-deps: check-cli-version

check-cli-version:
	@start-cli --version | awk '$$1 == "start-cli" { split($$2, v, "."); supported = v[1] > 2 || (v[1] == 2 && v[2] >= 2) } END { if (!supported) { print "start-cli 2.2.0 or later is required to preserve SDK 3 manifest fields"; exit 1 } }'
