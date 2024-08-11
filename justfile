default:
  @just --list --unsorted

build:
  docker build . \
    --tag redirects-monitor:latest

run:
  docker run --rm --name redirects-monitor \
    --mount type=bind,source="$(pwd)/test/config.yml",target=/config/config.yml \
    redirects-monitor:latest --config /config/config.yml

ghcr-build:
  BUILDX_NO_DEFAULT_ATTESTATIONS=1 \
  docker build . \
    --tag ghcr.io/selim13/redirects-monitor:latest \
    --platform linux/amd64,linux/arm64

ghcr-push:
  docker push ghcr.io/selim13/redirects-monitor:latest
