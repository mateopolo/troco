#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# TROCO — GIT BISECT SCRIPT FOR CHAT & WEBRTC REGRESSION
# Identifies the exact commit that introduced the chat or call regressions.
# ═══════════════════════════════════════════════════════════════════

STABLE_COMMIT="0dd3f6a83113674d3563caea8b80a24ed3619ef4"

echo "🔍 Starting Git Bisect..."
echo "  Known good commit: $STABLE_COMMIT (Before Batch 1 & 2)"
echo "  Known bad commit:  HEAD"

git bisect start
git bisect bad HEAD
git bisect good "$STABLE_COMMIT"

echo ""
echo "At each step, test the chat and WebRTC functionality:"
echo "  If functional: git bisect good"
echo "  If broken:     git bisect bad"
echo "  To abort:      git bisect reset"
