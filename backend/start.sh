#!/usr/bin/env bash
gunicorn backend.app:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
