#!/bin/sh
# Official Swiss Ephemeris v2.10.03 source; pin the full immutable revision.
set -eu
revision=175e1fcb3108bcd5c0d146c803f51dcf23508012
prefix=${PREFIX:-/usr/local}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT HUP INT TERM
git init -q "$work/source"
git -C "$work/source" remote add origin https://github.com/aloistr/swisseph.git
git -C "$work/source" fetch --depth 1 origin "$revision"
git -C "$work/source" checkout -q --detach FETCH_HEAD
test "$(git -C "$work/source" rev-parse HEAD)" = "$revision"
make -C "$work/source" -j "${BUILD_JOBS:-2}" libswe.a
install -d "$prefix/lib" "$prefix/include" "$prefix/share/licenses/swisseph"
install -m 0644 "$work/source/libswe.a" "$prefix/lib/libswe.a"
install -m 0644 "$work/source/swephexp.h" "$work/source/sweodef.h" "$prefix/include/"
install -m 0644 "$work/source/LICENSE" "$work/source/agpl-3.0.txt" "$prefix/share/licenses/swisseph/"
