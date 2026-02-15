#!/bin/bash
# EC2 Provisioning Script for LionHeart Agent
# Target: ubuntu@ec2-3-238-94-111.compute-1.amazonaws.com
# Usage: ssh -i "nim-10.pem" ubuntu@ec2-... < ec2-setup.sh

set -euo pipefail

echo "=== LionHeart EC2 Setup ==="

# 1. System updates
echo "[1/7] Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js via nvm
echo "[2/7] Installing Node.js..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 22
nvm alias default 22

# 3. Install global tools
echo "[3/7] Installing pnpm and pm2..."
npm install -g pnpm pm2

# 4. Install OpenClaw
echo "[4/7] Installing OpenClaw..."
if command -v openclaw &> /dev/null; then
  echo "OpenClaw already installed"
else
  curl -fsSL https://openclaw.ai/install.sh | bash
  openclaw onboard
fi

# 5. Clone and setup repo
echo "[5/7] Setting up LionHeart repo..."
if [ ! -d "$HOME/lion-heart" ]; then
  git clone https://github.com/phamdat721101/lion-heart.git "$HOME/lion-heart"
fi
cd "$HOME/lion-heart"
npm install

# 6. Link skills to OpenClaw workspace
echo "[6/7] Linking agent skills..."
mkdir -p "$HOME/.openclaw/workspace/skills"
ln -sf "$HOME/lion-heart/agent/skills/"* "$HOME/.openclaw/workspace/skills/"

# Copy env template
if [ ! -f "$HOME/.openclaw/workspace/.env" ]; then
  cp "$HOME/lion-heart/.env.example" "$HOME/.openclaw/workspace/.env"
  echo "Edit $HOME/.openclaw/workspace/.env with your keys!"
fi

# 7. Start with pm2
echo "[7/7] Starting OpenClaw gateway..."
pm2 delete lionheart-agent 2>/dev/null || true
pm2 start "openclaw gateway --port 18789" --name lionheart-agent
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true

# Open firewall
sudo ufw allow 18789/tcp 2>/dev/null || true

echo ""
echo "=== Setup Complete ==="
echo "Gateway: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):18789"
echo "Health:  curl http://localhost:18789/health"
echo ""
echo "Next steps:"
echo "  1. Edit ~/.openclaw/workspace/.env with AGENT_PRIVATE_KEY and contract addresses"
echo "  2. pm2 restart lionheart-agent"
