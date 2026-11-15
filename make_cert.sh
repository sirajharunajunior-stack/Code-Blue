#!/bin/sh
# Make a self-signed HTTPS certificate so phones can use the camera page.
#   ./make_cert.sh 192.168.1.50        (the Pi's / computer's LAN address)
# Then:  HM_SSL_CERT=certs/cert.pem HM_SSL_KEY=certs/key.pem python main.py
# and open https://192.168.1.50:8000/camera on the phone; accept the one-time certificate warning.
set -e
IP="${1:?usage: ./make_cert.sh <lan-ip-address>}"
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -nodes -days 825 -keyout certs/key.pem -out certs/cert.pem \
  -subj "/CN=$IP" -addext "subjectAltName=IP:$IP,DNS:localhost"
chmod 600 certs/key.pem
echo "Created certs/cert.pem and certs/key.pem"
