ARCHES := x86 arm
TS_CHECK := npx tsc --noEmit && npm test
include node_modules/@start9labs/start-sdk/s9pk.mk

javascript/index.js: Makefile $(wildcard tests/*.test.ts)

.PHONY: check-cli-version
check-deps: check-cli-version

check-cli-version:
	@start-cli --version | awk '$$1 == "start-cli" { split($$2, v, "."); supported = v[1] > 2 || (v[1] == 2 && v[2] >= 3) } END { if (!supported) { print "start-cli 2.3.0 or later is required to package foreign-architecture images correctly"; exit 1 } }'
