#!/usr/bin/env python3
"""Bounded, local-only smoke load and process recovery for the built preview."""
from concurrent.futures import ThreadPoolExecutor
from http.client import HTTPConnection
import json
import os
from math import ceil
from pathlib import Path
import socket
import subprocess
import time
from tempfile import TemporaryDirectory

with socket.socket() as reservation:
    reservation.bind(('127.0.0.1', 0))
    port = reservation.getsockname()[1]

root = Path(__file__).resolve().parents[2]
endpoints = [
    ('/health', 200, lambda obj: obj['status'] == 'healthy'),
    ('/api/astro/muhurat?city=Kolkata', 200, lambda obj: obj['scope_metadata']['status'] == 'PREVIEW'),
    ('/api/astro/muhurat?city=UnknownSyntheticCity', 422, lambda obj: obj['error'] == 'UNSUPPORTED_LOCATION'),
]

def request(endpoint):
    path, expected, validate = endpoint
    start = time.perf_counter()
    connection = HTTPConnection('127.0.0.1', port, timeout=3)
    try:
        connection.request('GET', path)
        reply = connection.getresponse()
        status = reply.status
        body = json.load(reply)
    finally:
        connection.close()
    if status != expected or not validate(body):
        raise AssertionError(f'{path} returned unexpected HTTP {status} or response contract')
    return {'path': path, 'ms': (time.perf_counter() - start) * 1000}

def start_server(fixture):
    start = time.perf_counter()
    # Start a preview with neutral adapter configuration even on a configured host.
    env = {'PATH': os.environ.get('PATH', os.defpath),
           'NODE_ENV': 'production', 'PORT': str(port), 'PREVIEW_LOOPBACK_ONLY': '1'}
    log_path = fixture / 'preview.log'
    with log_path.open('w') as log:
        process = subprocess.Popen(
            ['node', '--import', 'tsx', str(root / 'server.ts')], cwd=fixture, env=env,
            stdout=log, stderr=subprocess.STDOUT,
        )
    deadline = start + 10
    try:
        while time.perf_counter() < deadline:
            if process.poll() is not None:
                raise RuntimeError('preview exited before health check')
            # This line is emitted only after this child has bound successfully.
            if 'MyMomentOclock web service ready' in log_path.read_text().splitlines():
                request(endpoints[0])
                return process, (time.perf_counter() - start) * 1000
            time.sleep(0.025)
        raise RuntimeError('preview did not become healthy')
    except BaseException:
        stop_server(process)
        raise

def stop_server(process):
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=12)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
            raise

def measure(concurrency, rounds):
    start = time.perf_counter()
    with ThreadPoolExecutor(concurrency) as workers:
        results = list(workers.map(request, endpoints * rounds))
    elapsed = time.perf_counter() - start
    groups = {'all': results}
    groups.update({endpoint[0]: [value for value in results if value['path'] == endpoint[0]] for endpoint in endpoints})
    summary = {}
    for name, group in groups.items():
        values = sorted(value['ms'] for value in group)
        summary[name] = {'count': len(values), 'p95_ms': round(values[ceil(0.95 * len(values)) - 1], 3),
                         'p99_ms': round(values[ceil(0.99 * len(values)) - 1], 3)}
    return {'concurrency': concurrency, 'requests_per_second': round(len(results) / elapsed, 2), 'metrics': summary}

if not (root / 'dist/index.html').is_file():
    raise SystemExit('Run npm run build before this baseline.')

# Keep dotenv and app configuration separate from the source checkout.
with TemporaryDirectory(prefix='mmo-preview-baseline-') as directory:
    fixture = Path(directory)
    for name in ('dist', 'node_modules'):
        (fixture / name).symlink_to(root / name, target_is_directory=True)

    process, startup = start_server(fixture)
    try:
        baseline = measure(1, 10)
        concurrent = measure(8, 40)
    finally:
        stop_server(process)

    try:
        request(endpoints[0])
        raise AssertionError('health responded after stopping the first process')
    except ConnectionRefusedError:
        pass

    process, restart = start_server(fixture)
    try:
        recovered = measure(1, 3)
    finally:
        stop_server(process)

print(json.dumps({'startup_ms': round(startup, 3), 'restart_to_healthy_ms': round(restart, 3),
                  'baseline': baseline, 'concurrent': concurrent, 'recovered': recovered,
                  'unexpected_responses': 0}, indent=2))
