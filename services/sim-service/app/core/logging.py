import logging
import json
import socket
import threading
import queue
import time
import os
from datetime import datetime

# Global queue for async log shipping to Logstash
_log_queue = queue.Queue(maxsize=10000)
_shipper_thread = None
_stop_event = threading.Event()

class JSONFormatter(logging.Formatter):
    def __init__(self, service_name: str):
        super().__init__()
        self.service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "service": self.service_name,
            "level": record.levelname,
            "message": record.getMessage(),
        }
        
        # Merge extra fields if present, excluding standard LogRecord attributes
        STANDARD_ATTRS = {
            'name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 'filename',
            'module', 'exc_info', 'exc_text', 'stack_info', 'lineno', 'funcName',
            'created', 'msecs', 'relativeCreated', 'thread', 'threadName',
            'processName', 'process', 'message'
        }
        for key, value in record.__dict__.items():
            if key not in STANDARD_ATTRS:
                log_data[key] = value

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data)

class LogstashQueueHandler(logging.Handler):
    def emit(self, record):
        try:
            _log_queue.put_nowait(record)
        except queue.Full:
            pass

def _log_shipper():
    logstash_host = os.getenv("LOGSTASH_HOST", "logstash")
    logstash_port = int(os.getenv("LOGSTASH_PORT", "5044"))
    
    sock = None
    while not _stop_event.is_set():
        try:
            record = _log_queue.get(timeout=1.0)
        except queue.Empty:
            continue

        formatter = JSONFormatter(os.getenv("SERVICE_NAME", "unknown-service"))
        formatted_log = formatter.format(record) + "\n"

        connected = False
        for attempt in range(3):
            if sock is None:
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(2.0)
                    sock.connect((logstash_host, logstash_port))
                except Exception:
                    sock = None
                    time.sleep(0.5)
                    continue
            
            try:
                sock.sendall(formatted_log.encode("utf-8"))
                connected = True
                break
            except Exception:
                try:
                    sock.close()
                except Exception:
                    pass
                sock = None
                time.sleep(0.5)
        
        _log_queue.task_done()

def setup_logging(service_name: str):
    os.environ["SERVICE_NAME"] = service_name
    
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.handlers = []
    
    stdout_handler = logging.StreamHandler()
    stdout_handler.setFormatter(JSONFormatter(service_name))
    root_logger.addHandler(stdout_handler)
    
    logstash_handler = LogstashQueueHandler()
    root_logger.addHandler(logstash_handler)
    
    global _shipper_thread
    if _shipper_thread is None or not _shipper_thread.is_alive():
        _stop_event.clear()
        _shipper_thread = threading.Thread(target=_log_shipper, daemon=True)
        _shipper_thread.start()
