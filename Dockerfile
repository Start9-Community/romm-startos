ARG IMAGE
FROM ${IMAGE}
# The base image's CA store is only as current as its last release; the venv's certifi carries its own copy.
RUN apk upgrade --no-cache ca-certificates ca-certificates-bundle \
 && if [ -f /etc/ssl/certs/ca-certificates.crt.apk-new ]; then mv /etc/ssl/certs/ca-certificates.crt.apk-new /etc/ssl/certs/ca-certificates.crt; fi \
 && find /src/.venv -path '*/certifi/cacert.pem' -exec cp /etc/ssl/certs/ca-certificates.crt {} \; \
 && ! grep -q MIICTjCCAdOgAwIBAgIKPPYHqWhwDtqLhDAKBggqhkjOPQQDAzBr /etc/ssl/certs/ca-certificates.crt \
 && ! find /src/.venv -path '*/certifi/cacert.pem' -exec grep -l MIICTjCCAdOgAwIBAgIKPPYHqWhwDtqLhDAKBggqhkjOPQQDAzBr {} + | grep -q .
RUN apk add --no-cache --upgrade 'nodejs>=24.22.1-r0'
