#!/bin/bash
set -euxo pipefail

# install docker and docker compose
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

# add ubuntu user to docker group
usermod -aG docker ubuntu || true

# clone repo and run compose
cd /opt
if [ ! -d "${repo_path}" ]; then
  git clone --branch ${branch} ${repo_url} ${repo_path}
fi
cd ${repo_path}

if [ "${compose_up}" = "true" ]; then
  docker compose pull || true
  docker compose up -d --build
fi


