#!/bin/bash
# Script to test a simple connection to timataka.net
echo "Timataka Simple Connection Test"
echo "=============================="
echo "This script will test if timataka.net is accessible"
echo

docker compose exec backend node src/tests/simple-connection-test.js
