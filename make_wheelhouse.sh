#!/bin/sh
# Run ONCE on a computer WITH internet, before launch. Downloads every Python package the backend needs into ./wheelhouse
# so it can be installed on the spacecraft with no internet (see install_offline.sh).
#   ./make_wheelhouse.sh                                  # same OS/CPU/Python as this computer
#   ./make_wheelhouse.sh manylinux2014_aarch64 3.11       # for a different target, e.g. a 64-bit Raspberry Pi on Python 3.11
set -e
if [ -n "$1" ]; then
  pip download -r requirements.txt -d wheelhouse --only-binary=:all: --platform "$1" --python-version "${2:?give the target Python version, e.g. 3.11}"
else
  pip download -r requirements.txt -d wheelhouse
fi
echo "wheelhouse/ ready: copy the whole backend folder (including wheelhouse/) to the target."
