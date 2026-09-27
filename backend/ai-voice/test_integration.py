"""Real local HTTP boundaries, controlled provider fixtures; no paid requests."""
import json
import os
import threading
import socket
import subprocess
import time
from pathlib import Path
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from unittest.mock import patch
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import server
import gemini
import eleven
from historical_context import fetch_events_from_engine, load_unlocked_context

TIME = '1986-04-26T01:23:40Z'
ROW = {'eventId': 'boundary', 'timestamp': TIME, 'isVerified': True, 'title': 'Update', 'description': 'Recorded update', 'citations': [{'sourceName': 'Archive', 'referenceId': 'A1'}]}
PROVIDERS = {'gemini': {'configured': True}, 'elevenlabs': {'configured': True}}


class EngineFixture(BaseHTTPRequestHandler):
    available = True
    last_path = ''

    def do_GET(self):
        type(self).last_path = self.path
        self.send_response(200 if self.available else 503)
        self.end_headers()
        payload = {'status': 'ready'} if self.path == '/ready' else {'status': 'success', 'authoritativeClock': TIME, 'data': [ROW, {**ROW, 'eventId': 'future', 'timestamp': '1986-04-27T00:00:00Z'}, {**ROW, 'eventId': 'unverified', 'isVerified': False}, {**ROW, 'eventId': 'uncited', 'citations': []}]}
        self.wfile.write(json.dumps(payload).encode())

    def log_message(self, *_):
        pass


class IntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = ThreadingHTTPServer(('127.0.0.1', 0), EngineFixture)
        cls.api = server.AIVoiceServer(('127.0.0.1', 0), server.AIVoiceHandler)
        for service in (cls.engine, cls.api):
            threading.Thread(target=service.serve_forever, daemon=True).start()
        cls.env = patch.dict(os.environ, {'HISTORICAL_ENGINE_URL': f'http://127.0.0.1:{cls.engine.server_port}', 'AI_VOICE_PUBLIC_URL': ''})
        cls.env.start()

    @classmethod
    def tearDownClass(cls):
        cls.env.stop()
        for service in (cls.api, cls.engine):
            service.shutdown()
            service.server_close()

    def request(self, path, body=None, headers=None):
        port = getattr(self, 'frontend_port', self.api.server_port)
        request = Request(f'http://127.0.0.1:{port}{path}', data=json.dumps(body).encode() if body is not None else None, headers=headers or {})
        try:
            response = urlopen(request, timeout=10)
        except HTTPError as error:
            response = error
        with response:
            return response.status, response.headers, response.read()

    def test_context_filters_time_verification_and_citations(self):
        context = load_unlocked_context(TIME, fetch_events_from_engine)
        self.assertEqual([row['event_id'] for row in context['events']], ['boundary'])
        self.assertIn('simulationTime=', EngineFixture.last_path)

    def test_question_receives_only_allowed_context(self):
        def model(_system, content):
            payload = json.loads(content)
            self.assertEqual([e['event_id'] for e in payload['unlocked_events']], ['boundary'])
            return {'answer': 'Recorded update', 'known': True, 'cited_event_ids': ['boundary', 'future']}
        with patch('server.provider_status', return_value=PROVIDERS), patch.object(gemini, 'generate_grounded_json', side_effect=model):
            status, _, body = self.request('/api/ask', {'question': 'What is known?', 'simulationTime': TIME})
        self.assertEqual(status, 200)
        self.assertEqual([source['eventId'] for source in json.loads(body)['sources']], ['boundary'])

    def test_audio_same_origin_ranges_expiration(self):
        with patch('server.provider_status', return_value=PROVIDERS), patch.object(eleven, '_synthesize_speech', return_value=b'0123456789'):
            status, _, body = self.request('/api/broadcast', {'simulationTime': TIME})
        self.assertEqual(status, 200)
        path = json.loads(body)['audioUrl']
        self.assertTrue(path.startswith('/api/audio/'))
        self.assertEqual(self.request(path)[2], b'0123456789')
        status, headers, body = self.request(path, headers={'Range': 'bytes=2-5'})
        self.assertEqual((status, body, headers['Content-Range']), (206, b'2345', 'bytes 2-5/10'))
        self.assertEqual(self.request(path, headers={'Range': 'bytes=-3'})[2], b'789')
        self.assertEqual(self.request(path, headers={'Range': 'bytes=99-'})[0], 416)
        with patch('server.time.monotonic', return_value=10**12):
            self.assertEqual(self.request(path)[0], 404)

    def test_health_readiness_and_engine_outage(self):
        with patch('server.provider_status', return_value=PROVIDERS):
            self.assertEqual(self.request('/ready')[0], 200)
            EngineFixture.available = False
            try:
                self.assertEqual(self.request('/health')[0], 200)
                self.assertEqual(self.request('/ready')[0], 503)
                status, _, body = self.request('/api/ask', {'question': 'What?', 'simulationTime': TIME})
                self.assertEqual(status, 502)
                self.assertEqual(json.loads(body)['error'], 'HISTORICAL_ENGINE_UNAVAILABLE')
            finally:
                EngineFixture.available = True

    def test_invalid_timestamps_and_missing_configuration(self):
        for body in ({}, {'simulationTime': 'wrong'}, {'simulationTime': '1986-04-26T01:00:00'}):
            self.assertEqual(self.request('/api/ask', {**body, 'question': 'What?'})[0], 400)
        with patch('server.provider_status', return_value={'gemini': {'configured': False}, 'elevenlabs': {'configured': False}}):
            for endpoint, error in [('/api/ask', 'GEMINI_NOT_CONFIGURED'), ('/api/broadcast', 'ELEVENLABS_NOT_CONFIGURED')]:
                status, _, body = self.request(endpoint, {'simulationTime': TIME, 'question': 'What?'})
                self.assertEqual(status, 503)
                self.assertEqual(json.loads(body)['error'], error)

    @unittest.skipUnless(os.environ.get('RUN_PROXY_TESTS') == '1', 'Set RUN_PROXY_TESTS=1 to launch Vite and test frontend-origin routing')
    def test_frontend_origin_proxy(self):
        frontend = Path(__file__).resolve().parents[2] / 'frontend'
        with socket.socket() as port_probe:
            port_probe.bind(('127.0.0.1', 0))
            port = port_probe.getsockname()[1]
        env = {**os.environ, 'VITE_HISTORY_ENGINE_URL': f'http://127.0.0.1:{self.engine.server_port}', 'VITE_AI_VOICE_URL': f'http://127.0.0.1:{self.api.server_port}'}
        process = subprocess.Popen(['node', 'node_modules/vite/bin/vite.js', '--port', str(port)], cwd=frontend, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.frontend_port = port
        try:
            for _ in range(50):
                try:
                    if self.request('/')[0] == 200:
                        break
                except OSError:
                    time.sleep(0.1)
            else:
                self.fail('Vite did not start')
            self.assertEqual(self.request('/api/events?simulationTime=' + TIME)[0], 200)
            self.assertEqual(self.request('/api/history/ready')[0], 200)
            with patch('server.provider_status', return_value=PROVIDERS):
                self.assertEqual(self.request('/api/ai/ready')[0], 200)
            self.test_question_receives_only_allowed_context()
            self.test_audio_same_origin_ranges_expiration()
        finally:
            del self.frontend_port
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)


if __name__ == '__main__':
    unittest.main()
