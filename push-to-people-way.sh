#!/bin/bash
# Push Pablo codebase to people-way/pablo on GitHub
#
# Usage:
#   chmod +x push-to-people-way.sh
#   GITHUB_TOKEN=ghp_yourtoken ./push-to-people-way.sh
#
# The token needs these scopes: repo (or public_repo for public repos)
# Create one at: https://github.com/settings/tokens/new

set -e

if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: GITHUB_TOKEN is not set."
  echo "Create a token at https://github.com/settings/tokens/new"
  echo "Then run: GITHUB_TOKEN=ghp_... ./push-to-people-way.sh"
  exit 1
fi

OWNER="people-way"
REPO="pablo"
GITHUB_API="https://api.github.com"

echo "Creating GitHub repository $OWNER/$REPO ..."
HTTP_STATUS=$(curl -s -o /tmp/create_repo_response.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "$GITHUB_API/orgs/$OWNER/repos" \
  -d "{\"name\":\"$REPO\",\"private\":false,\"description\":\"Pablo — Your Personal Chess Coach\"}")

if [ "$HTTP_STATUS" = "201" ]; then
  echo "✓ Repository created: https://github.com/$OWNER/$REPO"
elif [ "$HTTP_STATUS" = "422" ]; then
  echo "Repository already exists (or name taken) — continuing with push."
else
  # Try creating under user account instead of org
  HTTP_STATUS2=$(curl -s -o /tmp/create_repo_response.json -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "$GITHUB_API/user/repos" \
    -d "{\"name\":\"$REPO\",\"private\":false,\"description\":\"Pablo — Your Personal Chess Coach\"}")
  if [ "$HTTP_STATUS2" = "201" ]; then
    echo "✓ Repository created under user account: https://github.com/$OWNER/$REPO"
  else
    echo "Repo creation response (HTTP $HTTP_STATUS2):"
    cat /tmp/create_repo_response.json
    echo ""
    echo "Continuing anyway — repo may already exist."
  fi
fi

echo ""
echo "Adding remote and pushing..."
git remote remove people-way 2>/dev/null || true
git remote add people-way "https://$GITHUB_TOKEN@github.com/$OWNER/$REPO.git"
git push people-way main

echo ""
echo "✓ Done! Your repo is live at: https://github.com/$OWNER/$REPO"
echo ""
echo "Next steps:"
echo "  1. Go to https://vercel.com/new"
echo "  2. Import github.com/$OWNER/$REPO"
echo "  3. Click Deploy — Vercel auto-detects Next.js"
echo "  4. Your site will be live at a *.vercel.app URL"
