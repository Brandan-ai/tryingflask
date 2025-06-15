# __init__.py
# Initializes the Flask app and connects components (DB, login manager, routes)
from flask import Flask
from .extensions import db, bcrypt, login_manager, migrate, mail  # Shared extensions
from .models import User  # Needed for DB table creation
from .routes import init_routes, stats_bp  # Registers application routes and stats blueprint


def create_app():
    app = Flask(__name__)
    
    # Core configurations
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///yourdatabase.db'
    app.config['SECRET_KEY'] = '2185...'  # Replace with a secure random key

    # Flask-Mail configuration
    app.config.update(
        MAIL_SERVER   ='localhost',
        MAIL_PORT     =1025,
        MAIL_USE_TLS  =False,
        MAIL_USE_SSL  =False,
        MAIL_USERNAME =None,
        MAIL_PASSWORD =None,
        MAIL_DEFAULT_SENDER=('Super‑Maths','noreply@local')
        
    )

    # Initialize extensions with app context
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    login_manager.init_app(app)
    mail.init_app(app)

    # Redirect to 'login' when @login_required denies access
    login_manager.login_view = 'login'
    login_manager.login_message = None
    login_manager.needs_refresh_message = None

    # Create tables if they don't exist
    with app.app_context():
        db.create_all()

    
    # Register app routes & blueprints
    init_routes(app)
    app.register_blueprint(stats_bp)

    with app.app_context():
        print(app.url_map)


    return app
