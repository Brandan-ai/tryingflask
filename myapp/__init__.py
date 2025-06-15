# myapp/__init__.py
from flask import Flask
from .extensions import (
    db, bcrypt, login_manager,
    migrate, mail, limiter
)
from .routes     import init_routes, stats_bp
from config      import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    login_manager.init_app(app)
    mail.init_app(app)
    limiter.init_app(app)

    # redirect @login_required to 'login'
    login_manager.login_view = 'login'
    login_manager.login_message = None
    login_manager.needs_refresh_message = None

    # create tables
    with app.app_context():
        db.create_all()

    # register routes + blueprints
    init_routes(app)
    app.register_blueprint(stats_bp)

    return app
