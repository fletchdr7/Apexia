"""WSGI entrypoint for hosts that only support WSGI (e.g. PythonAnywhere).

PythonAnywhere runs WSGI apps. FastAPI is ASGI, so we wrap it with a2wsgi.

On PythonAnywhere, set your web app's WSGI configuration file to import
`application` from this module, e.g.::

    import sys
    path = "/home/<youruser>/Apexia/backend"
    if path not in sys.path:
        sys.path.insert(0, path)
    from wsgi import application  # noqa
"""

from a2wsgi import ASGIMiddleware

from app.main import app

application = ASGIMiddleware(app)
