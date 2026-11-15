#!/bin/sh
# Install on the spacecraft computer with NO internet, using the wheelhouse made by make_wheelhouse.sh.
set -e
python3 -m venv venv
./venv/bin/pip install --no-index --find-links wheelhouse -r requirements.txt
echo "Installed. Start with:  ./venv/bin/python main.py"
